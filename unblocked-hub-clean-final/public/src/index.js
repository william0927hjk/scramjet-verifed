// public/src/index.js
import { Controller } from "@mercuryworkshop/scramjet-controller";
import { defaultConfigDev } from "@mercuryworkshop/scramjet";
import LibcurlClient from "@mercuryworkshop/libcurl-transport";

let controller = null;
let viewerFrameController = null;

async function waitForServiceWorker(registration, timeoutMs = 10000) {
  if (navigator.serviceWorker.controller) {
    return navigator.serviceWorker.controller;
  }

  const ready = navigator.serviceWorker.ready.then(() =>
    navigator.serviceWorker.controller || registration.active
  );

  const changed = new Promise(resolve => {
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => resolve(navigator.serviceWorker.controller),
      { once: true }
    );
  });

  const timeout = new Promise(resolve => {
    setTimeout(() => {
      resolve(
        navigator.serviceWorker.controller ||
        registration.active ||
        null
      );
    }, timeoutMs);
  });

  return Promise.race([ready, changed, timeout]);
}

async function initScramjet() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none"
  });

  const serviceWorker =
    await waitForServiceWorker(registration);

  if (!serviceWorker) {
    throw new Error("No active Scramjet service worker is available.");
  }

  const wisp =
    `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;

  const transport = new LibcurlClient({
    wisp
  });

  controller = new Controller({
    serviceworker: serviceWorker,
    transport,
    scramjetConfig: defaultConfigDev
  });

  await controller.wait();

  window.ScramjetHub = {
    controller,
    openProxy
  };

  console.log("✅ Scramjet controller ready");

  window.dispatchEvent(
    new Event("scramjet-controller-ready")
  );
}

function openProxy(url) {
  if (!controller) {
    throw new Error("Scramjet controller is not ready.");
  }

  const frame =
    document.getElementById("viewerFrame");

  if (!frame) {
    throw new Error("viewerFrame not found.");
  }

  frame.style.display = "block";

  if (!viewerFrameController) {
    viewerFrameController =
      controller.createFrame(frame);
  }

  viewerFrameController.go(url);

  return viewerFrameController;
}

window.ScramjetHub = {
  controller: null,
  openProxy
};

initScramjet().catch(error => {
  console.error(
    "❌ Scramjet initialization failed:",
    error
  );

  window.dispatchEvent(
    new CustomEvent(
      "scramjet-controller-error",
      { detail: error }
    )
  );
});
