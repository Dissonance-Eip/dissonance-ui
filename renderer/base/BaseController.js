import { Disposable } from './Disposable.js';

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
