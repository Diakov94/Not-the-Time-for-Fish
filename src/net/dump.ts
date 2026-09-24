import type { ClientId, Kind, NetId } from '../sim/entities.ts';
import { readSnapshot, type Snapshot } from '../sim/snapshot.ts';
import type { Sim } from '../sim/world.ts';

export type DumpRow = Pick<Snapshot, 'p' | 'q' | 'rest'> & {
  id: NetId;
  kind: Kind;
  home: ClientId | null;
  owner: ClientId | null;
  held: boolean;
  inFlight: boolean;
};
export type Dump = { me: ClientId; gone: ClientId[]; entities: DumpRow[] };

// The state dump shared by the desync hotkey and the headless comparison: the fold's table and every
// entity's identity and pose on this client, and whether this client's claim on it is in flight (it
// then simulates the prop itself), sorted by net id so two clients' dumps line up.
export function dump(sim: Sim): Dump {
  const entities = [...sim.entities.values()].map((e) => {
    const row = sim.ownership.rows.get(e.id);
    const { p, q, rest } = readSnapshot(e);
    const inFlight = sim.inFlight.has(e.id);
    return { id: e.id, kind: e.kind, home: e.home, owner: row?.owner ?? null, held: row?.held ?? false, inFlight, p, q, rest };
  });
  return { me: sim.me, gone: [...sim.ownership.gone], entities: entities.sort((a, b) => (a.id < b.id ? -1 : 1)) };
}
