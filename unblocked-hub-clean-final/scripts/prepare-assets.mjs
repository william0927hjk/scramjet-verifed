// scripts/prepare-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const require = createRequire(import.meta.url);

function packageRoot(pkg) {
  const resolved = require.resolve(pkg);
  let dir = path.dirname(resolved);
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`Could not locate ${pkg}`);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out);
    else out.push(file);
  }
  return out;
}

function findFile(pkg, candidates) {
  const files = walk(packageRoot(pkg));
  for (const candidate of candidates) {
    const exact = files.find(p => path.basename(p).toLowerCase() === candidate.toLowerCase());
    if (exact) return exact;
  }
  return null;
}

function copy(label, source, destination) {
  if (!source) {
    throw new Error(`Missing ${label}. The installed package does not provide the expected browser asset.`);
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  console.log(`✅ ${label}`);
}

// Scramjet core: controller injects /scramjet/scramjet.js into proxied documents.
// Keep the ESM build too so the top-level application can expose its exports as $scramjet.
copy(
  'Scramjet core JS',
  findFile('@mercuryworkshop/scramjet', ['scramjet.js']),
  path.join(publicDir, 'scramjet', 'scramjet.js')
);

copy(
  'Scramjet core ESM',
  findFile('@mercuryworkshop/scramjet', ['scramjet.mjs']),
  path.join(publicDir, 'scramjet', 'scramjet.mjs')
);

copy(
  'Scramjet WASM',
  findFile('@mercuryworkshop/scramjet', ['scramjet.wasm']),
  path.join(publicDir, 'scramjet', 'scramjet.wasm')
);

copy(
  'Scramjet controller API',
  findFile('@mercuryworkshop/scramjet-controller', ['controller.api.js']),
  path.join(publicDir, 'controller', 'controller.api.js')
);

copy(
  'Scramjet controller inject',
  findFile('@mercuryworkshop/scramjet-controller', ['controller.inject.js']),
  path.join(publicDir, 'controller', 'controller.inject.js')
);

copy(
  'Scramjet controller SW',
  findFile('@mercuryworkshop/scramjet-controller', ['controller.sw.js']),
  path.join(publicDir, 'controller', 'controller.sw.js')
);

copy(
  'libcurl client',
  findFile('@mercuryworkshop/libcurl-transport', ['index.mjs']),
  path.join(publicDir, 'clients', 'libcurl-client.js')
);

const utils =
  findFile('@mercuryworkshop/scramjet-utils', ['scramjet-utils.js']) ||
  findFile('@mercuryworkshop/scramjet-utils', ['index.mjs']);

if (utils) {
  copy(
    'Scramjet utils',
    utils,
    path.join(publicDir, 'scramjet', 'scramjet-utils.js')
  );
}

console.log('✅ Scramjet browser assets prepared.');
