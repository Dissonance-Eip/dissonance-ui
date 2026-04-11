import { BaseView } from '../base/BaseView.js';

export class AnalyzeView extends BaseView {
  constructor({
    selectedFileEl,
    changeFileBtn,
    metaFilenameEl,
    metaDurationEl,
    metaSampleRateEl,
    metaChannelsEl,
    waveformEl,
    processBtn,
  }) {
    super();
    this.selectedFileEl = selectedFileEl;
    this.changeFileBtn = changeFileBtn;
    this.metaFilenameEl = metaFilenameEl;
    this.metaDurationEl = metaDurationEl;
    this.metaSampleRateEl = metaSampleRateEl;
    this.metaChannelsEl = metaChannelsEl;
    this.waveformEl = waveformEl;
    this.processBtn = processBtn;

    this._player = null;
    this._currentUrl = null;
  }

  mount() {
    super.mount();
    this.track(() => this.clearAudioPreview());
  }

  setAudioPreviewFile(filePath) {
    if (!this.waveformEl) return;
    if (!filePath) {
      this.clearAudioPreview();
      return;
    }

    const url = this._toFileUrl(filePath);
    if (!url) {
      this.clearAudioPreview();
      return;
    }

    if (this._player && typeof this._player.loadTrack === 'function') {
      this._currentUrl = url;
      this._player.loadTrack(url);
      return;
    }

    this.clearAudioPreview();

    const WaveformPlayer = window.WaveformPlayer;
    if (typeof WaveformPlayer !== 'function') {
      return;
    }

    this._currentUrl = url;
    // Ensure the container is empty before attaching the player.
    this.waveformEl.innerHTML = '';

    this._player = new WaveformPlayer(this.waveformEl, {
      url,
      waveformStyle: 'mirror',
      height: 164,
      showInfo: false,
      showTime: false,
      showBPM: false,
      showPlaybackSpeed: false,
      waveformColor: 'rgba(15, 23, 42, 0.25)',
      progressColor: 'rgba(15, 23, 42, 0.9)',
      buttonColor: 'rgba(15, 23, 42, 0.9)',
    });
  }

  pauseAudioPreview() {
    try {
      this._player?.pause?.();
    } catch (_e) {
      // ignore
    }
  }

  clearAudioPreview() {
    this._currentUrl = null;
    try {
      this._player?.pause?.();
      this._player?.destroy?.();
    } catch (_e) {
      // ignore
    }
    this._player = null;
    if (this.waveformEl) {
      this.waveformEl.innerHTML = '';
    }
  }

  _toFileUrl(filePath) {
    try {
      // filePath should be an absolute path like /Users/... on macOS.
      return new URL(`file://${filePath}`).toString();
    } catch (_e) {
      return null;
    }
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

  setProcessEnabled(enabled) {
    if (!this.processBtn) return;
    this.processBtn.disabled = !enabled;
  }

  onChangeFile(cb) {
    if (!this.changeFileBtn) return;
    this.listen(this.changeFileBtn, 'click', cb);
  }

  onProcess(cb) {
    if (!this.processBtn) return;
    this.listen(this.processBtn, 'click', cb);
  }
}
