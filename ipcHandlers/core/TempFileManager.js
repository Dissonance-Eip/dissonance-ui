const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class TempFileManager {
  constructor({ rootDir } = {}) {
    this.rootDir = rootDir || path.join(os.tmpdir(), 'dissonance');
    this.tempFiles = new Set();
    this.tempFileBySenderId = new Map();
  }

  getRootDir() {
    return this.rootDir;
  }

  makeTempProcessedPath(inputPath) {
    const base = path.basename(inputPath, path.extname(inputPath) || '.wav');
    const stamp = Date.now();
    return path.join(this.rootDir, `${base}-processed-${stamp}.wav`);
  }

  registerForSender(senderId, filePath) {
    if (!filePath) return;
    this.tempFiles.add(filePath);
    if (senderId) this.tempFileBySenderId.set(senderId, filePath);
  }

  getForSender(senderId) {
    return senderId ? this.tempFileBySenderId.get(senderId) : null;
  }

  async cleanupForSender(senderId) {
    if (!senderId) return;
    const p = this.tempFileBySenderId.get(senderId);
    if (p) {
      await this.cleanupTempFile(p);
    }
  }

  isUnderRoot(filePath) {
    if (!filePath) return false;
    try {
      const rel = path.relative(this.rootDir, filePath);
      return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
    } catch (_e) {
      return false;
    }
  }

  async safeUnlink(filePath) {
    if (!filePath) return;
    try {
      await fs.unlink(filePath);
    } catch (_e) {
      // ignore
    }
  }

  async cleanupTempFile(filePath) {
    if (!filePath) return;
    if (!this.tempFiles.has(filePath) && !this.isUnderRoot(filePath)) return;

    await this.safeUnlink(filePath);

    this.tempFiles.delete(filePath);
    for (const [senderId, p] of this.tempFileBySenderId.entries()) {
      if (p === filePath) this.tempFileBySenderId.delete(senderId);
    }
  }

  async cleanupAll() {
    const paths = Array.from(this.tempFiles);
    await Promise.all(paths.map((p) => this.safeUnlink(p)));
    this.tempFiles.clear();
    this.tempFileBySenderId.clear();
  }
}

module.exports = { TempFileManager };
