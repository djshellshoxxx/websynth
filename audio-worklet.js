import { effectSettings } from './synth-core.js';

class TerrainLoomProcessor extends AudioWorkletProcessor {
  constructor(){
    super();
    this.voices=[];
    this.params={terrainX:.48,terrainY:.52,orbit:.42,roughness:.34,fold:.18,brightness:.62,resonance:.38,drift:.22,spread:.55,attack:.03,release:.45,glide:0,rift:0,smear:0,crush:0,void:0,fxMotion:0};
    this.tick=0;
    const n=Math.max(2048,Math.ceil(sampleRate*.6));
    this.fxIndex=0;
    this.riftL=new Float32Array(n); this.riftR=new Float32Array(n);
    this.smearL=new Float32Array(n); this.smearR=new Float32Array(n);
    this.voidL=new Float32Array(n); this.voidR=new Float32Array(n);
    this.smearLpL=0; this.smearLpR=0; this.voidLpL=0; this.voidLpR=0;
    this.crushCounter=0; this.crushHoldL=0; this.crushHoldR=0;
    this.port.onmessage=e=>this.msg(e.data||{});
  }
  msg(m){
    if(m.type==='params') Object.assign(this.params,m.values||{});
    if(m.type==='noteOn') this.noteOn(m.note,m.velocity??.8);
    if(m.type==='noteOff') for(const v of this.voices) if(v.note===m.note && !v.released){v.released=true;v.relStart=v.env;}
    if(m.type==='allOff') for(const v of this.voices){v.released=true;v.relStart=v.env;}
    if(m.type==='pitchBend') this.pitchBend=m.value||0;
  }
  noteOn(note,velocity){
    if(this.voices.length>=12) this.voices.sort((a,b)=>a.age-b.age).shift();
    this.voices.push({note,velocity,phase:0,env:0,released:false,relStart:0,age:currentTime,lp:0,r1:0,r2:0});
  }
  terrain(x,y){
    const p=this.params, a=1.5+p.terrainX*6.5,b=1.5+p.terrainY*7.5,c=2.5+p.roughness*11;
    const ridge=Math.sin(x*a+Math.sin(y*b)*(.8+p.roughness*2));
    const crater=Math.sin(Math.hypot(x,y)*c+p.orbit*Math.PI*2);
    const grid=Math.sin(x*(2+a*.65))*Math.cos(y*(2+b*.65));
    let v=ridge*(1-p.terrainX)*.48+crater*p.terrainX*.34+grid*(.18+p.terrainY*.3);
    v+=Math.sin((x+y)*c*1.7)*p.roughness*.16;
    const drive=1+p.fold*8; return Math.tanh(v*drive)/Math.tanh(drive);
  }
  read(buf,delaySamples){
    const n=buf.length, d=Math.max(1,Math.min(n-2,Math.round(delaySamples)));
    let i=this.fxIndex-d; if(i<0)i+=n;
    return buf[i];
  }
  processFx(l,r,fx,sampleNo){
    const sr=sampleRate, phase=(sampleNo/sr)*Math.PI*2*fx.motionRate*fx.motionDirection;
    let outL=l,outR=r;

    if(fx.riftWet>.0001){
      const mod=.72+.28*Math.sin(phase);
      const dl=fx.riftDelay*mod*sr, dr=fx.riftDelay*(1.02-.24*Math.sin(phase*1.07))*sr;
      const rl=this.read(this.riftL,dl), rr=this.read(this.riftR,dr);
      this.riftL[this.fxIndex]=Math.tanh(l + rl*fx.riftFeedback);
      this.riftR[this.fxIndex]=Math.tanh(r + rr*fx.riftFeedback);
      const cross=fx.riftDirection<0?-1:1;
      outL += (rl + rr*.22*cross)*fx.riftWet;
      outR += (rr - rl*.22*cross)*fx.riftWet;
    } else {
      this.riftL[this.fxIndex]=l; this.riftR[this.fxIndex]=r;
    }

    if(fx.smearWet>.0001){
      const wob=.88+.12*Math.sin(phase*.37+1.2);
      const sl=this.read(this.smearL,fx.smearDelay*wob*sr);
      const srR=this.read(this.smearR,fx.smearDelay*(1.11-.08*Math.sin(phase*.29))*sr);
      const alpha=1-Math.exp(-2*Math.PI*Math.max(80,fx.smearCutoff)/sr);
      this.smearLpL += (sl-this.smearLpL)*alpha;
      this.smearLpR += (srR-this.smearLpR)*alpha;
      this.smearL[this.fxIndex]=Math.tanh(l + this.smearLpR*fx.smearFeedback*.72);
      this.smearR[this.fxIndex]=Math.tanh(r + this.smearLpL*fx.smearFeedback*.72);
      outL += this.smearLpL*fx.smearWet;
      outR += this.smearLpR*fx.smearWet;
    } else {
      this.smearL[this.fxIndex]=l; this.smearR[this.fxIndex]=r;
    }

    if(fx.crushMix>.0001){
      if(this.crushCounter<=0){this.crushHoldL=outL;this.crushHoldR=outR;this.crushCounter=fx.crushHold;}
      this.crushCounter--;
      let cl=this.crushHoldL, cr=this.crushHoldR;
      if(fx.crushMode>0){cl=Math.round(cl*fx.crushSteps)/fx.crushSteps;cr=Math.round(cr*fx.crushSteps)/fx.crushSteps;}
      outL=outL*(1-fx.crushMix)+cl*fx.crushMix;
      outR=outR*(1-fx.crushMix)+cr*fx.crushMix;
    }

    if(fx.voidWet>.0001){
      const vl=this.read(this.voidL,fx.voidDelay*sr), vr=this.read(this.voidR,fx.voidDelay*1.071*sr);
      const alpha=1-Math.exp(-2*Math.PI*Math.max(80,fx.voidCutoff)/sr);
      this.voidLpL += (vl-this.voidLpL)*alpha;
      this.voidLpR += (vr-this.voidLpR)*alpha;
      const toneL=fx.voidTone<0?this.voidLpL:(vl-this.voidLpL*.55);
      const toneR=fx.voidTone<0?this.voidLpR:(vr-this.voidLpR*.55);
      this.voidL[this.fxIndex]=Math.tanh(l + toneR*fx.voidFeedback);
      this.voidR[this.fxIndex]=Math.tanh(r + toneL*fx.voidFeedback);
      outL += toneL*fx.voidWet;
      outR += toneR*fx.voidWet;
    } else {
      this.voidL[this.fxIndex]=l; this.voidR[this.fxIndex]=r;
    }

    this.fxIndex++; if(this.fxIndex>=this.riftL.length)this.fxIndex=0;
    return [Math.tanh(outL*1.05),Math.tanh(outR*1.05)];
  }
  process(_inputs, outputs){
    const out=outputs[0], L=out[0], R=out[1]||out[0], sr=sampleRate,p=this.params,fx=effectSettings(p);
    L.fill(0); if(R!==L) R.fill(0);
    for(let i=0;i<L.length;i++){
      let l=0,r=0;
      for(const v of this.voices){
        const attack=Math.max(.004,p.attack), release=Math.max(.02,p.release);
        if(!v.released) v.env=Math.min(1,v.env+1/(attack*sr)); else v.env=Math.max(0,v.env-v.relStart/(release*sr));
        if(v.env<=0) continue;
        const bend=(this.pitchBend||0)*2; const hz=440*Math.pow(2,((v.note+bend)-69)/12);
        v.phase=(v.phase+hz/sr)%1;
        const drift=Math.sin((this.tick+i)*.000013*(1+p.drift*8)+v.note)*p.drift*.22;
        const ang=v.phase*Math.PI*2; const ecc=.35+p.orbit*1.25;
        const x=Math.cos(ang+drift)*ecc + (p.terrainX-.5)*1.3;
        const y=Math.sin(ang*(1.003+p.orbit*.017)-drift)*(1.6-ecc*.45) + (p.terrainY-.5)*1.3;
        let s=this.terrain(x,y);
        const cutoff=.015+p.brightness*.42; v.lp += (s-v.lp)*cutoff; s=v.lp*(.4+p.brightness*.9);
        const res=.05+p.resonance*.5; const modal=Math.sin(ang*2.01+v.r1)*.18 + Math.sin(ang*3.97+v.r2)*.11;
        v.r1=(v.r1+res*.003)%6.283; v.r2=(v.r2+res*.0021)%6.283; s=(s+modal*p.resonance)*v.env*v.velocity*.17;
        const pan=Math.sin((v.note*.73)+p.spread*2.5)*p.spread; l+=s*(.72-pan*.28); r+=s*(.72+pan*.28);
      }
      [L[i],R[i]]=this.processFx(Math.tanh(l*1.25),Math.tanh(r*1.25),fx,this.tick+i);
    }
    this.tick+=L.length; this.voices=this.voices.filter(v=>v.env>0.0001); return true;
  }
}
registerProcessor('terrain-loom',TerrainLoomProcessor);
