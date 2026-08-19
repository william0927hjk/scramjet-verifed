// public/src/index.js
// Scramjet 2 controller bootstrap.

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
  const { Controller } = await import('/controller/controller.api.js');
  const { default: LibcurlClient } =
    await import('/clients/libcurl-client.js');

  const serviceWorker = await waitForServiceWorker();

  if (!serviceWorker) {
    throw new Error(
      'The service worker installed, but this page is not controlled yet. Reload once.'
    );
  }

  const wisp =
    `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/wisp/`;

  const transport = new LibcurlClient({ wisp });

  controller = new Controller({
    serviceworker: serviceWorker,
    transport
  });

  await controller.wait();

  console.log('✅ Scramjet controller ready');
  window.dispatchEvent(new Event('scramjet-controller-ready'));
}

function getOrCreateViewerFrame() {
  if (!viewerFrame) {
    viewerFrame = document.getElementById('viewerFrame');
    if (!viewerFrame) {
      throw new Error('viewerFrame not found');
    }
  }
  return viewerFrame;
}

export function openProxy(url) {
  if (!controller || !controller.isReady) {
    throw new Error('Scramjet controller is not ready.');
  }

  const frameEl = getOrCreateViewerFrame();
  frameEl.style.display = 'block';

  if (!frameEl.name) {
    frameEl.name = 'scramjet-frame';
  }

  const frame = controller.createFrame(frameEl);
  frame.go(url);
  return frame;
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
