import { githubService } from './github';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { logger } from '../utils/logger';
import { config } from '../config/environment';
import type { ILeak } from '../models/Leak';
import axios from 'axios';

// Enhanced regex patterns with boundary checks
const PROVIDER_PATTERNS: { [provider: string]: RegExp } = {
  openai: /\b(sk-[a-zA-Z0-9]{48})\b/g,
  'google-gemini': /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
  anthropic: /\b(sk-ant-api-[a-zA-Z0-9]{32})\b/g,
  cohere: /\b((?:xcohere-)?[a-zA-Z0-9]{40,60})\b/g,
  'mistral-ai': /\b(mistral[-_][a-zA-Z0-9]{32,64})\b/gi,
  'huggingface': /\b(hf_[a-zA-Z0-9]{34})\b/g,
};

// Contextual search queries
const SEARCH_QUERIES: string[] = [
  'filename:.env "OPENAI_API_KEY"',
  'filename:.env "GEMINI_API_KEY"',
  'filename:.env "ANTHROPIC_API_KEY"',
  'filename:.env "CO_API_KEY"',
  'filename:.env "MISTRAL_API_KEY"',
  'filename:.env "HUGGINGFACE_API_KEY"',
  'path:config "api_key"',
  'extension:json "api_key"',
  'extension:env "API_KEY"'
];

// Configuration constants
const MAX_CONCURRENT_SCANS = Number(process.env['MAX_CONCURRENT_SCANS'] || 3);
const CODE_SEARCH_QUERY_INTERVAL_MS = Number(process.env['CODE_SEARCH_QUERY_INTERVAL_MS'] || 5000);
const SCAN_ENTROPY_THRESHOLD = process.env['SCAN_ENTROPY_THRESHOLD'] 
  ? Number(process.env['SCAN_ENTROPY_THRESHOLD']) 
  : 3.5; // Default entropy threshold

// Calculate Shannon entropy
function calculateEntropy(str: string): number {
  const freqMap: Record<string, number> = {};
  const len = str.length;
  
  for (const char of str) {
    freqMap[char] = (freqMap[char] || 0) + 1;
  }
  
  return Object.values(freqMap).reduce((entropy, freq) => {
    const p = freq / len;
    return entropy - p * Math.log2(p);
  }, 0);
}

// Key validation functions
function isValidOpenAIKey(key: string): boolean {
  return /^sk-[a-zA-Z0-9]{48}$/.test(key);
}

function isValidGeminiKey(key: string): boolean {
  return /^AIza[0-9A-Za-z\-_]{35}$/.test(key);
}

function isValidAnthropicKey(key: string): boolean {
  return /^sk-ant-api-[a-zA-Z0-9]{32}$/.test(key);
}

function isValidCohereKey(key: string): boolean {
  return /^(xcohere-)?[a-zA-Z0-9]{40,60}$/.test(key);
}

function isValidMistralKey(key: string): boolean {
  return /^mistral[-_][a-zA-Z0-9]{32,64}$/i.test(key);
}

function isValidHuggingFaceKey(key: string): boolean {
  return /^hf_[a-zA-Z0-9]{34}$/.test(key);
}

// Provider validation mapping
const KEY_VALIDATORS: Record<string, (key: string) => boolean> = {
  openai: isValidOpenAIKey,
  'google-gemini': isValidGeminiKey,
  anthropic: isValidAnthropicKey,
  cohere: isValidCohereKey,
  'mistral-ai': isValidMistralKey,
  'huggingface': isValidHuggingFaceKey
};

function redactKey(key: string): string {
  if (key.length <= 8) return key;
  return `${key.substring(0, 4)}${'*'.repeat(key.length - 8)}${key.substring(key.length - 4)}`;
}

async function fetchRawFileContent(repoFullName: string, filePath: string, ref: string): Promise<string | null> {
  try {
    const rawUrl = `https://raw.githubusercontent.com/${repoFullName}/${ref}/${filePath}`;
    const response = await axios.get(rawUrl, { 
      timeout: 15000,
      transformResponse: [data => data]
    });
    return typeof response.data === 'string' ? response.data : null;
  } catch (error) {
    return null;
  }
}

