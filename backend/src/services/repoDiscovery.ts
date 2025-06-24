import { githubGraphQLService } from './githubGraphQL';
import { scoreRepo, RepoScoringInput } from '../utils/repoScoring';
import { logger } from '../utils/logger';
import { ScanAttempt } from '../models/ScanAttempt';

// Independent discovery filters
const RISKY_FILENAMES = [
  '.env',
  'docker-compose.yml',
  'access_token',
  'secrets',
  'config.json',
  'credentials.json',
  'api_key',
  'private_key',
  'secret',
  'password',
  'token',
  'key',
  'auth',
  'login',
  'config.yml',
  'settings.json',
  'secrets.json',
  'env.example',
  '.env.local',
  '.env.production',
];

const TARGET_LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Go',
  'Java',
  'C#',
  'PHP',
  'Ruby',
  'Rust',
  'Shell',
  'YAML',
  'JSON',
];

// Cache for recent scan attempts to avoid DB queries
const recentScanCache = new Map<string, number>();
const CACHE_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

export class RepoDiscoveryService {
  private readonly seen: Set<string> = new Set();
  private running = false;

  constructor() {
    // Clean up cache periodically
    setInterval(() => {
      const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago
      for (const [repoUrl, timestamp] of Array.from(recentScanCache.entries())) {
        if (timestamp < cutoff) {
          recentScanCache.delete(repoUrl);
        }
      }
    }, CACHE_CLEANUP_INTERVAL);
  }

  async start(onDiscovered: (repo: any, query: string) => void) {
    if (this.running) return;
    this.running = true;
    logger.status('Repo Discovery', 'Started');
    
    while (true) {
      try {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // Iterate over each filename independently
        for (const filename of RISKY_FILENAMES) {
          // For each filename, search across all languages
          for (const language of TARGET_LANGUAGES) {
            let hasMore = true;
            let after: string | undefined;
            
            while (hasMore) {
              const query = `${filename} language:${language} created:>${sinceDate}`;
              const { repos, hasMore: more, endCursor } = await githubGraphQLService.searchReposGraphQL(query, after);
              
              for (const repo of repos) {
                if (repo.isFork || repo.isArchived) {
                  logger.info('github', `[SKIP] Archived/forked repo: ${repo.repoName}`);
                  continue;
                }

                // Check if repo was recently scanned (30 days)
                const wasRecentlyScanned = await this.wasRecentlyScanned(repo.repoUrl);
                if (wasRecentlyScanned) {
                  logger.info('github', `[SKIP] Recently scanned repo: ${repo.repoName}`);
                  continue;
                }

                // Get additional metadata if needed
                const metadata = await githubGraphQLService.getRepoMetadata(repo.repoName);
                const enrichedRepo = {
                  ...repo,
                  ...metadata,
                };

                const input: RepoScoringInput = {
                  createdAt: enrichedRepo.createdAt,
                  riskyFiles: enrichedRepo.riskyFiles,
                  contributors: enrichedRepo.contributors,
                  stars: enrichedRepo.stars,
                  hasReadme: enrichedRepo.hasReadme,
                  commitCount: enrichedRepo.commitCount,
                  isFork: enrichedRepo.isFork,
                  isArchived: enrichedRepo.isArchived,
                  language: enrichedRepo.language,
                };
                
                const { score, reasons } = scoreRepo(input);
                
                if (!enrichedRepo.hasReadme) {
                  logger.info('github', `[INFO] [GITHUB] README not found for ${enrichedRepo.repoName} — boosting score (+20)`);
                }
                
                logger.info('github', `[REPO_SCORE] ${enrichedRepo.repoName}: ${score} (${reasons.join(' + ')})`);
                
                if (score >= 60 && !this.seen.has(enrichedRepo.repoUrl)) {
                  this.seen.add(enrichedRepo.repoUrl);
                  logger.info('github', `[QUEUE] Enqueued repo: ${enrichedRepo.repoUrl} (found via ${filename} in ${language})`);
                  onDiscovered(enrichedRepo, query);
                }
              }
              
              hasMore = more;
              after = endCursor;
            }
          }
        }
        
        // Wait before next discovery cycle
        await new Promise(res => setTimeout(res, 60000)); // 1 minute
        
      } catch (err: any) {
        if (err.response && err.response.headers && err.response.headers['x-ratelimit-remaining'] === '0') {
          const reset = parseInt(err.response.headers['x-ratelimit-reset']) * 1000;
          const wait = Math.max(reset - Date.now(), 10000);
          logger.warn('github', `GitHub API rate limit hit. Backing off for ${Math.ceil(wait / 1000)}s.`);
          await new Promise(res => setTimeout(res, wait));
        } else {
          logger.error('github', `Repo discovery error: ${err.message || err}`);
          await new Promise(res => setTimeout(res, 10000));
        }
      }
    }
  }

  private async wasRecentlyScanned(repoUrl: string): Promise<boolean> {
    try {
      // Check cache first
      const cachedTimestamp = recentScanCache.get(repoUrl);
      if (cachedTimestamp) {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return cachedTimestamp > thirtyDaysAgo;
      }

      // Check database
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const existingScan = await ScanAttempt.findOne({
        repo_url: repoUrl,
        scanned_at: { $gte: thirtyDaysAgo }
      }).select('scanned_at').lean();

      if (existingScan) {
        // Cache the result
        recentScanCache.set(repoUrl, existingScan.scanned_at.getTime());
        return true;
      }

      return false;
    } catch (error) {
      logger.error('github', `Error checking recent scans for ${repoUrl}: ${error instanceof Error ? error.message : String(error)}`);
      return false; // Default to not recently scanned to avoid blocking
    }
  }
} 