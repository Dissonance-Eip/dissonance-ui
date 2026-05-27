/**
 * Documentation-only interface for the renderer Logger contract.
 * Concrete impls (e.g. TerminalLogger) override these. Subclasses can be
 * swapped without touching call sites (controllers, views).
 */
export class Logger {
  log(_message) {}
  error(_message) {}
  setStatus(_message, _isError = false) {}
}
