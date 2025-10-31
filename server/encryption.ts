import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// Encryption for API keys - requires ENCRYPTION_KEY environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || process.env.SESSION_SECRET;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY or SESSION_SECRET environment variable must be set for secure API key storage");
}

const IV_LENGTH = 16;

export function encrypt(text: string): string {
  const iv = randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY!.padEnd(32, '0').slice(0, 32));
  const cipher = createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const key = Buffer.from(ENCRYPTION_KEY!.padEnd(32, '0').slice(0, 32));
  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
