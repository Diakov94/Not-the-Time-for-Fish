// The settings overlay's look (GAME.md, UI mood: chunky, playful, readable at a glance), in the HUD's
// colours. Sizes are px times `--k`, the store's text scale, which the screen sets as it draws and as the
// slider moves, so the whole sheet is the live preview; a control is never under 44 px. At 1280x720 and
// scale 1 both pages fit; past that the panel scrolls.
export const CSS = `
.settings {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(10 12 18 / 0.72);
  font-family: system-ui, sans-serif;
  font-weight: 800;
  font-size: calc(17px * var(--k));
  color: #f4f1ea;
}
.settings[hidden] {
  display: none;
}
.settings .sheet {
  box-sizing: border-box;
  width: min(1180px, calc(100vw - 32px));
  max-height: calc(100vh - 32px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: calc(10px * var(--k));
  padding: calc(14px * var(--k)) calc(22px * var(--k));
  background: #1d2330;
  border: 3px solid #f2c14e;
  border-radius: calc(18px * var(--k));
  box-shadow: 0 10px 40px rgb(0 0 0 / 0.6);
}
.settings header,
.settings footer {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--k));
}
.settings h1 {
  margin: 0 auto 0 0;
  font-size: calc(28px * var(--k));
  letter-spacing: 0.04em;
}
.settings button {
  box-sizing: border-box;
  min-width: 44px;
  min-height: max(44px, calc(44px * var(--k)));
  padding: 0 calc(12px * var(--k));
  font: inherit;
  color: #f4f1ea;
  background: #2d3548;
  border: 2px solid #4a5670;
  border-radius: calc(12px * var(--k));
  cursor: pointer;
}
.settings button:hover,
.settings button:focus-visible {
  border-color: #f2c14e;
  outline: none;
}
.settings button[aria-pressed='true'] {
  background: #f2c14e;
  border-color: #f2c14e;
  color: #1d2330;
}
.settings .close {
  min-width: max(44px, calc(44px * var(--k)));
  font-size: calc(22px * var(--k));
}
.settings .pages {
  display: flex;
  gap: calc(8px * var(--k));
}
.settings .page {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(500px * var(--k))), 1fr));
  grid-auto-flow: row dense;
  gap: calc(8px * var(--k)) calc(28px * var(--k));
}
.settings .row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: calc(10px * var(--k));
  min-height: max(44px, calc(44px * var(--k)));
}
.settings .row > span {
  line-height: 1.15;
}
.settings .choice {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: calc(6px * var(--k));
}
.settings .range {
  display: flex;
  align-items: center;
  gap: calc(10px * var(--k));
}
.settings input[type='range'] {
  width: calc(190px * var(--k));
  height: max(44px, calc(44px * var(--k)));
  margin: 0;
  accent-color: #f2c14e;
  cursor: pointer;
}
.settings output {
  min-width: 3.6em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.settings .preview,
.settings [data-key='palette'] {
  grid-column: 1 / -1;
}
.settings [data-key='palette'] {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.settings [data-key='palette'] > span {
  flex: none;
}
.settings .preview {
  padding: calc(6px * var(--k)) calc(12px * var(--k));
  background: rgb(20 24 34 / 0.62);
  border-radius: calc(12px * var(--k));
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.settings .pair {
  display: inline-flex;
  gap: 3px;
  margin-right: 6px;
  vertical-align: middle;
}
.settings .pair i {
  width: calc(16px * var(--k));
  height: calc(16px * var(--k));
  border: 2px solid #f4f1ea;
  border-radius: 50%;
}
.settings .keys {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) 1fr 1fr;
  align-items: center;
  gap: calc(6px * var(--k)) calc(8px * var(--k));
  align-content: start;
}
.settings .keys b {
  font-size: calc(14px * var(--k));
  letter-spacing: 0.06em;
  text-transform: uppercase;
  opacity: 0.8;
}
.settings .keys button {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.settings .keys button.waiting {
  border-color: #f2c14e;
  animation: waiting 0.6s ease-in-out infinite alternate;
}
@keyframes waiting {
  to {
    background: #4a5670;
  }
}
.settings .status {
  margin-right: auto;
  min-height: 1.2em;
  font-weight: 700;
}
.settings .status.refused {
  color: #ff9d8a;
}
`;
