process.removeAllListeners('warning');
import mongoose from 'mongoose';
import chalk from 'chalk';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';
import { Keypair } from '@solana/web3.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
const bs58 = require('bs58');
const ed25519 = require('ed25519-hd-key');
const crypto = require('crypto');

function getHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

const MONGODB_URI = "mongodb://localhost:27017/apiradar";
const ANKR_RPC = 'https://rpc.ankr.com/multichain/41d9609ae145f55dfb5916d425da95f64998d13d1973440a73fa20a6325888d3';
const ACCOUNTS_TO_SCAN = 10;
const CONCURRENCY = 5;

const ANKR_CHAINS = ['eth', 'bsc', 'polygon', 'arbitrum', 'base', 'avalanche', 'optimism'];

function isTestMnemonic(phrase: string): boolean {
  const words = phrase.split(/\s+/);
  return new Set(words).size < 4;
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const bip32 = BIP32Factory(ecc);


function isSpam(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('visit') || n.includes('claim') || n.includes('airdrop');
}


// Optimized HTTP Client with Keep-Alive
const httpsAgent = new (require('https').Agent)({ keepAlive: true, scheduling: 'lifo', maxSockets: 25, maxFreeSockets: 10, timeout: 30000 });
const httpClient = axios.create({
  timeout: 20000,
  httpAgent: httpsAgent,
  httpsAgent: httpsAgent,
  headers: { 'Connection': 'keep-alive' }
});



async function fetchWithRetry(url: string, payload: any = null, method: 'get' | 'post' = 'get', retries = 5): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      // Jitter: Add random delay (0-500ms) to prevent thundering herd
      if (i > 0) await sleep(Math.random() * 500 + (1000 * Math.pow(2, i)));

      const res = method === 'get'
        ? await httpClient.get(url)
        : await httpClient.post(url, payload);
      return res.data;
    } catch (e: any) {
      const isRateLimit = e.response?.status === 429;
      const isTimeout = e.code === 'ECONNABORTED' || e.message?.includes('timeout') || e.code === 'ETIMEDOUT';
      const isNetworkError = e.code === 'ECONNRESET' || e.message?.includes('socket hang up') || e.code === 'EAI_AGAIN';

      if ((isRateLimit || isTimeout || isNetworkError) && i < retries - 1) {
        // If rate limited, wait longer (exponential backoff)
        const delay = isRateLimit ? 2000 * Math.pow(2, i) : 1000;
        await sleep(delay);
        continue;
      }
      throw e;
    }
  }
}

async function safeAnkrCall(body: any): Promise<any> {
  return fetchWithRetry(ANKR_RPC, body, 'post');
}

const priceCache: Record<string, { price: number; ts: number }> = {};
const PRICE_TTL = 60_000;

async function getCachedPrice(id: string, fetcher: () => Promise<number>): Promise<number> {
  const cached = priceCache[id];
  if (cached && Date.now() - cached.ts < PRICE_TTL) return cached.price;
  try {
    const price = await fetcher();
    priceCache[id] = { price, ts: Date.now() };
    return price;
  } catch { return 0; }
}

async function getBtcPrice(): Promise<number> {
  return getCachedPrice('btc', async () => {
    const data = await fetchWithRetry('https://mempool.space/api/v1/prices');
    return data.USD;
  });
}


