import { BaseComponent } from '../base/BaseComponent.js';

/**
 * Reusable waveform preview built on the third-party WaveformPlayer.
 *
 * Encapsulates:
 *   - Player create / loadTrack / destroy lifecycle
 *   - Suppression of WaveformPlayer's unconditional auto-play in loadTrack()
 *   - file:// URL conversion for absolute paths
 *   - Theme rebuild on `dissonance:theme` event
 *   - Audio play/pause/ended event forwarding via onPlaybackStateChange
 *
 * Used by AnalyzeView (one instance) and CompareView (two instances).
 */
export class WaveformPreview extends BaseComponent {
  constructor({ containerEl, height = 164, onPlaybackStateChange = null } = {}) {
    super();
    this.containerEl = containerEl;
    this.height = height;
    this._onPlaybackStateChange = onPlaybackStateChange;

    this._player = null;
    this._currentFilePath = null;
    this._themeMode = null;
    this._listenersAttachedTo = null; // HTMLAudioElement we last wired
    this._removeAudioListeners = null;

    this._onThemeChanged = this._onThemeChanged.bind(this);
  }

  mount() {
    super.mount();
    this.track(() => this.clear());
    this.listen(window, 'dissonance:theme', this._onThemeChanged);
  }

  /** Register / replace the play/pause/ended forwarding callback. */
  setOnPlaybackStateChange(cb) {
    this._onPlaybackStateChange = cb;
    this._attachAudioListeners(); // wire to current player if any
  }

  /**
   * Load a file into the preview. Switching from one file to another reuses
   * the player to avoid re-parsing / visual flash. The first-load and the
   * loadTrack path both stay paused (no auto-play).
   */
  setFile(filePath) {
    if (!this.containerEl) return;
    if (!filePath) {
      this._currentFilePath = null;
      this.clear();
      return;
    }
    this._currentFilePath = filePath;

    const url = WaveformPreview._toFileUrl(filePath);
    if (!url) {
      this.clear();
      return;
    }

    // Reuse existing player when possible — preserves waveform state.
    if (this._player?.loadTrack) {
      // loadTrack() unconditionally calls play() at the end; replace play
      // with a no-op for the duration of the call, then restore.
      const originalPlay = this._player.play.bind(this._player);
      this._player.play = () => Promise.resolve();
      this._player.loadTrack(url).finally(() => {
        if (this._player) this._player.play = originalPlay;
      });
      return;
    }

    this.clear();

    const WaveformPlayer = window.WaveformPlayer;
    if (typeof WaveformPlayer !== 'function') return;

    this.containerEl.innerHTML = '';
    this._player = new WaveformPlayer(this.containerEl, {
      url,
      autoplay: false,
      waveformStyle: 'mirror',
      height: this.height,
      // Default is 200; bumping to 400 gives a denser, smoother-looking
      // waveform on wider displays without noticeable cost on small files.
      samples: 400,
      showInfo: false,
      showTime: false,
      showBPM: false,
      showPlaybackSpeed: false,
      showHoverTime: true,
      ...WaveformPreview._getWaveformColors(),
    });

    // (Re)wire audio event listeners to the new audio element. The same
    // element is reused across loadTrack() calls, so we only need to do this
    // once per fresh player — but crucially we DO need to do it after every
    // theme rebuild (which creates a brand-new player).
    this._attachAudioListeners();

    // The library only ships click-to-seek; add drag-to-scrub on top so
    // users can hold and drag the playhead to land precisely where they want.
    this._attachDragScrub();
  }

  pause() {
    try {
      this._player?.pause?.();
    } catch (_e) {}
  }

  clear() {
    this._detachAudioListeners();
    this._detachDragScrub();
    try {
      this._player?.pause?.();
      this._player?.destroy?.();
    } catch (_e) {}
    this._player = null;
    if (this.containerEl) this.containerEl.innerHTML = '';
  }

  get audio() {
    return this._player?.audio ?? null;
  }

  get isPlaying() {
    return !!this._player?.isPlaying;
  }

