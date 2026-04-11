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
    procFilenameEl,
    procDurationEl,
    procSampleRateEl,
    procChannelsEl,
    exportBtn,
  }) {
    super();
    this.origFilenameEl = origFilenameEl;
    this.origDurationEl = origDurationEl;
    this.origSampleRateEl = origSampleRateEl;
    this.origChannelsEl = origChannelsEl;

    this.procFilenameEl = procFilenameEl;
    this.procDurationEl = procDurationEl;
    this.procSampleRateEl = procSampleRateEl;
    this.procChannelsEl = procChannelsEl;

    this.exportBtn = exportBtn;
  }

  mount() {
    super.mount();
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
