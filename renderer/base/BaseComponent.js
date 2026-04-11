import { Disposable } from './Disposable.js';

export class BaseComponent extends Disposable {
  constructor() {
    super();
    this._mounted = false;
  }

  mount() {
    this._mounted = true;
  }

  unmount() {
    this.dispose();
    this._mounted = false;
  }

  listen(el, eventName, handler, options) {
    if (!el || typeof el.addEventListener !== 'function') return null;
    el.addEventListener(eventName, handler, options);
    this.track(() => {
      try {
        el.removeEventListener(eventName, handler, options);
      } catch (_e) {
        // ignore
      }
    });
    return handler;
  }

  get isMounted() {
    return this._mounted;
  }
}
