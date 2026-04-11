export class ViewRouter {
  constructor(views) {
    this.views = views;
    this.current = null;
  }

  show(name) {
    for (const [key, el] of Object.entries(this.views)) {
      if (!el) continue;
      el.hidden = key !== name;
    }
    this.current = name;
  }

  getCurrent() {
    return this.current;
  }
}
