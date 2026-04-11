import { BaseView } from '../base/BaseView.js';

export class AnalyzeView extends BaseView {
  constructor({
    selectedFileEl,
    changeFileBtn,
    metaFilenameEl,
    metaDurationEl,
    metaSampleRateEl,
    metaChannelsEl,
    nextBtn,
  }) {
    super();
    this.selectedFileEl = selectedFileEl;
    this.changeFileBtn = changeFileBtn;
    this.metaFilenameEl = metaFilenameEl;
    this.metaDurationEl = metaDurationEl;
    this.metaSampleRateEl = metaSampleRateEl;
    this.metaChannelsEl = metaChannelsEl;
    this.nextBtn = nextBtn;
  }

  mount() {
    super.mount();
  }

  setSelectedFile(filePath) {
    if (!this.selectedFileEl) return;
    this.selectedFileEl.textContent = filePath || 'No file selected';
    this.selectedFileEl.title = filePath || '';
  }

  setBasicWavInfo(basicInfo) {
    const { filename, durationSec, sampleRate, channels } = basicInfo || {};
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

  setNextEnabled(enabled) {
    if (!this.nextBtn) return;
    this.nextBtn.disabled = !enabled;
  }

  onChangeFile(cb) {
    if (!this.changeFileBtn) return;
    this.listen(this.changeFileBtn, 'click', cb);
  }

  onNext(cb) {
    if (!this.nextBtn) return;
    this.listen(this.nextBtn, 'click', cb);
  }
}
