const { ipcMain, dialog } = require('electron');
const fsSync = require('fs');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

function tryResolve(moduleName) {
  try {
    return require.resolve(moduleName);
  } catch (_e) {
    return null;
  }
}

function getAddonCandidates() {
  const candidates = [];

  // Allow overriding the exact path (useful for packaged apps / CI).
  const override = process.env.DISSONANCE_CORE_ADDON_PATH || null;
  if (override) candidates.push(override);

  const platform = process.platform; // win32, darwin, linux
  const arch = process.arch; // x64, arm64, ...

  // Current artifact naming in this repo.
  candidates.push(
    path.join(__dirname, '..', 'Build', 'Release', `dissonance_core-${platform}-${arch}.node`)
  );

  // Legacy / alternative locations and names.
  candidates.push(path.join(__dirname, '..', 'Build', 'Release', 'dissonance_core.node'));
  candidates.push(path.join(__dirname, '..', 'build', 'Release', 'dissonance_core.node'));
  candidates.push(
    path.join(__dirname, '..', 'build', 'Release', `dissonance_core-${platform}-${arch}.node`)
  );

  // Dedupe while preserving order.
  return [...new Set(candidates.filter(Boolean))];
}

// Try to load the native core addon (C++ -> node addon). If unavailable, fall back to simulation.
let coreAddon = null;
try {
  const candidates = getAddonCandidates();
  const existing = candidates.filter((p) => {
    try {
      return fsSync.existsSync(p);
    } catch (_e) {
      return false;
    }
  });

  console.log('Trying to load addon from candidates:', existing.length ? existing : candidates);

  // Try paths that exist first; then try all candidates (in case of virtual/asar paths).
  const ordered = [...existing, ...candidates.filter((p) => !existing.includes(p))];
  let lastError = null;

  for (const addonPath of ordered) {
    try {
      coreAddon = require(addonPath);
      console.log('Loaded addon from:', addonPath);
      lastError = null;
      break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!coreAddon && lastError) {
    throw lastError;
  }
} catch (e) {
  console.log('Could not load from local build:', e.message);
  try {
    coreAddon = require('dissonance-core');
    console.log('Loaded addon from dissonance-core package');
  } catch (pkgErr) {
    const bindingsPath = tryResolve('bindings');
    if (!bindingsPath) {
      coreAddon = null;
    } else {
      try {
        coreAddon = require('bindings')('dissonance_core');
        console.log('Loaded addon using bindings()');
      } catch (bindErr) {
        console.log('Could not load addon:', bindErr.message);
        coreAddon = null;
      }
    }
  }
}
console.log('dissonance core addon loaded:', !!coreAddon);
if (coreAddon) {
  console.log('Available functions:', Object.keys(coreAddon));
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

async function simulateProcessing(filePath, mainWindow) {
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

  const ext = path.extname(filePath) || '.wav';
  const base = path.basename(filePath, ext);
  const tmpDir = path.join(os.tmpdir(), 'dissonance');
  await fs.mkdir(tmpDir, { recursive: true });
  const processedPath = path.join(tmpDir, `${base}-processed${ext}`);
  await fs.copyFile(filePath, processedPath);

  forward(mainWindow, 'core:status', {
    status: 'processed',
    message: 'Processing complete',
    processedPath,
  });
  return { ok: true, processedPath };
}

function attachAddonEventForwarding(addon, mainWindow) {
  if (!addon || typeof addon.on !== 'function') return;
  try {
    addon.on('progress', (d) => forward(mainWindow, 'core:progress', d));
    addon.on('log', (m) => forward(mainWindow, 'core:log', m));
  } catch (e) {
    // be defensive
  }
}

function registerCoreHandlers(mainWindow) {
  ipcMain.handle('core:process', async (_event, payload) => {
    const filePath = typeof payload === 'string' ? payload : (payload && payload.filePath) || null;
    const options = (payload && payload.options) || {};

    console.log('core:process called with:', { filePath, options });
    if (!mainWindow) return { ok: false, error: 'No main window' };
    if (!filePath) return { ok: false, error: 'No file path provided' };

    // Notify UI that import succeeded
    forward(mainWindow, 'core:status', { status: 'imported', message: 'File imported to UI' });

    if (coreAddon && typeof coreAddon.process === 'function') {
      try {
        console.log('[DEBUG] Calling coreAddon.process()');
        forward(mainWindow, 'core:status', {
          status: 'sending',
          message: 'Sending to dissonance-core (addon)...',
        });
        attachAddonEventForwarding(coreAddon, mainWindow);
        forward(mainWindow, 'core:status', { status: 'processing', message: 'Processing started' });

        const result = coreAddon.process(filePath, options);
        console.log('[DEBUG] process() returned:', result);

        // Wait a bit for the result
        const resolved =
          result && typeof result.then === 'function'
            ? await Promise.race([result, new Promise((r) => setTimeout(() => r(null), 5000))])
            : result;

        const processedPath = (resolved && resolved.processedPath) || null;

        forward(mainWindow, 'core:status', {
          status: 'processed',
          message: 'Processing complete',
          processedPath,
        });
        return { ok: true, processedPath };
      } catch (err) {
        console.error('Core addon processing error', err);
        forward(mainWindow, 'core:status', {
          status: 'error',
          message: 'Processing failed',
          error: String(err),
        });
        return { ok: false, error: String(err) };
      }
    } else {
      console.log('[DEBUG] coreAddon.process is NOT a function. coreAddon:', coreAddon);
      console.log('[DEBUG] coreAddon.process:', coreAddon?.process);
    }

    // fallback: simulation
    try {
      return await simulateProcessing(filePath, mainWindow);
    } catch (err) {
      console.error('Processing error', err);
      forward(mainWindow, 'core:status', { status: 'error', message: 'Processing failed' });
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('core:export', async (_event, payload) => {
    // payload can be a string (processedPath) or an object { processedPath, destPath }
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

module.exports = { registerCoreHandlers, coreAddon };
