import { BaseView } from '../base/BaseView.js';

export class ProcessView extends BaseView {
  constructor({ selectedFileEl, processBtn }) {
    super();
    this.selectedFileEl = selectedFileEl;
    this.processBtn = processBtn;
  }

  mount() {
    super.mount();
  }

  setSelectedFile(filePath) {
    if (!this.selectedFileEl) return;
    this.selectedFileEl.textContent = filePath || 'No file selected';
    this.selectedFileEl.title = filePath || '';
  }

  setProcessEnabled(enabled) {
    if (!this.processBtn) return;
    this.processBtn.disabled = !enabled;
    this.processBtn.classList.toggle('enabled', enabled);
  }

  onProcess(cb) {
    if (!this.processBtn) return;
    this.listen(this.processBtn, 'click', cb);
  }
}
