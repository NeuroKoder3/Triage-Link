import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app, safeStorage } from 'electron';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_FILE = 'triagelink.key';

let _encryptionKey = null;

function getKeyPath() {
  return path.join(app.getPath('userData'), KEY_FILE);
}

function generateKey() {
  return crypto.randomBytes(32);
}

export function initEncryption() {
  const keyPath = getKeyPath();

  if (fs.existsSync(keyPath)) {
    const stored = fs.readFileSync(keyPath);
    if (safeStorage.isEncryptionAvailable()) {
      _encryptionKey = safeStorage.decryptString(stored);
    } else {
      _encryptionKey = stored.toString('hex');
    }
  } else {
    const rawKey = generateKey().toString('hex');
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(rawKey);
      fs.writeFileSync(keyPath, encrypted);
    } else {
      fs.writeFileSync(keyPath, rawKey);
    }
    _encryptionKey = rawKey;
  }
}

function getKey() {
  if (!_encryptionKey) throw new Error('Encryption not initialized');
  return Buffer.from(_encryptionKey, 'hex');
}

export function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(ciphertext) {
  if (!ciphertext || !ciphertext.startsWith('enc:')) return ciphertext;
  const parts = ciphertext.split(':');
  if (parts.length !== 4) return ciphertext;
  const [, ivHex, authTagHex, encrypted] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function encryptJSON(obj) {
  return encrypt(JSON.stringify(obj));
}

export function decryptJSON(ciphertext) {
  const json = decrypt(ciphertext);
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}
