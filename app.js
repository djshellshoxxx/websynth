import { clamp, scaleNotes, terrainSample, motionFeatures, mutateParams, PARAM_KEYS } from './synth-core.js';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state={audio:null,node:null,master:null,analyser:null,recDest:null,rec:null,chunks:[],midi:null,midiLearn:null,midiMap:{},camera:null,camPrev:null,camBaseline:24,camFrozen:false,keys:new Map(),drones:new Set(),octave:0,sustain:false,held:new Set(),sensor:{energy:0,x:.5,y:.5,spread:0},fps:0};
const params={terrainX:.48,terrainY:.52,orbit:.42,roughness:.34,fold:.18,brightness:.62,resonance:.38,drift:.22,spread:.55,attack:.03,release:.45,delay:.18,feedback:.22,level:.72};
const presets={
 'Glass Fault':{terrainX:.18,terrainY:.74,orbit:.35,roughness:.22,fold:.16,brightness:.86,resonance:.62,drift:.12,spread:.76,attack:.01,release:.72,delay:.24,feedback:.31,level:.68},
 'Neon Bog':{terrainX:.72,terrainY:.28,orbit:.71,roughness:.68,fold:.42,brightness:.38,resonance:.52,drift:.48,spread:.61,attack:.03,release:.85,delay:.29,feedback:.37,level:.65},
 'Bent Choir':{terrainX:.35,terrainY:.65,orbit:.52,roughness:.29,fold:.23,brightness:.58,resonance:.76,drift:.39,spread:.83,attack:.28,release:1.8,delay:.36,feedback:.42,level:.58},
 'Crater Bass':{terrainX:.82,terrainY:.36,orbit:.24,roughness:.44,fold:.67,brightness:.26,resonance:.41,drift:.08,spread:.27,attack:.005,release:.34,delay:.08,feedback:.14,level:.72},
 'Wire Bloom':{terrainX:.27,terrainY:.81,orbit:.79,roughness:.51,fold:.36,brightness:.72,resonance:.66,drift:.55,spread:.91,attack:.08,release:1.2,delay:.42,feedback:.48,level:.58},
 'Acid Weather':{terrainX:.64,terrainY:.44,orbit:.61,roughness:.77,fold:.74,brightness:.88,resonance:.49,drift:.31,spread:.72,attack:.01,release:.28,delay:.16,feedback:.29,level:.63},
 'Dust Organ':{terrainX:.43,terrainY:.31,orbit:.47,roughness:.18,fold:.12,brightness:.49,resonance:.72,drift:.16,spread:.52,attack:.12,release:1.4,delay:.21,feedback:.28,level:.61},
 'Slow Aurora':{terrainX:.24,terrainY:.67,orbit:.86,roughness:.26,fold:.21,brightness:.65,resonance:.58,drift:.82,spread:.95,attack:.9,release:3.1,delay:.48,feedback:.54,level:.52},
 'Broken Arcade':{terrainX:.76,terrainY:.22,orbit:.58,roughness:.88,fold:.81,brightness:.79,resonance:.33,drift:.21,spread:.68,attack:.005,release:.16,delay:.11,feedback:.23,level:.61},
 'Black Ice':{terrainX:.12,terrainY:.89,orbit:.31,roughness:.11,fold:.48,brightness:.92,resonance:.81,drift:.09,spread:.87,attack:.02,release:.95,delay:.31,feedback:.41,level:.59}
};
const qwerty=['a','s','d','f','g','h','j','k','l',';','q','w','e','r','t','y','u','i','o','p'];
const shapes=[[0],[0,7],[0,3,7],[0,4,7],[0,2,7],[0,5,7],[0,3,7,10],[0,7,12]];

