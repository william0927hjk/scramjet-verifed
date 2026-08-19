// scripts/prepare-assets.mjs
//
// Copies the published browser artifacts expected by Scramjet 2 into public/.
// This runs during `pnpm install` via postinstall, so GitHub does not need
// to contain node_modules.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

const require = createRequire(import.meta.url);

function packageRoot(pkg) {
  const main = require.resolve(pkg);
  let dir = path.dirname(main);

  while (dir !== path.dirname(dir)) {
    const pkgJson = path.join(dir, 'package.json');
    if (fs.existsSync(pkgJson)) return dir;
    dir = path.dirname(dir);
  }

  throw new Error(`Could not locate package root for ${pkg}`);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(p, out);
    } else {
      out.push(p);
    }
  }
  return out;
}

function findOne(pkg, patterns) {
  const files = walk(packageRoot(pkg));
  const normalized = files.map(p => ({ p, b: path.basename(p) }));
  for (const pattern of patterns) {
    const exact = normalized.find(x => x.b.toLowerCase() === pattern.toLowerCase());
    if (exact) return exact.p;
  }
  for (const pattern of patterns) {
    const hit = normalized.find(x => x.b.toLowerCase().includes(pattern.toLowerCase()));
    if (hit) return hit.p;
  }
  return null;
}

function copyRequired(label, source, destination) {
  if (!source) {
    throw new Error(
      `Could not find ${label}. The installed package does not contain a published browser artifact matching the expected Scramjet 2 layout.`
    );
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`✅ ${label}: ${source} -> ${destination}`);
}

// Scramjet core artifacts.
copyRequired(
  'Scramjet bundle',
  findOne('@mercuryworkshop/scramjet', ['scramjet.js']),
  path.join(publicDir, 'scram', 'scramjet.js')
);

copyRequired(
  'Scramjet WASM',
  findOne('@mercuryworkshop/scramjet', ['scramjet.wasm']),
  path.join(publicDir, 'scram', 'scramjet.wasm')
);

// Controller browser artifacts. Published controller packages include these
// generated browser files; search by basename so minor package-layout changes
// do not break the deployment.
for (const name of ['controller.api.js', 'controller.inject.js', 'controller.sw.js']) {
  let source = findOne('@mercuryworkshop/scramjet-controller', [name]);

  if (!source) {
    try {
      source = findOne('@mercuryworkshop/proxy-bootstrap', [name]);
    } catch {}
  }

  copyRequired(
    name,
    source,
    path.join(publicDir, 'controller', name)
  );
}

// libcurl browser client is shipped as an ESM browser build.
copyRequired(
  'libcurl client',
  findOne('@mercuryworkshop/libcurl-transport', ['index.mjs']),
  path.join(publicDir, 'clients', 'libcurl-client.js')
);

// Some controller builds use the utils browser bundle directly.
const utilsBundle =
  findOne('@mercuryworkshop/scramjet-utils', ['scramjet-utils.js']) ||
  findOne('@mercuryworkshop/scramjet-utils', ['index.mjs']);

if (utilsBundle) {
  copyRequired(
    'Scramjet utils bundle',
    utilsBundle,
    path.join(publicDir, 'scram', 'scramjet-utils.js')
  );
}

// The controller service worker is the actual Scramjet v2 worker.
// It is imported by public/sw.js.
console.log('✅ Scramjet browser assets prepared.');
