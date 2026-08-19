// server.js
import 'dotenv/config';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { server as wisp } from '@mercuryworkshop/wisp-js/server';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const PUBLIC = path.join(__dirname, 'public');

const app = Fastify({ logger: true });

// Public application files.
await app.register(fastifyStatic, {
  root: PUBLIC,
  prefix: '/',
});

// The prepare-assets script copies the browser-facing Scramjet/controller
// files from installed packages into public/scram, public/controller, etc.
// Keeping these files under public makes the deployment independent of
// node_modules path resolution at request time.

app.setNotFoundHandler((req, reply) => {
  const pathname = req.url.split('?')[0];
  const accept = String(req.headers.accept || '');

  // Never disguise a missing JS/WASM/worker/module as HTML.
  const assetLike =
    pathname.startsWith('/src/') ||
    pathname.startsWith('/scram/') ||
    pathname.startsWith('/controller/') ||
    pathname.startsWith('/clients/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.mjs') ||
    pathname.endsWith('.wasm');

  if (!assetLike && accept.includes('text/html')) {
    return reply.type('text/html').sendFile('index.html');
  }

  return reply.code(404).type('text/plain').send('Not found');
});

await app.listen({ port: PORT, host: '0.0.0.0' });

app.server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/wisp/')) {
    wisp.routeRequest(req, socket, head);
  } else {
    socket.destroy();
  }
});

console.log(`🚀 http://localhost:${PORT}`);
console.log(`🔌 ws://localhost:${PORT}/wisp/`);
