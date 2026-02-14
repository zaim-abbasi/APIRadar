import { connectToMongoDB, disconnectFromMongoDB } from '../config/mongo';
import { Leak } from '../models/Leak';
import { logger } from '../utils/logger';

async function migrate(): Promise<void> {
  await connectToMongoDB();

  const result = await Leak.collection.updateMany(
    { provider: 'grok' },
    { $set: { provider: 'groq' } }
  );

  logger.warn(`[MIGRATION] Renamed provider grok → groq: ${result.modifiedCount} document(s) updated`);

  await disconnectFromMongoDB();
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`[MIGRATION] Failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
