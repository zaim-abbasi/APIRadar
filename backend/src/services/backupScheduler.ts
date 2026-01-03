import { runBackup } from '../scripts/backup-database';
import { logger } from '../utils/logger';

const BACKUP_INTERVAL_DAYS = 7;
const BACKUP_INTERVAL_MS = BACKUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

let backupTimer: NodeJS.Timeout | null = null;
let lastBackupTime: number = 0;

function scheduleNextBackup(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
  }

  const timeSinceLastBackup = Date.now() - lastBackupTime;
  const delay = Math.max(0, BACKUP_INTERVAL_MS - timeSinceLastBackup);

  backupTimer = setTimeout(async () => {
    try {
      await runBackup();
      lastBackupTime = Date.now();
      scheduleNextBackup();
    } catch (error) {
      logger.error(`[BACKUP] Scheduled backup failed, retrying in 1 hour: ${error instanceof Error ? error.message : String(error)}`);
      backupTimer = setTimeout(() => scheduleNextBackup(), 60 * 60 * 1000);
    }
  }, delay);

  const nextBackupDate = new Date(Date.now() + delay);
  logger.warn(`[BACKUP] Next backup scheduled for: ${nextBackupDate.toISOString()}`);
}

export function startBackupScheduler(): void {
  logger.warn(`[BACKUP] Backup scheduler started (interval: ${BACKUP_INTERVAL_DAYS} days)`);
  scheduleNextBackup();
}

export function stopBackupScheduler(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  logger.warn('[BACKUP] Backup scheduler stopped');
}

