export const SCALES = {
  chromatic:[0,1,2,3,4,5,6,7,8,9,10,11], major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10],
  dorian:[0,2,3,5,7,9,10], pentatonic:[0,2,4,7,9], whole:[0,2,4,6,8,10], octatonic:[0,2,3,5,6,8,9,11]
};
export const PARAM_KEYS = ['terrainX','terrainY','orbit','roughness','fold','brightness','resonance','drift','spread'];
export const clamp = (v,min=0,max=1) => Math.min(max, Math.max(min, Number.isFinite(v) ? v : min));
export const midiToHz = n => 440 * 2 ** ((n - 69) / 12);
export function scaleNotes(root=60, scale='pentatonic', count=20){
  const ints=SCALES[scale]||SCALES.pentatonic, out=[];
  for(let i=0;i<count;i++){ const oct=Math.floor(i/ints.length); out.push(root+ints[i%ints.length]+12*oct); }
  return out;
}
export function terrainSample(x,y,p={}){
  const tx=clamp(p.terrainX??.5), ty=clamp(p.terrainY??.5), rough=clamp(p.roughness??.4), fold=clamp(p.fold??.2), orbit=clamp(p.orbit??.5);
  const a=1.5+tx*6.5, b=1.5+ty*7.5, c=2.5+rough*11;
  const ridge=Math.sin(x*a + Math.sin(y*b)*(0.8+rough*2));
  const crater=Math.sin(Math.hypot(x,y)*c + orbit*Math.PI*2);
  const grid=Math.sin(x*(2+a*.65))*Math.cos(y*(2+b*.65));
  let v=ridge*(1-tx)*.48 + crater*tx*.34 + grid*(.18+ty*.3);
  v += Math.sin((x+y)*c*1.7)*rough*.16;
  const drive=1+fold*8;
  v=Math.tanh(v*drive)/Math.tanh(drive);
  return clamp(v,-1,1);
}
export function motionFeatures(prev,curr,w,h,threshold=24){
  let total=0,sx=0,sy=0,ss=0,changed=0; const weights=[];
  for(let i=0;i<w*h;i++){ const d=Math.abs(curr[i]-prev[i]); if(d<threshold) continue; const wt=d/255; const x=i%w,y=Math.floor(i/w); total+=wt;sx+=x*wt;sy+=y*wt;changed++;weights.push([x,y,wt]); }
  if(!total) return {energy:0,x:.5,y:.5,spread:0};
  const cx=sx/total, cy=sy/total;
  for(const [x,y,wt] of weights) ss+=(Math.hypot(x-cx,y-cy)/Math.hypot(w,h))*wt;
  return {energy:clamp((changed/(w*h))*5),x:clamp(cx/Math.max(1,w-1)),y:clamp(cy/Math.max(1,h-1)),spread:clamp((ss/total)*3)};
}
export function mutateParams(src, rng=Math.random, amount=.18){
  const out={...src}; for(const k of PARAM_KEYS){ if(rng()>.42) out[k]=clamp((Number(src[k])||0)+(rng()*2-1)*amount); } return out;
}

export function applyCameraPerformance(base,sensor,opts={}){
  const depth=clamp(Number(opts.depth ?? .5),0,1);
  const wildness=clamp(Number(opts.wildness ?? 1),0,4);
  const chaos=Boolean(opts.chaos);
  const random=typeof opts.random==='function'?opts.random:Math.random;
  const x=(clamp(sensor?.x??.5)-.5)*2;
  const y=(clamp(sensor?.y??.5)-.5)*2;
  const energy=clamp(sensor?.energy??0);
  const spread=clamp(sensor?.spread??0);
  const amount=depth*wildness;
  const out={...base};
  const add=(k,delta,max=1)=>{ if(k in out) out[k]=clamp(Number(base[k]??0)+delta,0,max); };

  add('terrainX',x*.48*amount);
  add('terrainY',y*.48*amount);
  add('orbit',(x-y)*.22*amount);
  add('roughness',energy*.72*amount);
  add('fold',energy*.64*amount);
  add('brightness',(energy*.62 + y*.2)*amount);
  add('resonance',(spread*.68 + energy*.24)*amount);
  add('drift',(energy*.55 + Math.abs(x)*.25)*amount);
  add('spread',spread*.72*amount);
  add('delay',(spread*.28 + energy*.22)*amount,.75);

  if(chaos && energy>.18){
    const burst=clamp((energy-.18)/.82)*amount;
    for(const k of ['terrainX','terrainY','orbit','roughness','fold','brightness','resonance','drift','spread']){
      if(k in out) out[k]=clamp(out[k]+(random()*2-1)*.45*burst);
    }
  }

  const pitchBend=clamp((y*.5 + x*.2 + energy*.3)*amount,-1,1);
  return {params:out,pitchBend};
}

export function effectSettings(src={}){
  const signed=k=>{ const n=Number(src[k]); return Number.isFinite(n)?clamp(n,-1,1):0; };
  const rift=signed('rift'), smear=signed('smear'), crush=signed('crush'), voidAmt=signed('void'), fxMotion=signed('fxMotion');
  const riftMag=Math.abs(rift), smearMag=Math.abs(smear), crushMag=Math.abs(crush), voidMag=Math.abs(voidAmt), motionMag=Math.abs(fxMotion);
  return {
    riftDelay:.0015 + riftMag*.0165,
    riftFeedback:riftMag*.82,
    riftWet:riftMag*.62,
    riftDirection:rift<0?-1:1,
    smearDelay:.004 + smearMag*.051,
    smearWet:smearMag*.72,
    smearFeedback:smearMag*.58,
    smearCutoff:smear<0 ? 12000-(smearMag*10600) : 3600+(smearMag*10400),
    crushMix:crushMag*.88,
    crushHold:1+Math.floor(crushMag*28),
    crushSteps:Math.max(8,Math.round(4096*(1-crushMag)+16*crushMag)),
    crushMode:crush<0?-1:1,
    voidDelay:.08 + voidMag*.34,
    voidCutoff:voidAmt<0 ? 9000-(voidMag*8760) : 1200+(voidMag*7800),
    voidFeedback:voidMag*.78,
    voidWet:voidMag*.8,
    voidTone:voidAmt<0?-1:1,
    motionRate:.05 + motionMag*4.95,
    motionDirection:fxMotion<0?-1:1
  };
}
