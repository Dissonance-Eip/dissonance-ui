import { BaseView } from '../base/BaseView.js';

function formatDuration(durationSec) {
  if (typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec >= 0) {
    const total = Math.round(durationSec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return '—';
}

function formatSampleRate(sampleRate) {
  return sampleRate ? `${sampleRate} Hz` : '—';
}

function formatChannels(channels) {
  return channels ? String(channels) : '—';
}

export class CompareView extends BaseView {
  constructor({
    origFilenameEl,
    origDurationEl,
    origSampleRateEl,
    origChannelsEl,
    origWaveformEl,
    procFilenameEl,
    procDurationEl,
    procSampleRateEl,
    procChannelsEl,
    procWaveformEl,
    exportBtn,
  }) {
    super();
    this.origFilenameEl = origFilenameEl;
    this.origDurationEl = origDurationEl;
    this.origSampleRateEl = origSampleRateEl;
    this.origChannelsEl = origChannelsEl;
    this.origWaveformEl = origWaveformEl;

    this.procFilenameEl = procFilenameEl;
    this.procDurationEl = procDurationEl;
    this.procSampleRateEl = procSampleRateEl;
    this.procChannelsEl = procChannelsEl;
    this.procWaveformEl = procWaveformEl;

    this.exportBtn = exportBtn;

    this._origPlayer = null;
    this._procPlayer = null;
    this._origUrl = null;
    this._procUrl = null;

    this._origFilePath = null;
    this._procFilePath = null;
    this._themeMode = null;

    this._onThemeChanged = this._onThemeChanged.bind(this);
  }

  mount() {
    super.mount();
    this.track(() => this.clearAudioPreviews());
    this.listen(window, 'dissonance:theme', this._onThemeChanged);
  }

  setAudioPreviewFiles({ originalPath, processedPath }) {
    this.setOriginalAudioPreviewFile(originalPath);
    this.setProcessedAudioPreviewFile(processedPath);
  }

  setOriginalAudioPreviewFile(filePath) {
    this._origFilePath = filePath || null;
    this._origUrl = null;
    this._setAudioPreviewInto({
      filePath,
      el: this.origWaveformEl,
      getPlayer: () => this._origPlayer,
      setPlayer: (p) => {
        this._origPlayer = p;
      },
      setUrl: (url) => {
        this._origUrl = url;
      },
    });
  }

  setProcessedAudioPreviewFile(filePath) {
    this._procFilePath = filePath || null;
    this._procUrl = null;
    this._setAudioPreviewInto({
      filePath,
      el: this.procWaveformEl,
      getPlayer: () => this._procPlayer,
      setPlayer: (p) => {
        this._procPlayer = p;
      },
      setUrl: (url) => {
        this._procUrl = url;
      },
    });
  }

  pauseAudioPreviews() {
    try {
      this._origPlayer?.pause?.();
    } catch (_e) {}
    try {
      this._procPlayer?.pause?.();
    } catch (_e) {}
  }

  clearAudioPreviews() {
    this._origUrl = null;
    this._procUrl = null;

    try {
      this._origPlayer?.pause?.();
      this._origPlayer?.destroy?.();
    } catch (_e) {}
    this._origPlayer = null;

    try {
      this._procPlayer?.pause?.();
      this._procPlayer?.destroy?.();
    } catch (_e) {}
    this._procPlayer = null;

    if (this.origWaveformEl) this.origWaveformEl.innerHTML = '';
    if (this.procWaveformEl) this.procWaveformEl.innerHTML = '';
  }

  _setAudioPreviewInto({ filePath, el, getPlayer, setPlayer, setUrl }) {
    if (!el) return;

    if (!filePath) {
      if (el) el.innerHTML = '';
      try {
        getPlayer()?.pause?.();
        getPlayer()?.destroy?.();
      } catch (_e) {}
      setPlayer(null);
      setUrl(null);
      return;
    }

    const url = this._toFileUrl(filePath);
    if (!url) {
      if (el) el.innerHTML = '';
      try {
        getPlayer()?.pause?.();
        getPlayer()?.destroy?.();
      } catch (_e) {}
      setPlayer(null);
      setUrl(null);
      return;
    }

    const existing = getPlayer();
    if (existing && typeof existing.loadTrack === 'function') {
      setUrl(url);
      existing.loadTrack(url);
      return;
    }

    const WaveformPlayer = window.WaveformPlayer;
    if (typeof WaveformPlayer !== 'function') return;

    // Ensure container empty before attaching the player.
    el.innerHTML = '';
    setUrl(url);
    setPlayer(
      new WaveformPlayer(el, {
        url,
        waveformStyle: 'mirror',
        height: 140,
        showInfo: false,
        showTime: false,
        showBPM: false,
        showPlaybackSpeed: false,
        ...this._getWaveformColors(),
      })
    );
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

    // Only re-theme if we've already created players.
    if (!this._origPlayer && !this._procPlayer) return;

    const originalPath = this._origFilePath;
    const processedPath = this._procFilePath;

    this.clearAudioPreviews();

    if (originalPath) this.setOriginalAudioPreviewFile(originalPath);
    if (processedPath) this.setProcessedAudioPreviewFile(processedPath);
  }

  _toFileUrl(filePath) {
    try {
      // filePath should be an absolute path like /Users/... on macOS.
      return new URL(`file://${filePath}`).toString();
    } catch (_e) {
      return null;
    }
  }

  setExportEnabled(enabled) {
    if (!this.exportBtn) return;
    this.exportBtn.disabled = !enabled;
  }

  onExport(cb) {
    if (!this.exportBtn) return;
    this.listen(this.exportBtn, 'click', cb);
  }

  setOriginalInfo(basicInfo) {
    const { filename, durationSec, sampleRate, channels } = basicInfo || {};
    if (this.origFilenameEl) this.origFilenameEl.textContent = filename || '—';
    if (this.origDurationEl) this.origDurationEl.textContent = formatDuration(durationSec);
    if (this.origSampleRateEl) this.origSampleRateEl.textContent = formatSampleRate(sampleRate);
    if (this.origChannelsEl) this.origChannelsEl.textContent = formatChannels(channels);
  }

  setProcessedInfo(basicInfo) {
    const { filename, durationSec, sampleRate, channels } = basicInfo || {};
    if (this.procFilenameEl) this.procFilenameEl.textContent = filename || '—';
    if (this.procDurationEl) this.procDurationEl.textContent = formatDuration(durationSec);
    if (this.procSampleRateEl) this.procSampleRateEl.textContent = formatSampleRate(sampleRate);
    if (this.procChannelsEl) this.procChannelsEl.textContent = formatChannels(channels);
  }
}
