import { Disposable } from './Disposable.js';

/**
 * Base class for top-level renderer controllers.
 * Adds start/stop lifecycle on top of Disposable. Currently only
 * AppController extends it.
 */
export class BaseController extends Disposable {
  constructor() {
    super();
    this._started = false;
  }

  start() {
    this._started = true;
  }

  stop() {
    this.dispose();
    this._started = false;
  }

  get isStarted() {
    return this._started;
  }
}
