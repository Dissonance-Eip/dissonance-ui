/**
 * Singleton wiring for the core addon side of the app.
 * Loads the native addon, creates the shared TempFileManager, and
 * constructs the CoreIpcHandlers instance — all at module-load time.
 * Exposes `registerCoreHandlers(win)` for use during window setup and
 * `cleanupAllTempFiles()` for the will-quit hook.
 */
const { CoreAddonLoader } = require('./CoreAddonLoader');
const { TempFileManager } = require('./TempFileManager');
const { CoreIpcHandlers } = require('./CoreIpcHandlers');

const tempFileManager = new TempFileManager();
const coreAddon = new CoreAddonLoader().load();
const coreIpcHandlers = new CoreIpcHandlers({ coreAddon, tempFileManager });

function registerCoreHandlers(mainWindow) {
  coreIpcHandlers.register(mainWindow);
}

async function cleanupAllTempFiles() {
  await tempFileManager.cleanupAll();
}

module.exports = { registerCoreHandlers, cleanupAllTempFiles };
