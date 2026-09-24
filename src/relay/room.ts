// ADR 0005: the relay's whole logic. It knows sockets only as ids and the game payload only as
// opaque text, and its whole state is the members in join order and the room's `seq`, so a host
// that is evicted rebuilds it from one serialised value.
export type Room = { members: string[]; seq: number };

// One text frame for one member.
export type Out = { to: string; text: string };

export function newRoom(): Room {
  return { members: [], seq: 0 };
}

// Every message of the room goes to every member, the sender included, stamped with the next `seq`.
function fanOut(room: Room, message: object): Out[] {
  const text = JSON.stringify(message);
  return room.members.map((to) => ({ to, text }));
}

// A new member's id comes from the room's `seq`, so no two members of a room ever share one. The
// host is the connected member with the lowest join order: the first of `members`.
export function join(room: Room): { id: string; out: Out[] } {
  const seq = ++room.seq;
  const id = `c${seq}`;
  const out = fanOut(room, { type: 'joined', id, seq });
  room.members.push(id);
  out.push({ to: id, text: JSON.stringify({ type: 'welcome', you: id, members: room.members, host: room.members[0], seq }) });
  return { id, out };
}

// `left` names the host after the departure. The last member's departure reaches nobody.
export function leave(room: Room, id: string): Out[] {
  room.members = room.members.filter((m) => m !== id);
  return fanOut(room, { type: 'left', id, host: room.members[0], seq: ++room.seq });
}

export function forward(room: Room, from: string, data: string): Out[] {
  return fanOut(room, { type: 'msg', seq: ++room.seq, from, data });
}
