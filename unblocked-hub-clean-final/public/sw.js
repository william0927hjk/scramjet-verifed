// public/sw.js
// Scramjet 2 service-worker entrypoint.
// The published controller worker is prepared during `pnpm install`.

importScripts('/controller/controller.sw.js');
