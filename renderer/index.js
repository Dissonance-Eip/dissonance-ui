import { Logger } from './lib/Logger.js';
import { NoopLogger } from './lib/NoopLogger.js';
import { DissonanceApi } from './lib/DissonanceApi.js';
import { ViewRouter } from './lib/ViewRouter.js';
import { AppState } from './state/AppState.js';
import { WelcomeView } from './views/WelcomeView.js';
import { MainView } from './views/MainView.js';
import { AppController } from './controllers/AppController.js';

window.addEventListener('DOMContentLoaded', () => {
  // Dev-only logging. Flip to `false` to remove all logs/status without touching app code.
  // If you later want to delete logging entirely, you can remove this block + the Logger files.
  const ENABLE_DEV_LOGGER = true;

  const logger = ENABLE_DEV_LOGGER ? new Logger('log', 'status') : new NoopLogger();
  logger.log('Renderer DOMContentLoaded');

  if (!ENABLE_DEV_LOGGER) {
    const logContainer = document.getElementById('log-container');
    const status = document.getElementById('status');
    if (logContainer) logContainer.hidden = true;
    if (status) status.hidden = true;
  }

  const api = new DissonanceApi(window.dissonance);
  if (!api.isAvailable()) {
    logger.error('dissonance API NOT available — preload may have failed');
    return;
  }

  logger.log('dissonance API available from preload');

  const router = new ViewRouter({
    welcome: document.getElementById('view-welcome'),
    main: document.getElementById('view-main'),
  });

  const state = new AppState();

  const welcomeView = new WelcomeView({
    dropZoneEl: document.getElementById('dropZone'),
    api,
    logger,
  });

  const mainView = new MainView({
    selectedFileEl: document.getElementById('selectedFile'),
    changeFileBtn: document.getElementById('changeFileBtn'),
    processBtn: document.getElementById('processBtn'),
    exportBtn: document.getElementById('exportBtn'),
    logger,
  });

  const controller = new AppController({
    api,
    logger,
    router,
    state,
    welcomeView,
    mainView,
  });

  controller.start();

  // Expose for debugging in DevTools
  window.__logger = logger;
  window.__app = controller;
});
