// scripts/build-client.mjs
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const client = path.join(root, 'public', 'src', 'index.js');
const temp = path.join(root, 'public', 'src', 'index.bundle.js');

await build({
  entryPoints: [client],
  outfile: temp,
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: false,
  minify: false,
  logLevel: 'info',
  legalComments: 'none',
});

await fs.rename(temp, client);

console.log('✅ Browser client bundled:', client);
