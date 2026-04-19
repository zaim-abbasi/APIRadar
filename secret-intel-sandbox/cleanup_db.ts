import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { ScoreIntelligence, loadModel } from './intelligence';

// CONFIGURATION
const DRY_RUN = false; // SET TO FALSE TO ACTUALLY DELETE
const BATCH_SIZE = 500;

// Load backend env for DB URI and Encryption Key
dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI not found in backend/.env");

let key = process.env['ENCRYPTION_KEY'];
if (!key) throw new Error('ENCRYPTION_KEY is missing from process.env');

// If the key is not a 64-char hex string, hash it to make it compatible
if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    key = crypto.createHash('sha256').update(key).digest('hex');
}
const encryptionKey = Buffer.from(key, 'hex');

function decrypt(encryptedData: string, key: Buffer): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted payload format');
    const [iv64, authTag64, ciphertext64] = parts;
    const iv = Buffer.from(iv64, 'base64');
    const authTag = Buffer.from(authTag64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', new Uint8Array(key), new Uint8Array(iv));
    decipher.setAuthTag(new Uint8Array(authTag));
    let decrypted = decipher.update(ciphertext64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

let totalScanned = 0;
let secretsToDelete: mongoose.Types.ObjectId[] = [];

async function identifyDummies(batch: any[], key: Buffer) {
    batch.forEach((doc) => {
        try {
            if (!doc.encryptedKey) return;
            const decryptedKey = decrypt(doc.encryptedKey, key);
            const result = ScoreIntelligence(decryptedKey);
            
            if (result.score < 0.2) {
                secretsToDelete.push(doc._id);
            }
        } catch (err) {
            // ignore mangled data
        }
    });
}

async function runCleanup() {
    loadModel();
    console.log(`--- DATABASE CLEANUP INITIATED ---`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN (No deletions)' : 'LIVE (DELETING DATA)'}`);
    
    await mongoose.connect(MONGODB_URI!);
    const db = mongoose.connection.db;
    if (!db) throw new Error("DB connection failed");

    const secretsColl = db.collection('secrets');
    const leaksColl = db.collection('leaks');

    console.log("Scanning for dummy keys...");
    const cursor = secretsColl.find({});
    
    let batch = [];
    while (await cursor.hasNext()) {
        const doc = await cursor.next();
        if (doc) batch.push(doc);
        
        if (batch.length >= BATCH_SIZE) {
            await identifyDummies(batch, encryptionKey);
            totalScanned += batch.length;
            process.stdout.write(`\rScanned: ${totalScanned} | Flagged: ${secretsToDelete.length}`);
            batch = [];
        }
    }
    if (batch.length > 0) {
        await identifyDummies(batch, encryptionKey);
        totalScanned += batch.length;
    }
    console.log(`\nScan complete. Total secrets flagged: ${secretsToDelete.length}`);

    if (secretsToDelete.length === 0) {
        console.log("No dummy keys found. Exiting.");
        await mongoose.disconnect();
        return;
    }

    if (DRY_RUN) {
        console.log(`\n[DRY RUN] Would have deleted ${secretsToDelete.length} Secrets and their associated Leaks.`);
        console.log(`To commit these changes, set DRY_RUN = false in cleanup_db.ts and run again.`);
    } else {
        console.log(`\nPERFORMING DELETION...`);
        
        // Parallelize deletion in chunks
        const CHUNK_SIZE = 100;
        let deletedSecrets = 0;
        let deletedLeaks = 0;

        for (let i = 0; i < secretsToDelete.length; i += CHUNK_SIZE) {
            const chunk = secretsToDelete.slice(i, i + CHUNK_SIZE);
            
            // Delete Leaks first (referential integrity check usually not enforced in Mongo but good practice)
            const leakResult = await leaksColl.deleteMany({ secretId: { $in: chunk } });
            deletedLeaks += leakResult.deletedCount;

            // Delete Secrets
            const secretResult = await secretsColl.deleteMany({ _id: { $in: chunk } });
            deletedSecrets += secretResult.deletedCount;

            process.stdout.write(`\rDeleted: ${deletedSecrets} secrets and ${deletedLeaks} leaks...`);
        }
        console.log(`\n\nCLEANUP COMPLETE!`);
        console.log(`Secrets Deleted : ${deletedSecrets}`);
        console.log(`Leaks Deleted   : ${deletedLeaks}`);
    }

    await mongoose.disconnect();
}

runCleanup().catch(console.error);
