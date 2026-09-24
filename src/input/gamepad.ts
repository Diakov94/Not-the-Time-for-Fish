// The Gamepad API's standard mapping (w3c.github.io/gamepad/#remapping): the buttons by index, named as the
// bindings table names them; the axes are the left stick's x and y, then the right stick's, y pointing down.
const BUTTONS = ['PadA', 'PadB', 'PadX', 'PadY', 'PadLB', 'PadRB', 'PadLT', 'PadRT', 'PadView', 'PadMenu', 'PadL3', 'PadR3', 'PadUp', 'PadDown', 'PadLeft', 'PadRight', 'PadHome'];

// A stick past the deadzone, rescaled so the deadzone's edge is 0 and full deflection 1; radial, so a
// diagonal is not cut short.
function stick(deadzone: number, x = 0, y = 0): [number, number] {
  const m = Math.hypot(x, y);
  const k = m > deadzone ? Math.min(1, (m - deadzone) / (1 - deadzone)) / m : 0;
  return [x * k, y * k];
}

// What the pad holds now: every code down with how far (a button 1, a left-stick half-axis up to 1), and
// the right stick's deflection, which turns the camera.
export type Pad = { codes: Map<string, number>; look: { x: number; y: number } };

// One reading of the first connected pad; with none, nothing is held.
export function read(pads: (Gamepad | null)[], deadzone: number): Pad {
  const pad = pads.find((p) => p?.connected);
  const codes = new Map<string, number>();
  if (!pad) return { codes, look: { x: 0, y: 0 } };
  pad.buttons.forEach((b, i) => b.pressed && BUTTONS[i] && codes.set(BUTTONS[i], 1));
  const [x, y] = stick(deadzone, pad.axes[0], pad.axes[1]);
  const half: [string, number][] = [['PadStickLeft', -x], ['PadStickRight', x], ['PadStickUp', -y], ['PadStickDown', y]];
  half.forEach(([code, v]) => v > 0 && codes.set(code, v));
  const [lx, ly] = stick(deadzone, pad.axes[2], pad.axes[3]);
  return { codes, look: { x: lx, y: ly } };
}
