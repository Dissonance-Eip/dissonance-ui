import { BaseView } from '../base/BaseView.js';
import { readProcessingSettings } from '../domain/ProcessingSettings.js';

export class AnalyzeView extends BaseView {
  constructor({
    selectedFileEl,
    changeFileBtn,
    metaFilenameEl,
    metaDurationEl,
    metaSampleRateEl,
    metaChannelsEl,
    waveformEl,
    settingFftSizeEl,
    settingMaskingStrengthEl,
    settingProcessingModeEl,
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
    this.settingFftSizeEl = settingFftSizeEl;
    this.settingMaskingStrengthEl = settingMaskingStrengthEl;
    this.settingProcessingModeEl = settingProcessingModeEl;
    this.processBtn = processBtn;

    this._player = null;
    this._currentUrl = null;
    this._currentFilePath = null;
    this._themeMode = null;

    this._onThemeChanged = this._onThemeChanged.bind(this);
  }

  mount() {
    super.mount();
    this.track(() => this.clearAudioPreview());
    this.listen(window, 'dissonance:theme', this._onThemeChanged);
  }

  setAudioPreviewFile(filePath) {
    if (!this.waveformEl) return;
    if (!filePath) {
      this._currentFilePath = null;
      this.clearAudioPreview();
      return;
    }

    this._currentFilePath = filePath;

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
      ...this._getWaveformColors(),
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

  _getWaveformColors() {
    const isDark = !!document?.documentElement?.classList?.contains('dark');
    if (isDark) {
      return {
        waveformColor: 'rgba(226, 232, 240, 0.30)',
        progressColor: 'rgba(226, 232, 240, 0.95)',
        buttonColor: 'rgba(226, 232, 240, 0.95)',
      };
    }

    return {
      waveformColor: 'rgba(15, 23, 42, 0.25)',
      progressColor: 'rgba(15, 23, 42, 0.9)',
      buttonColor: 'rgba(15, 23, 42, 0.9)',
    };
  }

  _onThemeChanged(e) {
    const mode = e && e.detail && e.detail.mode ? String(e.detail.mode) : null;
    if (mode && mode === this._themeMode) return;
    this._themeMode = mode;

    if (!this._player || !this._currentFilePath) return;

    const filePath = this._currentFilePath;
    this.clearAudioPreview();
    this.setAudioPreviewFile(filePath);
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

  getProcessingOptions() {
    return readProcessingSettings({
      fftSizeValue: this.settingFftSizeEl?.value,
      maskingStrengthValue: this.settingMaskingStrengthEl?.value,
      processingModeValue: this.settingProcessingModeEl?.value,
    });
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
