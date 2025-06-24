import { RepoDiscoveryService } from '../services/repoDiscovery';
import { truffleHogService } from '../services/trufflehog';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { logger } from '../utils/logger';

const WORKER_COUNT = 5;
const scanQueue: { repo: any, query: string }[] = [];

export async function startScanScheduler() {
  const discoveryService = new RepoDiscoveryService();
  discoveryService.start((repo, query) => {
    scanQueue.push({ repo, query });
    logger.info('github', `[QUEUE] Enqueued repo: ${repo.repoUrl}`);
  });

  for (let i = 0; i < WORKER_COUNT; i++) {
    scanWorker();
  }
  
  logger.status('Leak Farm', 'Started', `${WORKER_COUNT} workers active`);
}

async function scanWorker() {
  while (true) {
    const next = scanQueue.shift();
    if (!next) {
      await new Promise(res => setTimeout(res, 1000));
      continue;
    }
    const { repo, query } = next;
    logger.info('farm', `[SCAN] Scanning started: ${repo.repoUrl}`);
    let scanResult;
    let errorMessage = '';
    let status: 'success' | 'error' = 'success';
    try {
      scanResult = await truffleHogService.scanRepository(repo.repoUrl);
      if (!scanResult || scanResult.error) {
        errorMessage = scanResult?.error || 'Unknown scan error';
        status = 'error';
        logger.error('farm', `[RESULT] Scan error: ${repo.repoUrl} → ${errorMessage}`);
      } else if (scanResult.results.length === 0) {
        logger.info('farm', `[RESULT] No leaks found`);
      } else {
        const leakTypes = Array.from(new Set(scanResult.results.map(r => r.provider)));
        logger.info('farm', `[RESULT] Leak found: ${repo.repoUrl} → ${leakTypes.join(', ')}`);
        for (const result of scanResult.results) {
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
          } catch (err: any) {
            if (err.code === 11000) {
              logger.warn('leak', `Duplicate leak skipped: ${result.redactedKey} in ${repo.repoUrl}`);
            } else {
              logger.error('leak', `Error saving leak: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
        }
      }
      // Store scan attempt
      await ScanAttempt.create({
        repo_url: repo.repoUrl,
        full_name: repo.repoName,
        scanned_at: new Date(),
        leak_found: scanResult && scanResult.results.length > 0,
        leak_types: scanResult && scanResult.results.length > 0 ? Array.from(new Set(scanResult.results.map(r => r.provider))) : [],
        query_used: query,
        trufflehog_output: scanResult,
        status,
        error_message: errorMessage || undefined,
      });
      logger.info('farm', `[STORE] Scan saved to DB: scan_attempts`);
    } catch (error: any) {
      logger.error('farm', `[RESULT] Scan error: ${repo.repoUrl} → ${error.message}`);
      try {
        await ScanAttempt.create({
          repo_url: repo.repoUrl,
          full_name: repo.repoName,
          scanned_at: new Date(),
          leak_found: false,
          leak_types: [],
          query_used: query,
          trufflehog_output: null,
          status: 'error',
          error_message: error.message,
        });
        logger.info('farm', `[STORE] Scan saved to DB: scan_attempts`);
      } catch {}
    }
  }
} 