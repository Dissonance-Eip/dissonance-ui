import { BaseController } from '../base/BaseController.js';

export class AppController extends BaseController {
  constructor({ api, logger, router, state, welcomeView, mainView, wavMetadataService }) {
    super();
    this.api = api;
    this.logger = logger;
    this.router = router;
    this.state = state;
    this.welcomeView = welcomeView;
    this.mainView = mainView;
    this.wavMetadataService = wavMetadataService;

    this._onGlobalDragOver = this._onGlobalDragOver.bind(this);
    this._onGlobalDrop = this._onGlobalDrop.bind(this);
  }

  start() {
    super.start();
    this.welcomeView.mount();
    this.track(() => this.welcomeView.unmount());

    this.mainView.mount();
    this.track(() => this.mainView.unmount());

    this.router.show('welcome');

    this.welcomeView.onFileImported((filePath, sourceLabel) => {
      this.importFile(filePath, sourceLabel);
    });

    this.mainView.onChangeFile(async () => {
      try {
        this.logger?.setStatus?.('Opening file dialog...');
        const filePath = await this.api.openFile();
        if (!filePath) {
          this.logger?.log?.('No file selected');
          this.logger?.setStatus?.('Import canceled');
          return;
        }
        this.importFile(filePath, 'Selected');
      } catch (err) {
        this.logger?.error?.(`Import failed: ${err}`);
      }
    });

    this.mainView.onProcess(() => this.processCurrentFile());
    this.mainView.onExport(() => this.exportProcessedFile());

    // Prevent the browser/Electron from navigating to the dropped file.
    window.addEventListener('dragover', this._onGlobalDragOver);
    window.addEventListener('drop', this._onGlobalDrop);
    this.track(() => window.removeEventListener('dragover', this._onGlobalDragOver));
    this.track(() => window.removeEventListener('drop', this._onGlobalDrop));

    // Listen for core status events from main via preload bridge
    const unsubscribe = this.api.onCoreStatus((data) => {
      const msg = data && data.message ? data.message : JSON.stringify(data);
      this.logger?.log?.(`core:status — ${msg}`);
    });
    if (typeof unsubscribe === 'function') {
      this.track(unsubscribe);
    }

    this._syncButtons();
    this.logger?.setStatus?.('Ready');
  }

  importFile(filePath, sourceLabel) {
    if (this.state.processedFilePath) {
      // Best-effort cleanup of the previous processed temp file.
      this.api.cleanupProcessedFile(this.state.processedFilePath).catch(() => {});
    }

    this.state.setCurrentFilePath(filePath);
    this.mainView.setSelectedFile(filePath);
    this.mainView.setBasicWavInfo(this.wavMetadataService.toBasicInfo(filePath, null));

    this.logger?.log?.(`${sourceLabel} file: ${filePath}`);
    this.logger?.setStatus?.('File imported');

    this.router.show('main');
    this._syncButtons();

    // Fetch WAV metadata immediately (does not create a processed file).
    this._inspectCurrentFile(filePath);
  }

  async _inspectCurrentFile(filePath) {
    if (!filePath) return;
    try {
      this.logger?.setStatus?.('Reading metadata…');
      const resp = await this.api.inspectFile(filePath);
      if (resp && resp.ok && resp.metadata) {
        this.mainView.setBasicWavInfo(
          this.wavMetadataService.toBasicInfoFromInspect(filePath, resp)
        );
        this.logger?.setStatus?.('Ready');
        return;
      }

      const errMsg = resp && resp.error ? resp.error : 'Unknown error';
      this.logger?.setStatus?.(`Metadata failed: ${errMsg}`, true);
      this.logger?.log?.(`Metadata failed: ${errMsg}`);
    } catch (err) {
      this.logger?.error?.(`Metadata failed: ${err}`);
    }
  }

  async processCurrentFile() {
    if (!this.state.currentFilePath) {
      this.logger?.setStatus?.('No file to process', true);
      return;
    }

    try {
      this.logger?.setStatus?.('Processing...');
      this.logger?.log?.('Sending processing request to dissonance-core (simulated)');

      const resp = await this.api.processFile(this.state.currentFilePath);
      if (resp && resp.ok && resp.processedPath) {
        this.state.setProcessedFilePath(resp.processedPath);

        this.mainView.setBasicWavInfo(
          this.wavMetadataService.toBasicInfoFromProcess(this.state.currentFilePath, resp)
        );

        this.logger?.setStatus?.('Processed');
        this.logger?.log?.(`Processing complete: ${resp.processedPath}`);
        this._syncButtons();
        return;
      }

      const errMsg = resp && resp.error ? resp.error : 'Unknown error';
      this.logger?.setStatus?.(`Processing failed: ${errMsg}`, true);
      this.logger?.log?.(`Processing failed: ${errMsg}`);
    } catch (err) {
      this.logger?.error?.(`Processing failed: ${err}`);
    }
  }

  async exportProcessedFile() {
    if (!this.state.processedFilePath) {
      this.logger?.setStatus?.('No processed file to export', true);
      return;
    }

    try {
      this.logger?.setStatus?.('Exporting...');
      this.logger?.log?.('Triggering export dialog');

      const resp = await this.api.exportFile(this.state.processedFilePath);
      if (resp && resp.ok && resp.exportedPath) {
        // After export, the main process cleans up the temp processed file.
        this.state.setProcessedFilePath(null);
        this._syncButtons();
        this.logger?.setStatus?.('Exported');
        this.logger?.log?.(`Exported to: ${resp.exportedPath}`);
        return;
      }

      const errMsg = resp && resp.error ? resp.error : 'Unknown error';
      this.logger?.setStatus?.(`Export failed: ${errMsg}`, true);
      this.logger?.log?.(`Export failed: ${errMsg}`);
    } catch (err) {
      this.logger?.error?.(`Export failed: ${err}`);
    }
  }

  _syncButtons() {
    this.mainView.setProcessEnabled(this.state.hasCurrentFile());
    this.mainView.setExportEnabled(this.state.hasProcessedFile());
  }

  _onGlobalDragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  }

  _onGlobalDrop(e) {
    e.preventDefault();

    // Allow dropping anywhere in the window (useful after you are on the main view).
    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) return;

    const file = dt.files[0];
    const filePath = this.api?.getPathForFile ? this.api.getPathForFile(file) : file.path || null;
    if (!filePath) return;

    this.importFile(filePath, 'Dropped');
  }
}
