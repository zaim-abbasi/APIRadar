import mongoose from 'mongoose';
import { existsSync, mkdirSync, readdirSync, statSync, rmSync, createWriteStream, writeFileSync } from 'fs';
import { join } from 'path';
import archiver from 'archiver';
import { config } from '../config/environment';
import { connectToMongoDB, disconnectFromMongoDB } from '../config/mongo';
import { logger } from '../utils/logger';
import { Configuration } from '../models/Configuration';
import { Leak } from '../models/Leak';
import { ScanAttempt } from '../models/ScanAttempt';

const BACKUP_DIR = join(process.cwd(), 'db_backup');
const BACKUP_RETENTION = 2;

function getDatabaseName(uri: string): string {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'test';
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function exportCollection(collectionName: string, model: mongoose.Model<any>, backupDir: string): Promise<number> {
  const documents = await model.find({}).lean();
  const filePath = join(backupDir, `${collectionName}.json`);
  writeFileSync(filePath, JSON.stringify(documents, null, 2), 'utf8');
  return documents.length;
}

async function createBackup(): Promise<string> {
  const dbName = getDatabaseName(config.MONGODB_URI);
  const dateStr = formatDate(new Date());
  const backupName = `${dbName}_${dateStr}`;
  const tempBackupDir = join(BACKUP_DIR, backupName);
  const compressedFile = join(BACKUP_DIR, `${backupName}.tar.gz`);

  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  if (existsSync(tempBackupDir)) {
    rmSync(tempBackupDir, { recursive: true, force: true });
  }
  mkdirSync(tempBackupDir, { recursive: true });

  logger.warn(`[BACKUP] Starting backup for database: ${dbName}`);

  try {
    const configCount = await exportCollection('configurations', Configuration, tempBackupDir);
    logger.warn(`[BACKUP] Exported ${configCount} configurations`);

    const leakCount = await exportCollection('leaks', Leak, tempBackupDir);
    logger.warn(`[BACKUP] Exported ${leakCount} leaks`);

    const scanAttemptCount = await exportCollection('scanattempts', ScanAttempt, tempBackupDir);
    logger.warn(`[BACKUP] Exported ${scanAttemptCount} scan attempts`);

    const collections = ['configurations', 'leaks', 'scanattempts'];
    const archive = archiver('tar', { gzip: true });
    const output = createWriteStream(compressedFile);
    
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      archive.on('error', reject);
      archive.pipe(output);
      
      collections.forEach(collection => {
        const filePath = join(tempBackupDir, `${collection}.json`);
        if (existsSync(filePath)) {
          archive.file(filePath, { name: `${collection}.json` });
        }
      });
      
      archive.finalize();
    });
    logger.warn(`[BACKUP] Backup compressed: ${compressedFile}`);

    rmSync(tempBackupDir, { recursive: true, force: true });
    logger.warn(`[BACKUP] Cleaned up temporary backup files`);

    const stats = statSync(compressedFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    logger.warn(`[BACKUP] Backup completed: ${compressedFile} (${sizeMB} MB)`);

    return compressedFile;
  } catch (error) {
    if (existsSync(tempBackupDir)) {
      rmSync(tempBackupDir, { recursive: true, force: true });
    }
    if (existsSync(compressedFile)) {
      rmSync(compressedFile, { force: true });
    }
    throw error;
  }
}

function cleanupOldBackups(): void {
  if (!existsSync(BACKUP_DIR)) {
    return;
  }

  const dbName = getDatabaseName(config.MONGODB_URI);
  const backupPattern = new RegExp(`^${dbName}_\\d{4}-\\d{2}-\\d{2}\\.tar\\.gz$`);
  
  const backups = readdirSync(BACKUP_DIR)
    .filter(file => backupPattern.test(file))
    .map(file => ({
      name: file,
      path: join(BACKUP_DIR, file),
      mtime: statSync(join(BACKUP_DIR, file)).mtime
    }))
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (backups.length > BACKUP_RETENTION) {
    const toDelete = backups.slice(BACKUP_RETENTION);
    toDelete.forEach(backup => {
      rmSync(backup.path, { force: true });
      logger.warn(`[BACKUP] Deleted old backup: ${backup.name}`);
    });
  }
}

async function runBackup(): Promise<void> {
  let isConnected = false;
  try {
    logger.warn('[BACKUP] Starting scheduled database backup');
    
    if (mongoose.connection.readyState !== 1) {
      await connectToMongoDB();
      isConnected = true;
    }

    await createBackup();
    cleanupOldBackups();
    logger.warn('[BACKUP] Backup process completed successfully');
  } catch (error) {
    logger.error(`[BACKUP] Backup failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  } finally {
    if (isConnected) {
      await disconnectFromMongoDB();
    }
  }
}

if (require.main === module) {
  runBackup()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { runBackup, BACKUP_DIR, BACKUP_RETENTION };
