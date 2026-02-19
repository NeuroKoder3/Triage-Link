const DB_PREFIX = 'triagelink_';

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(entityName, callback) {
    if (!this.listeners.has(entityName)) {
      this.listeners.set(entityName, new Set());
    }
    this.listeners.get(entityName).add(callback);
    return () => this.listeners.get(entityName)?.delete(callback);
  }

  emit(entityName, event) {
    this.listeners.get(entityName)?.forEach((cb) => {
      try {
        cb(event);
      } catch (e) {
        console.error('[TriageLink] Subscription callback error:', e);
      }
    });
  }
}

const eventBus = new EventBus();

class EntityStore {
  constructor(name) {
    this.name = name;
    this.storageKey = `${DB_PREFIX}entity_${name}`;
  }

  _getAll() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  _saveAll(items) {
    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  _sort(items, sortField) {
    if (!sortField) return items;
    const desc = sortField.startsWith('-');
    const field = desc ? sortField.slice(1) : sortField;
    return [...items].sort((a, b) => {
      const aVal = a[field] ?? '';
      const bVal = b[field] ?? '';
      if (aVal < bVal) return desc ? 1 : -1;
      if (aVal > bVal) return desc ? -1 : 1;
      return 0;
    });
  }

  _matchesFilter(item, criteria) {
    return Object.entries(criteria).every(([key, value]) => {
      if (value === undefined || value === null) return true;
      return item[key] === value;
    });
  }

  async list(sortField, limit) {
    let items = this._getAll();
    items = this._sort(items, sortField);
    if (limit) items = items.slice(0, limit);
    return items;
  }

  async filter(criteria, sortField, limit) {
    let items = this._getAll().filter((item) =>
      this._matchesFilter(item, criteria)
    );
    items = this._sort(items, sortField);
    if (limit) items = items.slice(0, limit);
    return items;
  }

  async create(data) {
    const items = this._getAll();
    const newItem = {
      id: generateId(),
      ...data,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    items.push(newItem);
    this._saveAll(items);
    eventBus.emit(this.name, { type: 'created', data: newItem });
    return newItem;
  }

  async update(id, data) {
    const items = this._getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1)
      throw new Error(`Entity ${this.name} with id ${id} not found`);
    items[index] = {
      ...items[index],
      ...data,
      updated_date: new Date().toISOString(),
    };
    this._saveAll(items);
    eventBus.emit(this.name, { type: 'updated', data: items[index] });
    return items[index];
  }

  async delete(id) {
    const items = this._getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1)
      throw new Error(`Entity ${this.name} with id ${id} not found`);
    const deleted = items.splice(index, 1)[0];
    this._saveAll(items);
    eventBus.emit(this.name, { type: 'deleted', data: deleted });
    return deleted;
  }

  subscribe(callback) {
    return eventBus.on(this.name, callback);
  }
}

class LocalAuth {
  constructor() {
    this._user = null;
    this._loadUser();
  }

  _loadUser() {
    try {
      const raw = localStorage.getItem(`${DB_PREFIX}current_user`);
      this._user = raw ? JSON.parse(raw) : null;
    } catch {
      this._user = null;
    }
    if (!this._user) {
      this._user = {
        id: 'local-admin-001',
        email: 'admin@triagelink.local',
        full_name: 'Local Administrator',
        role: 'admin',
        created_date: new Date().toISOString(),
      };
      localStorage.setItem(
        `${DB_PREFIX}current_user`,
        JSON.stringify(this._user)
      );
    }
  }

  async me() {
    return this._user;
  }

  logout(redirectUrl) {
    if (redirectUrl) {
      window.location.href = '/';
    }
  }

  redirectToLogin() {
    // No-op in offline mode; user is always authenticated locally
  }
}

class LocalIntegrations {
  constructor() {
    this.Core = {
      InvokeLLM: async (params) => {
        const endpoint =
          localStorage.getItem(`${DB_PREFIX}llm_endpoint`) || '';
        const apiKey =
          localStorage.getItem(`${DB_PREFIX}llm_api_key`) || '';

        if (endpoint) {
          try {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
              },
              body: JSON.stringify({
                model:
                  localStorage.getItem(`${DB_PREFIX}llm_model`) || 'gpt-4',
                messages: [
                  ...(params.system_prompt
                    ? [{ role: 'system', content: params.system_prompt }]
                    : []),
                  {
                    role: 'user',
                    content: params.prompt || params.user_prompt || '',
                  },
                ],
                ...(params.response_json_schema
                  ? { response_format: { type: 'json_object' } }
                  : {}),
              }),
            });
            const data = await response.json();
            return (
              data.choices?.[0]?.message?.content || JSON.stringify(data)
            );
          } catch (error) {
            console.warn(
              '[TriageLink] LLM endpoint call failed, using fallback:',
              error.message
            );
          }
        }

        if (params.response_json_schema) {
          return JSON.stringify({
            analysis:
              'Offline mode — configure an LLM endpoint in Settings for AI analysis.',
            recommendations: [
              'Connect a local LLM (e.g. Ollama) or set an OpenAI-compatible API key.',
            ],
            confidence: 0,
          });
        }
        return 'Offline mode — configure an LLM endpoint in Settings for AI-powered analysis.';
      },

      SendEmail: async (params) => {
        console.log('[TriageLink] Email queued (offline):', params);
        return { success: true, message: 'Email logged locally (offline mode)' };
      },

      SendSMS: async (params) => {
        console.log('[TriageLink] SMS queued (offline):', params);
        return { success: true, message: 'SMS logged locally (offline mode)' };
      },

      UploadFile: async (params) => {
        console.log('[TriageLink] File upload (offline):', params?.name);
        return { url: 'local://uploaded-file', success: true };
      },

      GenerateImage: async (params) => {
        console.log('[TriageLink] Image generation (offline):', params);
        return { url: 'local://generated-image', success: true };
      },

      ExtractDataFromUploadedFile: async (params) => {
        console.log('[TriageLink] Data extraction (offline):', params);
        return { data: {}, success: true };
      },
    };
  }
}

class AppClient {
  constructor() {
    this._entityStores = {};
    this.auth = new LocalAuth();
    this.integrations = new LocalIntegrations();
    this.appLogs = {
      logUserInApp: async () => {},
    };

    this.entities = new Proxy(
      {},
      {
        get: (_target, name) => {
          if (typeof name !== 'string') return undefined;
          if (!this._entityStores[name]) {
            this._entityStores[name] = new EntityStore(name);
          }
          return this._entityStores[name];
        },
      }
    );
  }
}

export const appClient = new AppClient();
