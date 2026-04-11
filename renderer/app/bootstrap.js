import { TerminalLogger } from '../infrastructure/TerminalLogger.js';
import { DissonanceApi } from '../infrastructure/DissonanceApi.js';
import { ViewRouter } from '../infrastructure/ViewRouter.js';
import { AppState } from '../state/AppState.js';
import { UploadView } from '../views/UploadView.js';
import { AnalyzeView } from '../views/AnalyzeView.js';
import { ProcessView } from '../views/ProcessView.js';
import { CompareView } from '../views/CompareView.js';
import { ExportView } from '../views/ExportView.js';
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
    upload: document.getElementById('view-upload'),
    analyze: document.getElementById('view-analyze'),
    process: document.getElementById('view-process'),
    compare: document.getElementById('view-compare'),
    export: document.getElementById('view-export'),
  });

  const state = new AppState();
  const wavMetadataService = new WavMetadataService();

  const uploadView = new UploadView({
    dropZoneEl: document.getElementById('dropZone'),
    api,
    logger,
  });

  const analyzeView = new AnalyzeView({
    selectedFileEl: document.getElementById('analyzeSelectedFile'),
    changeFileBtn: document.getElementById('analyzeChangeFileBtn'),
    metaFilenameEl: document.getElementById('analyzeMetaFilename'),
    metaDurationEl: document.getElementById('analyzeMetaDuration'),
    metaSampleRateEl: document.getElementById('analyzeMetaSampleRate'),
    metaChannelsEl: document.getElementById('analyzeMetaChannels'),
    nextBtn: document.getElementById('analyzeNextBtn'),
  });

  const processView = new ProcessView({
    selectedFileEl: document.getElementById('processSelectedFile'),
    processBtn: document.getElementById('processBtn'),
  });

  const compareView = new CompareView({
    origFilenameEl: document.getElementById('compareOrigFilename'),
    origDurationEl: document.getElementById('compareOrigDuration'),
    origSampleRateEl: document.getElementById('compareOrigSampleRate'),
    origChannelsEl: document.getElementById('compareOrigChannels'),
    procFilenameEl: document.getElementById('compareProcFilename'),
    procDurationEl: document.getElementById('compareProcDuration'),
    procSampleRateEl: document.getElementById('compareProcSampleRate'),
    procChannelsEl: document.getElementById('compareProcChannels'),
    nextBtn: document.getElementById('compareNextBtn'),
  });

  const exportView = new ExportView({
    selectedFileEl: document.getElementById('exportSelectedFile'),
    exportBtn: document.getElementById('exportBtn'),
  });

  const controller = new AppController({
    api,
    logger,
    router,
    state,
    uploadView,
    analyzeView,
    processView,
    compareView,
    exportView,
    wavMetadataService,
  });

  controller.start();

  // Expose for debugging in DevTools
  window.__logger = logger;
  window.__app = controller;
}
