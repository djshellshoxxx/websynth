# Architecture Summary

From `SPEC.md`.

- **Platform.** Static GitHub Pages site, no backend, account, analytics, cookies, CDN, framework or build step (SPEC "Platform").
- **Audio engine.** AudioWorklet synthesis with a minimum of 12 voices and oldest-voice stealing. A deterministic, bounded terrain function combines ridge, crater, grid, roughness and fold components (SPEC "Audio engine").
- **Camera is not a pitch control.** The webcam does local frame-difference analysis and extracts centroid, energy and spread. These features deform the synthesis space; notes stay under keyboard or MIDI control (SPEC "Motion Field").
- **Consent for camera.** `getUserMedia()` runs only after an explicit user action.
- **Split of responsibilities.** `synth-core.js` holds pure helpers, `audio-worklet.js` the real-time synthesis, and `app.js` the Web Audio graph, controls, MIDI, camera, recording and presets (README "Structure").
