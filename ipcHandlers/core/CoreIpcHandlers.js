const { ipcMain, dialog } = require('electron');
const fs = require('fs').promises;
const path = require('path');

async function readWavMetadata(filePath) {
  // Minimal RIFF/WAV parser (fmt + data). Works for PCM/WAVEFORMATEX layouts.
  // Reads only the file header area (fast) and returns enough fields for UI display.
  const handle = await fs.open(filePath, 'r');
  try {
    const headerBuf = Buffer.alloc(64 * 1024);
    const { bytesRead } = await handle.read(headerBuf, 0, headerBuf.length, 0);
    const buf = headerBuf.subarray(0, bytesRead);

    if (buf.length < 12) {
      throw new Error('File too small to be a WAV');
    }

    const riff = buf.toString('ascii', 0, 4);
    const wave = buf.toString('ascii', 8, 12);
    if (riff !== 'RIFF' || wave !== 'WAVE') {
      throw new Error('Not a RIFF/WAVE file');
    }

    let offset = 12;
    let fmt = null;
    let data = null;

    while (offset + 8 <= buf.length) {
      const id = buf.toString('ascii', offset, offset + 4);
      const size = buf.readUInt32LE(offset + 4);
      const chunkStart = offset + 8;

      if (id === 'fmt ' && chunkStart + 16 <= buf.length) {
        fmt = {
          subchunk1Size: size,
          audioFormat: buf.readUInt16LE(chunkStart + 0),
          numChannels: buf.readUInt16LE(chunkStart + 2),
          sampleRate: buf.readUInt32LE(chunkStart + 4),
          byteRate: buf.readUInt32LE(chunkStart + 8),
          blockAlign: buf.readUInt16LE(chunkStart + 12),
          bitsPerSample: buf.readUInt16LE(chunkStart + 14),
        };
      } else if (id === 'data') {
        data = { subchunk2Size: size };
      }

      // Chunks are word-aligned.
      offset = chunkStart + size + (size % 2);

      if (fmt && data) break;
    }

    if (!fmt) {
      throw new Error('WAV fmt chunk not found');
    }
    if (!data) {
      throw new Error('WAV data chunk not found');
    }

    const bytesPerSample = fmt.bitsPerSample ? fmt.bitsPerSample / 8 : 0;
    const numSamples = bytesPerSample > 0 ? Math.floor(data.subchunk2Size / bytesPerSample) : null;

    return {
      riff,
      wave,
      fmt: 'fmt ',
      subchunk1Size: fmt.subchunk1Size,
      audioFormat: fmt.audioFormat,
      numChannels: fmt.numChannels,
      sampleRate: fmt.sampleRate,
      byteRate: fmt.byteRate,
      blockAlign: fmt.blockAlign,
      bitsPerSample: fmt.bitsPerSample,
      data: 'data',
      subchunk2Size: data.subchunk2Size,
      numSamples,
    };
  } finally {
    await handle.close();
  }
}

function forward(win, channel, payload) {
  try {
    if (win && win.webContents && typeof win.webContents.send === 'function') {
      win.webContents.send(channel, payload);
    }
  } catch (e) {
    console.error('Failed to forward', channel, e);
  }
}

function attachAddonEventForwarding(addon, mainWindow) {
  if (!addon || typeof addon.on !== 'function') return;
  try {
    addon.on('progress', (d) => forward(mainWindow, 'core:progress', d));
    addon.on('log', (m) => forward(mainWindow, 'core:log', m));
  } catch (_e) {
    // be defensive
  }
}

class CoreIpcHandlers {
  constructor({ coreAddon, tempFileManager }) {
    this.coreAddon = coreAddon;
    this.tempFileManager = tempFileManager;
  }

