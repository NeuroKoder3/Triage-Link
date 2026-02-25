const DB_PREFIX = 'triagelink_';
const SESSION_KEY = `${DB_PREFIX}session_id`;
const ipc = typeof window !== 'undefined' && window.electronAPI?.db;

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class EventBus {
  constructor() { this.listeners = new Map(); }
  on(name, cb) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(cb);
    return () => this.listeners.get(name)?.delete(cb);
  }
  emit(name, event) {
    this.listeners.get(name)?.forEach(cb => { try { cb(event); } catch (e) { console.error('[TriageLink] Subscription error:', e); } });
  }
}

const eventBus = new EventBus();

function getSessionId() {
  return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
}

function setSessionId(id) {
  if (id) {
    sessionStorage.setItem(SESSION_KEY, id);
    localStorage.setItem(SESSION_KEY, id);
  } else {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(SESSION_KEY);
  }
}

function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(`${DB_PREFIX}current_user`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCurrentUser(user) {
  if (user) {
    sessionStorage.setItem(`${DB_PREFIX}current_user`, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(`${DB_PREFIX}current_user`);
  }
}

// --- IPC-backed Entity Store ---
class IPCEntityStore {
  constructor(name) { this.name = name; }

  async list(sortField, limit) {
    return ipc.entity.list(this.name, sortField, limit);
  }

  async filter(criteria, sortField, limit) {
    return ipc.entity.filter(this.name, criteria, sortField, limit);
  }

  async create(data) {
    const user = getCurrentUser();
    const result = await ipc.entity.create(this.name, data, user?.id, user?.email);
    eventBus.emit(this.name, { type: 'created', data: result });
    return result;
  }

  async update(id, data) {
    const user = getCurrentUser();
    const result = await ipc.entity.update(this.name, id, data, user?.id, user?.email);
    eventBus.emit(this.name, { type: 'updated', data: result });
    return result;
  }

  async delete(id) {
    const user = getCurrentUser();
    const result = await ipc.entity.delete(this.name, id, user?.id, user?.email);
    eventBus.emit(this.name, { type: 'deleted', data: result });
    return result;
  }

  subscribe(callback) { return eventBus.on(this.name, callback); }
}

// --- localStorage fallback Entity Store (for browser-only dev) ---
class LocalEntityStore {
  constructor(name) {
    this.name = name;
    this.storageKey = `${DB_PREFIX}entity_${name}`;
  }
  _getAll() { try { return JSON.parse(localStorage.getItem(this.storageKey)) || []; } catch { return []; } }
  _saveAll(items) { localStorage.setItem(this.storageKey, JSON.stringify(items)); }
  _sort(items, sortField) {
    if (!sortField) return items;
    const desc = sortField.startsWith('-');
    const field = desc ? sortField.slice(1) : sortField;
    return [...items].sort((a, b) => { const av = a[field] ?? '', bv = b[field] ?? ''; return av < bv ? (desc ? 1 : -1) : av > bv ? (desc ? -1 : 1) : 0; });
  }
  async list(sortField, limit) { let items = this._sort(this._getAll(), sortField); if (limit) items = items.slice(0, limit); return items; }
  async filter(criteria, sortField, limit) {
    let items = this._getAll().filter(item => Object.entries(criteria).every(([k, v]) => v == null || item[k] === v));
    items = this._sort(items, sortField); if (limit) items = items.slice(0, limit); return items;
  }
  async create(data) {
    const items = this._getAll();
    const newItem = { id: generateId(), ...data, created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    items.push(newItem); this._saveAll(items); eventBus.emit(this.name, { type: 'created', data: newItem }); return newItem;
  }
  async update(id, data) {
    const items = this._getAll(); const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Entity ${this.name} with id ${id} not found`);
    items[idx] = { ...items[idx], ...data, updated_date: new Date().toISOString() };
    this._saveAll(items); eventBus.emit(this.name, { type: 'updated', data: items[idx] }); return items[idx];
  }
  async delete(id) {
    const items = this._getAll(); const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error(`Entity ${this.name} with id ${id} not found`);
    const deleted = items.splice(idx, 1)[0]; this._saveAll(items); eventBus.emit(this.name, { type: 'deleted', data: deleted }); return deleted;
  }
  subscribe(callback) { return eventBus.on(this.name, callback); }
}

// --- Auth (IPC-backed) ---
class IPCAuth {
  constructor() { this._user = null; }

  async init() {
    const sid = getSessionId();
    if (sid) {
      try {
        const user = await ipc.auth.validate(sid);
        if (user) { this._user = user; setCurrentUser(user); return; }
      } catch { /* session invalid */ }
    }
    this._user = null;
    setCurrentUser(null);
    setSessionId(null);
  }

  async register({ organizationName, email, fullName, role, password }) {
    const result = await ipc.auth.register({ organizationName, email, fullName, role, password });
    this._user = result.user;
    setSessionId(result.session.id);
    setCurrentUser(result.user);
    return result.user;
  }

  async login({ email, password }) {
    const result = await ipc.auth.login({ email, password });
    this._user = result.user;
    setSessionId(result.session.id);
    setCurrentUser(result.user);
    return result.user;
  }

  async me() {
    if (this._user) return this._user;
    const sid = getSessionId();
    if (!sid) throw new Error('Not authenticated');
    const user = await ipc.auth.validate(sid);
    if (!user) { this.logout(); throw new Error('Session expired'); }
    this._user = user;
    setCurrentUser(user);
    return user;
  }

  isLoggedIn() { return !!this._user || !!getSessionId(); }

  async logout() {
    const sid = getSessionId();
    if (sid) { try { await ipc.auth.logout(sid); } catch { /* ignore */ } }
    this._user = null;
    setSessionId(null);
    setCurrentUser(null);
  }

  async resetPassword(params) { return ipc.auth.resetPassword(params); }

  async extendSession() {
    const sid = getSessionId();
    if (sid) await ipc.auth.extend(sid);
  }

  redirectToLogin() {}
}

// --- Auth (localStorage fallback) ---
class LocalAuth {
  constructor() { this._user = null; this._loadSession(); }
  _getUsersStore() { try { return JSON.parse(localStorage.getItem(`${DB_PREFIX}registered_users`)) || []; } catch { return []; } }
  _saveUsersStore(users) { localStorage.setItem(`${DB_PREFIX}registered_users`, JSON.stringify(users)); }
  _loadSession() { try { this._user = JSON.parse(localStorage.getItem(`${DB_PREFIX}current_session`)) || null; } catch { this._user = null; } }
  _saveSession(user) { this._user = user; if (user) localStorage.setItem(`${DB_PREFIX}current_session`, JSON.stringify(user)); else localStorage.removeItem(`${DB_PREFIX}current_session`); }

  async _hashPassword(password, salt) {
    const useSalt = salt || crypto.getRandomValues(new Uint8Array(16)).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');
    const encoded = new TextEncoder().encode(useSalt + password);
    let digest = await crypto.subtle.digest('SHA-256', encoded);
    for (let i = 1; i < 3; i++) { const c = new Uint8Array(digest.byteLength + encoded.byteLength); c.set(new Uint8Array(digest), 0); c.set(encoded, digest.byteLength); digest = await crypto.subtle.digest('SHA-256', c); }
    return { salt: useSalt, hash: `sha256:${useSalt}:${Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')}` };
  }

  async register({ organizationName, email, fullName, role, password }) {
    const users = this._getUsersStore();
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) throw new Error('An account with this email already exists.');
    const { hash } = await this._hashPassword(password);
    const newUser = { id: generateId(), email: email.toLowerCase(), full_name: fullName || email.split('@')[0], organization_name: organizationName, role, password_hash: hash, created_date: new Date().toISOString() };
    users.push(newUser); this._saveUsersStore(users);
    const sessionUser = { ...newUser }; delete sessionUser.password_hash; this._saveSession(sessionUser); return sessionUser;
  }

  async login({ email, password }) {
    const users = this._getUsersStore();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No account found with this email.');
    let valid = false;
    if (user.password_hash.startsWith('sha256:')) { const p = user.password_hash.split(':'); const { hash } = await this._hashPassword(password, p[1]); valid = hash === user.password_hash; }
    else { let h = 0; for (let i = 0; i < password.length; i++) h = ((h << 5) - h + password.charCodeAt(i)) | 0; valid = user.password_hash === `tl_${Math.abs(h).toString(36)}_${password.length}`; }
    if (!valid) throw new Error('Incorrect password.');
    const sessionUser = { ...user }; delete sessionUser.password_hash; this._saveSession(sessionUser); return sessionUser;
  }

  async me() { if (!this._user) throw new Error('Not authenticated'); return this._user; }
  isLoggedIn() { return !!this._user; }
  logout() { this._saveSession(null); }
  async resetPassword({ email, organizationName, newPassword }) {
    const users = this._getUsersStore();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) throw new Error('No account found.');
    if (user.organization_name?.toLowerCase() !== organizationName?.toLowerCase()) throw new Error('Organization name does not match.');
    const { hash } = await this._hashPassword(newPassword);
    const idx = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
    users[idx].password_hash = hash; this._saveUsersStore(users); return { success: true };
  }
  async extendSession() {}
  redirectToLogin() {}
}

// --- Integrations (Built-in AI Engine) ---
class LocalIntegrations {
  constructor() {
    this._engine = null;
    this._enginePromise = null;
    this.Core = {
      InvokeLLM: async (params) => {
        const engine = await this._getEngine();
        return engine.routeInvokeLLM(params);
      },
      SendEmail: async (params) => { console.log('[TriageLink] Email queued:', params); return { success: true, message: 'Email logged locally' }; },
      SendSMS: async (params) => { console.log('[TriageLink] SMS queued:', params); return { success: true, message: 'SMS logged locally' }; },
      UploadFile: async (params) => { console.log('[TriageLink] File upload:', params?.name); return { url: 'local://uploaded-file', success: true }; },
      GenerateImage: async (params) => { console.log('[TriageLink] Image generation:', params); return { url: 'local://generated-image', success: true }; },
      ExtractDataFromUploadedFile: async (params) => { console.log('[TriageLink] Data extraction:', params); return { data: {}, success: true }; },
    };
  }

  async _getEngine() {
    if (this._engine) return this._engine;
    if (!this._enginePromise) {
      this._enginePromise = import('@/lib/triageAI.js').then(mod => {
        this._engine = mod;
        return mod;
      });
    }
    return this._enginePromise;
  }
}

// --- Audit helper (renderer-side) ---
const auditHelper = {
  log: async (entry) => {
    if (ipc) {
      const user = getCurrentUser();
      await ipc.audit.log({ ...entry, userId: entry.userId || user?.id, userEmail: entry.userEmail || user?.email });
    }
  },
  list: async (limit, offset, filters) => {
    if (ipc) return ipc.audit.list(limit, offset, filters);
    return [];
  },
};

// --- Settings helper ---
const settingsHelper = {
  get: async (key) => ipc ? ipc.settings.get(key) : localStorage.getItem(`${DB_PREFIX}${key}`),
  set: async (key, value) => {
    if (ipc) await ipc.settings.set(key, value);
    else localStorage.setItem(`${DB_PREFIX}${key}`, value);
  },
};

// --- Backup helper ---
const backupHelper = ipc ? {
  create: () => ipc.backup.create(),
  restore: () => ipc.backup.restore(),
  export: () => ipc.backup.export(),
} : {
  create: async () => ({ success: false, message: 'Backup only available in Electron' }),
  restore: async () => ({ success: false, message: 'Restore only available in Electron' }),
  export: async () => ({ success: false, message: 'Export only available in Electron' }),
};

// --- Migration ---
async function migrateLocalStorageIfNeeded() {
  if (!ipc) return;
  const migrated = sessionStorage.getItem(`${DB_PREFIX}migrated`);
  if (migrated) return;

  const data = {};
  let hasData = false;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('triagelink_entity_') || key === 'triagelink_registered_users') {
      data[key] = localStorage.getItem(key);
      hasData = true;
    }
  }

  if (hasData) {
    try {
      await ipc.migrate.fromLocalStorage(data);
      for (const key of Object.keys(data)) localStorage.removeItem(key);
      console.log('[TriageLink] localStorage data migrated to SQLite');
    } catch (err) {
      console.warn('[TriageLink] Migration failed:', err.message);
    }
  }
  sessionStorage.setItem(`${DB_PREFIX}migrated`, '1');
}

// --- App Client ---
class AppClient {
  constructor() {
    this._entityStores = {};
    this.auth = ipc ? new IPCAuth() : new LocalAuth();
    this.integrations = new LocalIntegrations();
    this.audit = auditHelper;
    this.settings = settingsHelper;
    this.backup = backupHelper;
    this.appLogs = { logUserInApp: async () => {} };

    this.entities = new Proxy({}, {
      get: (_target, name) => {
        if (typeof name !== 'string') return undefined;
        if (!this._entityStores[name]) {
          this._entityStores[name] = ipc ? new IPCEntityStore(name) : new LocalEntityStore(name);
        }
        return this._entityStores[name];
      },
    });

    this._init();
  }

  async _init() {
    if (ipc) {
      await migrateLocalStorageIfNeeded();
      if (this.auth.init) await this.auth.init();
    }
  }
}

export const appClient = new AppClient();
