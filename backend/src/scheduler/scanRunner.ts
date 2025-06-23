import cron from 'node-cron';
import { githubService } from '../services/github';
import { truffleHogService } from '../services/trufflehog';
import { Leak } from '../models/Leak';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

export function startScanScheduler() {
  cron.schedule(`*/${config.SCAN_INTERVAL_MINUTES} * * * *`, async () => {
    logger.info('farm', '🚀 Scheduled scan started');
    try {
      const repos = await githubService.getRecentlyUpdatedRepos(config.MAX_REPOS_PER_SCAN);
      for (const repo of repos) {
        const scan = await truffleHogService.scanRepository(repo.repoUrl);
        if (scan.results.length === 0) continue;
        for (const result of scan.results) {
          try {
            await Leak.create({
              redactedKey: result.redactedKey,
              provider: result.provider,
              repoName: repo.repoName,
              repoUrl: repo.repoUrl,
              authorName: repo.authorName,
              authorUrl: repo.authorUrl,
              timestamp: new Date(),
              filePath: result.filePath,
              commitHash: result.commitHash,
            });
            logger.info('leak', `💧 Leak saved: ${result.redactedKey} in ${repo.repoUrl}`);
          } catch (err: any) {
            if (err.code === 11000) {
              logger.warn('leak', `Duplicate leak skipped: ${result.redactedKey} in ${repo.repoUrl}`);
            } else {
              logger.error('leak', `Error saving leak: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      }
    } catch (error) {
      logger.error('farm', `Error in scheduled scan: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
} 