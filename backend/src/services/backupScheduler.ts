import { runBackup } from '../scripts/backup-database';
import { logger } from '../utils/logger';
import { ConfigurationService } from './ConfigurationService';

const BACKUP_INTERVAL_DAYS = 7;
const BACKUP_INTERVAL_MS = BACKUP_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
const BACKUP_STATE_KEY = 'backup_state';

let backupTimer: NodeJS.Timeout | null = null;

async function getLastBackupTime(): Promise<number> {
  const state = await ConfigurationService.getConfig(BACKUP_STATE_KEY);
  return state?.lastBackupTime ?? 0;
}

async function setLastBackupTime(time: number): Promise<void> {
  await ConfigurationService.setConfig(BACKUP_STATE_KEY, { lastBackupTime: time });
}

async function scheduleNextBackup(): Promise<void> {
  if (backupTimer) {
    clearTimeout(backupTimer);
  }

  const lastBackupTime = await getLastBackupTime();
  const timeSinceLastBackup = Date.now() - lastBackupTime;
  const delay = Math.max(0, BACKUP_INTERVAL_MS - timeSinceLastBackup);

  backupTimer = setTimeout(async () => {
    try {
      await runBackup();
      await setLastBackupTime(Date.now());
      scheduleNextBackup();
    } catch (error) {
      logger.error(`[BACKUP] Scheduled backup failed, retrying in 1 hour: ${error instanceof Error ? error.message : String(error)}`);
      backupTimer = setTimeout(() => scheduleNextBackup(), 60 * 60 * 1000);
    }
  }, delay);

  const nextBackupDate = new Date(Date.now() + delay);
  logger.warn(`[BACKUP] Next backup scheduled for: ${nextBackupDate.toISOString()}`);
}

export async function startBackupScheduler(): Promise<void> {
  logger.warn(`[BACKUP] Backup scheduler started (interval: ${BACKUP_INTERVAL_DAYS} days)`);
  await scheduleNextBackup();
}

export function stopBackupScheduler(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  logger.warn('[BACKUP] Backup scheduler stopped');
}
