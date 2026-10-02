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
