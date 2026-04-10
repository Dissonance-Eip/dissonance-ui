export class DissonanceApi {
  constructor(bridge) {
    this.bridge = bridge;
  }

  isAvailable() {
    return !!this.bridge;
  }

  async openFile() {
    return this.bridge.openFile();
  }

  async getFileStats(filePath) {
    return this.bridge.getFileStats(filePath);
  }

  async inspectFile(filePath) {
    return this.bridge.inspectFile(filePath);
  }

  async cleanupProcessedFile(processedPath) {
    return this.bridge.cleanupProcessedFile(processedPath);
  }

  async processFile(filePath) {
    return this.bridge.processFile(filePath);
  }

  async exportFile(processedPath) {
    return this.bridge.exportFile(processedPath);
  }

  onCoreStatus(cb) {
    return this.bridge.onCoreStatus(cb);
  }
}
