export class Logger {
  constructor(logElId = 'log', statusElId = 'status') {
    this.logEl = document.getElementById(logElId);
    this.statusEl = document.getElementById(statusElId);
  }

  timePrefix() {
    return new Date().toLocaleTimeString();
  }

  log(message) {
    const line = `[${this.timePrefix()}] ${message}`;

    if (this.logEl) {
      const el = document.createElement('div');
      el.className = 'log-entry';
      el.textContent = line;
      this.logEl.appendChild(el);

      const container = this.logEl.parentElement;
      if (container) container.scrollTop = container.scrollHeight;
    }

    console.log(message);
  }

  error(message) {
    this.log(`ERROR: ${message}`);
    this.setStatus(message, true);
  }

  setStatus(message, isError = false) {
    if (!this.statusEl) return;
    this.statusEl.textContent = message || '';
    this.statusEl.style.color = isError ? '#fecaca' : '#e5e7eb';
  }
}
