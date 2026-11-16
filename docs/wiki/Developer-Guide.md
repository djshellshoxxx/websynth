# Developer Guide

```sh
npm test                    # 21 tests pass on this snapshot
python -m http.server 8000  # then open http://localhost:8000
```

No dependencies and no build step. CI: `.github/workflows/static.yml`. Syntax checks on `app.js`, `synth-core.js` and `audio-worklet.js` pass.
