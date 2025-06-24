import { RepoDiscoveryService } from '../services/repoDiscovery';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';
import { logger } from '../utils/logger';

// const WORKER_COUNT = 5;
const scanQueue: { repo: any, query: string }[] = [];

export async function startScanScheduler() {
  const discoveryService = new RepoDiscoveryService();
  discoveryService.start((repo, query) => {
    scanQueue.push({ repo, query });
    logger.info('github', `[QUEUE] Enqueued repo: ${repo.repoUrl}`);
  });

  // Only start a single worker
  scanWorker();
  
  logger.status('Leak Farm', 'Started', `1 worker active`);
}

async function scanWorker() {
  while (true) {
    const next = scanQueue.shift();
    if (!next) {
      await new Promise(res => setTimeout(res, 1000));
      continue;
    }
    const { repo, query } = next;
    
    // Additional duplicate check before scanning
    const wasRecentlyScanned = await checkRecentScan(repo.repoUrl);
    if (wasRecentlyScanned) {
      logger.info('farm', `[SKIP] Recently scanned repo: ${repo.repoUrl}`);
      continue;
    }
    
    logger.info('farm', `[SCAN] Scanning started: ${repo.repoUrl}`);
    let scanResult;
    let errorMessage = '';
    let status: 'success' | 'error' = 'success';
    
    try {
      // TODO: Integrate streaming-based detection system here
      // scanResult = await streamingDetectionService.scanRepository(repo.repoUrl);
      // For now, set scanResult to a placeholder
      scanResult = { results: [] as any[] };
      if (!scanResult || scanResult.results.length === 0) {
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
          status: 'error',
          error_message: error.message,
        });
        logger.info('farm', `[STORE] Scan saved to DB: scan_attempts`);
      } catch (dbError) {
        logger.error('farm', `[DB_ERROR] Failed to save scan attempt: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
      }
    }
  }
}

async function checkRecentScan(repoUrl: string): Promise<boolean> {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const existingScan = await ScanAttempt.findOne({
      repo_url: repoUrl,
      scanned_at: { $gte: thirtyDaysAgo }
    }).select('scanned_at').lean();

    return !!existingScan;
  } catch (error) {
    logger.error('farm', `Error checking recent scan for ${repoUrl}: ${error instanceof Error ? error.message : String(error)}`);
    return false; // Default to not recently scanned to avoid blocking
  }
} 