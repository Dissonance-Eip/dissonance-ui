import { TerminalLogger } from '../infrastructure/TerminalLogger.js';
import { DissonanceApi } from '../infrastructure/DissonanceApi.js';
import { ViewRouter } from '../infrastructure/ViewRouter.js';
import { AppState } from '../state/AppState.js';
import { WelcomeView } from '../views/WelcomeView.js';
import { MainView } from '../views/MainView.js';
import { AppController } from '../controllers/AppController.js';
import { WavMetadataService } from '../services/WavMetadataService.js';

export function bootstrap() {
  const api = new DissonanceApi(window.dissonance);
  const logger = new TerminalLogger(window.dissonance);
  logger.log('Renderer DOMContentLoaded');

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
  const wavMetadataService = new WavMetadataService();

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
    metaFilenameEl: document.getElementById('metaFilename'),
    metaDurationEl: document.getElementById('metaDuration'),
    metaSampleRateEl: document.getElementById('metaSampleRate'),
    metaChannelsEl: document.getElementById('metaChannels'),
    logger,
  });

  const controller = new AppController({
    api,
    logger,
    router,
    state,
    welcomeView,
    mainView,
    wavMetadataService,
  });

  controller.start();

  // Expose for debugging in DevTools
  window.__logger = logger;
  window.__app = controller;
}
