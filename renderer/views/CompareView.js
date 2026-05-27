/**
 * Third screen after processing: side-by-side comparison of the original
 * and the processed WAV. Hosts two independent WaveformPreview instances
 * + an info panel each + a single Export button. _renderInfo() is shared
 * between the two sides; otherwise each preview is fully encapsulated.
 */
import { BaseComponent } from '../base/BaseComponent.js';
import { WaveformPreview } from '../components/WaveformPreview.js';
import { formatDuration, formatSampleRate, formatChannels } from '../utils/wavInfoFormatters.js';

export class CompareView extends BaseComponent {
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

    this.procFilenameEl = procFilenameEl;
    this.procDurationEl = procDurationEl;
    this.procSampleRateEl = procSampleRateEl;
    this.procChannelsEl = procChannelsEl;

    this.exportBtn = exportBtn;

    this._origPreview = new WaveformPreview({ containerEl: origWaveformEl, height: 140 });
    this._procPreview = new WaveformPreview({ containerEl: procWaveformEl, height: 140 });
  }

  mount() {
    super.mount();
    this._origPreview.mount();
    this._procPreview.mount();
    this.track(() => this._origPreview.unmount());
    this.track(() => this._procPreview.unmount());
  }

  // ---------------------------------------------------------------------------
  // Waveform previews
  // ---------------------------------------------------------------------------

  setAudioPreviewFiles({ originalPath, processedPath }) {
    this._origPreview.setFile(originalPath);
    this._procPreview.setFile(processedPath);
  }

  setOriginalAudioPreviewFile(filePath) {
    this._origPreview.setFile(filePath);
  }

  setProcessedAudioPreviewFile(filePath) {
    this._procPreview.setFile(filePath);
  }

  pauseAudioPreviews() {
    this._origPreview.pause();
    this._procPreview.pause();
  }

  clearAudioPreviews() {
    this._origPreview.clear();
    this._procPreview.clear();
  }

  // ---------------------------------------------------------------------------
  // Info panels
  // ---------------------------------------------------------------------------

  setOriginalInfo(basicInfo) {
    this._renderInfo(basicInfo, {
      filenameEl: this.origFilenameEl,
      durationEl: this.origDurationEl,
      sampleRateEl: this.origSampleRateEl,
      channelsEl: this.origChannelsEl,
    });
  }

  setProcessedInfo(basicInfo) {
    this._renderInfo(basicInfo, {
      filenameEl: this.procFilenameEl,
      durationEl: this.procDurationEl,
      sampleRateEl: this.procSampleRateEl,
      channelsEl: this.procChannelsEl,
    });
  }

  _renderInfo(basicInfo, { filenameEl, durationEl, sampleRateEl, channelsEl }) {
    const { filename, durationSec, sampleRate, channels } = basicInfo || {};
    if (filenameEl) filenameEl.textContent = filename || '—';
    if (durationEl) durationEl.textContent = formatDuration(durationSec);
    if (sampleRateEl) sampleRateEl.textContent = formatSampleRate(sampleRate);
    if (channelsEl) channelsEl.textContent = formatChannels(channels);
  }

  // ---------------------------------------------------------------------------
  // Buttons
  // ---------------------------------------------------------------------------

  setExportEnabled(enabled) {
    if (this.exportBtn) this.exportBtn.disabled = !enabled;
  }

  onExport(cb) {
    if (this.exportBtn) this.listen(this.exportBtn, 'click', cb);
  }
}
