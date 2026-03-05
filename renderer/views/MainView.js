export class MainView {
  constructor({ selectedFileEl, changeFileBtn, processBtn, exportBtn, logger }) {
    this.selectedFileEl = selectedFileEl;
    this.changeFileBtn = changeFileBtn;
    this.processBtn = processBtn;
    this.exportBtn = exportBtn;
    this.logger = logger;
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

  setExportEnabled(enabled) {
    if (!this.exportBtn) return;
    this.exportBtn.disabled = !enabled;
    this.exportBtn.classList.toggle('enabled', enabled);
  }

  onChangeFile(cb) {
    if (!this.changeFileBtn) return;
    this.changeFileBtn.addEventListener('click', cb);
  }

  onProcess(cb) {
    if (!this.processBtn) return;
    this.processBtn.addEventListener('click', cb);
  }

  onExport(cb) {
    if (!this.exportBtn) return;
    this.exportBtn.addEventListener('click', cb);
  }
}
