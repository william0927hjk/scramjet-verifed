// public/src/index.js
// Scramjet v2 controller bootstrap.

let controller = null;
let viewerFrame = null;

async function waitForServiceWorker(registration, timeoutMs = 10000) {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported in this browser.');
  }

  // Already controlled.
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  // Wait for the browser to finish the SW lifecycle, but do not require
  // controllerchange on the first page load.
  const controllerChanged = new Promise(resolve => {
    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => resolve(navigator.serviceWorker.controller),
      { once: true }
    );
  });

  const ready = navigator.serviceWorker.ready.then(() =>
    navigator.serviceWorker.controller || registration.active
  );

  const timeout = new Promise(resolve =>
    setTimeout(
      () => resolve(navigator.serviceWorker.controller || registration.active),
      timeoutMs
    )
  );

  return Promise.race([
    controllerChanged,
    ready,
    timeout
  ]);
}

async function initScramjet() {
  // Load Scramjet core before the controller bundle.
  const scramjetCore = await import('/scramjet/scramjet.mjs');

  // The controller expects the Scramjet runtime on this global.
  globalThis.$scramjet = scramjetCore;

  if (!globalThis.$scramjet.BareResponse) {
    throw new Error(
      'Scramjet core loaded, but BareResponse is missing.'
    );
  }

  const { Controller } =
    await import('/controller/controller.api.js');

  const { default: LibcurlClient } =
    await import('/clients/libcurl-client.js');

  // Register here so we have the actual registration object available.
  const registration =
    await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

  const serviceWorker =
    await waitForServiceWorker(registration);

  if (!serviceWorker) {
    throw new Error(
      'The Scramjet service worker installed but no active worker is available.'
    );
  }

  const wisp =
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;

  const transport =
    new LibcurlClient({ wisp });

  controller =
    new Controller({
      serviceworker: serviceWorker,
      transport
    });

  await controller.wait();

  console.log('✅ Scramjet controller ready');

  window.ScramjetHub = {
    get controller() {
      return controller;
    },

    openProxy
  };

  window.dispatchEvent(
    new Event('scramjet-controller-ready')
  );
}

function getOrCreateViewerFrame() {
  if (!viewerFrame) {
    viewerFrame =
      document.getElementById('viewerFrame');
  }

  if (!viewerFrame) {
    throw new Error('viewerFrame not found');
  }

  return viewerFrame;
}

function openProxy(url) {
  if (!controller || !controller.isReady) {
    throw new Error(
      'Scramjet controller is not ready.'
    );
  }

  const frameEl =
    getOrCreateViewerFrame();

  frameEl.style.display = 'block';

  if (!window.ScramjetHub.viewerFrameController) {
    window.ScramjetHub.viewerFrameController =
      controller.createFrame(frameEl);
  }

  window.ScramjetHub.viewerFrameController.go(url);

  return window.ScramjetHub.viewerFrameController;
}

window.ScramjetHub = {
  controller: null,
  viewerFrameController: null,
  openProxy
};

initScramjet().catch(error => {
  console.error(
    '❌ Scramjet initialization failed:',
    error
  );

  window.dispatchEvent(
    new CustomEvent(
      'scramjet-controller-error',
      { detail: error }
    )
  );
});
