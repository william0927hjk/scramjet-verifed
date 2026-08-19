# Unblocked Hub — clean Scramjet 2 project

This repository is cleaned of `node_modules` and stale lockfiles.

## Deployment

Use the repository root (`unblocked-hub`) as the Render service root.

Build command:
`pnpm install`

Start command:
`pnpm start`

The `postinstall` script runs `scripts/prepare-assets.mjs`, which copies the
browser-facing Scramjet 2, controller, libcurl, and utility assets from the
installed packages into `public/`.

The dependency versions intentionally stay within the Scramjet 2 transport
generation:

- Scramjet 2.0.67-alpha.2
- scramjet-controller 0.0.14
- scramjet-utils 0.0.3
- proxy-transports 1.0.2
- libcurl-transport 2.0.5
- wisp-js 0.4.1

Do not commit `node_modules/`.

The proxy viewer is created through the Scramjet controller rather than by
manually constructing `/scramjet/<base64>` URLs. The viewer iframe is not
given the old `allow-scripts + allow-same-origin` sandbox combination.
