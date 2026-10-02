# Terrain Loom

Terrain Loom is an experimental browser synthesizer from Circuit Drift Labs. Each voice scans a two-dimensional mathematical sound terrain; the player changes the terrain itself rather than only choosing a conventional oscillator waveform.

## Play

Open the GitHub Pages site, press **Start audio**, then use A–; and Q–P or the on-screen note buttons. Drag the terrain to reshape the voice field in real time.

Keyboard modes:
- **Grid:** two QWERTY rows play scale degrees.
- **Shape:** 1–8 selects a chord/interval shape; letter keys choose roots.
- **Drone:** letter keys latch notes; Space clears them.
- **Z / X:** octave down/up.
- **Shift:** sustain.

## MIDI

Use **Connect MIDI** in a browser that supports Web MIDI. Notes, velocity, sustain, pitch bend and mod wheel are supported. To MIDI-learn a control, double-click its slider, then move a MIDI CC. Mappings are stored in localStorage.

## Motion Field

The optional webcam sensor uses low-resolution frame differencing to measure motion centroid, energy and spread. It does not identify hands or faces. Camera frames are processed locally in the page, are not uploaded, and are not included in synth recordings.

## Recording

Press **Record** to capture the synth master. Press **Stop / export** to download the browser-supported recording format (normally WebM/Opus).

## Browser compatibility

Web Audio/AudioWorklet is broadly available in current browsers. Web MIDI support varies by browser, so MIDI is optional. Camera access requires HTTPS or a secure local context and user permission.

## Development

No dependencies are required.

```bash
npm test
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Structure

- `synth-core.js`: pure terrain, scale, mutation and motion-analysis helpers.
- `audio-worklet.js`: real-time polyphonic terrain synthesis.
- `app.js`: Web Audio graph, performance controls, MIDI, camera, recording and presets.
- `index.html` / `styles.css`: Pages UI.
- `SPEC.md`: product/technical specification.
