// The development relay's port (`npm run relay`, src/relay/serve.ts), for Node and the browser alike.
export const DEV_PORT = 8787;
// The path under which the page's own origin reaches the relay (ADR 0005: one origin for both), so one
// Cloudflare quick tunnel to the dev server carries the page and the room; vite.config.ts forwards it.
export const RELAY_PATH = '/relay';
