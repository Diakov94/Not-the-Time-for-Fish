// The HUD's look (GAME.md, UI mood: chunky, playful, readable at a glance). Every size is in `--u`, a
// hundredth of the height of the largest 16:9 box the window holds times the viewer's text scale
// (`--scale`, which the HUD writes from the settings store, card 122), so the layout keeps its proportions
// from 1280x720 to 1920x1080. `--top` leaves the top edge to the app's room hint, two 14 px lines at
// both 1280 and 1920 px wide. No text is under 12 px, whatever the scale. Three columns share the top: the
// team at most 30 --u wide from the left (a long name puts its state under it), the centre's texts within
// 33 --u of either edge, the fish counter at the right, so at the largest scale no panel meets another.
export const CSS = `
.hud {
  --u: calc(min(1vh, 0.5625vw) * var(--scale, 1));
  --top: calc(7 * var(--u) + 14px);
  --middle: calc(100vw - 66 * var(--u)); /* the widest a centred text may be */
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
.hud .top {
  position: absolute;
  top: var(--top);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(1 * var(--u));
}
.hud .clock {
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
  top: var(--top);
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
  font-size: max(12px, calc(1.7 * var(--u)));
  font-weight: 700;
}
.hud .fish .title {
  grid-column: 1 / -1;
  font-size: max(12px, calc(2 * var(--u)));
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
.hud .overtime {
  max-width: var(--middle);
  box-sizing: border-box;
  font-size: calc(2.6 * var(--u));
  background: rgb(150 30 20 / 0.8);
  text-align: center;
  text-wrap: balance;
}
.hud .work {
  position: absolute;
  bottom: calc(8 * var(--u));
  left: 50%;
  transform: translateX(-50%);
  width: calc(32 * var(--u));
  text-align: center;
  font-size: max(12px, calc(2.2 * var(--u)));
}
.hud .work .bar {
  height: calc(1.6 * var(--u));
  margin-top: calc(0.6 * var(--u));
  border: calc(0.3 * var(--u)) solid #f4f1ea;
  border-radius: calc(1 * var(--u));
  overflow: hidden;
}
.hud .work .fill {
  height: 100%;
  background: #f4f1ea;
}
.hud .whisker i {
  position: absolute;
  top: 50%;
  left: 0;
  width: calc(12 * var(--u));
  height: calc(10 * var(--u));
  margin-top: calc(-5 * var(--u));
}
.hud .whisker i + i {
  left: auto;
  right: 0;
  transform: scaleX(-1);
}
.hud .whisker b {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: calc(0.6 * var(--u));
  border-radius: calc(0.3 * var(--u));
  background: #f4f1ea;
  box-shadow: 0 0 0 calc(0.25 * var(--u)) rgb(0 0 0 / 0.6);
  transform-origin: left center;
  animation: twitch 0.12s ease-in-out infinite alternate;
}
.hud .whisker b:first-child {
  transform: rotate(-16deg);
}
.hud .whisker b:last-child {
  transform: rotate(16deg);
  animation-delay: -0.06s;
}
@keyframes twitch {
  from {
    rotate: -5deg;
  }
  to {
    rotate: 5deg;
  }
}
.hud .team {
  position: absolute;
  top: var(--top);
  left: calc(2 * var(--u));
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(0.8 * var(--u));
  max-width: calc(30 * var(--u));
  font-size: max(12px, calc(2.2 * var(--u)));
}
.hud .mate {
  display: flex;
  flex-wrap: wrap;
  column-gap: 0.3em;
  max-width: 100%;
  box-sizing: border-box;
  white-space: nowrap;
}
.hud .mate .name {
  overflow: hidden;
  text-overflow: ellipsis;
}
.hud .mate .state {
  flex: none;
  font-weight: 700;
}
.hud .mate[data-state='grabbed'] {
  background: rgb(170 110 0 / 0.85);
}
.hud .mate[data-state='captured'] {
  background: rgb(150 30 20 / 0.85);
}
.hud .arrow {
  position: absolute;
  top: 0;
  left: 0;
}
.hud .arrow::before {
  content: '';
  position: absolute;
  top: calc(-2 * var(--u));
  left: calc(-2 * var(--u));
  border-left: calc(4 * var(--u)) solid #f4f1ea;
  border-top: calc(2 * var(--u)) solid transparent;
  border-bottom: calc(2 * var(--u)) solid transparent;
  filter: drop-shadow(0 0 calc(0.3 * var(--u)) #111);
}
.hud .tip {
  margin-top: calc(4 * var(--u));
  max-width: min(calc(100 * var(--u)), var(--middle));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(0.4 * var(--u));
  text-align: center;
  text-wrap: balance;
  font-size: calc(2.6 * var(--u));
  animation: tip 5s linear forwards;
}
.hud .tip small {
  font-size: max(12px, calc(1.6 * var(--u)));
  font-weight: 700;
  opacity: 0.8;
}
@keyframes tip {
  0% {
    opacity: 0;
  }
  5%,
  90% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
`;
