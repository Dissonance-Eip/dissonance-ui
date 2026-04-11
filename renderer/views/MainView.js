import { BaseView } from '../base/BaseView.js';

export class MainView extends BaseView {
  constructor({
    selectedFileEl,
    changeFileBtn,
    processBtn,
    exportBtn,
    metaFilenameEl,
    metaDurationEl,
    metaSampleRateEl,
    metaChannelsEl,
    logger,
  }) {
    super();
    this.selectedFileEl = selectedFileEl;
    this.changeFileBtn = changeFileBtn;
    this.processBtn = processBtn;
    this.exportBtn = exportBtn;
    this.metaFilenameEl = metaFilenameEl;
    this.metaDurationEl = metaDurationEl;
    this.metaSampleRateEl = metaSampleRateEl;
    this.metaChannelsEl = metaChannelsEl;
    this.logger = logger;
  }

  mount() {
    super.mount();
  }

  setSelectedFile(filePath) {
    if (!this.selectedFileEl) return;
    this.selectedFileEl.textContent = filePath || 'No file selected';
    this.selectedFileEl.title = filePath || '';
  }

  setBasicWavInfo({ filename, durationSec, sampleRate, channels } = {}) {
    if (this.metaFilenameEl) {
      this.metaFilenameEl.textContent = filename || '—';
      this.metaFilenameEl.title = filename || '';
    }

    if (this.metaDurationEl) {
      if (typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0) {
        const total = Math.round(durationSec);
        const m = Math.floor(total / 60);
        const s = total % 60;
        this.metaDurationEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
      } else {
        this.metaDurationEl.textContent = '—';
      }
    }

    if (this.metaSampleRateEl) {
      this.metaSampleRateEl.textContent = sampleRate ? `${sampleRate} Hz` : '—';
    }

    if (this.metaChannelsEl) {
      this.metaChannelsEl.textContent = channels ? String(channels) : '—';
    }
  }

  setProcessEnabled(enabled) {
    if (!this.processBtn) return;
    this.processBtn.disabled = !enabled;
    this.processBtn.classList.toggle('enabled', enabled);
  }

  setExportEnabled(enabled) {
    if (!this.exportBtn) return;
    this.exportBtn.disabled = !enabled;
    this.exportBtn.classList.toggle('enabled', enabled);
  }

  onChangeFile(cb) {
    if (!this.changeFileBtn) return;
    this.listen(this.changeFileBtn, 'click', cb);
  }

  onProcess(cb) {
    if (!this.processBtn) return;
    this.listen(this.processBtn, 'click', cb);
  }

  onExport(cb) {
    if (!this.exportBtn) return;
    this.listen(this.exportBtn, 'click', cb);
  }
}
