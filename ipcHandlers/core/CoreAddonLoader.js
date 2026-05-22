/**
 * Loads the dissonance_core native addon, trying (in order):
 *   1. DISSONANCE_CORE_ADDON_PATH env override
 *   2. Platform-named .node in Build/Release/  (what CI ships)
 *   3. Generic .node in Build/Release/ or build/Release/
 *   4. The `dissonance-core` npm package
 *   5. node-bindings fallback
 * Returns the addon module or null. The loader never throws — call sites
 * handle a missing addon by returning structured errors over IPC.
 */
const fsSync = require('fs');
const path = require('path');

function tryResolve(moduleName) {
  try {
    return require.resolve(moduleName);
  } catch (_e) {
    return null;
  }
}

function getAddonCandidates() {
  const candidates = [];

  const override = process.env.DISSONANCE_CORE_ADDON_PATH || null;
  if (override) candidates.push(override);

  const platform = process.platform;
  const arch = process.arch;

  candidates.push(
    path.join(__dirname, '..', '..', 'Build', 'Release', `dissonance_core-${platform}-${arch}.node`)
  );

  candidates.push(path.join(__dirname, '..', '..', 'Build', 'Release', 'dissonance_core.node'));
  candidates.push(path.join(__dirname, '..', '..', 'build', 'Release', 'dissonance_core.node'));
  candidates.push(
    path.join(__dirname, '..', '..', 'build', 'Release', `dissonance_core-${platform}-${arch}.node`)
  );

  return [...new Set(candidates.filter(Boolean))];
}

class CoreAddonLoader {
  /**
   * @returns {object|null} The loaded addon module, or `null` if every
   *          candidate path failed. Never throws — IPC handlers that need
   *          the addon check for `null` and return a structured error.
   */
  load() {
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

    return coreAddon;
  }
}

module.exports = { CoreAddonLoader };
