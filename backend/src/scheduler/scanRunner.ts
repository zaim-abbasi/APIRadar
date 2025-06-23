import cron from 'node-cron';
import { githubService } from '../services/github';
import { truffleHogService } from '../services/trufflehog';
import { Leak } from '../models/Leak';
import { config } from '../config/environment';

export function startScanScheduler() {
  cron.schedule(`*/${config.SCAN_INTERVAL_MINUTES} * * * *`, async () => {
    console.log('Starting scheduled scan...');
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
            console.log('Saved new leak:', result.redactedKey, repo.repoUrl);
          } catch (err: any) {
            if (err.code === 11000) {
              console.log('Skipped duplicate leak:', result.redactedKey, repo.repoUrl);
            } else {
              console.error('Error saving leak:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in scheduled scan:', error);
    }
  });
} 