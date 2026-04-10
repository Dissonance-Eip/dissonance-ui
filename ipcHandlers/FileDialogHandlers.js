const { ipcMain, dialog } = require('electron');

class FileDialogHandlers {
  register() {
    ipcMain.handle('dialog:openFile', async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'm4a', 'flac'] }],
      });
      if (canceled || !filePaths || filePaths.length === 0) return null;
      return filePaths[0];
    });
  }
}

module.exports = { FileDialogHandlers };
