import { githubService } from './github';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import type { ILeak } from '../models/Leak';
import type { IScanAttempt } from '../models/ScanAttempt';
import axios from 'axios';

const REGEX_PATTERNS = [
  /sk-[A-Za-z0-9]{40}/,                            // OpenAI
  /AIza[0-9A-Za-z\-_]{35}/,                        // Google Gemini
  /[xX]-api-key=[A-Za-z0-9_-]{30,50}/,             // Anthropic
  /Mistral[_]?[A-Za-z0-9]{32,64}/,                 // Mistral AI
  /[a-zA-Z0-9]{48,64}/                             // Cohere (generic key)
];

const SEARCH_QUERIES: string[] = [
  'filename:.env AND api_key',
  'filename:config.json AND token',
  'access_token',
  'sk-',
  'AKIA',
  'AIza',
  'anthropic',
  'cohere',
  'mistral',
];

const MAX_CONCURRENT_SCANS = Number(process.env['MAX_CONCURRENT_SCANS'] || 3);
const CODE_SEARCH_QUERY_INTERVAL_MS = Number(process.env['CODE_SEARCH_QUERY_INTERVAL_MS'] || 5000);
const RATE_LIMIT_MAX = config.RATE_LIMIT_MAX;
const RATE_LIMIT_WINDOW = config.RATE_LIMIT_WINDOW;
const SCAN_ENTROPY_THRESHOLD = process.env['SCAN_ENTROPY_THRESHOLD'] ? Number(process.env['SCAN_ENTROPY_THRESHOLD']) : undefined;

function calculateEntropy(str: string): number {
  const map: Record<string, number> = {};
  for (const c of str) map[c] = (map[c] || 0) + 1;
  let entropy = 0;
  for (const k in map) {
    const p = map[k]! / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function redactKey(key: string): string {
  if (key.length <= 8) return key[0] + '***' + key[key.length - 1];
  return key.slice(0, 4) + '***' + key.slice(-4);
}

function getProvider(key: string): string {
  if (/sk-[A-Za-z0-9]{40}/.test(key)) return 'openai';
  if (/AIza[0-9A-Za-z\-_]{35}/.test(key)) return 'google-gemini';
  if (/[xX]-api-key=[A-Za-z0-9_-]{30,50}/.test(key)) return 'anthropic';
  if (/Mistral[_]?[A-Za-z0-9]{32,64}/.test(key)) return 'mistral-ai';
  if (/[a-zA-Z0-9]{48,64}/.test(key)) return 'cohere';
  return 'unknown';
}

async function fetchRawFileContent(repoFullName: string, filePath: string, ref: string): Promise<string | null> {
  const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${ref}/${filePath}`;
  try {
    const resp = await axios.get<string>(rawUrl, { timeout: 15000 });
    if (typeof resp.data === 'string') return resp.data;
  } catch {}
  return null;
}

async function alreadyScanned(repoUrl: string, query: string): Promise<boolean> {
  const recent = await ScanAttempt.findOne({
    repo_url: repoUrl,
    query_used: query,
    status: 'success',
    scanned_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  }).lean();
  return !!recent;
}

export class GitHubCodeLeakFarmService {
  private running = false;

  public start() {
    if (this.running) return;
    this.running = true;
    logger.status('farm', 'Started', 'GitHubCodeLeakFarm');
    this.loop();
  }

  private async loop(): Promise<void> {
    while (this.running) {
      try {
        await this.runParallelScans();
      } catch (err: any) {
        logger.error('farm', `ERROR: ${err.message}`);
      }
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  private async runParallelScans(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < Math.min(MAX_CONCURRENT_SCANS, SEARCH_QUERIES.length); i++) {
      const query: string = SEARCH_QUERIES[i]!;
      promises.push(this.runQueryLoop(query, i));
      await new Promise(res => setTimeout(res, CODE_SEARCH_QUERY_INTERVAL_MS));
    }
    await Promise.all(promises);
  }

  private async runQueryLoop(query: string, idx: number): Promise<void> {
    let page = 1;
    let rateLimitCount = 0;
    while (this.running) {
      try {
        // REST code search
        const response: any = await githubService['makeRequest']((client: any) =>
          client.get('/search/code', {
            params: {
              q: query,
              per_page: 10,
              page,
            }
          })
        );
        const items: any[] = response.data?.items || [];
        logger.info('farm', `Query executed: ${query}`);
        logger.info('farm', `Results for query "${query}": ${items.length}`);
        if (items.length === 0) {
          logger.info('farm', `No results for query "${query}". Raw response: ${JSON.stringify(response.data)}`);
        }
        for (const item of items) {
          const repoName: string = item.repository.full_name;
          const repoUrl: string = item.repository.html_url;
          const authorName: string = item.repository.owner.login;
          const authorUrl: string = item.repository.owner.html_url;
          const filePath: string = item.path;
          const commitHash: string = item.sha;
          logger.info('farm', `Scanning file: ${repoName}/${filePath}`);
          if (await alreadyScanned(repoUrl, query)) continue;
          const content = await fetchRawFileContent(repoName, filePath, 'HEAD');
          if (!content) continue;
          let foundLeak = false;
          let leakTypes: string[] = [];
          for (const regex of REGEX_PATTERNS) {
            const matches = content.match(regex);
            if (matches) {
              logger.info('farm', `Potential secret found in ${repoName}/${filePath}`);
              for (const match of matches) {
                if (SCAN_ENTROPY_THRESHOLD) {
                  const entropy = calculateEntropy(match);
                  if (entropy < SCAN_ENTROPY_THRESHOLD) continue;
                }
                const provider = getProvider(match);
                const leak: Partial<ILeak> = {
                  redactedKey: redactKey(match),
                  fullKey: match,
                  provider,
                  repoName,
                  repoUrl,
                  authorName,
                  authorUrl,
                  timestamp: new Date(),
                  filePath,
                  commitHash,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                try {
                  await Leak.create(leak);
                  logger.info('leak', `Leak saved (${provider}) in ${repoName}`);
                  foundLeak = true;
                  leakTypes.push(provider);
                } catch (err: any) {
                  logger.error('leak', `Leak save failed: ${err?.message || err}`);
                }
              }
            }
          }
          try {
            await ScanAttempt.create({
              repo_url: repoUrl,
              full_name: repoName,
              scanned_at: new Date(),
              leak_found: foundLeak,
              leak_types: leakTypes,
              query_used: query,
              status: 'success',
              error_message: undefined,
            });
            logger.info('farm', `[STORE] Scan saved to DB: scan_attempts`);
          } catch (err: any) {
            logger.error('farm', `ScanAttempt save failed: ${err?.message || err}`);
          }
        }
        // Pagination: REST API paginates with 'page' param
        if (items.length === 10) {
          page++;
        } else {
          page = 1;
          await new Promise(res => setTimeout(res, 60000));
        }
        rateLimitCount = 0;
      } catch (err: any) {
        if (err.response && err.response.status === 403) {
          rateLimitCount++;
          logger.warn('farm', `Rate limit hit, switching token`);
          if (rateLimitCount > 3) {
            logger.warn('farm', `Too many rate limits, backing off for ${RATE_LIMIT_WINDOW}ms`);
            await new Promise(res => setTimeout(res, RATE_LIMIT_WINDOW));
            rateLimitCount = 0;
          } else {
            await new Promise(res => setTimeout(res, 10000));
          }
        } else {
          logger.error('farm', `REST API error: ${err?.message || err}`);
          await new Promise(res => setTimeout(res, 10000));
        }
      }
    }
  }
}

export const gitHubCodeLeakFarmService = new GitHubCodeLeakFarmService(); 