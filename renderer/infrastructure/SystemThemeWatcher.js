export class SystemThemeWatcher {
  constructor({ api, rootEl } = {}) {
    this.api = api;
    this.rootEl = rootEl || document.documentElement;
    this._unsubscribe = null;
    this._onTheme = this._onTheme.bind(this);
  }

  async start() {
    if (!this.api) return;

    try {
      const initial = await this.api.getSystemTheme?.();
      this._onTheme(initial);
    } catch (_e) {
      // ignore
    }

    try {
      const unsub = this.api.onSystemTheme?.(this._onTheme);
      this._unsubscribe = typeof unsub === 'function' ? unsub : null;
    } catch (_e) {
      // ignore
    }
  }

  stop() {
    try {
      this._unsubscribe?.();
    } catch (_e) {
      // ignore
    }
    this._unsubscribe = null;
  }

  _onTheme(data) {
    const mode = data && data.mode ? String(data.mode) : 'light';
    const isDark = mode === 'dark';
    try {
      this.rootEl.classList.toggle('dark', isDark);
    } catch (_e) {
      // ignore
    }

    try {
      window.dispatchEvent(new CustomEvent('dissonance:theme', { detail: { mode } }));
    } catch (_e) {
      // ignore
    }
  }
}
