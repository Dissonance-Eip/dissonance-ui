export class DropZone {
  constructor({ el, api, logger }) {
    this.el = el;
    this.api = api;
    this.logger = logger;
    this.onFileSelected = null;

    this._onClick = this._onClick.bind(this);
    this._onDragEnterOver = this._onDragEnterOver.bind(this);
    this._onDragLeaveDrop = this._onDragLeaveDrop.bind(this);
    this._onDrop = this._onDrop.bind(this);
  }

  mount() {
    if (!this.el) return;

    this.el.addEventListener('click', this._onClick);

    ['dragenter', 'dragover'].forEach((evt) => {
      this.el.addEventListener(evt, this._onDragEnterOver);
    });

    ['dragleave', 'drop'].forEach((evt) => {
      this.el.addEventListener(evt, this._onDragLeaveDrop);
    });

    this.el.addEventListener('drop', this._onDrop);
  }

  setOnFileSelected(cb) {
    this.onFileSelected = cb;
  }

  async _onClick() {
    try {
      this.logger?.setStatus('Opening file dialog...');
      const filePath = await this.api.openFile();
      if (!filePath) {
        this.logger?.log('No file selected');
        this.logger?.setStatus('Import canceled');
        return;
      }
      this.onFileSelected?.(filePath, 'Selected');
    } catch (err) {
      this.logger?.error(`Import failed: ${err}`);
    }
  }

  _onDragEnterOver(e) {
    e.preventDefault();
    e.stopPropagation();
    this.el.classList.add('dragover');
  }

  _onDragLeaveDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    this.el.classList.remove('dragover');
  }

  _onDrop(e) {
    e.preventDefault();
    e.stopPropagation();

    const dt = e.dataTransfer;
    if (!dt || !dt.files || dt.files.length === 0) {
      this.logger?.log('Drop: no files');
      return;
    }

    const file = dt.files[0];
    const filePath = file.path || null;
    if (!filePath) {
      this.logger?.log('Drop: file has no path');
      return;
    }

    this.onFileSelected?.(filePath, 'Dropped');
  }
}
