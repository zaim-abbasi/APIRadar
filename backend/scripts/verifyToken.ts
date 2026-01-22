import axios from 'axios';
import chalk from 'chalk';

import mongoose from 'mongoose';
import { GithubToken } from '../src/models/GithubToken';

const MONGODB_URI = "mongodb://localhost:27017/apiradar";

async function verifyGithubToken(token: string) {
  console.log(chalk.cyan(`\n🔍 Testing token: ${token.substring(0, 10)}...`));

  let dbConnected = false;
  try {
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
  } catch (err) {
    console.log(chalk.yellow('⚠️  DB Connection failed, will perform verification only.'));
  }

  try {
    // 1. Check Rate Limit (Basic validity check)
    const rateRes = await axios.get('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json'
      },
      timeout: 10000
    });

    // 2. Check User Identity (Required for webapp display/logging)
    const userRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`
      },
      timeout: 10000
    });

    console.log(chalk.green('✅ TOKEN IS ALIVE!'));
    console.log(chalk.white(`   Owner: `) + chalk.yellow(`${userRes.data.login}`));
    console.log(chalk.white(`   Account Type: `) + chalk.yellow(`${userRes.data.type}`));
    console.log(chalk.white(`   Search Limit: `) + chalk.yellow(`${rateRes.data.resources.search.remaining}/${rateRes.data.resources.search.limit}`));
    console.log(chalk.white(`   Core Limit: `) + chalk.yellow(`${rateRes.data.resources.core.remaining}/${rateRes.data.resources.core.limit}`));

    const scopes = userRes.headers['x-oauth-scopes'] || 'no specific scopes';
    console.log(chalk.white(`   Permissions: `) + chalk.magenta(`${scopes}`));

    if (dbConnected) {
      await GithubToken.updateOne({ token }, { token }, { upsert: true });
      console.log(chalk.blue('💾 Token saved/updated in database.'));
    }

  } catch (err: any) {
    const status = err.response?.status;
    const message = err.response?.data?.message;

    if (status === 401) {
      console.log(chalk.red('❌ TOKEN IS DEAD: ') + chalk.white('Revoked or Bad Credentials (401)'));
    } else if (status === 403) {
      if (message?.toLowerCase().includes('suspended')) {
        console.log(chalk.red('❌ ACCOUNT SUSPENDED: ') + chalk.white('The account owner has been flagged by GitHub'));
      } else {
        console.log(chalk.yellow('⚠️ BLOCKED: ') + chalk.white('Token is valid but currently flat-out rate limited (403)'));
      }
    } else {
      console.log(chalk.red(`💥 ERROR (${status || 'Network'}): `) + chalk.white(message || 'Connection failed'));
    }
  } finally {
    if (dbConnected) {
      await mongoose.connection.close();
    }
  }
}

const tokenToTest = process.argv[2];

if (!tokenToTest) {
  console.log(chalk.red('Please provide a token: ') + chalk.white('npx ts-node scripts/verifyToken.ts ghp_XYZ...'));
} else {
  verifyGithubToken(tokenToTest);
}
