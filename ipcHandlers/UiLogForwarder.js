const { ipcMain } = require('electron');

class UiLogForwarder {
  register() {
    ipcMain.on('ui:log', (_event, payload) => {
      try {
        const level = payload && payload.level ? String(payload.level) : 'log';
        const message = payload && payload.message != null ? String(payload.message) : '';
        const fn = typeof console[level] === 'function' ? console[level] : console.log;
        fn(`[UI] ${message}`);
      } catch (e) {
        console.log('[UI] (log forwarding failed)', e);
      }
    });
  }
}

module.exports = { UiLogForwarder };
