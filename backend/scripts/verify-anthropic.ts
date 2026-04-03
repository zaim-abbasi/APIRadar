import axios from 'axios';
import chalk from 'chalk';
import { connectToMongoDB, disconnectFromMongoDB } from '../src/config/mongo';
import { Secret } from '../src/models/Secret';
import { decrypt, getEncryptionKey } from '../src/utils/encryption';

async function verifyKey(id: string, key: string, current: number, total: number) {
  const prefix = `[${current}/${total}] ID: ${id}`;
  const headers = {
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  };

  try {
    // STEP 1: DYNAMIC DISCOVERY (The Identity Check)
    const modelsResponse = await axios.get('https://api.anthropic.com/v1/models', {
      headers,
      timeout: 10000
    });

    const availableModels: { id: string }[] = modelsResponse.data.data;
    if (!availableModels || availableModels.length === 0) {
      console.log(chalk.red(`${prefix} -> DEAD (No models found)`));
      return;
    }

    console.log(chalk.green(`${prefix} -> LIVE (Authenticated, ${availableModels.length} models)`));

    // STEP 2: TEST THE STRONGEST MODEL (The Capacity Test)
    const topModel = availableModels.find(m => m.id.includes('opus'))?.id ||
      availableModels.find(m => m.id.includes('sonnet'))?.id ||
      (availableModels[0] ? availableModels[0].id : undefined);

    if (!topModel) {
      console.log(chalk.red(`${prefix} -> ERROR (Could not determine top model)`));
      return;
    }

    try {
      await axios.post('https://api.anthropic.com/v1/messages', {
        model: topModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'hi' }],
      }, {
        headers,
        timeout: 10000
      });

      console.log(chalk.cyan(`   -> USABLE! Verified on ${topModel}`));
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 429) {
        console.log(chalk.yellow(`   -> RATE LIMITED (Credits likely exist)`));
      } else if (status === 400 && error.response?.data?.error?.type === 'invalid_request_error') {
        console.log(chalk.red(`   -> NO CREDITS (Free shell/Empty)`));
      } else {
        console.log(chalk.gray(`   -> CAPACITY TEST FAILED (${status || 'Network Error'})`));
      }
    }
  } catch (error: any) {
    const status = error.response?.status;
    if (status === 401) {
      console.log(chalk.red(`${prefix} -> DEAD (401)`));
    } else if (status === 429) {
      console.log(chalk.yellow(`${prefix} -> RATE LIMITED (Discovery prevented)`));
    } else {
      console.log(chalk.gray(`${prefix} -> ERROR (${status || error.message})`));
    }
  }
}

async function run() {
  try {
    await connectToMongoDB();

    const secrets = await Secret.find({ provider: 'anthropic' });
    const total = secrets.length;
    console.log(chalk.blue(`\n🚀 Starting tactical probe for ${total} deduplicated Anthropic keys...\n`));

    const CONCURRENCY = 15;
    let index = 0;
    const AES_KEY = getEncryptionKey();

    const next = async (): Promise<void> => {
      if (index >= total) return;
      const i = index++;
      const secret = secrets[i];
      if (secret?.encryptedKey) {
        const fullKey = decrypt(secret.encryptedKey, AES_KEY);
        await verifyKey(secret.id, fullKey, i + 1, total);
      }
      return next();
    };

    const workers = Array(CONCURRENCY).fill(null).map(() => next());
    await Promise.all(workers);

    console.log(chalk.green(`\n✅ Tactical probe complete.`));
  } catch (err) {
    console.error(chalk.red('\n❌ Script Error:'), err);
  } finally {
    await disconnectFromMongoDB();
  }
}

run().catch((err) => {
  console.error(chalk.red('Fatal Error:'), err);
  process.exit(1);
});
