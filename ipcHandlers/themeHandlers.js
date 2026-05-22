/**
 * Theme IPC: exposes the current OS light/dark mode to the renderer and
 * pushes updates over `ui:systemTheme` when the OS preference changes.
 * The renderer's SystemThemeWatcher toggles the `dark` Tailwind class on
 * <html> based on these signals.
 */
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
