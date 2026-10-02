# Terrain Loom WebSynth Specification

## Purpose
Terrain Loom is a static, browser-based experimental synthesizer for Circuit Drift Labs. It must be playable immediately without hardware, but gain expressive depth from MIDI, pointer/touch input, and an optional webcam motion sensor. The instrument should sound and feel unlike a standard subtractive synth or browser theremin.

## Core identity
The synthesis concept is polyphonic 2D wave-terrain scanning. Each note traces an orbit across a continuously morphable mathematical surface; the sampled surface height becomes audio. The player changes terrain geometry, orbit, roughness, fold, brightness, resonance, drift, and stereo spread.

The webcam is not a pitch theremin. It performs local frame-difference analysis and extracts X centroid, Y centroid, motion energy, and spread. Those features deform the synthesis space while notes remain under keyboard, touch, pointer, or MIDI control.

## Platform
- Static GitHub Pages site at `djshellshoxxx.github.io/websynth/`.
- No backend, account, analytics, cookies, required CDN, framework, or build step.
- Web Audio `AudioWorklet` for custom low-latency synthesis.
- Web MIDI when supported, with graceful fallback.
- `getUserMedia()` camera use only after explicit user action.
- `MediaRecorder` for exporting performances where supported.

## Audio engine
- Minimum 12-voice polyphony with oldest-voice stealing.
- Deterministic bounded terrain function combining ridge, crater, grid, spatial roughness, and nonlinear fold components.
- Per-voice orbit position, phase, velocity, envelope, and stereo behavior.
- Attack and release envelope controls.
- Brightness control implemented as stable tonal damping/filtering.
- Resonant/modal coloration must remain stable at maximum parameter settings.
- Stereo spread based on per-note orbit divergence.
- Delay and feedback send with safe feedback maximum.
- Master soft saturation and gain ceiling to reduce clipping risk.
- MIDI velocity affects amplitude; pitch bend is supported.

## Performance input
### Computer keyboard
Three modes:
1. Grid: A–; and Q–P map to adjacent scale degrees across rows.
2. Shape: number keys 1–8 select interval/chord shapes while letter keys select roots.
3. Drone: mapped keys toggle latched notes; Space clears drones.

Z/X shift octave and Shift sustains. Musical shortcuts must not fire while focus is inside form controls.

### Pointer and touch
- Large visual terrain canvas acts as an XY controller.
- X maps to Terrain X and Y maps to Terrain Y.
- Double-click resets terrain center.
- On-screen note buttons provide mouse/touch performance independent of QWERTY layout.

### Scales
Chromatic, major, minor, Dorian, pentatonic, whole-tone, and octatonic scales with selectable root.

### MIDI
- Explicit Connect MIDI action.
- Enumerate/hot-plug inputs.
- Note on/off, velocity, sustain CC64, pitch bend.
- CC1 defaults to Drift.
- MIDI Learn: double-click a synth control, then move a controller CC to bind it.
- Persist user CC mappings in localStorage and provide clear-all.
- No SysEx request.

## Motion Field camera sensor
- Camera starts only when the user presses Start camera.
- Frames remain local and are never uploaded or stored.
- Analyze a small grayscale frame buffer with frame differencing; no ML library required.
- Extract normalized X centroid, Y centroid, motion energy, and spread.
- Smooth sensor output and expose sensitivity, smoothing, and modulation depth.
- Default mappings: X→Terrain X, Y→Terrain Y, Energy→Roughness, Spread→Resonance.
- Mapping selectors allow safe alternate destinations.
- Freeze Sensor and Calibrate controls.
- Visible sensor meters and privacy text.
- Camera failure must not affect normal synth operation.

## Presets and exploration
Ship at least 10 presets: Glass Fault, Neon Bog, Bent Choir, Crater Bass, Wire Bloom, Acid Weather, Dust Organ, Slow Aurora, Broken Arcade, Black Ice.

Randomize must use bounded musical ranges. Mutate changes only a subset of normalized timbre parameters. User presets are saved locally.

## Recording
Record the synth master via `MediaStreamDestination` + `MediaRecorder`; stopping creates a downloadable browser-supported audio file. Recording is independent of the webcam and must never record webcam video.

## Visual design
- Circuit Drift Labs family resemblance with near-black base and vivid cyan, magenta, orange, green, and violet accents.
- Large animated Canvas 2D terrain surface that reflects the same terrain math used by the synth concept.
- Active notes draw orbit markers/traces.
- Translucent panels, large labels, responsive desktop/mobile layout.
- Avoid skeuomorphic hardware/rack styling.
- Respect `prefers-reduced-motion` for nonessential animation.

## First-run UX
- One prominent Start Audio control to satisfy browser audio gesture restrictions.
- Dismissible Quick Start dialog, reopenable from Help.
- User can make sound after starting audio via QWERTY or on-screen notes.
- Clear live status feedback for MIDI, camera, recording, preset, and error states.
- Panic button releases all voices.

## Integration
- The synth header/footer links back to Circuit Drift Labs.
- Circuit Drift Labs `products.js` must list Terrain Loom as a browser instrument linking to the Pages deployment.
- README documents controls, compatibility, privacy, and local development/tests.

## Quality gates
- Pure synthesis/mapping math has Node tests for clamping, MIDI frequency, scale generation, bounded terrain output, motion feature extraction, and mutation bounds.
- `node --test` passes.
- `node --check` passes for browser JavaScript and AudioWorklet source.
- All HTML element IDs referenced by `app.js` exist in `index.html`.
- No external runtime dependencies.
