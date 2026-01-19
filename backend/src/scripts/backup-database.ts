import { existsSync, mkdirSync, readdirSync, statSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { spawn } from 'child_process';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

const BACKUP_DIR = resolve(process.cwd(), 'db_backup');
const BACKUP_RETENTION = 2;
const DUMP_BINARY = process.env['MONGODUMP_PATH'] || 'mongodump';
const BACKUP_PREFIX = 'api-radar_backup';

function getDatabaseName(uri: string): string {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match?.[1] ?? 'test';
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function runMongodump(archivePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dump = spawn(DUMP_BINARY, [
      `--uri=${config.MONGODB_URI}`,
      `--archive=${archivePath}`,
      '--gzip',
    ]);

    let stderr = '';

    dump.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    dump.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(new Error(`mongodump not found. Install MongoDB Database Tools or set MONGODUMP_PATH.`));
        return;
      }
      reject(error);
    });

    dump.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mongodump exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`));
      }
    });
  });
}

async function createBackup(): Promise<{ path: string; sizeMB: string; dbName: string }> {
  const dbName = getDatabaseName(config.MONGODB_URI);
  const dateStr = formatDate(new Date());
  const backupName = `${BACKUP_PREFIX}_${dateStr}`;
  const archiveFile = join(BACKUP_DIR, `${backupName}.gz`);

  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  try {
    if (existsSync(archiveFile)) {
      rmSync(archiveFile, { force: true });
    }

    await runMongodump(archiveFile);

    const stats = statSync(archiveFile);
    if (stats.size === 0) {
      throw new Error('Backup file is empty');
    }

    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    return { path: archiveFile, sizeMB, dbName };
  } catch (error) {
    if (existsSync(archiveFile)) {
      rmSync(archiveFile, { force: true });
    }
    throw error;
  }
}

function cleanupOldBackups(): void {
  if (!existsSync(BACKUP_DIR)) return;

  const backupPattern = new RegExp(`^${BACKUP_PREFIX}_\\d{4}-\\d{2}-\\d{2}\\.gz$`);

  const backups = readdirSync(BACKUP_DIR)
    .filter(file => backupPattern.test(file))
    .map(file => ({
      name: file,
      path: join(BACKUP_DIR, file),
      mtime: statSync(join(BACKUP_DIR, file)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (backups.length > BACKUP_RETENTION) {
    backups.slice(BACKUP_RETENTION).forEach(backup => {
      rmSync(backup.path, { force: true });
      logger.warn(`[BACKUP] Deleted old backup: ${backup.name}`);
    });
  }
}

async function runBackup(): Promise<void> {
  try {
    const { path, sizeMB, dbName } = await createBackup();
    const filename = path.split(/[/\\]/).pop();
    logger.warn(`[BACKUP] Success: ${filename} | Size: ${sizeMB}MB | Database: ${dbName}`);
    cleanupOldBackups();
  } catch (error) {
    logger.error(`[BACKUP] Failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

if (require.main === module) {
  process.on('unhandledRejection', (err) => {
    logger.error(`[BACKUP] Unhandled rejection: ${err}`);
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.error(`[BACKUP] Uncaught exception: ${err.message}`);
    process.exit(1);
  });

  runBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runBackup, BACKUP_DIR, BACKUP_RETENTION };