  register(mainWindow) {
    ipcMain.handle('core:cleanupProcessed', async (_event, payload) => {
      const processedPath =
        typeof payload === 'string' ? payload : (payload && payload.processedPath) || null;
      if (!processedPath) return { ok: false, error: 'No processed file path' };

      await this.tempFileManager.cleanupTempFile(processedPath);
      return { ok: true };
    });

    ipcMain.handle('core:inspect', async (_event, payload) => {
      const filePath = typeof payload === 'string' ? payload : (payload && payload.filePath) || null;

      console.log('core:inspect called with:', { filePath });
      if (!mainWindow) return { ok: false, error: 'No main window' };
      if (!filePath) return { ok: false, error: 'No file path provided' };

      if (this.coreAddon && typeof this.coreAddon.inspect === 'function') {
        try {
          forward(mainWindow, 'core:status', { status: 'inspecting', message: 'Reading metadata…' });
          const result = this.coreAddon.inspect(filePath);
          forward(mainWindow, 'core:status', { status: 'inspected', message: 'Metadata loaded' });
          return { ...(result || {}), ok: true };
        } catch (err) {
          console.error('Core addon inspect error', err);
          forward(mainWindow, 'core:status', {
            status: 'error',
            message: 'Metadata read failed',
            error: String(err),
          });
          return { ok: false, error: String(err) };
        }
      }

      // Fallback: parse WAV metadata directly (so the UI still shows basic info).
      try {
        forward(mainWindow, 'core:status', { status: 'inspecting', message: 'Reading metadata…' });
        const metadata = await readWavMetadata(filePath);
        forward(mainWindow, 'core:status', { status: 'inspected', message: 'Metadata loaded' });
        return { ok: true, metadata, source: 'wav-header' };
      } catch (err) {
        return { ok: false, error: 'Core addon inspect not available' };
      }
    });

    ipcMain.handle('core:process', async (_event, payload) => {
      const filePath = typeof payload === 'string' ? payload : (payload && payload.filePath) || null;
      const options = (payload && payload.options) || {};

      console.log('core:process called with:', { filePath, options });
      if (!mainWindow) return { ok: false, error: 'No main window' };
      if (!filePath) return { ok: false, error: 'No file path provided' };

      forward(mainWindow, 'core:status', { status: 'imported', message: 'File imported to UI' });

      const senderId = _event && _event.sender ? _event.sender.id : null;
      if (senderId) {
        await this.tempFileManager.cleanupForSender(senderId);
      }

      if (this.coreAddon && typeof this.coreAddon.process === 'function') {
        let outputPath = null;
        try {
          console.log('[DEBUG] Calling coreAddon.process()');
          forward(mainWindow, 'core:status', {
            status: 'sending',
            message: 'Sending to dissonance-core (addon)...',
          });

          attachAddonEventForwarding(this.coreAddon, mainWindow);
          forward(mainWindow, 'core:status', { status: 'processing', message: 'Processing started' });

          await fs.mkdir(this.tempFileManager.getRootDir(), { recursive: true });
          outputPath = this.tempFileManager.makeTempProcessedPath(filePath);

          const result = this.coreAddon.process(filePath, { ...options, outputPath });
          console.log('[DEBUG] process() returned:', result);

          const resolved =
            result && typeof result.then === 'function'
              ? await Promise.race([result, new Promise((r) => setTimeout(() => r(null), 5000))])
              : result;

          const processedPath = (resolved && resolved.processedPath) || outputPath || null;
          if (processedPath) {
            this.tempFileManager.registerForSender(senderId, processedPath);
          }

          forward(mainWindow, 'core:status', {
            status: 'processed',
            message: 'Processing complete',
            processedPath,
          });

          let metadata = resolved && resolved.metadata ? resolved.metadata : null;
          if (!metadata) {
            try {
              metadata = await readWavMetadata(processedPath || filePath);
            } catch (_e) {}
          }

          return { ...(resolved || {}), ok: true, processedPath, metadata };
        } catch (err) {
          console.error('Core addon processing error', err);

          try {
            await this.tempFileManager.cleanupTempFile(outputPath);
          } catch (_e) {}

          forward(mainWindow, 'core:status', {
            status: 'error',
            message: 'Processing failed',
            error: String(err),
          });
          return { ok: false, error: String(err) };
        }
      } else {
        console.log('[DEBUG] coreAddon.process is NOT a function. coreAddon:', this.coreAddon);
        console.log('[DEBUG] coreAddon.process:', this.coreAddon?.process);
      }

      // fallback: simulation
      try {
        const resp = await this._simulateProcessing(filePath, mainWindow);
        if (resp && resp.ok && resp.processedPath && senderId) {
          this.tempFileManager.registerForSender(senderId, resp.processedPath);
        }
        return resp;
      } catch (err) {
        console.error('Processing error', err);
        forward(mainWindow, 'core:status', { status: 'error', message: 'Processing failed' });
        return { ok: false, error: String(err) };
      }
    });

    ipcMain.handle('core:export', async (_event, payload) => {
      const processedPathStr =
        typeof payload === 'string' ? payload : (payload && payload.processedPath) || null;
      const destPath = (payload && payload.destPath) || null;

      if (!processedPathStr) return { ok: false, error: 'No processed file path' };
      if (!mainWindow) return { ok: false, error: 'No main window' };

      try {
        let canceled = false;
        let filePath;
        if (destPath) {
          filePath = destPath;
        } else {
          const result = await dialog.showSaveDialog({
            title: 'Export processed file',
            defaultPath: path.basename(processedPathStr),
            filters: [{ name: 'Audio', extensions: ['wav', 'mp3', 'ogg', 'm4a', 'flac'] }],
          });
          canceled = result.canceled;
          filePath = result.filePath;
        }

        if (canceled || !filePath) {
          return { ok: false, error: 'Export canceled' };
        }

        await fs.copyFile(processedPathStr, filePath);

        await this.tempFileManager.cleanupTempFile(processedPathStr);

        forward(mainWindow, 'core:status', {
          status: 'exported',
          message: `Exported to ${filePath}`,
          exportedPath: filePath,
        });

        return { ok: true, exportedPath: filePath };
      } catch (err) {
        console.error('Export error', err);
        forward(mainWindow, 'core:status', { status: 'error', message: 'Export failed' });
        return { ok: false, error: String(err) };
      }
    });
  }

  async _simulateProcessing(filePath, mainWindow) {
    forward(mainWindow, 'core:status', {
      status: 'sending',
      message: 'Sending to dissonance-core (simulated)...',
    });
    await new Promise((r) => setTimeout(r, 500));

    forward(mainWindow, 'core:status', { status: 'processing', message: 'Processing started' });
    for (let p = 10; p <= 100; p += 30) {
      await new Promise((r) => setTimeout(r, 500));
      forward(mainWindow, 'core:status', { status: 'processing', message: `Processing: ${p}%` });
    }

    await fs.mkdir(this.tempFileManager.getRootDir(), { recursive: true });
    const processedPath = this.tempFileManager.makeTempProcessedPath(filePath);
    await fs.copyFile(filePath, processedPath);

    this.tempFileManager.registerForSender(null, processedPath);

    forward(mainWindow, 'core:status', {
      status: 'processed',
      message: 'Processing complete',
      processedPath,
    });

    let metadata = null;
    try {
      metadata = await readWavMetadata(processedPath);
    } catch (_e) {}

    return { ok: true, processedPath, metadata };
  }
}

module.exports = { CoreIpcHandlers };
