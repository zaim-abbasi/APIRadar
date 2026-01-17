import { runBackup } from '../scripts/backup-database';
import { logger } from '../utils/logger';

const BACKUP_HOUR_UTC = 8;

let backupTimer: NodeJS.Timeout | null = null;
let isBackupRunning = false;

async function scheduleNextBackup(): Promise<void> {
  if (backupTimer) clearTimeout(backupTimer);

  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const currentHour = now.getUTCHours();

  let daysUntilSunday = (7 - dayOfWeek) % 7;
  if (dayOfWeek === 0 && currentHour >= BACKUP_HOUR_UTC) {
    daysUntilSunday = 7;
  }

  const targetDate = new Date(now);
  targetDate.setUTCDate(targetDate.getUTCDate() + daysUntilSunday);
  targetDate.setUTCHours(BACKUP_HOUR_UTC, 0, 0, 0);

  const delay = targetDate.getTime() - Date.now();

  backupTimer = setTimeout(async () => {
    if (isBackupRunning) {
      logger.warn('[BACKUP] Backup in progress, skipping task and rescheduling');
      return scheduleNextBackup();
    }

    try {
      isBackupRunning = true;
      await runBackup();
    } catch (error) {
      logger.error(`[BACKUP] Backup task failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isBackupRunning = false;
      await scheduleNextBackup();
    }
  }, delay);

  const scheduledTime = new Date(Date.now() + delay);
  logger.warn(`[BACKUP] Next backup scheduled for: ${scheduledTime.toISOString()}`);
}

export async function startBackupScheduler(): Promise<void> {
  logger.warn(`[BACKUP] Backup scheduler active (Every Sunday at ${BACKUP_HOUR_UTC}:00 UTC)`);
  await scheduleNextBackup();
}

export function stopBackupScheduler(): void {
  if (backupTimer) {
    clearTimeout(backupTimer);
    backupTimer = null;
  }
  isBackupRunning = false;
  logger.warn('[BACKUP] Backup scheduler stopped');
}