async function checkAllBitcoin(seed: Uint8Array, count: number) {
  const root = bip32.fromSeed(seed);
  const results: { idx: number; address: string; balance: number; usd: number; type: string }[] = [];

  const types = [
    { name: 'SegWit', path: "m/84'/0'/0'/0/", format: 'p2wpkh' },
    { name: 'Nested', path: "m/49'/0'/0'/0/", format: 'p2sh' },
    { name: 'Legacy', path: "m/44'/0'/0'/0/", format: 'p2pkh' }
  ];

  for (const type of types) {
    const initialBatch = Math.min(2, count);
    const addresses: { idx: number; address: string }[] = [];
    for (let i = 0; i < initialBatch; i++) {
      const child = root.derivePath(`${type.path}${i}`);
      let address: string | undefined;
      if (type.format === 'p2wpkh') address = bitcoin.payments.p2wpkh({ pubkey: child.publicKey }).address;
      else if (type.format === 'p2sh') address = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wpkh({ pubkey: child.publicKey }) }).address;
      else address = bitcoin.payments.p2pkh({ pubkey: child.publicKey }).address;
      if (address) addresses.push({ idx: i, address });
    }

    const checkBtcAddr = async (item: { idx: number; address: string }) => {
      try {
        const data = await fetchWithRetry(`https://mempool.space/api/address/${item.address}`);
        const satoshis = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) +
          (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum);
        if (satoshis > 0) {
          const btc = satoshis / 100000000;
          const price = await getBtcPrice();
          return { idx: item.idx, address: item.address, balance: btc, usd: btc * price, type: type.name };
        }
      } catch (e: any) {
        if (e?.response?.status !== 429 && !e?.message?.includes('timeout')) {
          console.log(chalk.gray(`      [BTC:${type.name}] Error: ${e?.message?.slice(0, 50) || 'unknown'}`));
        }
      }
      return null;
    };

    const initialResults = await Promise.all(addresses.map(checkBtcAddr));
    let foundInInitial = false;
    for (const r of initialResults) {
      if (r) { results.push(r); foundInInitial = true; }
    }

    if (foundInInitial && count > initialBatch) {
      const extraAddresses: { idx: number; address: string }[] = [];
      for (let i = initialBatch; i < count; i++) {
        const child = root.derivePath(`${type.path}${i}`);
        let address: string | undefined;
        if (type.format === 'p2wpkh') address = bitcoin.payments.p2wpkh({ pubkey: child.publicKey }).address;
        else if (type.format === 'p2sh') address = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wpkh({ pubkey: child.publicKey }) }).address;
        else address = bitcoin.payments.p2pkh({ pubkey: child.publicKey }).address;
        if (address) extraAddresses.push({ idx: i, address });
      }
      const extraResults = await Promise.all(extraAddresses.map(checkBtcAddr));
      for (const r of extraResults) { if (r) results.push(r); }
    }
  }
  return results;
}

function deriveSolanaAddresses(seed: Uint8Array, count: number): string[] {
  const results: string[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const derived = ed25519.derivePath(`m/44'/501'/${i}'/0'`, Buffer.from(seed).toString('hex'));
      if (!derived?.key) continue;
      const keypair = Keypair.fromSeed(Uint8Array.from(derived.key).slice(0, 32));
      results.push(keypair.publicKey.toBase58());
    } catch { }
  }
  return results;
}

async function checkAllSolana(seed: Uint8Array, count: number) {
  const addresses = deriveSolanaAddresses(seed, count);
  if (addresses.length === 0) return [];

  const results: { idx: number; address: string; assets: { symbol: string; balance: string; usd: number }[] }[] = [];
  let scanDepth = 2;

  const checkSolAddr = async (i: number) => {
    try {
      const body = { jsonrpc: '2.0', id: 1, method: 'ankr_getAccountBalance', params: { walletAddress: addresses[i], blockchain: ['solana'] } };
      const data = await safeAnkrCall(body);
      const assets = (data.result?.assets || [])
        .filter((a: any) => Number(a.balanceUsd) > 0.01 && !isSpam(a.tokenName || ''))
        .map((a: any) => ({ symbol: a.tokenSymbol, balance: Number(a.balance).toFixed(4), usd: Number(a.balanceUsd) }));
      if (assets.length > 0) return { idx: i, address: addresses[i]!, assets };
    } catch (e: any) {
      if (!e?.message?.includes('timeout')) {
        console.log(chalk.gray(`      [SOL] Error: ${e?.message?.slice(0, 50) || 'unknown'}`));
      }
    }
    return null;
  };

  const initialIndices = Array.from({ length: Math.min(scanDepth, addresses.length) }, (_, i) => i);
  const initialResults = await Promise.all(initialIndices.map(checkSolAddr));
  let foundInInitial = false;
  for (const r of initialResults) {
    if (r) { results.push(r); foundInInitial = true; }
  }

  if (foundInInitial && addresses.length > scanDepth) {
    const extraIndices = Array.from({ length: addresses.length - scanDepth }, (_, i) => i + scanDepth);
    const extraResults = await Promise.all(extraIndices.map(checkSolAddr));
    for (const r of extraResults) { if (r) results.push(r); }
  }

  return results;
}

async function checkEvm(address: string) {
  try {
    const data = await safeAnkrCall({
      jsonrpc: '2.0', id: 1, method: 'ankr_getAccountBalance',
      params: { walletAddress: address, blockchain: ANKR_CHAINS }
    });

    const assets = (data.result?.assets || []).filter((a: any) => Number(a.balanceUsd) > 0.01 && !isSpam(a.tokenName || ''));
    if (assets.length === 0) return [];

    const grouped: Record<string, { chain: string; assets: { symbol: string; balance: string; usd: number }[] }> = {};
    for (const a of assets) {
      const chain = a.blockchain || 'unknown';
      if (!grouped[chain]) grouped[chain] = { chain, assets: [] };
      grouped[chain]!.assets.push({
        symbol: a.tokenSymbol,
        balance: Number(a.balance).toFixed(4),
        usd: Number(a.balanceUsd)
      });
    }
    return Object.values(grouped);
  } catch (e: any) {
    console.log(chalk.gray(`      [EVM] Error: ${e?.message?.slice(0, 50) || 'unknown'}`));
    return [];
  }
}

