/**
 * Electron main-process entry point.
 * Boots a MainApplication rooted at this directory; everything else hangs
 * off that — window creation, IPC handler registration, quit/flush lifecycle.
 */
const { MainApplication } = require('./main/MainApplication');

new MainApplication({ uiRoot: __dirname }).run();
