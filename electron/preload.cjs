const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('app:version'),
  getPlatform: () => ipcRenderer.invoke('app:platform'),
  getUserDataPath: () => ipcRenderer.invoke('app:userData'),

  db: {
    auth: {
      register: (params) => ipcRenderer.invoke('db:auth:register', params),
      login: (params) => ipcRenderer.invoke('db:auth:login', params),
      validate: (sessionId) => ipcRenderer.invoke('db:auth:validate', sessionId),
      extend: (sessionId) => ipcRenderer.invoke('db:auth:extend', sessionId),
      logout: (sessionId) => ipcRenderer.invoke('db:auth:logout', sessionId),
      resetPassword: (params) => ipcRenderer.invoke('db:auth:resetPassword', params),
    },
    entity: {
      list: (type, sort, limit) => ipcRenderer.invoke('db:entity:list', type, sort, limit),
      filter: (type, criteria, sort, limit) => ipcRenderer.invoke('db:entity:filter', type, criteria, sort, limit),
      create: (type, data, userId, userEmail) => ipcRenderer.invoke('db:entity:create', type, data, userId, userEmail),
      update: (type, id, data, userId, userEmail) => ipcRenderer.invoke('db:entity:update', type, id, data, userId, userEmail),
      delete: (type, id, userId, userEmail) => ipcRenderer.invoke('db:entity:delete', type, id, userId, userEmail),
    },
    audit: {
      log: (entry) => ipcRenderer.invoke('db:audit:log', entry),
      list: (limit, offset, filters) => ipcRenderer.invoke('db:audit:list', limit, offset, filters),
    },
    settings: {
      get: (key) => ipcRenderer.invoke('db:settings:get', key),
      set: (key, value) => ipcRenderer.invoke('db:settings:set', key, value),
    },
    backup: {
      create: () => ipcRenderer.invoke('db:backup:create'),
      restore: () => ipcRenderer.invoke('db:backup:restore'),
      export: () => ipcRenderer.invoke('db:backup:export'),
    },
    migrate: {
      fromLocalStorage: (data) => ipcRenderer.invoke('db:migrate:localStorage', data),
    },
  },
});
