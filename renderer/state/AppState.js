export class AppState {
  constructor() {
    this.currentFilePath = null;
    this.processedFilePath = null;
  }

  setCurrentFilePath(filePath) {
    this.currentFilePath = filePath;
    this.processedFilePath = null;
  }

  setProcessedFilePath(filePath) {
    this.processedFilePath = filePath;
  }

  hasCurrentFile() {
    return !!this.currentFilePath;
  }

  hasProcessedFile() {
    return !!this.processedFilePath;
  }
}
