// The HUD's look (GAME.md, UI mood: chunky, playful, readable at a glance). Every size is in `--u`, a
// hundredth of the height of the largest 16:9 box the window holds, so the layout keeps its proportions
// from 1280x720 to 1920x1080. The top edge below 5u is left to the app's one-line room hint.
export const CSS = `
.hud {
  --u: min(1vh, 0.5625vw);
  position: fixed;
  inset: 0;
  pointer-events: none;
  font-family: system-ui, sans-serif;
  font-weight: 800;
  color: #f4f1ea;
  text-shadow: 0 0.08em 0.25em rgb(0 0 0 / 0.7);
}
.hud [hidden],
.hud[hidden] {
  display: none !important;
}
.hud .panel {
  background: rgb(20 24 34 / 0.62);
  border-radius: calc(1.2 * var(--u));
  padding: calc(0.8 * var(--u)) calc(1.6 * var(--u));
}
.hud .clock {
  position: absolute;
  top: calc(7 * var(--u));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.hud .phase {
  font-size: calc(2.4 * var(--u));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hud .timer {
  font-size: calc(6 * var(--u));
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.hud .fish {
  position: absolute;
  top: calc(7 * var(--u));
  right: calc(2 * var(--u));
  display: grid;
  grid-template-columns: auto auto auto;
  align-items: baseline;
  column-gap: calc(0.8 * var(--u));
  text-align: center;
}
.hud .fish b {
  font-size: calc(5 * var(--u));
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.hud .fish .of {
  font-size: calc(3.5 * var(--u));
}
.hud .fish small {
  font-size: calc(1.7 * var(--u));
  font-weight: 700;
}
.hud .fish .title {
  grid-column: 1 / -1;
  font-size: calc(2 * var(--u));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.hud .items {
  position: absolute;
  bottom: calc(3 * var(--u));
  left: calc(2 * var(--u));
  display: flex;
  gap: calc(1.2 * var(--u));
  font-size: calc(2.6 * var(--u));
}
.hud .items .off {
  opacity: 0.5;
}
`;
