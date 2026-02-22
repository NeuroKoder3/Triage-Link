import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { encrypt, decrypt, encryptJSON, decryptJSON } from './encryption.js';

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

let db = null;

function generateId() {
  return crypto.randomUUID();
}

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'triagelink.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  createTables();
  return db;
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      full_name TEXT,
      organization_name TEXT,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      failed_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_date TEXT NOT NULL,
      updated_date TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      data TEXT NOT NULL,
      created_date TEXT NOT NULL,
      updated_date TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      severity TEXT DEFAULT 'info'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
    CREATE INDEX IF NOT EXISTS idx_entities_type_created ON entities(entity_type, created_date);
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);
}

// --- Audit Logging ---
export function auditLog({ userId, userEmail, action, entityType, entityId, details, severity }) {
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, timestamp, user_id, user_email, action, entity_type, entity_id, details, severity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    generateId(),
    new Date().toISOString(),
    userId || null,
    userEmail || null,
    action,
    entityType || null,
    entityId || null,
    details ? encrypt(typeof details === 'string' ? details : JSON.stringify(details)) : null,
    severity || 'info'
  );
}

export function getAuditLogs(limit = 200, offset = 0, filters = {}) {
  let query = 'SELECT * FROM audit_logs';
  const conditions = [];
  const params = [];

  if (filters.action) { conditions.push('action = ?'); params.push(filters.action); }
  if (filters.userId) { conditions.push('user_id = ?'); params.push(filters.userId); }
  if (filters.entityType) { conditions.push('entity_type = ?'); params.push(filters.entityType); }
  if (filters.startDate) { conditions.push('timestamp >= ?'); params.push(filters.startDate); }
  if (filters.endDate) { conditions.push('timestamp <= ?'); params.push(filters.endDate); }

  if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params);
  return rows.map(row => ({
    ...row,
    details: row.details ? decrypt(row.details) : null,
  }));
}

// --- Authentication ---
function cleanExpiredSessions() {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
}

export function registerUser({ organizationName, email, fullName, role, password }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) throw new Error('An account with this email already exists. Please log in.');

  const passwordHash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
  const userId = generateId();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, full_name, organization_name, role, password_hash, failed_attempts, created_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(userId, email.toLowerCase(), fullName || email.split('@')[0], organizationName, role, passwordHash, now, now);

  const session = createSession(userId);

  auditLog({ userId, userEmail: email.toLowerCase(), action: 'user.register', details: `New account created with role: ${role}` });

  return {
    session,
    user: { id: userId, email: email.toLowerCase(), full_name: fullName || email.split('@')[0], organization_name: organizationName, role, created_date: now },
  };
}

export function loginUser({ email, password }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw new Error('No account found with this email. Please sign up first.');

  if (user.locked_until) {
    const lockExpiry = new Date(user.locked_until).getTime();
    if (Date.now() < lockExpiry) {
      const minutesLeft = Math.ceil((lockExpiry - Date.now()) / 60000);
      throw new Error(`Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`);
    }
    db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
    user.failed_attempts = 0;
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    const attempts = (user.failed_attempts || 0) + 1;
    const updates = { failed_attempts: attempts };
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      updates.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
      auditLog({ userId: user.id, userEmail: user.email, action: 'auth.lockout', severity: 'warning', details: `Account locked after ${attempts} failed attempts` });
    }
    db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
      .run(updates.failed_attempts, updates.locked_until || null, user.id);

    const remaining = MAX_LOGIN_ATTEMPTS - attempts;
    if (remaining > 0) throw new Error(`Incorrect password. ${remaining} attempt(s) remaining.`);
    throw new Error('Account locked due to too many failed attempts. Try again in 15 minutes.');
  }

  db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
  cleanExpiredSessions();
  const session = createSession(user.id);

  auditLog({ userId: user.id, userEmail: user.email, action: 'auth.login', details: 'Successful login' });

  return {
    session,
    user: { id: user.id, email: user.email, full_name: user.full_name, organization_name: user.organization_name, role: user.role, created_date: user.created_date },
  };
}

