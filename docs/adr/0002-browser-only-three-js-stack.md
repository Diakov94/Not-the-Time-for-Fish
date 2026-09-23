---
status: accepted
---

# Browser-only game on Three.js, TypeScript and Rapier instead of a game engine

The game is built almost entirely by a multi-agent AI system and reaches its players through a private link. We chose a code-first web stack (Three.js with `WebGPURenderer` and a WebGL2 fallback, TypeScript, Vite, Rapier WASM, a lightweight ECS) over Unity, Unreal or Godot, because agents work best with text-based formats and plain git diffs, and because a browser build needs zero install and no per-platform builds. The cost is doing engine work ourselves: physics sync, animation, procedural audio and tooling.

## Considered options

- **Godot**: text-based scenes, but editor-centric workflows and a heavy 3D web export; agent ergonomics for GDScript and C# were the weaker bet.
- **Unity / Unreal**: binary assets, licensing and editor-bound pipelines; a poor fit for agent-driven development.
- **Babylon.js**: viable; Three.js was picked for ecosystem size, WebGPU maturity and the volume of reference code available to agents.

## Consequences

- Desktop Chromium and Firefox only; Safari is unsupported. The performance target is 60+ FPS on near-high-end PCs.
- Every asset is either procedural (audio, geometry skeletons) or a text-friendly format (glTF), so the whole game lives in git.
