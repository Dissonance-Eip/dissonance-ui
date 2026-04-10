export class AppController {
  constructor({ api, logger, router, state, welcomeView, mainView }) {
    this.api = api;
    this.logger = logger;
    this.router = router;
    this.state = state;
    this.welcomeView = welcomeView;
    this.mainView = mainView;

    this._onGlobalDragOver = this._onGlobalDragOver.bind(this);
    this._onGlobalDrop = this._onGlobalDrop.bind(this);
  }

  start() {
    this.welcomeView.mount();

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

    // Listen for core status events from main via preload bridge
    this.api.onCoreStatus((data) => {
      const msg = data && data.message ? data.message : JSON.stringify(data);
      this.logger?.log?.(`core:status — ${msg}`);
    });

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
    const filename = filePath ? String(filePath).split(/[/\\]/).pop() : null;
    this.mainView.setBasicWavInfo({ filename });

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
        const meta = resp.metadata;
        const filename = filePath ? String(filePath).split(/[/\\]/).pop() : null;
        const sampleRate = typeof meta.sampleRate === 'number' ? meta.sampleRate : null;
        const channels = typeof meta.numChannels === 'number' ? meta.numChannels : null;

        let durationSec = null;
        if (typeof meta.numSamples === 'number' && sampleRate && channels) {
          const frames = meta.numSamples / channels;
          durationSec = frames / sampleRate;
        }

        this.mainView.setBasicWavInfo({ filename, durationSec, sampleRate, channels });
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

        const meta = resp.metadata || null;
        const filename = this.state.currentFilePath
          ? String(this.state.currentFilePath).split(/[/\\]/).pop()
          : null;
        const sampleRate = meta && typeof meta.sampleRate === 'number' ? meta.sampleRate : null;
        const channels = meta && typeof meta.numChannels === 'number' ? meta.numChannels : null;

        let durationSec = null;
        if (meta && typeof meta.numSamples === 'number' && sampleRate && channels) {
          const frames = meta.numSamples / channels;
          durationSec = frames / sampleRate;
        } else if (
          meta &&
          typeof meta.subchunk2Size === 'number' &&
          sampleRate &&
          channels &&
          meta.bitsPerSample
        ) {
          const bytesPerSample = meta.bitsPerSample / 8;
          if (bytesPerSample > 0) {
            const totalSamples = meta.subchunk2Size / bytesPerSample;
            durationSec = totalSamples / (channels * sampleRate);
          }
        }

        this.mainView.setBasicWavInfo({ filename, durationSec, sampleRate, channels });

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
    const filePath = file.path || null;
    if (!filePath) return;

    this.importFile(filePath, 'Dropped');
  }
}
