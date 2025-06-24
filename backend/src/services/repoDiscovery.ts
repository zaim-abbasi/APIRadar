import { githubService } from './github';
import { scoreRepo, RepoScoringInput } from '../utils/repoScoring';
import { logger } from '../utils/logger';

const DISCOVERY_QUERIES = [
  { filename: '.env', language: 'JavaScript' },
  { filename: 'docker-compose.yml', language: 'Python' },
  { filename: 'access_token', language: 'TypeScript' },
  { filename: 'secrets', language: 'YAML' },
  { filename: 'config.json', language: 'Shell' },
];

export class RepoDiscoveryService {
  private readonly seen: Set<string> = new Set();
  private running = false;

  async start(onDiscovered: (repo: any, query: string) => void) {
    if (this.running) return;
    this.running = true;
    logger.status('Repo Discovery', 'Started');
    while (true) {
      try {
        const sinceDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        for (const { filename, language } of DISCOVERY_QUERIES) {
          let page = 1;
          let hasMore = true;
          while (hasMore) {
            const query = `${filename} language:${language} created:>${sinceDate}`;
            const { repos, hasMore: more } = await githubService.searchRepos(query, page);
            for (const repo of repos) {
              if (repo.isFork || repo.isArchived) {
                logger.info('github', `[SKIP] Archived/forked repo: ${repo.repoName}`);
                continue;
              }
              const input: RepoScoringInput = {
                createdAt: repo.createdAt,
                riskyFiles: repo.riskyFiles,
                contributors: repo.contributors,
                stars: repo.stars,
                hasReadme: repo.hasReadme,
                commitCount: repo.commitCount,
                isFork: repo.isFork,
                isArchived: repo.isArchived,
                language: repo.language,
              };
              const { score, reasons } = scoreRepo(input);
              if (!repo.hasReadme) {
                logger.info('github', `[INFO] [GITHUB] README not found for ${repo.repoName} — boosting score (+20)`);
              }
              logger.info('github', `[REPO_SCORE] ${repo.repoName}: ${score} (${reasons.join(' + ')})`);
              if (score >= 60 && !this.seen.has(repo.repoUrl)) {
                this.seen.add(repo.repoUrl);
                logger.info('github', `[QUEUE] Enqueued repo: ${repo.repoUrl}`);
                onDiscovered(repo, query);
              }
            }
            hasMore = more;
            page++;
          }
        }
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
} 