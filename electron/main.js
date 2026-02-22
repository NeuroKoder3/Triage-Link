import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import log from 'electron-log/main.js';
import { initEncryption } from './encryption.js';
import {
  initDatabase, closeDatabase,
  registerUser, loginUser, validateSession, extendSession, destroySession, resetUserPassword,
  entityList, entityFilter, entityCreate, entityUpdate, entityDelete,
  auditLog, getAuditLogs,
  getSetting, setSetting,
  createBackup, restoreBackup, exportData,
  migrateFromLocalStorage,
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('TriageLink starting …');

if (process.platform === 'win32') {
  app.setAppUserModelId('com.triagelink.app');
}

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'TriageLink',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.info('Main window visible');
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  initEncryption();
  initDatabase();
  log.info('Database and encryption initialized');

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  closeDatabase();
});

function registerIpcHandlers() {
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:platform', () => process.platform);
  ipcMain.handle('app:userData', () => app.getPath('userData'));

  // --- Auth ---
  ipcMain.handle('db:auth:register', (_e, params) => {
    return registerUser(params);
  });

  ipcMain.handle('db:auth:login', (_e, params) => {
    return loginUser(params);
  });

  ipcMain.handle('db:auth:validate', (_e, sessionId) => {
    return validateSession(sessionId);
  });

  ipcMain.handle('db:auth:extend', (_e, sessionId) => {
    extendSession(sessionId);
    return { success: true };
  });

  ipcMain.handle('db:auth:logout', (_e, sessionId) => {
    destroySession(sessionId);
    return { success: true };
  });

  ipcMain.handle('db:auth:resetPassword', (_e, params) => {
    return resetUserPassword(params);
  });

  // --- Entities ---
  ipcMain.handle('db:entity:list', (_e, entityType, sortField, limit) => {
    return entityList(entityType, sortField, limit);
  });

  ipcMain.handle('db:entity:filter', (_e, entityType, criteria, sortField, limit) => {
    return entityFilter(entityType, criteria, sortField, limit);
  });

  ipcMain.handle('db:entity:create', (_e, entityType, data, userId, userEmail) => {
    return entityCreate(entityType, data, userId, userEmail);
  });

  ipcMain.handle('db:entity:update', (_e, entityType, id, data, userId, userEmail) => {
    return entityUpdate(entityType, id, data, userId, userEmail);
  });

  ipcMain.handle('db:entity:delete', (_e, entityType, id, userId, userEmail) => {
    return entityDelete(entityType, id, userId, userEmail);
  });

  // --- Audit ---
  ipcMain.handle('db:audit:log', (_e, entry) => {
    auditLog(entry);
    return { success: true };
  });

  ipcMain.handle('db:audit:list', (_e, limit, offset, filters) => {
    return getAuditLogs(limit, offset, filters);
  });

  // --- Settings ---
  ipcMain.handle('db:settings:get', (_e, key) => {
    return getSetting(key);
  });

  ipcMain.handle('db:settings:set', (_e, key, value) => {
    setSetting(key, value);
    return { success: true };
  });

  // --- Backup ---
  ipcMain.handle('db:backup:create', async () => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save Database Backup',
      defaultPath: `triagelink-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    });
    if (result.canceled) return { canceled: true };
    const backupPath = createBackup(result.filePath);
    return { success: true, path: backupPath };
  });

  ipcMain.handle('db:backup:restore', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Restore Database Backup',
      filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      properties: ['openFile'],
    });
    if (result.canceled) return { canceled: true };
    restoreBackup(result.filePaths[0]);
    return { success: true };
  });

  ipcMain.handle('db:backup:export', () => {
    return exportData();
  });

  // --- Migration ---
  ipcMain.handle('db:migrate:localStorage', (_e, data) => {
    return migrateFromLocalStorage(data);
  });
}
