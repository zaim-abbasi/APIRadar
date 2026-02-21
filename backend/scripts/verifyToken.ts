import axios from 'axios';
import chalk from 'chalk';
import mongoose from 'mongoose';
import readline from 'readline';
import { GithubToken } from '../src/models/GithubToken';

const MONGODB_URI = "mongodb://localhost:27017/apiradar";

function readTokens(): Promise<string[]> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const lines: string[] = [];
    console.log(chalk.cyan('Paste token(s), then press Enter twice:\n'));
    rl.on('line', line => {
      const t = line.trim();
      if (!t && lines.length > 0) { rl.close(); return; }
      if (t) lines.push(t);
    });
    rl.on('close', () => resolve(lines));
  });
}

async function verify(token: string): Promise<'live' | 'dead' | 'exists'> {
  try {
    const [rateRes, userRes] = await Promise.all([
      axios.get('https://api.github.com/rate_limit', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        timeout: 10000,
      }),
      axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }),
    ]);

    const search = rateRes.data.resources.search;
    const core = rateRes.data.resources.core;
    console.log(chalk.green('  ✅ Live') + chalk.gray(` | ${userRes.data.login} | search: ${search.remaining}/${search.limit} | core: ${core.remaining}/${core.limit}`));

    if (await GithubToken.exists({ token })) return 'exists';
    await GithubToken.create({ token });
    return 'live';
  } catch {
    return 'dead';
  }
}

async function run() {
  const tokens = await readTokens();
  if (!tokens.length) { console.log(chalk.red('No tokens provided.')); return; }

  await mongoose.connect(MONGODB_URI);
  console.log(chalk.gray(`\nProcessing ${tokens.length} token(s)...\n`));

  let added = 0, dead = 0, dupes = 0;

  for (const token of tokens) {
    const short = token.substring(0, 12) + '...';
    process.stdout.write(chalk.gray(`${short} `));
    const result = await verify(token);
    if (result === 'live') { added++; }
    else if (result === 'exists') { dupes++; console.log(chalk.yellow('  ⚠️  Already in DB')); }
    else { dead++; console.log(chalk.red('  ❌ Expired/revoked')); }
  }

  console.log(chalk.cyan(`\n📊 ${added} added, ${dupes} duplicates, ${dead} dead\n`));
  await mongoose.connection.close();
}

run();
