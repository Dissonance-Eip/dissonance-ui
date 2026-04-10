const { app, BrowserWindow } = require('electron');
const path = require('path');
const { registerFileHandlers } = require('./ipcHandlers/fileHandlers');
const { cleanupAllTempFiles } = require('./ipcHandlers/dissonanceCore');

let mainWindow = null;

function createWindow() {
  if (mainWindow) {
    return mainWindow;
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 740,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    try {
      mainWindow.show();
    } catch (_) {}
  });

  mainWindow.on('closed', () => {
    // Best-effort cleanup of any temp processed files.
    Promise.resolve(cleanupAllTempFiles()).catch(() => {});
    mainWindow = null;
  });

  mainWindow
    .loadFile(path.join(__dirname, 'index.html'))
    .catch((e) => console.error('Failed to load index.html:', e));

  registerFileHandlers(mainWindow);
  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  Promise.resolve(cleanupAllTempFiles()).catch(() => {});
  app.quit();
});

app.on('before-quit', () => {
  Promise.resolve(cleanupAllTempFiles()).catch(() => {});
});
