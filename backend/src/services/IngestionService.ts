import crypto from 'crypto';
import { Leak, ILeak } from '../models/Leak';
import { Secret } from '../models/Secret';
import { getEncryptionKey, encrypt } from '../utils/encryption';
import { logger } from '../utils/logger';

export interface RawLeakFinding extends Partial<ILeak> {
  fullKey?: string;
  redactedKey?: string;
  verification_status?: string;
}

export class IngestionService {
  public async processLeaks(leaks: RawLeakFinding[]): Promise<void> {
    if (!leaks.length) return;

    const AES_KEY = getEncryptionKey();

    for (const leak of leaks) {
      if (!leak.fullKey) continue;

      try {
        const keyHash = crypto.createHash('sha256').update(leak.fullKey).digest('hex');

        const secretDoc = await Secret.findOneAndUpdate(
          { keyHash },
          {
            $setOnInsert: {
              encryptedKey: encrypt(leak.fullKey, AES_KEY),
              provider: leak.provider,
              status: leak.verification_status || 'pending',
            }
          },
          { upsert: true, new: true }
        ).select('_id').lean();

        if (!secretDoc || !secretDoc._id) {
          throw new Error(`Failed to secure Secret mapping for: ${leak.redactedKey}`);
        }

        const safeLeakData = { ...leak };
        delete safeLeakData.fullKey;
        delete safeLeakData.redactedKey;

        await Leak.updateOne(
          { repoUrl: leak.repoUrl, secretId: secretDoc._id, filePath: leak.filePath },
          {
            $setOnInsert: {
              ...safeLeakData,
              secretId: secretDoc._id,
              leakDetectedAt: new Date()
            }
          },
          { upsert: true }
        );

      } catch (error) {
        if ((error as any).code === 11000) {
          logger.warn(`[INGESTION] Expected duplicate leak record bypassed: ${(error as any).message}`);
        } else {
          logger.error(`[INGESTION] Failed to process leak ${leak.redactedKey}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }
}

export const ingestionService = new IngestionService();
