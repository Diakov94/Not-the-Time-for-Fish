import { offerBindings } from '../settings/screen.ts';
import { settings } from '../settings/store.ts';
import { conflict, nameOf, tables, type Action } from './bindings.ts';
import { read } from './gamepad.ts';

// The settings screen's remap page (ADR 0012) shows this zone's tables in effect and their names, refuses
// a press by this zone's clash rule, and awaits a pad button through this zone's reading. Loaded for this
// effect by the page, beside the HUD's `offerView`: keyboard.ts stays free of the screen's DOM.
offerBindings({
  table: tables,
  name: nameOf,
  conflict: (action, code) => conflict(action as Action, code),
  padPressed: () => [...read(navigator.getGamepads?.() ?? [], settings().deadzone).codes.keys()][0] ?? null,
});
