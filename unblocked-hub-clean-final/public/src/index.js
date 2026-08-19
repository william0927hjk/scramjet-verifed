// public/src/index.js
// Scramjet v2 controller bootstrap.

let controller = null;
let viewerFrame = null;

async function waitForServiceWorker(registration, timeoutMs = 10000) {
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

  const changed = new Promise(resolve => {
    const handler = () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handler
      );
      resolve(navigator.serviceWorker.controller);
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handler,
      { once: true }
    );
  });

  const timeout = new Promise(resolve => {
    setTimeout(() => {
      resolve(
        navigator.serviceWorker.controller ||
        registration.active ||
        registration.waiting
      );
    }, timeoutMs);
  });

  return Promise.race([changed, timeout]);
}

async function initScramjet() {
  // Load Scramjet's runtime first.
  const scramjetCore = await import('/scramjet/scramjet.mjs');

  globalThis.$scramjet = scramjetCore;

  if (!globalThis.$scramjet.BareResponse) {
    throw new Error(
      'Scramjet core loaded, but BareResponse is missing.'
    );
  }

  const ControllerModule =
    await import('/controller/controller.api.js');

  // Handle the different export shapes used by generated bundles.
  const Controller =
    ControllerModule.Controller ||
    ControllerModule.default?.Controller ||
    ControllerModule.default;

  if (typeof Controller !== 'function') {
    console.error(
      'Controller module exports:',
      ControllerModule
    );

    throw new Error(
      'Scramjet controller bundle did not expose a Controller constructor.'
    );
  }

  const transportModule =
    await import('/clients/libcurl-client.js');

  const LibcurlClient =
    transportModule.default ||
    transportModule.LibcurlClient ||
    transportModule;

  if (typeof LibcurlClient !== 'function') {
    console.error(
      'Transport module exports:',
      transportModule
    );

    throw new Error(
      'libcurl transport did not expose a constructor.'
    );
  }

  const registration =
    await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    });

  const serviceWorker =
    await waitForServiceWorker(registration);

  if (!serviceWorker) {
    throw new Error(
      'No active Scramjet service worker is available.'
    );
  }

  const wisp =
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;

  const transport =
    new LibcurlClient({ wisp });

  const config =
    scramjetCore.defaultConfigDev ||
    scramjetCore.defaultConfig ||
    undefined;

  controller =
    new Controller({
      serviceworker: serviceWorker,
      transport,
      scramjetConfig: config
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

  const frame =
    getOrCreateViewerFrame();

  frame.style.display = 'block';

  if (!window.ScramjetHub.viewerFrameController) {
    window.ScramjetHub.viewerFrameController =
      controller.createFrame(frame);
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
