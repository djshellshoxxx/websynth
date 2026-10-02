# Terrain Loom Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy an experimental wave-terrain browser synth with QWERTY, touch, MIDI, webcam-motion modulation, presets, recording, and Circuit Drift Labs integration.

**Architecture:** A dependency-free static site uses pure functions in `synth-core.js`, an `AudioWorkletProcessor` for synthesis, and `app.js` for browser I/O/state. Canvas 2D provides the terrain UI; browser-native MIDI, camera, localStorage, and MediaRecorder provide optional integrations.

**Tech Stack:** HTML5, CSS3, ES modules, Web Audio/AudioWorklet, Web MIDI, MediaDevices, Canvas 2D, MediaRecorder, Node built-in test runner.

**Spec:** `SPEC.md`

## Global Constraints
- Static GitHub Pages deployment with no backend or build step.
- No external runtime dependencies or CDNs.
- Camera permission is never requested automatically.
- Camera frames are not uploaded, stored, or recorded.
- Web MIDI is optional and must degrade gracefully.
- Synth output and terrain functions remain bounded under all UI values.

## Review Focus
- Browser without Web MIDI retains keyboard/touch functionality.
- Camera permission denial leaves the synth usable.
- Repeated key input does not leave stuck notes after blur/Panic.
- Extreme terrain parameters do not generate NaN/Infinity.
- Recording starts audio first and exports only master audio.

---

### Task 1: Pure synth and sensor math
**Files:** Create `synth-core.js`; Create `tests/synth-core.test.mjs`; Create `package.json`.
**Interfaces:** Produces `clamp`, `midiToHz`, `scaleNotes`, `terrainSample`, `motionFeatures`, `mutateParams`.
- [x] Write tests first for each pure behavior.
- [x] Run `node --test` and observe missing-module failure.
- [x] Implement minimal pure functions.
- [x] Run `node --test`; expect all tests pass.

### Task 2: AudioWorklet engine
**Files:** Create `audio-worklet.js`.
**Interfaces:** Consumes messages `params`, `noteOn`, `noteOff`, `allOff`, `pitchBend`; produces stereo audio.
- [x] Implement 12-voice terrain synthesis, envelopes, modal coloration, stereo spread, and soft limiting.
- [x] Run `node --check audio-worklet.js`.

### Task 3: Browser controller layer
**Files:** Create `app.js`.
**Interfaces:** Consumes DOM controls and `synth-core.js`; sends worklet messages; owns MIDI/camera/recording state.
- [x] Implement AudioContext startup, delay/master graph, notes, keyboard modes, scale/root, MIDI + learn, camera sensor, presets, recorder, storage, status, and visualizer.
- [x] Run `node --check app.js`.

### Task 4: UI and responsive visual system
**Files:** Create `index.html`; Create `styles.css`.
**Interfaces:** Every ID/query required by `app.js` exists; data-param controls match parameter keys.
- [x] Build accessible control panels, terrain canvas, note buttons, camera meters/mappings, presets, MIDI state, recorder, Help dialog, and responsive layout.
- [x] Add Circuit Drift Labs links and local-only camera disclosure.

### Task 5: Documentation and integration
**Files:** Create `README.md`; Create `SPEC.md`; modify Circuit Drift Labs `products.js`.
- [x] Document usage, browser compatibility, privacy, tests, and architecture.
- [ ] Add Terrain Loom to Circuit Drift Labs catalogue linking to WebSynth Pages.
- [ ] Run full verification and deploy through existing Pages workflow.
