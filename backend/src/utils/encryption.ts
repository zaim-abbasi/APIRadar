import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Ensures strict AES-256 compatibility dynamically generating 32 Buffer bytes
 */
export function getEncryptionKey(): Buffer {
  const rawKey = process.env['ENCRYPTION_KEY'];
  if (!rawKey) throw new Error('ENCRYPTION_KEY is missing from process.env');

  if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
  }

  return Buffer.from(rawKey, 'hex');
}

export function encrypt(text: string, key: Buffer): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', new Uint8Array(key), new Uint8Array(iv));

  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(encryptedData: string, key: Buffer): string {
  const [iv64, authTag64, ciphertext64] = encryptedData.split(':');
  if (!iv64 || !authTag64 || !ciphertext64) throw new Error('Invalid encrypted payload format');

  const iv = Buffer.from(iv64, 'base64');
  const authTag = Buffer.from(authTag64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', new Uint8Array(key), new Uint8Array(iv));
  decipher.setAuthTag(new Uint8Array(authTag));

  let decrypted = decipher.update(ciphertext64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
