const { ipcMain, nativeTheme } = require('electron');

function getSystemThemeMode() {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
}

function registerThemeHandlers(mainWindow) {
  try {
    ipcMain.removeHandler('ui:getSystemTheme');
  } catch (_e) {
    // ignore
  }

  ipcMain.handle('ui:getSystemTheme', async () => {
    return { mode: getSystemThemeMode() };
  });

  const forwardTheme = () => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      mainWindow.webContents.send('ui:systemTheme', { mode: getSystemThemeMode() });
    } catch (_e) {
      // ignore
    }
  };

  const listener = () => forwardTheme();
  nativeTheme.on('updated', listener);

  if (mainWindow && typeof mainWindow.on === 'function') {
    mainWindow.on('closed', () => {
      try {
        nativeTheme.removeListener('updated', listener);
      } catch (_e) {
        // ignore
      }
    });
  }
}

module.exports = { registerThemeHandlers };
