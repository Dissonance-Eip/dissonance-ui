/**
 * Top-level Electron lifecycle controller.
 *
 * Owns:
 *   - The single MainWindowManager
 *   - The quit/close flush dance: before the window is destroyed (X button)
 *     or the app exits (Cmd+Q), the renderer is asked to drain its tag-write
 *     queue. Both paths funnel through _flushThroughRenderer() with a 3s
 *     safety timeout so an unresponsive renderer can never hang quit.
 *   - Final temp-file cleanup on `will-quit` (exactly once per session).
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const { MainWindowManager } = require('./MainWindowManager');
const { registerFileHandlers } = require('../ipcHandlers/fileHandlers');
const { cleanupAllTempFiles } = require('../ipcHandlers/core/coreSetup');

const FLUSH_TIMEOUT_MS = 3000;

class MainApplication {
  constructor({ uiRoot = path.join(__dirname, '..') } = {}) {
    this.uiRoot = uiRoot;
    this.windowManager = new MainWindowManager({
      preloadPath: path.join(this.uiRoot, 'preload.js'),
    });

    // Lifecycle flags
    this._readyToQuit = false; // before-quit may proceed without re-flush
    this._closeFlushPending = false; // a close-event flush is in progress
    this._closeFlushed = false; // close-event flush already completed
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
      // On macOS we'd typically keep the app alive after closing the last
      // window, but for the beta we quit on all platforms.
      app.quit();
    });

    app.on('before-quit', (event) => {
      if (this._readyToQuit) return;

      const win = this.windowManager.getWindow();
      if (!win || win.isDestroyed()) {
        // No window to flush through (likely closed via X already, in which
        // case the close-handler did the flush). Just exit.
        this._readyToQuit = true;
        app.quit();
        return;
      }

      // If the close-event flush has already run for this window, skip the
      // round-trip and quit immediately.
      if (this._closeFlushed) {
        this._readyToQuit = true;
        app.quit();
        return;
      }

      event.preventDefault();
      this._flushThroughRenderer(win, () => {
        this._readyToQuit = true;
        app.quit();
      });
    });

    // Final cleanup runs exactly once, just before the app actually exits.
    app.on('will-quit', () => this._cleanup());
  }

  _createAndInitWindow() {
    const hadWindow = !!this.windowManager.getWindow();
    const win = this.windowManager.createWindow({});

    if (!hadWindow) {
      // Intercept the window's close event so we can flush any pending tag
      // writes BEFORE the window is destroyed (otherwise before-quit fires
      // with no live webContents to talk to and edits are lost on Win/Linux,
      // where clicking the X is the most common quit path).
      win.on('close', (event) => {
        if (this._closeFlushed || this._closeFlushPending) return;
        event.preventDefault();
        this._closeFlushPending = true;
        this._flushThroughRenderer(win, () => {
          this._closeFlushed = true;
          this._closeFlushPending = false;
          win.close();
        });
      });

      win.loadFile(path.join(this.uiRoot, 'index.html')).catch((e) => {
        console.error('Failed to load index.html:', e);
      });
      registerFileHandlers(win);
    }

    return win;
  }

  /**
   * Ask the renderer to drain its tag-write queue, then call onDone.
   * A safety timeout guarantees we never hang if the renderer is unresponsive.
   */
  _flushThroughRenderer(win, onDone) {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      onDone();
    };
    const timeout = setTimeout(finish, FLUSH_TIMEOUT_MS);
    ipcMain.once('app:flushDone', () => {
      clearTimeout(timeout);
      finish();
    });
    try {
      win.webContents.send('app:flushRequest');
    } catch (_e) {
      // webContents may be gone — fall back to the timeout.
    }
  }

  _cleanup() {
    Promise.resolve(cleanupAllTempFiles()).catch(() => {});
  }
}

module.exports = { MainApplication };
