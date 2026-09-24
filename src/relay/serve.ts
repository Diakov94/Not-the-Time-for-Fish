import { DEV_PORT } from './address.ts';
import { startRelay } from './node.ts';

// `npm run relay`: the Node host next to `vite dev`, so two browser tabs are two players.
const relay = await startRelay(Number(process.env.PORT ?? DEV_PORT));
console.log(`relay: ws://localhost:${relay.port}/<room code>`);
