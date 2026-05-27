/**
 * Wraps the single application BrowserWindow.
 * Holds the configured preload path, creates the window on first request,
 * and exposes `getWindow()` so other modules don't have to track lifecycle.
 * contextIsolation is on / nodeIntegration is off (renderer security).
 */
const { BrowserWindow } = require('electron');

class MainWindowManager {
  constructor({ preloadPath }) {
    this.preloadPath = preloadPath;
    this._window = null;
  }

  createWindow({ width = 800, height = 800 } = {}) {
    if (this._window) return this._window;

    this._window = new BrowserWindow({
      width,
      height,
      webPreferences: {
        preload: this.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });

    this._window.once('ready-to-show', () => {
      try {
        this._window.show();
      } catch (_e) {
        // ignore
      }
    });

    this._window.on('closed', () => {
      this._window = null;
    });

    return this._window;
  }

  getWindow() {
    return this._window;
  }
}

module.exports = { MainWindowManager };
