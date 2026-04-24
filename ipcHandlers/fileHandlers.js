const { ipcMain } = require('electron');
const fs = require('fs').promises;
const path = require('path');

const { UiLogForwarder } = require('./UiLogForwarder');
const { FileDialogHandlers } = require('./FileDialogHandlers');

function registerFileHandlers(mainWindow) {
  new UiLogForwarder().register();
  new FileDialogHandlers().register();

  try {
    const { registerThemeHandlers } = require('./themeHandlers');
    registerThemeHandlers(mainWindow);
  } catch (err) {
    console.error('Failed to register theme handlers:', err);
  }

  ipcMain.handle('file:getStats', async (_event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return { name: path.basename(filePath), size: stats.size, mtimeMs: stats.mtimeMs };
    } catch (err) {
      console.error('Failed to get file stats:', err);
      return null;
    }
  });

  // Delegate core processing/export handlers to a single module so it's easy to swap in the
  // real native addon later. The module handles loading the addon and falling back to simulation.
  try {
    const { registerCoreHandlers } = require('./dissonanceCore');
    registerCoreHandlers(mainWindow);
  } catch (err) {
    console.error('Failed to register core handlers:', err);
  }
}

module.exports = { registerFileHandlers };
