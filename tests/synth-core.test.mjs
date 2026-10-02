import test from 'node:test';
import assert from 'node:assert/strict';
import { clamp, midiToHz, scaleNotes, terrainSample, motionFeatures, mutateParams, applyCameraPerformance } from '../synth-core.js';

test('clamp keeps values inside bounds', () => {
  assert.equal(clamp(-1, 0, 1), 0);
  assert.equal(clamp(2, 0, 1), 1);
  assert.equal(clamp(0.4, 0, 1), 0.4);
});

test('midiToHz maps A4 to 440 Hz', () => {
  assert.ok(Math.abs(midiToHz(69) - 440) < 1e-9);
});

test('scaleNotes produces ascending scale degrees', () => {
  assert.deepEqual(scaleNotes(60, 'pentatonic', 8), [60,62,64,67,69,72,74,76]);
});

test('terrainSample stays finite and bounded across extreme controls', () => {
  for (let i = 0; i < 200; i++) {
    const v = terrainSample((i - 100) / 7, (100 - i) / 9, { terrainX: 1, terrainY: 0, roughness: 1, fold: 1, orbit: 1 });
    assert.ok(Number.isFinite(v));
    assert.ok(v >= -1.001 && v <= 1.001);
  }
});

test('motionFeatures reports centroid and energy for changed pixels', () => {
  const prev = new Uint8ClampedArray(16).fill(0);
  const curr = new Uint8ClampedArray(16).fill(0);
  curr[3] = 255; curr[7] = 255;
  const f = motionFeatures(prev, curr, 4, 4, 20);
  assert.ok(f.energy > 0);
  assert.ok(f.x > 0.7);
  assert.ok(f.y >= 0 && f.y <= 1);
  assert.ok(f.spread >= 0 && f.spread <= 1);
});

test('mutateParams respects normalized parameter bounds', () => {
  const src = { terrainX:.5, terrainY:.5, orbit:.5, roughness:.5, fold:.5, brightness:.5, resonance:.5, drift:.5, spread:.5 };
  const out = mutateParams(src, () => 1, 0.25);
  for (const v of Object.values(out)) assert.ok(v >= 0 && v <= 1);
});

test('camera performance is bipolar around the base patch and does not rewrite it', () => {
  const base={terrainX:.5,terrainY:.5,roughness:.3,fold:.2,brightness:.4,resonance:.5,delay:.1,drift:.2,spread:.4,orbit:.4};
  const out=applyCameraPerformance(base,{x:1,y:0,energy:1,spread:1},{depth:1,wildness:2,chaos:false});
  assert.equal(base.terrainX,.5);
  assert.ok(out.params.terrainX>.5);
  assert.ok(out.params.terrainY<.5);
  assert.ok(out.params.roughness>.3);
  assert.ok(out.params.fold>.2);
  assert.ok(out.params.brightness>.4);
  assert.ok(out.params.resonance>.5);
  assert.ok(out.params.delay>.1);
  assert.ok(Math.abs(out.pitchBend)>0.01);
});

test('camera performance clamps normalized targets even at extreme wildness', () => {
  const base={terrainX:.98,terrainY:.02,roughness:.95,fold:.95,brightness:.95,resonance:.95,delay:.7,drift:.95,spread:.95,orbit:.95};
  const out=applyCameraPerformance(base,{x:1,y:1,energy:1,spread:1},{depth:1,wildness:4,chaos:true,random:()=>1});
  for(const [k,v] of Object.entries(out.params)){ if(k==='delay') assert.ok(v>=0&&v<=.75); else assert.ok(v>=0&&v<=1); }
  assert.ok(out.pitchBend>=-1&&out.pitchBend<=1);
});
