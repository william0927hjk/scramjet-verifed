// scripts/prepare-assets.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

const publicDir = path.join(root, "public");

const require = createRequire(import.meta.url);

function packageRoot(pkg) {
  const resolved = require.resolve(pkg);
  let dir = path.dirname(resolved);

  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }

    dir = path.dirname(dir);
  }

  throw new Error(`Could not locate package root for ${pkg}`);
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const file = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(file, files);
    } else {
      files.push(file);
    }
  }

  return files;
}

function findFile(pkg, names) {
  const files = walk(packageRoot(pkg));

  for (const name of names) {
    const exact = files.find(
      file =>
        path.basename(file).toLowerCase() ===
        name.toLowerCase()
    );

    if (exact) {
      return exact;
    }
  }

  return null;
}

function copy(label, source, destination) {
  if (!source) {
    throw new Error(
      `Missing ${label}. The installed package does not contain the required browser asset.`
    );
  }

  fs.mkdirSync(
    path.dirname(destination),
    { recursive: true }
  );

  fs.copyFileSync(
    source,
    destination
  );

  console.log(
    `✅ ${label}: ${destination}`
  );
}

// Scramjet browser runtime.
copy(
  "Scramjet core",
  findFile(
    "@mercuryworkshop/scramjet",
    ["scramjet.js"]
  ),
  path.join(
    publicDir,
    "scramjet",
    "scramjet.js"
  )
);

copy(
  "Scramjet WASM",
  findFile(
    "@mercuryworkshop/scramjet",
    ["scramjet.wasm"]
  ),
  path.join(
    publicDir,
    "scramjet",
    "scramjet.wasm"
  )
);

// Controller assets.
// These are still needed by the controller's generated
// frame/service-worker machinery.
copy(
  "Controller API",
  findFile(
    "@mercuryworkshop/scramjet-controller",
    ["controller.api.js"]
  ),
  path.join(
    publicDir,
    "controller",
    "controller.api.js"
  )
);

copy(
  "Controller inject",
  findFile(
    "@mercuryworkshop/scramjet-controller",
    ["controller.inject.js"]
  ),
  path.join(
    publicDir,
    "controller",
    "controller.inject.js"
  )
);

copy(
  "Controller service worker",
  findFile(
    "@mercuryworkshop/scramjet-controller",
    ["controller.sw.js"]
  ),
  path.join(
    publicDir,
    "controller",
    "controller.sw.js"
  )
);

// Transport used by the browser.
copy(
  "libcurl transport",
  findFile(
    "@mercuryworkshop/libcurl-transport",
    ["index.mjs"]
  ),
  path.join(
    publicDir,
    "clients",
    "libcurl-client.js"
  )
);

// Optional Scramjet utilities bundle.
const utils =
  findFile(
    "@mercuryworkshop/scramjet-utils",
    ["scramjet-utils.js"]
  ) ||
  findFile(
    "@mercuryworkshop/scramjet-utils",
    ["index.mjs"]
  );

if (utils) {
  copy(
    "Scramjet utils",
    utils,
    path.join(
      publicDir,
      "scramjet",
      "scramjet-utils.js"
    )
  );
}

console.log(
  "✅ Scramjet assets prepared."
);
