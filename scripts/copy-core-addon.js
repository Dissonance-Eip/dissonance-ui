#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');

function usage() {
  console.log('copy-core-addon.js — copy a built dissonance_core.node into the UI build folder.');
  console.log('Usage: node copy-core-addon.js [--source <path-to-node-file>]');
  console.log('Environment variable: CORE_ADDON_PATH can also point to the .node file.');
}

async function main() {
  const uiRoot = path.resolve(__dirname, '..');
  const destDir = path.join(uiRoot, 'build', 'Release');
  const destPath = path.join(destDir, 'dissonance_core.node');

  const argv = process.argv.slice(2);
  let sourceArg = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source' && argv[i+1]) { sourceArg = argv[i+1]; break; }
    if (!argv[i].startsWith('-') && !sourceArg) sourceArg = argv[i];
  }

  const candidates = [];
  if (process.env.CORE_ADDON_PATH) candidates.push(process.env.CORE_ADDON_PATH);
  if (sourceArg) candidates.push(sourceArg);

  // common relative paths to the core build
  candidates.push(path.join(uiRoot, '..', 'core', 'build', 'Release', 'dissonance_core.node'));
  candidates.push(path.join(uiRoot, '..', '..', 'CLionProjects', 'core', 'build', 'Release', 'dissonance_core.node'));
  candidates.push(path.join(uiRoot, '..', '..', 'core', 'build', 'Release', 'dissonance_core.node'));
  candidates.push('C:\\Users\\luca\\CLionProjects\\core\\build\\Release\\dissonance_core.node');

  // Attempt to find the file by walking up a few levels looking for core/build/Release
  const maxUp = 4;
  let cur = uiRoot;
  for (let i = 0; i < maxUp; i++) {
    const tryPath = path.join(cur, 'core', 'build', 'Release', 'dissonance_core.node');
    candidates.push(tryPath);
    cur = path.dirname(cur);
  }

  // Deduplicate preserving order
  const seen = new Set();
  const finalCandidates = candidates.filter(p => {
    try { p = path.resolve(p); } catch(e) {}
    if (seen.has(p)) return false; seen.add(p); return true;
  });

  let found = null;
  for (const c of finalCandidates) {
    if (!c) continue;
    if (fs.existsSync(c)) { found = c; break; }
  }

  if (!found) {
    console.error('\nCould not find a built `dissonance_core.node` artifact. Tried the following locations:');
    finalCandidates.forEach(p => console.error(' - ' + p));
    console.error('\nBuild the native addon in the core project (e.g. with node-gyp or your CMake build) and re-run this script.');
    process.exitCode = 2;
    return;
  }

  try {
    await fsp.mkdir(destDir, { recursive: true });
    await fsp.copyFile(found, destPath);
    console.log(`Copied ${found} -> ${destPath}`);
    process.exitCode = 0;
  } catch (err) {
    console.error('Failed to copy file:', err);
    process.exitCode = 3;
  }
}

if (process.argv.includes('--help') || process.argv.includes('-h')) { usage(); process.exit(0); }
main();
