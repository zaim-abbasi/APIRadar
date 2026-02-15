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
const ed25519 = require('ed25519-hd-key');

const MONGODB_URI = "mongodb://localhost:27017/apiradar";
const ANKR_RPC = 'https://rpc.ankr.com/multichain/41d9609ae145f55dfb5916d425da95f64998d13d1973440a73fa20a6325888d3';
const ACCOUNTS_TO_SCAN = 10;

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
    const res = await axios.get('https://mempool.space/api/v1/prices');
    return res.data.USD;
  });
}



async function checkAllBitcoin(seed: Uint8Array, count: number) {
  const root = bip32.fromSeed(seed);
  const results: { idx: number; address: string; balance: number; usd: number }[] = [];

  const addresses: { idx: number; address: string }[] = [];
  for (let i = 0; i < count; i++) {
    const child = root.derivePath(`m/84'/0'/0'/0/${i}`);
    const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: bitcoin.networks.bitcoin });
    if (address) addresses.push({ idx: i, address });
  }

  let scanDepth = 1;
  for (let i = 0; i < scanDepth && i < addresses.length; i++) {
    const { idx, address } = addresses[i]!;
    try {
      await sleep(1500);
      const { data } = await axios.get(`https://mempool.space/api/address/${address}`, { timeout: 10000 });
      const satoshis = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) +
        (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum);
      if (satoshis > 0) {
        if (i === 0) scanDepth = count;
        const btc = satoshis / 100000000;
        const price = await getBtcPrice();
        results.push({ idx, address, balance: btc, usd: btc * price });
      }
    } catch (e: any) {
      console.log(chalk.gray(`      [BTC] Error: ${e?.message?.slice(0, 50) || 'unknown'}`));
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
  let scanDepth = 1;

  for (let i = 0; i < scanDepth && i < addresses.length; i++) {
    try {
      await sleep(1000);
      const { data } = await axios.post(ANKR_RPC, {
        jsonrpc: '2.0', id: 1, method: 'ankr_getAccountBalance',
        params: { walletAddress: addresses[i], blockchain: ['solana'] }
      }, { timeout: 15000 });

      const assets = (data.result?.assets || [])
        .filter((a: any) => Number(a.balanceUsd) > 0.01 && !isSpam(a.tokenName || ''))
        .map((a: any) => ({ symbol: a.tokenSymbol, balance: Number(a.balance).toFixed(4), usd: Number(a.balanceUsd) }));

      if (assets.length > 0) {
        if (i === 0) scanDepth = count;
        results.push({ idx: i, address: addresses[i]!, assets });
      }
    } catch (e: any) {
      console.log(chalk.gray(`      [SOL] Error: ${e?.message?.slice(0, 50) || 'unknown'}`));
    }
  }

  return results;
}

