zone: src/app (with a Vite config at the root)
size: S
# Two machines over the internet through one tunnel

ADR 0005 plans the Prototype's internet session as the Node relay on the owner's machine behind a Cloudflare quick tunnel. The app cannot use one yet: it connects to `ws://<page host>:8787/<code>`, but a tunnel serves the page over https on port 443. There is no Vite config either, so nothing proxies the relay and Vite rejects a tunnel's hostname. On one network, `npm run dev -- --host` already works.

## DoD
- One origin serves the page and the relay, so one tunnel carries both. The socket is `wss` on an https page and `ws` on http.

## Acceptance
- Two tabs where one opens the page through a second hostname for the same dev server (for example 127.0.0.1 and localhost) join one room through the single origin. Before: only `ws://<host>:8787` works.
- On one machine with two tabs, the room still works as before.

## Test
- None: the check is named in the report. The public tunnel itself is the owner's to run.
