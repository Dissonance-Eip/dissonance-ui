import { BaseView } from '../base/BaseView.js';

export class ExportView extends BaseView {
  constructor({ selectedFileEl, exportBtn }) {
    super();
    this.selectedFileEl = selectedFileEl;
    this.exportBtn = exportBtn;
  }

  mount() {
    super.mount();
  }

  setSelectedFile(filePath) {
    if (!this.selectedFileEl) return;
    this.selectedFileEl.textContent = filePath || 'No processed file';
    this.selectedFileEl.title = filePath || '';
  }

  setExportEnabled(enabled) {
    if (!this.exportBtn) return;
    this.exportBtn.disabled = !enabled;
    this.exportBtn.classList.toggle('enabled', enabled);
  }

  onExport(cb) {
    if (!this.exportBtn) return;
    this.listen(this.exportBtn, 'click', cb);
  }
}