function createSession(userId) {
  const sessionId = generateId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  db.prepare('INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
    .run(sessionId, userId, now.toISOString(), expiresAt.toISOString());
  return { id: sessionId, expiresAt: expiresAt.toISOString() };
}

export function validateSession(sessionId) {
  if (!sessionId) return null;
  const session = db.prepare('SELECT s.*, u.id as uid, u.email, u.full_name, u.organization_name, u.role, u.created_date FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ?').get(sessionId);
  if (!session) return null;
  if (new Date(session.expires_at) < new Date()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }
  return { id: session.uid, email: session.email, full_name: session.full_name, organization_name: session.organization_name, role: session.role, created_date: session.created_date };
}

export function extendSession(sessionId) {
  const newExpiry = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(newExpiry, sessionId);
}

export function destroySession(sessionId) {
  if (!sessionId) return;
  const session = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(sessionId);
  if (session) {
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(session.user_id);
    auditLog({ userId: session.user_id, userEmail: user?.email, action: 'auth.logout', details: 'User logged out' });
  }
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}

export function resetUserPassword({ email, organizationName, newPassword }) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) throw new Error('No account found with this email.');
  if (user.organization_name?.toLowerCase() !== organizationName?.toLowerCase()) {
    throw new Error('Organization name does not match our records.');
  }
  const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL, updated_date = ? WHERE id = ?')
    .run(passwordHash, new Date().toISOString(), user.id);
  auditLog({ userId: user.id, userEmail: user.email, action: 'auth.password_reset', details: 'Password was reset' });
  return { success: true };
}

// --- Entity CRUD (encrypted storage) ---
export function entityList(entityType, sortField, limit) {
  let rows = db.prepare('SELECT * FROM entities WHERE entity_type = ?').all(entityType);
  let items = rows.map(row => ({ ...decryptJSON(row.data), id: row.id, created_date: row.created_date, updated_date: row.updated_date }));

  if (sortField) {
    const desc = sortField.startsWith('-');
    const field = desc ? sortField.slice(1) : sortField;
    items.sort((a, b) => {
      const aVal = a[field] ?? '';
      const bVal = b[field] ?? '';
      if (aVal < bVal) return desc ? 1 : -1;
      if (aVal > bVal) return desc ? -1 : 1;
      return 0;
    });
  }

  if (limit) items = items.slice(0, limit);
  return items;
}

export function entityFilter(entityType, criteria, sortField, limit) {
  let items = entityList(entityType, sortField);
  if (criteria && Object.keys(criteria).length > 0) {
    items = items.filter(item =>
      Object.entries(criteria).every(([key, value]) => {
        if (value === undefined || value === null) return true;
        return item[key] === value;
      })
    );
  }
  if (limit) items = items.slice(0, limit);
  return items;
}

export function entityCreate(entityType, data, userId, userEmail) {
  const id = generateId();
  const now = new Date().toISOString();
  const itemData = { ...data };
  delete itemData.id;
  delete itemData.created_date;
  delete itemData.updated_date;

  const encrypted = encryptJSON(itemData);
  db.prepare('INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)')
    .run(id, entityType, encrypted, now, now);

  auditLog({ userId, userEmail, action: 'entity.create', entityType, entityId: id, details: `Created ${entityType}` });

  return { ...itemData, id, created_date: now, updated_date: now };
}

export function entityUpdate(entityType, id, data, userId, userEmail) {
  const existing = db.prepare('SELECT * FROM entities WHERE id = ? AND entity_type = ?').get(id, entityType);
  if (!existing) throw new Error(`Entity ${entityType} with id ${id} not found`);

  const existingData = decryptJSON(existing.data) || {};
  const merged = { ...existingData, ...data };
  delete merged.id;
  delete merged.created_date;
  delete merged.updated_date;

  const now = new Date().toISOString();
  const encrypted = encryptJSON(merged);
  db.prepare('UPDATE entities SET data = ?, updated_date = ? WHERE id = ?').run(encrypted, now, id);

  auditLog({ userId, userEmail, action: 'entity.update', entityType, entityId: id, details: `Updated ${entityType}` });

  return { ...merged, id, created_date: existing.created_date, updated_date: now };
}