async function startAudio(){
 if(state.audio){await state.audio.resume();return;}
 const AC=window.AudioContext||window.webkitAudioContext; if(!AC){status('Web Audio unavailable');return;}
 const ctx=new AC(); await ctx.audioWorklet.addModule('./audio-worklet.js');
 const node=new AudioWorkletNode(ctx,'terrain-loom',{outputChannelCount:[2]});
 const master=ctx.createGain(), delay=ctx.createDelay(2), fb=ctx.createGain(), wet=ctx.createGain(), analyser=ctx.createAnalyser(), dest=ctx.createMediaStreamDestination();
 delay.delayTime.value=params.delay; fb.gain.value=params.feedback; wet.gain.value=.28; master.gain.value=params.level;
 node.connect(master); node.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master); master.connect(analyser); analyser.connect(ctx.destination); master.connect(dest);
 Object.assign(state,{audio:ctx,node,master,analyser,recDest:dest,delay,fb,wet}); pushParams(); $('#startAudio').textContent='Audio on'; $('#startAudio').classList.add('active'); status('Audio ready');
}
function pushParams(){ if(!state.node)return; state.node.port.postMessage({type:'params',values:params}); if(state.master)state.master.gain.setTargetAtTime(params.level,state.audio.currentTime,.02); if(state.delay)state.delay.delayTime.setTargetAtTime(params.delay,state.audio.currentTime,.02); if(state.fb)state.fb.gain.setTargetAtTime(params.feedback,state.audio.currentTime,.02); }
function noteOn(n,v=.78){startAudio().then(()=>state.node?.port.postMessage({type:'noteOn',note:n,velocity:v})); state.held.add(n); flashKey(n,true);}
function noteOff(n){ if(state.sustain)return; state.node?.port.postMessage({type:'noteOff',note:n}); state.held.delete(n); flashKey(n,false);}
function allOff(){state.node?.port.postMessage({type:'allOff'});state.held.clear();state.drones.clear();$$('.playkey').forEach(x=>x.classList.remove('down'));}
function flashKey(n,on){const el=document.querySelector(`[data-note="${n}"]`);if(el)el.classList.toggle('down',on);}
function status(t){$('#status').textContent=t;}
function rootMidi(){return 48+Number($('#root').value)+state.octave*12;}
function layout(){return scaleNotes(rootMidi(),$('#scale').value,24);}
function keyboardNotes(k){
 const mode=$('#keyMode').value, notes=layout(),i=qwerty.indexOf(k); if(i<0)return[];
 if(mode==='grid')return [notes[i]];
 if(mode==='drone')return [notes[i]];
 const root=notes[i%10]; const shape=shapes[Math.min(7,Number(state.shape||0))]; return shape.map(x=>root+x);
}
function keyDown(e){ if(e.repeat||['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName))return; const k=e.key.toLowerCase(); if(k==='z'){state.octave=Math.max(-2,state.octave-1);updateOct();return;} if(k==='x'){state.octave=Math.min(3,state.octave+1);updateOct();return;} if(k==='shift'){state.sustain=true;return;} if(k===' '){e.preventDefault(); if($('#keyMode').value==='drone')allOff(); return;} if(/^[1-8]$/.test(k)&&$('#keyMode').value==='shape'){state.shape=Number(k)-1;status(`Shape ${k}`);return;}
 const ns=keyboardNotes(k); if(!ns.length)return; e.preventDefault();
 if($('#keyMode').value==='drone'){for(const n of ns){if(state.drones.has(n)){state.drones.delete(n);noteOff(n);}else{state.drones.add(n);noteOn(n);}}}else{state.keys.set(k,ns);ns.forEach(n=>noteOn(n));}
}
function keyUp(e){const k=e.key.toLowerCase(); if(k==='shift'){state.sustain=false; for(const n of [...state.held])if(![...state.keys.values()].flat().includes(n)&&!state.drones.has(n))noteOff(n);return;} if($('#keyMode').value==='drone')return; const ns=state.keys.get(k)||[]; ns.forEach(n=>noteOff(n));state.keys.delete(k);}
function updateOct(){$('#octave').textContent=state.octave>=0?`+${state.octave}`:`${state.octave}`;renderPlayKeys();}
function renderPlayKeys(){const host=$('#playKeys');host.innerHTML='';for(const n of layout().slice(0,16)){const b=document.createElement('button');b.className='playkey';b.dataset.note=n;b.textContent=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n%12]+Math.floor(n/12-1);b.onpointerdown=e=>{e.preventDefault();noteOn(n,.82)};b.onpointerup=b.onpointercancel=e=>{e.preventDefault();noteOff(n)};host.append(b);}}
function bindControls(){
 $$('[data-param]').forEach(el=>{const k=el.dataset.param;el.value=params[k];const out=document.querySelector(`[data-out="${k}"]`);const change=()=>{params[k]=Number(el.value);if(out)out.textContent=formatParam(k,params[k]);pushParams();};el.addEventListener('input',change);el.addEventListener('dblclick',()=>beginMidiLearn(k));change();});
 $('#preset').innerHTML=Object.keys(presets).map(n=>`<option>${n}</option>`).join(''); $('#preset').onchange=()=>loadPreset($('#preset').value); $('#random').onclick=randomize;$('#mutate').onclick=mutate;$('#panic').onclick=allOff;
 $('#root').onchange=renderPlayKeys;$('#scale').onchange=renderPlayKeys; $('#startAudio').onclick=startAudio; $('#midiBtn').onclick=enableMidi; $('#cameraBtn').onclick=toggleCamera; $('#freezeCam').onclick=()=>{state.camFrozen=!state.camFrozen;$('#freezeCam').classList.toggle('active',state.camFrozen)}; $('#calibrateCam').onclick=()=>{state.camBaseline=Math.max(8,Math.round(12+state.sensor.energy*90));status('Camera baseline calibrated')};
 $('#record').onclick=toggleRecord; $('#savePreset').onclick=saveUserPreset; $('#helpBtn').onclick=()=>$('#help').showModal(); $('#closeHelp').onclick=()=>$('#help').close();
 $('#camSensitivity').oninput=()=>status(`Camera sensitivity ${$('#camSensitivity').value}`); $('#camDepth').oninput=()=>{}; $('#camSmooth').oninput=()=>{}; $('#keyMode').onchange=()=>{allOff();status(`${$('#keyMode').selectedOptions[0].text} mode`)};
 $('#terrain').addEventListener('pointerdown',padPointer); $('#terrain').addEventListener('pointermove',e=>{if(e.buttons)padPointer(e)}); $('#terrain').addEventListener('dblclick',()=>{params.terrainX=.5;params.terrainY=.5;syncUI();});
 $('#clearMidi').onclick=()=>{state.midiMap={};localStorage.removeItem('terrain-midi-map');renderMidiMap();status('MIDI mappings cleared')};
}
function formatParam(k,v){ if(['attack','release','delay'].includes(k))return `${v.toFixed(2)}s`; return `${Math.round(v*100)}%`; }
function syncUI(){for(const [k,v] of Object.entries(params)){const el=document.querySelector(`[data-param="${k}"]`);if(el){el.value=v;const o=document.querySelector(`[data-out="${k}"]`);if(o)o.textContent=formatParam(k,v);}}pushParams();}
function loadPreset(n){Object.assign(params,presets[n]);syncUI();status(`Loaded ${n}`);}
function randomize(){for(const k of PARAM_KEYS)params[k]=Math.random();params.attack=Math.random()*.45;params.release=.18+Math.random()*2.4;params.delay=Math.random()*.48;params.feedback=Math.random()*.5;syncUI();status('Randomized');}
function mutate(){Object.assign(params,mutateParams(params,Math.random,.22));syncUI();status('Mutated');}
function padPointer(e){const r=e.currentTarget.getBoundingClientRect();params.terrainX=clamp((e.clientX-r.left)/r.width);params.terrainY=clamp(1-(e.clientY-r.top)/r.height);syncUI();}
async function enableMidi(){ if(!navigator.requestMIDIAccess){status('Web MIDI is not supported in this browser');return;} try{state.midi=await navigator.requestMIDIAccess(); wireMidi();state.midi.onstatechange=wireMidi;$('#midiBtn').classList.add('active');status(`MIDI ready: ${state.midi.inputs.size} input(s)`);}catch(e){status(`MIDI unavailable: ${e.message}`);} }
function wireMidi(){if(!state.midi)return;for(const input of state.midi.inputs.values())input.onmidimessage=onMidi;$('#midiDevices').textContent=[...state.midi.inputs.values()].map(x=>x.name||'MIDI input').join(', ')||'No MIDI inputs';}
function onMidi(e){const [st,d1,d2=0]=e.data,cmd=st&0xf0;$('#midiLast').textContent=[...e.data].map(x=>x.toString(16).padStart(2,'0')).join(' ');if(cmd===0x90&&d2>0)noteOn(d1,d2/127);else if(cmd===0x80||(cmd===0x90&&d2===0))noteOff(d1);else if(cmd===0xe0){const v=((d2<<7)|d1)-8192;state.node?.port.postMessage({type:'pitchBend',value:v/8192});}else if(cmd===0xb0){if(d1===64){state.sustain=d2>=64;if(!state.sustain)for(const n of [...state.held])noteOff(n);return;} if(state.midiLearn){state.midiMap[d1]=state.midiLearn;localStorage.setItem('terrain-midi-map',JSON.stringify(state.midiMap));status(`CC${d1} → ${state.midiLearn}`);state.midiLearn=null;renderMidiMap();return;} const p=state.midiMap[d1]||(d1===1?'drift':null);if(p&&p in params){params[p]=d2/127;syncUI();}}}
function beginMidiLearn(p){state.midiLearn=p;status(`Move a MIDI CC to map it to ${p}`);}
function renderMidiMap(){$('#midiMap').textContent=Object.entries(state.midiMap).map(([cc,p])=>`CC${cc}→${p}`).join(' · ')||'Double-click a knob/slider to MIDI-learn it';}
async function toggleCamera(){ if(state.camera){stopCamera();return;} if(!navigator.mediaDevices?.getUserMedia){status('Camera API unavailable');return;} try{const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:320},height:{ideal:240}},audio:false});state.camera=stream;const v=$('#camVideo');v.srcObject=stream;await v.play();$('#cameraBtn').textContent='Stop camera';$('#cameraBtn').classList.add('active');state.camPrev=null;requestAnimationFrame(cameraLoop);status('Camera sensor active. Frames stay local.');}catch(e){status(`Camera unavailable: ${e.message}`);} }
function stopCamera(){state.camera?.getTracks().forEach(t=>t.stop());state.camera=null;$('#camVideo').srcObject=null;$('#cameraBtn').textContent='Start camera';$('#cameraBtn').classList.remove('active');status('Camera stopped');}
function cameraLoop(){if(!state.camera)return;const v=$('#camVideo'),c=$('#camCanvas'),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(v,0,0,c.width,c.height);const rgba=ctx.getImageData(0,0,c.width,c.height).data,g=new Uint8ClampedArray(c.width*c.height);for(let i=0,j=0;i<rgba.length;i+=4,j++)g[j]=(rgba[i]+rgba[i+1]+rgba[i+2])/3;if(state.camPrev&&!state.camFrozen){const sens=Number($('#camSensitivity').value),th=Math.max(4,state.camBaseline+(1-sens)*35);const f=motionFeatures(state.camPrev,g,c.width,c.height,th),sm=Number($('#camSmooth').value);for(const k of Object.keys(f))state.sensor[k]=state.sensor[k]*sm+f[k]*(1-sm);applySensor();updateSensorUI();}state.camPrev=g;requestAnimationFrame(cameraLoop);}
function applySensor(){const depth=Number($('#camDepth').value),maps={x:$('#mapX').value,y:$('#mapY').value,energy:$('#mapEnergy').value,spread:$('#mapSpread').value};for(const [feature,p] of Object.entries(maps)){if(!p||!(p in params))continue;const target=state.sensor[feature];params[p]=clamp(params[p]*(1-depth)+target*depth);}syncUI();}
function updateSensorUI(){for(const k of ['x','y','energy','spread']){const el=$(`#meter-${k}`);if(el)el.style.setProperty('--v',`${state.sensor[k]*100}%`);const t=$(`#value-${k}`);if(t)t.textContent=state.sensor[k].toFixed(2);}}
function toggleRecord(){if(!state.recDest)return startAudio().then(toggleRecord);if(state.rec?.state==='recording'){state.rec.stop();return;}const type=['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus'].find(MediaRecorder.isTypeSupported);state.chunks=[];state.rec=new MediaRecorder(state.recDest.stream,type?{mimeType:type}:undefined);state.rec.ondataavailable=e=>{if(e.data.size)state.chunks.push(e.data)};state.rec.onstop=()=>{const blob=new Blob(state.chunks,{type:state.rec.mimeType});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`terrain-loom-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);$('#record').textContent='Record';status('Recording exported');};state.rec.start();$('#record').textContent='Stop / export';status('Recording…');}
function saveUserPreset(){const name=prompt('Preset name');if(!name)return;const all=JSON.parse(localStorage.getItem('terrain-user-presets')||'{}');all[name]={...params};localStorage.setItem('terrain-user-presets',JSON.stringify(all));status(`Saved ${name}`);renderUserPresets();}
function renderUserPresets(){const host=$('#userPresets'),all=JSON.parse(localStorage.getItem('terrain-user-presets')||'{}');host.innerHTML='';for(const [n,p] of Object.entries(all)){const b=document.createElement('button');b.textContent=n;b.onclick=()=>{Object.assign(params,p);syncUI();status(`Loaded ${n}`)};host.append(b);}}
function draw(){const c=$('#terrain'),ctx=c.getContext('2d');const dpr=Math.min(2,devicePixelRatio||1),w=c.clientWidth,h=c.clientHeight;if(c.width!==w*dpr||c.height!==h*dpr){c.width=w*dpr;c.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}ctx.clearRect(0,0,w,h);const step=Math.max(7,Math.floor(w/70));for(let y=0;y<h;y+=step){for(let x=0;x<w;x+=step){const nx=(x/w-.5)*4,ny=(y/h-.5)*3;const z=terrainSample(nx,ny,params),hue=(280+z*110+params.terrainX*80)%360;ctx.fillStyle=`hsla(${hue},90%,${45+z*18}%,.72)`;ctx.fillRect(x,y,step+1,step+1);}}ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1.5;for(const n of state.held){const t=performance.now()*.001*(.3+n%5*.04)+n;const rx=w*(.18+.25*params.orbit),ry=h*(.14+.18*(1-params.orbit));const x=w/2+Math.cos(t)*rx,y=h/2+Math.sin(t*1.013)*ry;ctx.beginPath();ctx.arc(x,y,4+6*params.resonance,0,Math.PI*2);ctx.stroke();}requestAnimationFrame(draw);}
function spectrumLoop(){if(state.analyser){const a=new Uint8Array(state.analyser.frequencyBinCount);state.analyser.getByteFrequencyData(a);let sum=0;for(const x of a)sum+=x;$('#levelMeter').style.setProperty('--v',`${Math.min(100,sum/a.length/1.8)}%`);}requestAnimationFrame(spectrumLoop);}
function init(){
 try{state.midiMap=JSON.parse(localStorage.getItem('terrain-midi-map')||'{}')}catch{}; bindControls();renderPlayKeys();renderMidiMap();renderUserPresets();window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',allOff);draw();spectrumLoop();if(!localStorage.getItem('terrain-help-seen')){setTimeout(()=>{$('#help').showModal();localStorage.setItem('terrain-help-seen','1')},350)}
}
init();
