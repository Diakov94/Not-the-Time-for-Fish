import { defineConfig } from 'vite';
import { DEV_PORT, RELAY_PATH } from './src/relay/address.ts';

// The dev server is the one origin of the page and the relay (ADR 0005): a socket to `/relay/<code>` is
// forwarded to `npm run relay` as `/<code>`, and a Cloudflare quick tunnel's hostname is served.
export default defineConfig({
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: { [`${RELAY_PATH}/`]: { target: `ws://localhost:${DEV_PORT}`, ws: true, rewrite: (path) => path.slice(RELAY_PATH.length) } },
  },
});