export function entityDelete(entityType, id, userId, userEmail) {
  const existing = db.prepare('SELECT * FROM entities WHERE id = ? AND entity_type = ?').get(id, entityType);
  if (!existing) throw new Error(`Entity ${entityType} with id ${id} not found`);
  db.prepare('DELETE FROM entities WHERE id = ?').run(id);
  auditLog({ userId, userEmail, action: 'entity.delete', entityType, entityId: id, details: `Deleted ${entityType}`, severity: 'warning' });
  const data = decryptJSON(existing.data) || {};
  return { ...data, id, created_date: existing.created_date, updated_date: existing.updated_date };
}

// --- Settings ---
export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? decrypt(row.value) : null;
}

export function setSetting(key, value) {
  const encrypted = encrypt(value);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, encrypted);
}

// --- Backup / Restore ---
export function createBackup(destPath) {
  const backupPath = destPath || path.join(app.getPath('userData'), `triagelink-backup-${Date.now()}.db`);
  db.backup(backupPath);
  auditLog({ action: 'system.backup', details: `Database backup created: ${path.basename(backupPath)}` });
  return backupPath;
}

export function restoreBackup(sourcePath) {
  if (!fs.existsSync(sourcePath)) throw new Error('Backup file not found');
  const currentPath = path.join(app.getPath('userData'), 'triagelink.db');
  const tempBackup = currentPath + '.pre-restore';
  fs.copyFileSync(currentPath, tempBackup);

  try {
    db.close();
    fs.copyFileSync(sourcePath, currentPath);
    db = new Database(currentPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    auditLog({ action: 'system.restore', details: `Database restored from: ${path.basename(sourcePath)}`, severity: 'warning' });
  } catch (err) {
    fs.copyFileSync(tempBackup, currentPath);
    db = new Database(currentPath);
    db.pragma('journal_mode = WAL');
    throw new Error(`Restore failed, original database preserved: ${err.message}`);
  } finally {
    if (fs.existsSync(tempBackup)) fs.unlinkSync(tempBackup);
  }
}

export function exportData() {
  const entities = db.prepare('SELECT * FROM entities').all();
  const users = db.prepare('SELECT id, email, full_name, organization_name, role, created_date FROM users').all();
  const settings = db.prepare('SELECT * FROM settings').all();

  const decryptedEntities = entities.map(e => ({
    id: e.id,
    entity_type: e.entity_type,
    data: decryptJSON(e.data),
    created_date: e.created_date,
    updated_date: e.updated_date,
  }));

  return { entities: decryptedEntities, users, settings: settings.map(s => ({ key: s.key, value: decrypt(s.value) })), exportedAt: new Date().toISOString() };
}

// --- Migration from localStorage ---
export function migrateFromLocalStorage(localStorageData) {
  if (!localStorageData) return { migrated: 0 };
  let migrated = 0;

  const insertEntity = db.prepare('INSERT OR IGNORE INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)');
  const insertUser = db.prepare('INSERT OR IGNORE INTO users (id, email, full_name, organization_name, role, password_hash, failed_attempts, created_date) VALUES (?, ?, ?, ?, ?, ?, 0, ?)');

  const txn = db.transaction(() => {
    for (const [key, value] of Object.entries(localStorageData)) {
      if (key.startsWith('triagelink_entity_')) {
        const entityType = key.replace('triagelink_entity_', '');
        try {
          const items = JSON.parse(value);
          if (Array.isArray(items)) {
            for (const item of items) {
              const { id, created_date, updated_date, ...data } = item;
              insertEntity.run(id || generateId(), entityType, encryptJSON(data), created_date || new Date().toISOString(), updated_date || new Date().toISOString());
              migrated++;
            }
          }
        } catch { /* skip corrupted data */ }
      }

      if (key === 'triagelink_registered_users') {
        try {
          const users = JSON.parse(value);
          if (Array.isArray(users)) {
            for (const user of users) {
              const hash = user.password_hash?.startsWith('sha256:') || user.password_hash?.startsWith('tl_')
                ? bcrypt.hashSync('changeme_migrated', BCRYPT_ROUNDS)
                : user.password_hash;
              insertUser.run(user.id || generateId(), user.email, user.full_name, user.organization_name, user.role, hash, user.created_date || new Date().toISOString());
              migrated++;
            }
          }
        } catch { /* skip */ }
      }
    }
  });

  txn();
  auditLog({ action: 'system.migration', details: `Migrated ${migrated} records from localStorage` });
  return { migrated };
}

export function closeDatabase() {
  if (db) db.close();
}
