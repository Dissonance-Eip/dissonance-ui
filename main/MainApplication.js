const { app, BrowserWindow } = require('electron');
const path = require('path');

const { MainWindowManager } = require('./MainWindowManager');
const { registerFileHandlers } = require('../ipcHandlers/fileHandlers');
const { cleanupAllTempFiles } = require('../ipcHandlers/dissonanceCore');

class MainApplication {
  constructor({ uiRoot = path.join(__dirname, '..') } = {}) {
    this.uiRoot = uiRoot;
    this.windowManager = new MainWindowManager({
      preloadPath: path.join(this.uiRoot, 'preload.js'),
    });
  }

  run() {
    app.whenReady().then(() => {
      this._createAndInitWindow();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this._createAndInitWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      this._cleanup();
      app.quit();
    });

    app.on('before-quit', () => {
      this._cleanup();
    });
  }

  _createAndInitWindow() {
    const hadWindow = !!this.windowManager.getWindow();
    const win = this.windowManager.createWindow({});

    if (!hadWindow) {
      win.on('closed', () => {
        this._cleanup();
      });

      win.loadFile(path.join(this.uiRoot, 'index.html')).catch((e) => {
        console.error('Failed to load index.html:', e);
      });

      registerFileHandlers(win);
    }

    return win;
  }

  _cleanup() {
    Promise.resolve(cleanupAllTempFiles()).catch(() => {});
  }
}

module.exports = { MainApplication };
