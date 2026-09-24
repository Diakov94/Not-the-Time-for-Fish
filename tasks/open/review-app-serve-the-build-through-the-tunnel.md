zone: src/app
size: S
files: vite.config.ts, package.json, index.html
# The friends load the dev server through the tunnel: 13.9 MB in 50 requests and a blank page for 6 s; the build is 1.26 MB gzip in 2

Measured by the shell review of 2026-09-24 in headless Chrome, cold cache, on an emulated 20 Mbit/s link with 60 ms latency (a quick tunnel's order of magnitude: the owner's upload):

| served by | requests | bytes | room form at |
| --- | --- | --- | --- |
| `vite dev` (what card 15 tunnels) | 50 | 13.9 MB uncompressed, the pre-bundled Rapier alone 6.9 MB | 6.2 s, a dark blank page until then |
| `vite build` + `vite preview` | 2 | 1.26 MB gzip (3.5 MB raw: 2.7 MB is the WASM's base64, ADR 0003's accepted price) | 0.7 s |

Locally both take 0.2 s, which is why it was never felt. The page is blank until the form appears because the title lives in `roomScreen`, behind the whole module graph and `await init()`. Vite 8's `preview` takes the same `proxy` and `allowedHosts` as `server`, so card 15's one origin holds for the build too, and ADR 0005's tunnel arithmetic is untouched.

## DoD
- vite.config.ts: `preview` shares `server`'s proxy and allowed hosts (one owner of the proxy line); package.json: `play` = build then preview, named in `.studio/project.conf`'s comment for playtests; `npm run gates` runs `vite build` (0.5 s measured), so a build that breaks cannot pass.
- index.html carries the title and one line, "Завантаження…", that the room screen replaces: the first paint is not blank.

## Acceptance
- Cold load over the emulated link: the room form ≤ 1.0 s in ≤ 3 requests (before: 6.2 s, 50 requests, 13.9 MB); first text ≤ 0.3 s (before: 6.2 s).

## Test
- None: the load is the measurement; the gates' build is the check.