async function checkEvm(address: string) {
  try {
    await sleep(1000);
    const { data } = await axios.post(ANKR_RPC, {
      jsonrpc: '2.0', id: 1, method: 'ankr_getAccountBalance',
      params: { walletAddress: address, blockchain: ANKR_CHAINS }
    }, { timeout: 15000 });

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

async function run() {
  const startTime = Date.now();
  console.log(chalk.cyan('\n🚀 APIRadar: GOD MODE (BTC + SOL + EVM Scanner'));
  console.log(chalk.gray('   Chains: Bitcoin · Solana · Ethereum · BSC · Polygon · Base · Arbitrum · Avalanche · Optimism'));
  console.log(chalk.gray(`   Accounts per seed: ${ACCOUNTS_TO_SCAN}\n`));

  await mongoose.connect(MONGODB_URI);
  console.log(chalk.green('✅ Database connected'));

  const leaks = await mongoose.connection.db!.collection('leaks').find({ provider: 'bip39_seed_phrase' }).toArray();

  const seenPhrases = new Map<string, number>();
  const uniqueLeaks: typeof leaks = [];
  let dupeCount = 0;

  for (let i = 0; i < leaks.length; i++) {
    const phrase = String(leaks[i]!['fullKey'] || '').trim();
    if (!bip39.validateMnemonic(phrase)) continue;
    if (isTestMnemonic(phrase)) continue;
    if (seenPhrases.has(phrase)) {
      dupeCount++;
      continue;
    }
    seenPhrases.set(phrase, i);
    uniqueLeaks.push(leaks[i]!);
  }

  console.log(chalk.white(`   ${leaks.length} seeds found, ${uniqueLeaks.length} unique valid mnemonics`));
  if (dupeCount > 0) console.log(chalk.gray(`   ${dupeCount} duplicates skipped`));
  console.log('');

  const hits: { seed: number; repo: string; file: string; findings: string[]; totalUsd: number }[] = [];
  const jsonResults: any[] = [];
  const seedTimings: number[] = [];

  for (let i = 0; i < uniqueLeaks.length; i++) {
    const seedStart = Date.now();
    const leak = uniqueLeaks[i]!;
    const phrase = String(leak['fullKey'] || '').trim();
    const repo = String(leak['repoUrl'] || '').replace('https://github.com/', '');
    const file = String(leak['filePath'] || '');

    let eta = '';
    if (seedTimings.length > 0) {
      const avgMs = seedTimings.reduce((a, b) => a + b, 0) / seedTimings.length;
      const remaining = Math.ceil((avgMs * (uniqueLeaks.length - i)) / 1000);
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      eta = ` (~${mins}m${secs}s left)`;
    }
    process.stdout.write(chalk.gray(`\r   Scanning ${i + 1}/${uniqueLeaks.length}: ${repo.slice(0, 35)}...${eta}   `));

    const findings: string[] = [];
    let seedTotalUsd = 0;
    const seedJson: any = { repo, file, btc: [], sol: [], evm: [] };

    const seedBuf = Uint8Array.from(await bip39.mnemonicToSeed(phrase));

    const btcResults = await checkAllBitcoin(seedBuf, ACCOUNTS_TO_SCAN);
    for (const btc of btcResults) {
      findings.push(chalk.yellow(`  🟠 BTC[${btc.idx}]  `) + chalk.white(`${btc.balance.toFixed(8)} BTC`) + chalk.green(` ($${btc.usd.toFixed(2)})`) + chalk.gray(`  ${btc.address}`));
      seedTotalUsd += btc.usd;
      seedJson.btc.push(btc);
    }

    const solResults = await checkAllSolana(seedBuf, ACCOUNTS_TO_SCAN);
    for (const sol of solResults) {
      for (const a of sol.assets) {
        findings.push(chalk.magenta(`  ◎ SOL[${sol.idx}]  `) + chalk.white(`${a.balance} ${a.symbol}`) + chalk.green(` ($${a.usd.toFixed(2)})`) + chalk.gray(`  ${sol.address}`));
        seedTotalUsd += a.usd;
      }
      seedJson.sol.push(sol);
    }

    const ethRoot = ethers.HDNodeWallet.fromPhrase(phrase, undefined, "m");
    let evmDepth = 1;

    for (let idx = 0; idx < evmDepth; idx++) {
      const wallet = ethRoot.derivePath(`m/44'/60'/0'/0/${idx}`);
      const evm = await checkEvm(wallet.address);
      if (evm.length > 0) {
        if (idx === 0) evmDepth = ACCOUNTS_TO_SCAN;
        for (const c of evm) {
          for (const a of c.assets) {
            findings.push(chalk.blue(`  ⟠ ${c.chain.padEnd(11)}`) + chalk.white(`${a.balance} ${a.symbol}`) + chalk.green(` ($${a.usd.toFixed(2)})`) + chalk.gray(`  ${wallet.address}`));
            seedTotalUsd += a.usd;
          }
        }
        seedJson.evm.push({ address: wallet.address, chains: evm });
      }
    }

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
    }

    seedTimings.push(Date.now() - seedStart);
  }

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

  const outPath = path.join(__dirname, 'scan-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ scannedAt: new Date().toISOString(), seeds: uniqueLeaks.length, funded: hits.length, results: jsonResults }, null, 2));
  console.log(chalk.gray(`\n  Results saved to ${outPath}`));
  console.log(chalk.gray(`  Completed in ${elapsed}s. No database changes made.\n`));

  await mongoose.connection.close();
  process.exit(0);
}

run();
