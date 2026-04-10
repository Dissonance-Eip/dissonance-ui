export class TerminalLogger {
  constructor(bridge) {
    this.bridge = bridge;
  }

  _send(level, message) {
    try {
      if (this.bridge && typeof this.bridge.logToMain === 'function') {
        this.bridge.logToMain(level, String(message));
        return;
      }
    } catch (_e) {
      // ignore
    }

    const fn = console && typeof console[level] === 'function' ? console[level] : console.log;
    fn(String(message));
  }

  log(message) {
    this._send('log', message);
  }

  error(message) {
    this._send('error', message);
  }

  setStatus(message, isError = false) {
    const prefix = isError ? 'STATUS(ERROR)' : 'STATUS';
    this._send('log', `${prefix}: ${message}`);
  }
}