  _attachAudioListeners() {
    const audio = this._player?.audio;
    if (!audio || !this._onPlaybackStateChange) return;
    if (this._listenersAttachedTo === audio) return; // already wired

    this._detachAudioListeners();
    this._listenersAttachedTo = audio;

    const fire = () => this._onPlaybackStateChange(this.isPlaying);
    audio.addEventListener('play', fire);
    audio.addEventListener('pause', fire);
    audio.addEventListener('ended', fire);

    this._removeAudioListeners = () => {
      audio.removeEventListener('play', fire);
      audio.removeEventListener('pause', fire);
      audio.removeEventListener('ended', fire);
    };
  }

  _detachAudioListeners() {
    try {
      this._removeAudioListeners?.();
    } catch (_e) {}
    this._removeAudioListeners = null;
    this._listenersAttachedTo = null;
  }

  /**
   * Hold + drag on the waveform canvas to scrub through the track. The
   * library only ships click-to-seek, so we listen for pointerdown on the
   * canvas and then mirror pointermove on the window (so dragging keeps
   * working even if the cursor leaves the canvas). Pointer-up anywhere
   * ends the drag.
   */
  _attachDragScrub() {
    const canvas = this._player?.canvas;
    if (!canvas || this._dragAttachedTo === canvas) return;
    this._detachDragScrub();
    this._dragAttachedTo = canvas;

    let dragging = false;

    const seekFrom = (clientX) => {
      const player = this._player;
      if (!player?.audio?.duration) return;
      const rect = canvas.getBoundingClientRect();
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      player.seekToPercent?.(pct);
    };

    const onDown = (e) => {
      // Left mouse / primary touch only.
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      seekFrom(e.clientX);
      // Prevent text/canvas selection while dragging.
      e.preventDefault();
    };
    const onMove = (e) => {
      if (dragging) seekFrom(e.clientX);
    };
    const onUp = () => {
      dragging = false;
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    this._removeDragScrub = () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }

  _detachDragScrub() {
    try {
      this._removeDragScrub?.();
    } catch (_e) {}
    this._removeDragScrub = null;
    this._dragAttachedTo = null;
  }

  _onThemeChanged(e) {
    const mode = e?.detail?.mode ? String(e.detail.mode) : null;
    if (mode && mode === this._themeMode) return;
    this._themeMode = mode;

    if (!this._player || !this._currentFilePath) return;

    // Capture playback state before tearing the player down so we can
    // restore position + play state on the new player. Otherwise the user
    // changes theme mid-listen and silently loses their place.
    const wasPlaying = this.isPlaying;
    const currentTime = this._player.audio?.currentTime ?? 0;

    // Recreate the player so the new theme colours take effect.
    // setFile() also re-attaches audio listeners to the new player's audio.
    const filePath = this._currentFilePath;
    this.clear();
    this.setFile(filePath);

    if (!this._player?.audio) return;
    this._restorePlaybackState(currentTime, wasPlaying);
  }

  /**
   * After a player rebuild, seek to the previous position and resume if it
   * was playing. The audio element loads asynchronously so we wait for
   * `loadedmetadata` (duration is known by then) before seeking.
   */
  _restorePlaybackState(currentTime, wasPlaying) {
    const audio = this._player?.audio;
    if (!audio) return;

    const restore = () => {
      audio.removeEventListener('loadedmetadata', restore);
      try {
        if (currentTime > 0 && Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(currentTime, audio.duration);
        }
        if (wasPlaying) audio.play?.().catch(() => {});
      } catch (_e) {
        // ignore — best-effort restore
      }
    };

    if (audio.readyState >= 1 /* HAVE_METADATA */) {
      restore();
    } else {
      audio.addEventListener('loadedmetadata', restore);
    }
  }

  static _toFileUrl(filePath) {
    try {
      return new URL(`file://${filePath}`).toString();
    } catch (_e) {
      return null;
    }
  }

  static _getWaveformColors() {
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
}
