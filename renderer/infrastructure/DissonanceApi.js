import { BaseApi } from '../base/BaseApi.js';

export class DissonanceApi extends BaseApi {
  async openFile() {
    return this._call('openFile');
  }

  getPathForFile(file) {
    return this._call('getPathForFile', file);
  }

  async getFileStats(filePath) {
    return this._call('getFileStats', filePath);
  }

  async inspectFile(filePath) {
    return this._call('inspectFile', filePath);
  }

  async cleanupProcessedFile(processedPath) {
    return this._call('cleanupProcessedFile', processedPath);
  }

  async processFile(filePath) {
    return this._call('processFile', filePath);
  }

  async exportFile(processedPath) {
    return this._call('exportFile', processedPath);
  }

  onCoreStatus(cb) {
    return this._call('onCoreStatus', cb);
  }
}