async function alreadyScanned(repoUrl: string, filePath: string, query: string, commitHash: string): Promise<boolean> {
  const recentScan = await ScanAttempt.findOne({
    repoUrl,
    filePath,
    queryUsed: query,
    commitHash
  }).lean();
  return !!recentScan;
}

function extractApiKeys(content: string): { key: string, provider: string }[] {
  const results: { key: string, provider: string }[] = [];
  const foundKeys = new Set<string>();

  for (const [provider, regex] of Object.entries(PROVIDER_PATTERNS)) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    
    while ((match = regex.exec(content)) !== null) {
      const key = match[1] || match[0];
      // Skip duplicates and invalid keys
      if (foundKeys.has(key) || !KEY_VALIDATORS[provider] || !KEY_VALIDATORS[provider](key)) continue;
      foundKeys.add(key);
      results.push({ key, provider });
    }
  }
  return results;
}

export class GitHubCodeLeakFarmService {
  private running = false;
  private activeScans = new Set<string>();

  public start() {
    if (this.running) return;
    this.running = true;
    logger.status('farm', 'Service started', 'GitHubCodeLeakFarm');
    this.scanLoop();
  }

  public stop() {
    this.running = false;
    logger.status('farm', 'Service stopped', 'GitHubCodeLeakFarm');
  }

