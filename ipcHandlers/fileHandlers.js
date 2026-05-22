/**
 * Composition root for all IPC handler registration on the main side.
 * Called once after window creation, it boots:
 *   UiLogForwarder      — `ui:log` channel for renderer console forwarding
 *   FileDialogHandlers  — `dialog:openFile`
 *   themeHandlers       — `ui:getSystemTheme` + `ui:systemTheme` push
 *   coreSetup           — `core:*` handlers (process, readMetadata, writeTags, export, cleanup)
 * Order matters only in that core handlers should register after the window
 * exists so they can push status events into it.
 */
const { UiLogForwarder } = require('./UiLogForwarder');
const { FileDialogHandlers } = require('./FileDialogHandlers');
const { registerThemeHandlers } = require('./themeHandlers');
const { registerCoreHandlers } = require('./core/coreSetup');

function registerFileHandlers(mainWindow) {
  new UiLogForwarder().register();
  new FileDialogHandlers().register();
  registerThemeHandlers(mainWindow);
  registerCoreHandlers(mainWindow);
}

module.exports = { registerFileHandlers };
