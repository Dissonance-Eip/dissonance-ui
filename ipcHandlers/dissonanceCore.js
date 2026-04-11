const { CoreAddonLoader } = require('./core/CoreAddonLoader');
const { TempFileManager } = require('./core/TempFileManager');
const { CoreIpcHandlers } = require('./core/CoreIpcHandlers');

const tempFileManager = new TempFileManager();
const coreAddon = new CoreAddonLoader().load();
const coreIpcHandlers = new CoreIpcHandlers({ coreAddon, tempFileManager });

function registerCoreHandlers(mainWindow) {
  coreIpcHandlers.register(mainWindow);
}

async function cleanupAllTempFiles() {
  await tempFileManager.cleanupAll();
}

module.exports = { registerCoreHandlers, cleanupAllTempFiles, coreAddon };