function deriveTronAddress(seed: Uint8Array, index: number): string {
  try {
    const root = bip32.fromSeed(seed);
    const child = root.derivePath(`m/44'/195'/0'/0/${index}`);
    const pubKey = ecc.pointFromScalar(child.privateKey!, false)!.slice(1);
    const hash = ethers.keccak256(pubKey).replace('0x', '');
    const addressHex = '41' + hash.substring(hash.length - 40);
    const { createHash } = require('crypto');
    const sha256 = (b: Buffer) => createHash('sha256').update(b).digest();
    const firstSha = sha256(Buffer.from(addressHex, 'hex'));
    const secondSha = sha256(firstSha);
    const checksum = secondSha.subarray(0, 4).toString('hex');
    return bs58.encode(new Uint8Array(Buffer.from(addressHex + checksum, 'hex')));
  } catch { return ''; }
}

async function checkTron(address: string) {
  if (!address) return null;
  try {
    const { data } = await fetchWithRetry(`https://api.trongrid.io/v1/accounts/${address}`);
    const account = data.data?.[0];
    if (!account) return null;

    const assets: { symbol: string; balance: string; usd: number }[] = [];
    const trx = (account.balance || 0) / 1_000_000;
    const trxPrice = await getCachedPrice('trx', async () => {
      const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd', { timeout: 5000 });
      return res.data.tron?.usd || 0.25;
    });
    if (trx > 0.01) assets.push({ symbol: 'TRX', balance: trx.toFixed(4), usd: trx * trxPrice });

    for (const tokenMap of (account.trc20 || [])) {
      for (const [contract, rawAmount] of Object.entries(tokenMap)) {
        const bal = Number(rawAmount) / 1_000_000;
        if (bal > 0.1) {
          let symbol = 'TRC20';
          if (contract === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t') symbol = 'USDT';
          else if (contract === 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8') symbol = 'USDC';
          else symbol = contract.slice(0, 6) + '...';
          assets.push({ symbol, balance: bal.toFixed(2), usd: bal });
        }
      }
    }

    return assets.length > 0 ? { address, assets } : null;
  } catch { return null; }
}

async function run() {
  const startTime = Date.now();
  console.log(chalk.cyan('\n🚀 APIRadar: GOD MODE (BTC + SOL + EVM + TRON Scanner'));
  console.log(chalk.gray('   Chains: Bitcoin · Solana · Ethereum · BSC · Polygon · Base · Arbitrum · Avalanche · Optimism · Tron'));
  console.log(chalk.gray(`   Accounts per seed: ${ACCOUNTS_TO_SCAN}\n`));

  const RESULT_FILE = path.join(__dirname, 'scan-results.json');
  const scannedHashes = new Set<string>();
  let prevResults: any[] = [];
  let prevHits: any[] = [];

  if (fs.existsSync(RESULT_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(RESULT_FILE, 'utf8'));
      if (Array.isArray(data.results)) {
        prevResults = data.results;
        prevHits = data.results.filter((r: any) => r.totalUsd > 0);
        data.results.forEach((r: any) => {
          if (r.id) scannedHashes.add(r.id);
        });
        console.log(chalk.yellow(`   📝 Resuming: Loaded ${data.results.length} previously scanned seeds`));
      }
    } catch {
      console.log(chalk.red(`   ⚠️  Corrupt scan-results.json found, starting fresh backup...`));
    }
  }

  await mongoose.connect(MONGODB_URI);
  console.log(chalk.green('✅ Database connected'));

  const leaks = await mongoose.connection.db!.collection('leaks').find({ provider: 'bip39_seed_phrase' }).toArray();

  const seenPhrases = new Map<string, number>();
  const uniqueLeaks: typeof leaks = [];
  let dupeCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < leaks.length; i++) {
    const phrase = String(leaks[i]!['fullKey'] || '').trim();
    if (!bip39.validateMnemonic(phrase)) continue;
    if (isTestMnemonic(phrase)) continue;

    if (seenPhrases.has(phrase)) {
      dupeCount++;
      continue;
    }
    seenPhrases.set(phrase, i);

    const hash = getHash(phrase);
    if (scannedHashes.has(hash)) {
      skippedCount++;
      continue;
    }
    uniqueLeaks.push(leaks[i]!);
  }

  console.log(chalk.white(`   ${leaks.length} seeds found, ${uniqueLeaks.length} new to scan`));
  if (dupeCount > 0) console.log(chalk.gray(`   ${dupeCount} duplicates skipped`));
  if (skippedCount > 0) console.log(chalk.gray(`   ${skippedCount} already scanned (skipped)`));
  console.log('');

  const hits: { seed: number; repo: string; file: string; findings: string[]; totalUsd: number }[] = [];
  const jsonResults: any[] = [...prevResults];
  const seedTimings: number[] = [];

  // Simple atomic save
  function saveProgress() {
    const tmpFile = RESULT_FILE + '.tmp';
    const finalData = {
      scannedAt: new Date().toISOString(),
      totalScanned: scannedHashes.size + jsonResults.length - prevResults.length, // correct total
      funded: prevHits.length + hits.length,
      results: jsonResults
    };
    fs.writeFileSync(tmpFile, JSON.stringify(finalData, null, 2));
    fs.renameSync(tmpFile, RESULT_FILE);
  }

  async function processSeed(i: number) {
    const seedStart = Date.now();
    const leak = uniqueLeaks[i]!;
    const phrase = String(leak['fullKey'] || '').trim();
    const repo = String(leak['repoUrl'] || '').replace('https://github.com/', '');
    const file = String(leak['filePath'] || '');
    const hash = getHash(phrase);

    const findings: string[] = [];
    let seedTotalUsd = 0;
    const seedJson: any = { id: hash };

    const seedBuf = Uint8Array.from(await bip39.mnemonicToSeed(phrase));

    const [btcResults, solResults, evmInitial, tron] = await Promise.all([
      checkAllBitcoin(seedBuf, ACCOUNTS_TO_SCAN),
      checkAllSolana(seedBuf, ACCOUNTS_TO_SCAN),
      (async () => {
        const mnemonic = ethers.Mnemonic.fromPhrase(phrase);
        const initialDepth = 2;
        const initialWallets = Array.from({ length: initialDepth }, (_, idx) =>
          ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${idx}`)
        );
        const initialResults = await Promise.all(initialWallets.map(w => checkEvm(w.address)));
        const evmResults: { address: string; chains: any }[] = [];
        let foundInInitial = false;
        for (let idx = 0; idx < initialResults.length; idx++) {
          if (initialResults[idx]!.length > 0) {
            foundInInitial = true;
            evmResults.push({ address: initialWallets[idx]!.address, chains: initialResults[idx]! });
          }
        }
        if (foundInInitial && ACCOUNTS_TO_SCAN > initialDepth) {
          const extraWallets = Array.from({ length: ACCOUNTS_TO_SCAN - initialDepth }, (_, idx) =>
            ethers.HDNodeWallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${idx + initialDepth}`)
          );
          const extraResults = await Promise.all(extraWallets.map(w => checkEvm(w.address)));
          for (let idx = 0; idx < extraResults.length; idx++) {
            if (extraResults[idx]!.length > 0) {
              evmResults.push({ address: extraWallets[idx]!.address, chains: extraResults[idx]! });
            }
          }
        }
        return evmResults;
      })(),
      checkTron(deriveTronAddress(seedBuf, 0)),
    ]);

    if (btcResults.length > 0) {
      seedJson.btc = [];
      for (const btc of btcResults) {
        findings.push(chalk.yellow(`  🟠 BTC[${btc.idx}:${btc.type}]  `) + chalk.white(`${btc.balance.toFixed(8)} BTC`) + chalk.green(` ($${btc.usd.toFixed(2)})`) + chalk.gray(`  ${btc.address}`));
        seedTotalUsd += btc.usd;
        seedJson.btc.push(btc);
      }
    }

    if (solResults.length > 0) {
      seedJson.sol = [];
      for (const sol of solResults) {
        for (const a of sol.assets) {
          findings.push(chalk.magenta(`  ◎ SOL[${sol.idx}]  `) + chalk.white(`${a.balance} ${a.symbol}`) + chalk.green(` ($${a.usd.toFixed(2)})`) + chalk.gray(`  ${sol.address}`));
          seedTotalUsd += a.usd;
        }
        seedJson.sol.push(sol);
      }
    }

    if (evmInitial.length > 0) {
      seedJson.evm = [];
      for (const evmEntry of evmInitial) {
        for (const c of evmEntry.chains) {
          for (const a of c.assets) {
            findings.push(chalk.blue(`  ⟠ ${c.chain.padEnd(11)}`) + chalk.white(`${a.balance} ${a.symbol}`) + chalk.green(` ($${a.usd.toFixed(2)})`) + chalk.gray(`  ${evmEntry.address}`));
            seedTotalUsd += a.usd;
          }
        }
        seedJson.evm.push(evmEntry);
      }
    }

    if (tron) {
      seedJson.tron = [];
      for (const a of tron.assets) {
        findings.push(chalk.red(`  ♦ TRON       `) + chalk.white(`${a.balance} ${a.symbol}`) + chalk.green(` ($${a.usd.toFixed(2)})`) + chalk.gray(`  ${tron.address}`));
        seedTotalUsd += a.usd;
      }
      seedJson.tron.push(tron);
    }

    if (seedTotalUsd > 0) {
      seedJson.repo = repo;
      seedJson.file = file;
      seedJson.totalUsd = seedTotalUsd;
    } else {
      seedJson.val = 0;
    }

    const elapsed = Date.now() - seedStart;
    return { i, repo, file, phrase, findings, seedTotalUsd, seedJson, elapsed };
  }

  // Worker Pool Implementation
  const queue = [...uniqueLeaks];
  let scanCount = 0;

  async function worker() {
    while (queue.length > 0) {
      const uniqueIndex = uniqueLeaks.length - queue.length;
      const leak = queue.shift();
      if (!leak) break;

      try {
        const { i, repo, file, phrase, findings, seedTotalUsd, seedJson, elapsed } = await processSeed(uniqueIndex);

        scanCount++;
        seedTimings.push(elapsed);

        if (findings.length > 0) {
          process.stdout.write('\r' + ' '.repeat(90) + '\r');
          console.log(chalk.cyan(`\n━━━ Seed #${i + 1} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
          console.log(chalk.white(`  Source:  `) + chalk.yellow(repo));
          console.log(chalk.white(`  File:    `) + chalk.yellow(file));
          console.log(chalk.white(`  Words:   `) + chalk.white(String(phrase.split(/\s+/).length)));
          console.log('');
          findings.forEach(f => console.log(f));
          console.log(chalk.green(`\n  💰 Seed Total: $${seedTotalUsd.toFixed(2)}`));
          hits.push({ seed: i + 1, repo, file, findings, totalUsd: seedTotalUsd });
          seedJson.totalUsd = seedTotalUsd;
          jsonResults.push(seedJson);
          saveProgress(); // Immediately save found funds
        } else {
          jsonResults.push(seedJson);
          saveProgress(); // Save every seed (as requested)
        }

        // Progress update
        let eta = '';
        if (seedTimings.length > 0) {
          const avgMs = seedTimings.reduce((a, b) => a + b, 0) / seedTimings.length;
          const remaining = Math.ceil((avgMs * (uniqueLeaks.length - scanCount)) / 1000 / CONCURRENCY);
          const mins = Math.floor(remaining / 60);
          const secs = remaining % 60;
          eta = ` (~${mins}m${secs}s left)`;
        }
        process.stdout.write(chalk.gray(`\r   Scanning ${scanCount}/${uniqueLeaks.length}${eta}   `));

      } catch (e) {
        console.error(`Error processing seed:`, e);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  process.stdout.write('\r' + ' '.repeat(90) + '\r');
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(chalk.cyan('\n\n══════════════════════════════════════════════'));
  console.log(chalk.cyan('  📊 SCAN SUMMARY'));
  console.log(chalk.cyan('══════════════════════════════════════════════'));
  console.log(chalk.white(`  Seeds scanned:    ${uniqueLeaks.length}`));
  console.log(chalk.white(`  Funded wallets:   `) + (hits.length > 0 ? chalk.green(String(hits.length)) : chalk.gray('0')));

  if (hits.length > 0) {
    const grandTotal = hits.reduce((sum, h) => sum + h.totalUsd, 0);
    console.log(chalk.white(`  Total value:      `) + chalk.green(`$${grandTotal.toFixed(2)}`));
    console.log('');
    for (const h of hits) {
      console.log(chalk.white(`  Seed #${String(h.seed).padEnd(4)}`) + chalk.green(`$${h.totalUsd.toFixed(2).padStart(12)}`) + chalk.gray(`  ${h.repo.slice(0, 45)}`));
    }
  }

  saveProgress();
  console.log(chalk.gray(`\n  Results saved to ${RESULT_FILE}`));
  console.log(chalk.gray(`  Completed in ${elapsed}s. No database changes made.\n`));

  await mongoose.connection.close();
  process.exit(0);
}

run();
