import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

function createTestKey() {
  return crypto.randomBytes(32);
}

function encryptWith(key, plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `enc:${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function decryptWith(key, ciphertext) {
  if (!ciphertext || !ciphertext.startsWith('enc:')) return ciphertext;
  const [, ivHex, authTagHex, encrypted] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

describe('AES-256-GCM Encryption', () => {
  let key;

  beforeAll(() => {
    key = createTestKey();
  });

  it('encrypts and decrypts a simple string', () => {
    const plaintext = 'Hello, TriageLink!';
    const encrypted = encryptWith(key, plaintext);
    expect(encrypted).toMatch(/^enc:/);
    expect(encrypted).not.toContain(plaintext);
    const decrypted = decryptWith(key, encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypts and decrypts JSON data', () => {
    const data = { patient_name: 'John Doe', diagnosis: 'Kidney Transplant', priority: 'urgent' };
    const json = JSON.stringify(data);
    const encrypted = encryptWith(key, json);
    const decrypted = JSON.parse(decryptWith(key, encrypted));
    expect(decrypted).toEqual(data);
  });

  it('produces different ciphertexts for same input (random IV)', () => {
    const plaintext = 'Same input text';
    const enc1 = encryptWith(key, plaintext);
    const enc2 = encryptWith(key, plaintext);
    expect(enc1).not.toBe(enc2);
    expect(decryptWith(key, enc1)).toBe(plaintext);
    expect(decryptWith(key, enc2)).toBe(plaintext);
  });

  it('fails to decrypt with wrong key', () => {
    const plaintext = 'Secret data';
    const encrypted = encryptWith(key, plaintext);
    const wrongKey = createTestKey();
    expect(() => decryptWith(wrongKey, encrypted)).toThrow();
  });

  it('detects tampered ciphertext', () => {
    const plaintext = 'Important data';
    const encrypted = encryptWith(key, plaintext);
    const parts = encrypted.split(':');
    parts[3] = parts[3].replace(/^./, 'f');
    const tampered = parts.join(':');
    expect(() => decryptWith(key, tampered)).toThrow();
  });

  it('passes through non-encrypted strings', () => {
    expect(decryptWith(key, 'regular string')).toBe('regular string');
    expect(decryptWith(key, null)).toBe(null);
    expect(decryptWith(key, '')).toBe('');
  });

  it('handles unicode and special characters', () => {
    const plaintext = '患者データ 🏥 Creatinine: >2.0 mg/dL — "urgent" page!';
    const encrypted = encryptWith(key, plaintext);
    expect(decryptWith(key, encrypted)).toBe(plaintext);
  });

  it('handles large payloads', () => {
    const plaintext = 'x'.repeat(100000);
    const encrypted = encryptWith(key, plaintext);
    expect(decryptWith(key, encrypted)).toBe(plaintext);
  });
});
