const { contextBridge, ipcRenderer, webUtils } = require('electron');

console.log('Preload script loaded (ui/preload.js)');

contextBridge.exposeInMainWorld('dissonance', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch (_e) {
      return null;
    }
  },
  getFileStats: (filePath) => ipcRenderer.invoke('file:getStats', filePath),
  inspectFile: (filePath) => ipcRenderer.invoke('core:inspect', filePath),
  processFile: (filePath) => ipcRenderer.invoke('core:process', filePath),
  exportFile: (processedPath) => ipcRenderer.invoke('core:export', processedPath),
  cleanupProcessedFile: (processedPath) =>
    ipcRenderer.invoke('core:cleanupProcessed', processedPath),
  logToMain: (level, message) => ipcRenderer.send('ui:log', { level, message }),
  onCoreStatus: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('core:status', handler);
    return () => ipcRenderer.removeListener('core:status', handler);
  },
});
