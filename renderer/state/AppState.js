/**
 * Minimal session state for the active file and its processed temp output.
 * setCurrentFilePath() clears processedFilePath as a deliberate side effect
 * — switching the source invalidates any previously processed result.
 */
export class AppState {
  constructor() {
    this.currentFilePath = null;
    this.processedFilePath = null;
  }

  /**
   * @param {string|null} filePath
   * Side effect: clears `processedFilePath`. Any previously processed result
   * belongs to the OLD source file and is invalid once the source changes.
   */
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
