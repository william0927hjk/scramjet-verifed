// public/src/index.js
// Scramjet v2 controller bootstrap.
// The controller bundle expects Scramjet core exports at globalThis.$scramjet.

let controller = null;
let viewerFrame = null;

async function waitForServiceWorker(timeoutMs = 15000) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  await navigator.serviceWorker.ready;

  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  await new Promise(resolve => {
    const timer = setTimeout(resolve, timeoutMs);

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

  return navigator.serviceWorker.controller;
}

async function initScramjet() {
  // scramjet.js is the browser bundle used by proxied documents.
  // scramjet.mjs is the ESM bundle whose exports the controller bundle expects
  // to find through globalThis.$scramjet.
  const scramjetCore = await import('/scramjet/scramjet.mjs');

  globalThis.$scramjet = scramjetCore;

  if (!globalThis.$scramjet.BareResponse) {
    throw new Error('Scramjet core loaded, but BareResponse is missing.');
  }

  const { Controller } = await import('/controller/controller.api.js');
  const { default: LibcurlClient } =
    await import('/clients/libcurl-client.js');

  const serviceWorker = await waitForServiceWorker();

  if (!serviceWorker) {
    throw new Error('No active service worker is controlling this page.');
  }

  const wisp =
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;

  const transport = new LibcurlClient({ wisp });

  controller = new Controller({
    serviceworker: serviceWorker,
    transport,
    scramjetConfig: scramjetCore.defaultConfigDev ?? scramjetCore.defaultConfig
  });

  await controller.wait();

  console.log('✅ Scramjet controller ready');

  window.ScramjetHub = {
    get controller() {
      return controller;
    },
    openProxy
  };

  window.dispatchEvent(new Event('scramjet-controller-ready'));
}

function getOrCreateViewerFrame() {
  if (!viewerFrame) {
    viewerFrame = document.getElementById('viewerFrame');
  }

  if (!viewerFrame) {
    throw new Error('viewerFrame not found');
  }

  return viewerFrame;
}

export function openProxy(url) {
  if (!controller) {
    throw new Error('Scramjet controller is not ready.');
  }

  const frameEl = getOrCreateViewerFrame();

  frameEl.style.display = 'block';

  if (!window.ScramjetHub.viewerFrameController) {
    window.ScramjetHub.viewerFrameController =
      controller.createFrame(frameEl);
  }

  window.ScramjetHub.viewerFrameController.go(url);
  return window.ScramjetHub.viewerFrameController;
}

window.ScramjetHub = {
  get controller() {
    return controller;
  },
  openProxy
};

initScramjet().catch(error => {
  console.error('❌ Scramjet initialization failed:', error);
  window.dispatchEvent(
    new CustomEvent('scramjet-controller-error', { detail: error })
  );
});