  private async scanLoop(): Promise<void> {
    let lastStatusLog = Date.now();
    const STATUS_LOG_INTERVAL = 1 * 60 * 1000; // 1 minute
    let firstCycle = true;
    while (this.running) {
      let scannedAnything = false;
      try {
        scannedAnything = await this.executeScanCycle();
      } catch (error) {
        logger.error('[FARM] Scan cycle error: ' + (error instanceof Error ? error.message : String(error)));
      }
      if (firstCycle && !scannedAnything) {
        logger.init('No new files to scan. System is idle, waiting for new changes...');
        firstCycle = false;
      }
      if (Date.now() - lastStatusLog > STATUS_LOG_INTERVAL) {
        logger.init('No new files to scan. System is idle, waiting for new changes...');
        lastStatusLog = Date.now();
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  private async executeScanCycle(): Promise<boolean> {
    const scanPromises: Promise<void>[] = [];
    let scannedAnything = false;
    for (const query of SEARCH_QUERIES) {
      if (this.activeScans.size >= MAX_CONCURRENT_SCANS) break;
      scanPromises.push(this.processSearchQuery(query));
      this.activeScans.add(query);
      scannedAnything = true;
      await new Promise(resolve => setTimeout(resolve, CODE_SEARCH_QUERY_INTERVAL_MS));
    }
    await Promise.all(scanPromises);
    return scannedAnything;
  }

  private async processSearchQuery(query: string): Promise<void> {
    try {
      let page = 1;
      let hasMoreResults = true;
      
      while (this.running && hasMoreResults) {
        const response = await axios.get('https://api.github.com/search/code', {
          params: { q: query, per_page: 10, page },
          headers: {
            'Authorization': `Bearer ${config.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'API-Radar-Scanner/1.0',
          },
          timeout: 30000,
        });
        
        const items: any[] = response.data?.items || [];
        if (items.length === 0) {
          hasMoreResults = false;
          break;
        }
        
        await this.processSearchResults(items, query);
        
        // Pagination control
        page = items.length === 10 ? page + 1 : 1;
        if (page === 1) {
          await new Promise(resolve => setTimeout(resolve, 60000)); // Cooldown
        }
      }
    } catch (error) {
      this.handleSearchError(error, query);
    } finally {
      this.activeScans.delete(query);
    }
  }

  private async processSearchResults(items: any[], query: string): Promise<void> {
    for (const item of items) {
      if (!this.running) break;
      const repoName: string = item.repository.full_name;
      const filePath: string = item.path;
      // Exclude documentation files from scan targets
      const docFilePatterns = [/^readme(\.md|\.txt)?$/i, /^license(\.md|\.txt)?$/i, /^contributing(\.md|\.txt)?$/i, /^code\_of\_conduct(\.md|\.txt)?$/i, /^changelog(\.md|\.txt)?$/i, /^notice(\.md|\.txt)?$/i];
      const fileName = filePath.split('/').pop() || '';
      if (docFilePatterns.some(pattern => pattern.test(fileName))) continue;
      let commitHash = '';
      try {
        const commitResp = await githubService.getFileLatestCommitHash(repoName, filePath);
        commitHash = commitResp || '';
      } catch (err) {
        commitHash = '';
      }
      if (!commitHash) continue;
      if (await alreadyScanned(item.repository.html_url, filePath, query, commitHash)) {
        continue;
      }
      logger.scan(repoName, filePath);
      const content = await fetchRawFileContent(repoName, filePath, 'HEAD');
      if (!content) {
        continue;
      }
      await this.detectAndSaveLeaks(content, repoName, item.repository.html_url, filePath, query, commitHash);
    }
  }

  private async detectAndSaveLeaks(
    content: string, 
    repoName: string, 
    repoUrl: string,
    filePath: string,
    query: string,
    commitHash: string
  ): Promise<void> {
    const leaks = extractApiKeys(content);
    const foundLeaks: string[] = [];
    for (const { key, provider } of leaks) {
      if (calculateEntropy(key) < SCAN_ENTROPY_THRESHOLD) continue;
      try {
        const [repoCreatedAt, leakIntroducedAt] = await Promise.all([
          this.getRepoCreationDate(repoName),
          this.getLeakIntroductionDate(repoName, filePath)
        ]);
        // Upsert leak: update if exists for this repoUrl+filePath+provider, else create
        const leakData: Partial<ILeak> = {
          redactedKey: redactKey(key),
          fullKey: key,
          provider,
          repoUrl,
          filePath,
          leakIntroducedAt,
          leakDetectedAt: new Date(),
          repoCreatedAt
        };
        await Leak.findOneAndUpdate(
          { repoUrl, filePath, provider },
          leakData,
          { upsert: true, new: true }
        );
        foundLeaks.push(provider);
        logger.leak(provider, repoName);
      } catch (error) {
        logger.error('[FARM] Failed to save leak: ' + (error instanceof Error ? error.message : String(error)));
      }
    }
    await this.saveScanAttempt(repoUrl, repoName, filePath, commitHash, query, foundLeaks.length > 0, foundLeaks);
  }

  private async getRepoCreationDate(repoName: string): Promise<Date> {
    try {
      const repoMeta = await githubService.getRepoMetadata(repoName);
      return repoMeta.createdAt ? new Date(repoMeta.createdAt) : new Date();
    } catch (error) {
      logger.error('[FARM] Repo metadata error: ' + (error instanceof Error ? error.message : String(error)));
      return new Date();
    }
  }

  private async getLeakIntroductionDate(repoName: string, filePath: string): Promise<Date> {
    return githubService.getFileLatestCommitDate(repoName, filePath);
  }

  private async saveScanAttempt(
    repoUrl: string,
    repoName: string,
    filePath: string,
    commitHash: string,
    query: string,
    leakFound: boolean,
    leakTypes: string[]
  ): Promise<void> {
    try {
      await ScanAttempt.create({
        repoUrl,
        fullName: repoName,
        filePath,
        commitHash,
        scannedAt: new Date(),
        leakFound,
        leakTypes,
        queryUsed: query
      });
    } catch (error) {
      logger.error('[FARM] ScanAttempt save failed: ' + (error instanceof Error ? error.message : String(error)));
    }
  }

  private handleSearchError(error: any, query: string): void {
    if (axios.isAxiosError(error) && error.response?.status === 403) {
      logger.warn('[FARM] Rate limit hit for query: ' + query);
    } else {
      logger.error('[FARM] Search error for "' + query + '": ' + (error instanceof Error ? error.message : String(error)));
    }
  }
}

export const gitHubCodeLeakFarmService = new GitHubCodeLeakFarmService(); 