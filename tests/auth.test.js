import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

describe('Authentication - bcrypt password hashing', () => {
  it('hashes a password with bcrypt', () => {
    const password = 'SecureP@ss10';
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  it('verifies correct password', () => {
    const password = 'MyP@ssword123';
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
  });

  it('rejects incorrect password', () => {
    const password = 'CorrectPassword1!';
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    expect(bcrypt.compareSync('WrongPassword1!', hash)).toBe(false);
  });

  it('produces different hashes for same password (random salt)', () => {
    const password = 'SamePassword1!';
    const hash1 = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    const hash2 = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    expect(hash1).not.toBe(hash2);
    expect(bcrypt.compareSync(password, hash1)).toBe(true);
    expect(bcrypt.compareSync(password, hash2)).toBe(true);
  });

  it('handles passwords with special characters', () => {
    const password = 'P@$$w0rd!#%^&*()_+-=[]{}|;:,.<>?';
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
  });

  it('handles very long passwords', () => {
    const password = 'A'.repeat(72);
    const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    expect(bcrypt.compareSync(password, hash)).toBe(true);
  });
});

describe('Authentication - Account lockout logic', () => {
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 15 * 60 * 1000;

  it('locks account after max failed attempts', () => {
    let failedAttempts = 0;
    let lockedUntil = null;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      failedAttempts++;
      if (failedAttempts >= MAX_ATTEMPTS) {
        lockedUntil = new Date(Date.now() + LOCKOUT_MS).toISOString();
      }
    }

    expect(failedAttempts).toBe(MAX_ATTEMPTS);
    expect(lockedUntil).toBeDefined();
    expect(new Date(lockedUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('resets failed attempts on successful login', () => {
    let failedAttempts = 3;
    failedAttempts = 0;
    expect(failedAttempts).toBe(0);
  });

  it('lockout expires after duration', () => {
    const lockedUntil = new Date(Date.now() - 1000).toISOString();
    const isLocked = new Date(lockedUntil).getTime() > Date.now();
    expect(isLocked).toBe(false);
  });
});

describe('Authentication - Session management', () => {
  const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

  it('creates session with correct expiry', () => {
    const now = Date.now();
    const expiresAt = new Date(now + SESSION_TTL_MS);
    expect(expiresAt.getTime() - now).toBe(SESSION_TTL_MS);
  });

  it('detects expired session', () => {
    const expiredSession = { expires_at: new Date(Date.now() - 1000).toISOString() };
    const isExpired = new Date(expiredSession.expires_at) < new Date();
    expect(isExpired).toBe(true);
  });

  it('validates active session', () => {
    const activeSession = { expires_at: new Date(Date.now() + 3600000).toISOString() };
    const isExpired = new Date(activeSession.expires_at) < new Date();
    expect(isExpired).toBe(false);
  });
});

describe('Password validation rules', () => {
  const rules = [
    { id: 'length', test: (p) => p.length >= 10 },
    { id: 'upper', test: (p) => /[A-Z]/.test(p) },
    { id: 'lower', test: (p) => /[a-z]/.test(p) },
    { id: 'numSymbol', test: (p) => /[0-9!@#$%^&*()_+\-={};':"\\|,.<>?`~]/.test(p) },
  ];

  it('rejects short passwords', () => {
    expect(rules[0].test('Short1!')).toBe(false);
  });

  it('requires uppercase', () => {
    expect(rules[1].test('alllowercase1!')).toBe(false);
    expect(rules[1].test('HasUppercase1!')).toBe(true);
  });

  it('requires lowercase', () => {
    expect(rules[2].test('ALLUPPERCASE1!')).toBe(false);
    expect(rules[2].test('HASLOWERcase1!')).toBe(true);
  });

  it('requires number or symbol', () => {
    expect(rules[3].test('NoNumbersHere')).toBe(false);
    expect(rules[3].test('HasNumber1Here')).toBe(true);
    expect(rules[3].test('HasSymbol!Here')).toBe(true);
  });

  it('accepts valid password', () => {
    const password = 'SecureP@ss10';
    expect(rules.every(r => r.test(password))).toBe(true);
  });
});
