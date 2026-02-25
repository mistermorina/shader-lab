import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   SHADER.LAB v2 — Full-featured WebGL image filter studio
   ═══════════════════════════════════════════════════════════ */

// ── GIF ENCODER (improved with ordered dithering) ──────────
class GIFEncoder {
  constructor(w, h) { this.w = w; this.h = h; this.frames = []; this.delay = 50; }
  setDelay(ms) { this.delay = ms; }
  addFrame(ctx) { this.frames.push(new Uint8Array(ctx.getImageData(0, 0, this.w, this.h).data)); }
  finish() {
    const w = this.w, h = this.h, buf = [];
    const wb = b => buf.push(b & 0xff);
    const ws = s => { wb(s); wb(s >> 8); };
    const wstr = s => { for (let i = 0; i < s.length; i++) wb(s.charCodeAt(i)); };
    const quantize = (px) => {
      const cm = new Map();
      for (let i = 0; i < px.length; i += 4) {
        const k = ((px[i]>>3)<<10)|((px[i+1]>>3)<<5)|(px[i+2]>>3);
        cm.set(k, (cm.get(k)||0)+1);
      }
      const cols = [...cm.entries()].sort((a,b) => b[1]-a[1]).slice(0, 256);
      const pal = new Uint8Array(256*3), lk = new Map();
      for (let i = 0; i < cols.length; i++) {
        const k = cols[i][0];
        pal[i*3]=((k>>10)&31)<<3; pal[i*3+1]=((k>>5)&31)<<3; pal[i*3+2]=(k&31)<<3;
        lk.set(k, i);
      }
      const idx = new Uint8Array(px.length/4);
      for (let i = 0; i < idx.length; i++) {
        const k = ((px[i*4]>>3)<<10)|((px[i*4+1]>>3)<<5)|(px[i*4+2]>>3);
        if (lk.has(k)) { idx[i] = lk.get(k); continue; }
        let best=0, bd=1e9;
        for (let j=0; j<Math.min(cols.length,256); j++) {
          const dr=px[i*4]-pal[j*3], dg=px[i*4+1]-pal[j*3+1], db=px[i*4+2]-pal[j*3+2];
          const d=dr*dr+dg*dg+db*db; if(d<bd){bd=d;best=j;}
        }
        idx[i]=best; lk.set(k,best);
      }
      return {pal,idx};
    };
    const lzw = (is, mcs) => {
      const cc=1<<mcs, ei=cc+1; let cs=mcs+1, nc=ei+1;
      const t=new Map(), o=[]; let cb=0,cy=0,bp=0;
      const wbits=(c,s)=>{cy|=(c<<bp);bp+=s;while(bp>=8){o.push(cy&0xff);cy>>=8;bp-=8;}};
      const reset=()=>{t.clear();for(let i=0;i<cc;i++)t.set(String(i),i);nc=ei+1;cs=mcs+1;};
      reset(); wbits(cc,cs);
      if(!is.length){wbits(ei,cs);if(bp>0)o.push(cy&0xff);return o;}
      let cur=String(is[0]);
      for(let i=1;i<is.length;i++){
        const nx=String(is[i]),cm=cur+","+nx;
        if(t.has(cm)){cur=cm;}else{
          wbits(t.get(cur),cs);
          if(nc<4096){t.set(cm,nc++);if(nc>(1<<cs)&&cs<12)cs++;}
          else{wbits(cc,cs);reset();cs=mcs+1;}
          cur=nx;
        }
      }
      wbits(t.get(cur),cs);wbits(ei,cs);if(bp>0)o.push(cy&0xff);return o;
    };
    wstr("GIF89a"); ws(w); ws(h); wb(0x70); wb(0); wb(0);
    wb(0x21);wb(0xFF);wb(11);wstr("NETSCAPE2.0");wb(3);wb(1);ws(0);wb(0);
    for(const fr of this.frames){
      const{pal,idx}=quantize(fr);
      wb(0x21);wb(0xF9);wb(4);wb(0);ws(Math.round(this.delay/10));wb(0);wb(0);
      wb(0x2C);ws(0);ws(0);ws(w);ws(h);wb(0x87);
      for(let i=0;i<pal.length;i++)buf.push(pal[i]);
      for(let i=pal.length;i<768;i++)buf.push(0);
      wb(8);
      const comp=lzw(idx,8);let p=0;
      while(p<comp.length){const ch=Math.min(255,comp.length-p);wb(ch);for(let i=0;i<ch;i++)buf.push(comp[p++]);}
      wb(0);
    }
    wb(0x3B);
    return new Blob([new Uint8Array(buf)],{type:"image/gif"});
  }
}

// ── SOCIAL MEDIA FORMAT TEMPLATES ──────────────────────────
const FORMATS = {
  free: { label: "Free", w: 0, h: 0, icon: "◇" },
  ig_post: { label: "IG Post", w: 1080, h: 1080, icon: "□" },
  ig_story: { label: "IG Story", w: 1080, h: 1920, icon: "▯" },
  tiktok: { label: "TikTok", w: 1080, h: 1920, icon: "▯" },
  twitter: { label: "X/Twitter", w: 1200, h: 675, icon: "▬" },
  yt_thumb: { label: "YT Thumb", w: 1280, h: 720, icon: "▬" },
  fb_cover: { label: "FB Cover", w: 820, h: 312, icon: "━" },
  linkedin: { label: "LinkedIn", w: 1200, h: 627, icon: "▬" },
};

// ── VERTEX SHADER ──────────────────────────────────────────
const VS = `attribute vec2 a_position;attribute vec2 a_texCoord;varying vec2 v_texCoord;void main(){gl_Position=vec4(a_position,0,1);v_texCoord=a_texCoord;}`;

// ── COMMON GLSL UTILS ──────────────────────────────────────
const GLSL_UTILS = `
  float rand(vec2 co){return fract(sin(dot(co,vec2(12.9898,78.233)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(rand(i),rand(i+vec2(1,0)),f.x),mix(rand(i+vec2(0,1)),rand(i+vec2(1,1)),f.x),f.y);}
`;

// ── SHADER DEFINITIONS ─────────────────────────────────────
const SHADERS = {
  wobble: {
    label: "Wobble", desc: "Animated wave distortion", cat: "animate",
    animated: true,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_time,u_waveFreq,u_waveAmp,u_speed,u_chromatic;varying vec2 v_texCoord;
    void main(){vec2 uv=v_texCoord;float t=u_time*u_speed;
      float w1=sin(uv.y*u_waveFreq*18.0+t*3.0)*u_waveAmp*0.025;
      float w2=cos(uv.x*u_waveFreq*14.0+t*2.3)*u_waveAmp*0.018;
      float w3=sin((uv.x+uv.y)*u_waveFreq*8.0+t*1.7)*u_waveAmp*0.01;
      vec2 d=vec2(w1+w3,w2+w3);float cs=length(d)*u_chromatic*4.0;
      float r=texture2D(u_image,clamp(uv+d*1.1+vec2(cs,0),0.0,1.0)).r;
      float g=texture2D(u_image,clamp(uv+d,0.0,1.0)).g;
      float b=texture2D(u_image,clamp(uv+d*0.9-vec2(cs,0),0.0,1.0)).b;
      gl_FragColor=vec4(r,g,b,1);}`,
    uniforms: {
      u_waveFreq: { label: "Frequency", min: 0.3, max: 4, step: 0.1, default: 1.5 },
      u_waveAmp: { label: "Amplitude", min: 0.2, max: 4, step: 0.1, default: 1.5 },
      u_speed: { label: "Speed", min: 0.2, max: 3, step: 0.1, default: 1.0 },
      u_chromatic: { label: "Chromatic", min: 0, max: 1, step: 0.01, default: 0.3 },
    },
  },
  glitch: {
    label: "Glitch", desc: "Digital corruption", cat: "animate",
    animated: true,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_time,u_intensity,u_blockSize,u_rgbShift;varying vec2 v_texCoord;
    ${GLSL_UTILS}
    void main(){vec2 uv=v_texCoord;float t=floor(u_time*8.0);
      float blockY=floor(uv.y*(20.0/u_blockSize))/( 20.0/u_blockSize);
      float glitchLine=step(0.97-u_intensity*0.15,rand(vec2(t,blockY)));
      float shift=glitchLine*(rand(vec2(t*1.1,blockY))-0.5)*u_intensity*0.15;
      vec2 uv2=uv+vec2(shift,0);
      float rgbOff=u_rgbShift*0.01*(1.0+glitchLine*3.0);
      float r=texture2D(u_image,clamp(vec2(uv2.x+rgbOff,uv2.y),0.0,1.0)).r;
      float g=texture2D(u_image,clamp(uv2,0.0,1.0)).g;
      float b=texture2D(u_image,clamp(vec2(uv2.x-rgbOff,uv2.y),0.0,1.0)).b;
      float scanline=0.95+0.05*sin(uv.y*u_resolution.y*1.5);
      float flicker=0.97+0.03*rand(vec2(t,0));
      gl_FragColor=vec4(vec3(r,g,b)*scanline*flicker,1);}`,
    uniforms: {
      u_intensity: { label: "Intensity", min: 0.1, max: 2, step: 0.05, default: 0.8 },
      u_blockSize: { label: "Block Size", min: 0.5, max: 4, step: 0.1, default: 1.5 },
      u_rgbShift: { label: "RGB Shift", min: 0, max: 3, step: 0.1, default: 1.0 },
    },
  },
  vhs: {
    label: "VHS", desc: "Retro tape distortion", cat: "animate",
    animated: true,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_time,u_tracking,u_noise_amt,u_bleed;varying vec2 v_texCoord;
    ${GLSL_UTILS}
    void main(){vec2 uv=v_texCoord;float t=u_time;
      float trackWarp=sin(uv.y*3.0+t*0.5)*u_tracking*0.008+sin(uv.y*50.0+t*20.0)*u_tracking*0.001;
      vec2 uv2=vec2(clamp(uv.x+trackWarp,0.0,1.0),uv.y);
      float bleed=u_bleed*0.004;
      float r=texture2D(u_image,uv2+vec2(bleed,0)).r;
      float g=texture2D(u_image,uv2).g;
      float b=texture2D(u_image,uv2-vec2(bleed,0)).b;
      vec3 col=vec3(r,g,b);
      float n=rand(vec2(uv.y*300.0,t*100.0))*u_noise_amt*0.15;
      col+=n;
      float scanline=0.92+0.08*sin(uv.y*u_resolution.y*0.8+t*2.0);
      col*=scanline;
      float vig=1.0-0.3*length((uv-0.5)*vec2(1.3,1.0));
      col*=vig;
      col=mix(col,col*vec3(1.1,1.0,0.9),0.3);
      float lum=dot(col,vec3(0.3,0.6,0.1));
      col=mix(vec3(lum),col,0.85);
      gl_FragColor=vec4(clamp(col,0.0,1.0),1);}`,
    uniforms: {
      u_tracking: { label: "Tracking", min: 0, max: 5, step: 0.1, default: 2.0 },
      u_noise_amt: { label: "Noise", min: 0, max: 3, step: 0.1, default: 1.5 },
      u_bleed: { label: "Color Bleed", min: 0, max: 5, step: 0.1, default: 2.0 },
    },
  },
  halftone: {
    label: "Halftone", desc: "Print dot pattern", cat: "style",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_dotSize,u_mode;varying vec2 v_texCoord;
    float ht(float v,vec2 c,float a,float s){float sn=sin(a),cs=cos(a);vec2 r=vec2(c.x*cs-c.y*sn,c.x*sn+c.y*cs);vec2 g=fract(r/s)-0.5;return smoothstep(v*0.7,v*0.7+0.05,length(g));}
    void main(){vec2 uv=v_texCoord;vec4 col=texture2D(u_image,uv);vec2 c=gl_FragCoord.xy;float s=u_dotSize;
      if(u_mode<0.5){float l=dot(col.rgb,vec3(.299,.587,.114));gl_FragColor=vec4(vec3(ht(1.0-l,c,.785,s)),1);}
      else{float cc=1.0-col.r,m=1.0-col.g,y=1.0-col.b,k=min(cc,min(m,y));vec3 r=vec3(1);
        r*=vec3(ht(cc-k*.5,c,.262,s),1,1);r*=vec3(1,ht(m-k*.5,c,1.309,s),1);r*=vec3(1,1,ht(y-k*.5,c,0.0,s));r*=vec3(ht(k,c,.785,s));
        gl_FragColor=vec4(r,1);}}`,
    uniforms: {
      u_dotSize: { label: "Dot Size", min: 2, max: 20, step: 0.5, default: 6 },
      u_mode: { label: "Mode", min: 0, max: 1, step: 1, default: 1, labels: ["B/W", "CMYK"] },
    },
  },
  paper: {
    label: "Paper", desc: "Vintage paper texture", cat: "style",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_grain,u_warmth,u_vignette;varying vec2 v_texCoord;
    ${GLSL_UTILS}
    void main(){vec2 uv=v_texCoord;vec4 col=texture2D(u_image,uv);vec2 c=gl_FragCoord.xy;
      float n=noise(c*0.8)*0.5+noise(c*2.0)*0.3+noise(c*5.0)*0.2;float gr=(n-0.5)*u_grain;
      vec3 t=mix(col.rgb,col.rgb*vec3(1,.95,.88),u_warmth);float l=dot(t,vec3(.299,.587,.114));t=mix(t,vec3(l),u_warmth*0.3);
      vec2 v=uv*(1.0-uv);float vv=pow(v.x*v.y*15.0,u_vignette);
      gl_FragColor=vec4(clamp((t+gr)*vv,0.0,1.0),1);}`,
    uniforms: {
      u_grain: { label: "Grain", min: 0, max: 0.5, step: 0.01, default: 0.15 },
      u_warmth: { label: "Warmth", min: 0, max: 1, step: 0.01, default: 0.4 },
      u_vignette: { label: "Vignette", min: 0.1, max: 1, step: 0.01, default: 0.35 },
    },
  },
  glass: {
    label: "Fluted Glass", desc: "Refraction distortion", cat: "style",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_frequency,u_amplitude,u_direction;varying vec2 v_texCoord;
    void main(){vec2 uv=v_texCoord;float a=u_direction*3.14159/180.0;float s=sin(a),c=cos(a);
      float p=uv.x*c+uv.y*s;float w=sin(p*u_frequency*40.0);float d=w*u_amplitude*0.02;
      vec2 o=vec2(c,s)*d;vec2 uv2=clamp(uv+o,0.0,1.0);
      float r=texture2D(u_image,uv2+o*0.3).r;float g=texture2D(u_image,uv2).g;float b=texture2D(u_image,uv2-o*0.3).b;
      float h=pow(max(0.0,w),8.0)*0.15;
      vec4 bl=vec4(0);for(int i=-2;i<=2;i++){bl+=texture2D(u_image,uv2+vec2(c,s)*float(i)*0.001*u_amplitude);}bl/=5.0;
      gl_FragColor=vec4(mix(vec3(r,g,b),bl.rgb,0.3)+h,1);}`,
    uniforms: {
      u_frequency: { label: "Frequency", min: 0.5, max: 5, step: 0.1, default: 2 },
      u_amplitude: { label: "Strength", min: 0.5, max: 5, step: 0.1, default: 2 },
      u_direction: { label: "Angle", min: 0, max: 180, step: 1, default: 90 },
    },
  },
  bloom: {
    label: "Bloom", desc: "Dreamy light glow", cat: "style",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_threshold,u_intensity,u_radius;varying vec2 v_texCoord;
    void main(){vec2 uv=v_texCoord;vec4 col=texture2D(u_image,uv);vec2 px=1.0/u_resolution;
      vec3 bright=max(col.rgb-u_threshold,0.0);
      vec3 blur=vec3(0);float total=0.0;
      for(float x=-4.0;x<=4.0;x+=1.0){for(float y=-4.0;y<=4.0;y+=1.0){
        float w=exp(-(x*x+y*y)/(2.0*u_radius*u_radius));
        vec4 s=texture2D(u_image,uv+vec2(x,y)*px*u_radius*2.0);
        blur+=max(s.rgb-u_threshold,0.0)*w;total+=w;
      }}
      blur/=total;
      vec3 result=col.rgb+blur*u_intensity;
      result=1.0-(1.0-result)*(1.0-blur*u_intensity*0.5);
      gl_FragColor=vec4(clamp(result,0.0,1.0),1);}`,
    uniforms: {
      u_threshold: { label: "Threshold", min: 0, max: 1, step: 0.01, default: 0.45 },
      u_intensity: { label: "Intensity", min: 0, max: 3, step: 0.05, default: 1.2 },
      u_radius: { label: "Radius", min: 0.5, max: 4, step: 0.1, default: 2.0 },
    },
  },
  neon: {
    label: "Neon Glow", desc: "Edge-detected neon", cat: "style",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_edgeWidth,u_glowInt,u_bgDark;varying vec2 v_texCoord;
    void main(){vec2 uv=v_texCoord;vec2 px=u_edgeWidth/u_resolution;
      vec3 tl=texture2D(u_image,uv+vec2(-px.x,px.y)).rgb;
      vec3 t=texture2D(u_image,uv+vec2(0,px.y)).rgb;
      vec3 tr=texture2D(u_image,uv+px).rgb;
      vec3 l=texture2D(u_image,uv+vec2(-px.x,0)).rgb;
      vec3 r=texture2D(u_image,uv+vec2(px.x,0)).rgb;
      vec3 bl=texture2D(u_image,uv-px).rgb;
      vec3 b=texture2D(u_image,uv+vec2(0,-px.y)).rgb;
      vec3 br=texture2D(u_image,uv+vec2(px.x,-px.y)).rgb;
      vec3 gx=tl*-1.0+tr+l*-2.0+r*2.0+bl*-1.0+br;
      vec3 gy=tl+t*2.0+tr+bl*-1.0+b*-2.0+br*-1.0;
      vec3 edge=sqrt(gx*gx+gy*gy);
      vec4 orig=texture2D(u_image,uv);
      vec3 hue=normalize(orig.rgb+0.001)*0.5+0.5;
      vec3 neonCol=edge*hue*u_glowInt*3.0;
      vec3 bg=orig.rgb*(1.0-u_bgDark);
      gl_FragColor=vec4(clamp(bg+neonCol,0.0,1.0),1);}`,
    uniforms: {
      u_edgeWidth: { label: "Edge Width", min: 0.5, max: 4, step: 0.1, default: 1.5 },
      u_glowInt: { label: "Glow", min: 0.2, max: 3, step: 0.05, default: 1.5 },
      u_bgDark: { label: "Background", min: 0, max: 1, step: 0.01, default: 0.7 },
    },
  },
  ascii: {
    label: "ASCII", desc: "Text character art", cat: "retro",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_cellSize,u_colored;varying vec2 v_texCoord;
    ${GLSL_UTILS}
    float charPattern(float lum, vec2 cellUV) {
      int idx = int(lum * 9.0);
      vec2 p = cellUV;
      float d = 1.0;
      if (idx <= 0) { d = 1.0; }
      else if (idx == 1) { d = step(0.45, abs(p.x - 0.5)) + step(0.45, abs(p.y - 0.5)); d = 1.0 - (1.0-step(0.4, length(p - 0.5)))*0.5; }
      else if (idx == 2) { d = step(0.35, length(p - 0.5)); }
      else if (idx == 3) { d = step(0.15, abs(p.x - 0.5)) * step(0.15, abs(p.y - 0.5)); }
      else if (idx == 4) { d = step(0.1, min(abs(p.x - 0.5), abs(p.y - 0.5))); }
      else if (idx == 5) { d = step(0.25, length(p - 0.5)); }
      else if (idx == 6) { float c = step(0.12, min(abs(p.x-0.5),abs(p.y-0.5))); float r = step(0.2, length(p-0.5)); d = c*r; }
      else if (idx == 7) { d = step(0.15, length(p - 0.5)); }
      else if (idx == 8) { d = step(0.08, min(abs(p.x-0.5),abs(p.y-0.5))) * step(0.1, length(p-0.5)); }
      else { d = 0.0; }
      return d;
    }
    void main(){vec2 uv=v_texCoord;float cs=u_cellSize;
      vec2 cell=floor(uv*u_resolution/cs)*cs/u_resolution;
      vec2 cellUV=fract(uv*u_resolution/cs);
      vec4 col=texture2D(u_image,cell+cs*0.5/u_resolution);
      float lum=dot(col.rgb,vec3(.299,.587,.114));
      float pattern=charPattern(lum,cellUV);
      vec3 fg=u_colored>0.5?col.rgb:vec3(0.0);
      vec3 bg=u_colored>0.5?col.rgb*0.15:vec3(0.05);
      vec3 result=mix(fg,bg,pattern);
      gl_FragColor=vec4(result,1);}`,
    uniforms: {
      u_cellSize: { label: "Cell Size", min: 3, max: 16, step: 1, default: 8 },
      u_colored: { label: "Color", min: 0, max: 1, step: 1, default: 1, labels: ["Mono", "Color"] },
    },
  },
  dither: {
    label: "Dithering", desc: "Retro pixel art", cat: "retro",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_pixelSize,u_colorLevels,u_palette;varying vec2 v_texCoord;
    float bayer8(vec2 p){ivec2 ip=ivec2(mod(p,8.0));int v2=ip.x/2+ip.y/2*4;int b0=int(mod(float(ip.x),2.0));int b1=int(mod(float(ip.y),2.0));return float(v2*4+b0*2+b1)/64.0;}
    void main(){vec2 uv=v_texCoord;float ps=u_pixelSize;
      vec2 puv=floor(uv*u_resolution/ps)*ps/u_resolution;
      vec4 col=texture2D(u_image,puv);float bv=bayer8(gl_FragCoord.xy/ps);
      vec3 d=col.rgb+(bv-0.5)/u_colorLevels;vec3 r;
      if(u_palette<0.5)r=floor(d*u_colorLevels+0.5)/u_colorLevels;
      else if(u_palette<1.5){float l=dot(d,vec3(.299,.587,.114));int i=int(l*3.0+0.5);if(i<=0)r=vec3(0);else if(i==1)r=vec3(0,.67,.67);else if(i==2)r=vec3(.67,0,.67);else r=vec3(1);}
      else{float l=dot(d,vec3(.299,.587,.114));int i=int(l*3.0+0.5);if(i<=0)r=vec3(.06,.22,.06);else if(i==1)r=vec3(.19,.38,.19);else if(i==2)r=vec3(.55,.67,.06);else r=vec3(.61,.74,.06);}
      gl_FragColor=vec4(r,1);}`,
    uniforms: {
      u_pixelSize: { label: "Pixel Size", min: 1, max: 12, step: 1, default: 3 },
      u_colorLevels: { label: "Colors", min: 2, max: 16, step: 1, default: 4 },
      u_palette: { label: "Palette", min: 0, max: 2, step: 1, default: 0, labels: ["Full", "CGA", "GameBoy"] },
    },
  },
  chromatic: {
    label: "Chromatic", desc: "RGB split aberration", cat: "style",
    animated: false,
    fragment: `precision highp float;uniform sampler2D u_image;uniform vec2 u_resolution;uniform float u_amount,u_angle,u_barrel;varying vec2 v_texCoord;
    void main(){vec2 uv=v_texCoord;float a=u_angle*3.14159/180.0;vec2 dir=vec2(cos(a),sin(a))*u_amount*0.008;
      vec2 c=uv-0.5;float dist2=dot(c,c);vec2 bdir=dir*(1.0+dist2*u_barrel*4.0);
      float r=texture2D(u_image,clamp(uv+bdir,0.0,1.0)).r;
      float g=texture2D(u_image,uv).g;
      float b=texture2D(u_image,clamp(uv-bdir,0.0,1.0)).b;
      gl_FragColor=vec4(r,g,b,1);}`,
    uniforms: {
      u_amount: { label: "Amount", min: 0, max: 5, step: 0.1, default: 2.0 },
      u_angle: { label: "Angle", min: 0, max: 360, step: 1, default: 0 },
      u_barrel: { label: "Barrel", min: 0, max: 3, step: 0.1, default: 1.0 },
    },
  },
};

// ── PRESET DEFINITIONS ─────────────────────────────────────
const PRESETS = [
  { name: "Cyberpunk", shader: "glitch", icon: "⚡", params: { u_intensity: 1.5, u_blockSize: 1.0, u_rgbShift: 2.5 } },
  { name: "Lo-Fi Dream", shader: "vhs", icon: "📼", params: { u_tracking: 3.0, u_noise_amt: 2.0, u_bleed: 3.5 } },
  { name: "Newsprint", shader: "halftone", icon: "🗞", params: { u_dotSize: 5, u_mode: 0 } },
  { name: "Magazine", shader: "halftone", icon: "📰", params: { u_dotSize: 4, u_mode: 1 } },
  { name: "Old Photo", shader: "paper", icon: "📜", params: { u_grain: 0.25, u_warmth: 0.7, u_vignette: 0.5 } },
  { name: "Tron", shader: "neon", icon: "💠", params: { u_edgeWidth: 2.0, u_glowInt: 2.5, u_bgDark: 0.9 } },
  { name: "Game Boy", shader: "dither", icon: "🎮", params: { u_pixelSize: 4, u_colorLevels: 4, u_palette: 2 } },
  { name: "Matrix", shader: "ascii", icon: "🖥", params: { u_cellSize: 6, u_colored: 0 } },
  { name: "Soft Bloom", shader: "bloom", icon: "✨", params: { u_threshold: 0.3, u_intensity: 1.8, u_radius: 3.0 } },
  { name: "Jelly", shader: "wobble", icon: "🫧", params: { u_waveFreq: 2.5, u_waveAmp: 2.0, u_speed: 0.7, u_chromatic: 0.5 } },
];

// ── CATEGORIES ─────────────────────────────────────────────
const CATEGORIES = { animate: "Animated", style: "Style", retro: "Retro" };

// ══════════════════════ MAIN COMPONENT ═════════════════════
export default function ShaderLabV2() {
  const [image, setImage] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [activeShader, setActiveShader] = useState("wobble");
  const [params, setParams] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePos, setComparePos] = useState(0.5);
  const [draggingCompare, setDraggingCompare] = useState(false);
  const [activeFormat, setActiveFormat] = useState("free");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [showPresets, setShowPresets] = useState(false);
  const [customPresets, setCustomPresets] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordSec, setRecordSec] = useState(3);
  const [tab, setTab] = useState("effects"); // effects | format | presets
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const canvasRef = useRef(null);
  const origCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const glRef = useRef(null);
  const programRef = useRef(null);
  const textureRef = useRef(null);
  const prevShaderRef = useRef(null);
  const animFrameRef = useRef(null);
  const timeRef = useRef(0);
  const lastFrameRef = useRef(0);
  const compareAreaRef = useRef(null);

  const shader = SHADERS[activeShader];

  // ── WebGL Setup ──
  const setupGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return null;
    let gl = glRef.current;
    if (!gl) { gl = canvas.getContext("webgl", { preserveDrawingBuffer: true }); if (!gl) return null; glRef.current = gl; }
    const sd = SHADERS[activeShader]; if (!sd) return null;
    if (prevShaderRef.current !== activeShader) {
      if (programRef.current) gl.deleteProgram(programRef.current);
      const vs = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vs, VS); gl.compileShader(vs);
      const fs = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fs, sd.fragment); gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(fs)); return null; }
      const prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
      programRef.current = prog; prevShaderRef.current = activeShader;
      const pb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, pb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
      const pl = gl.getAttribLocation(prog, "a_position"); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl,2,gl.FLOAT,false,0,0);
      const tb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, tb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,1,1,1,0,0,1,0]), gl.STATIC_DRAW);
      const tl = gl.getAttribLocation(prog, "a_texCoord"); gl.enableVertexAttribArray(tl); gl.vertexAttribPointer(tl,2,gl.FLOAT,false,0,0);
    }
    gl.useProgram(programRef.current);
    if (textureRef.current) gl.deleteTexture(textureRef.current);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); textureRef.current = tex;
    const fmt = FORMATS[activeFormat];
    if (fmt.w > 0) { canvas.width = fmt.w; canvas.height = fmt.h; }
    else { canvas.width = image.naturalWidth || image.width; canvas.height = image.naturalHeight || image.height; }
    gl.viewport(0, 0, canvas.width, canvas.height);
    return gl;
  }, [image, activeShader, activeFormat]);

  const renderFrame = useCallback((time) => {
    const canvas = canvasRef.current; const gl = glRef.current; const prog = programRef.current;
    const sd = SHADERS[activeShader]; if (!canvas || !gl || !prog || !image || !sd) return;
    gl.useProgram(prog);
    gl.uniform1i(gl.getUniformLocation(prog, "u_image"), 0);
    gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), canvas.width, canvas.height);
    const tl = gl.getUniformLocation(prog, "u_time"); if (tl) gl.uniform1f(tl, time);
    Object.keys(sd.uniforms).forEach(k => {
      const v = params[k] !== undefined ? params[k] : sd.uniforms[k].default;
      gl.uniform1f(gl.getUniformLocation(prog, k), v);
    });
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }, [activeShader, params, image]);

  // ── Draw original for compare ──
  useEffect(() => {
    if (!image || !origCanvasRef.current) return;
    const c = origCanvasRef.current;
    const fmt = FORMATS[activeFormat];
    c.width = fmt.w > 0 ? fmt.w : (image.naturalWidth || image.width);
    c.height = fmt.h > 0 ? fmt.h : (image.naturalHeight || image.height);
    const ctx = c.getContext("2d");
    // Cover fill
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    const scale = Math.max(c.width / iw, c.height / ih);
    const sw = iw * scale, sh = ih * scale;
    ctx.drawImage(image, (c.width - sw) / 2, (c.height - sh) / 2, sw, sh);
  }, [image, activeFormat]);

  // ── Animation loop ──
  useEffect(() => {
    if (!image) return;
    const gl = setupGL(); if (!gl) return;
    const sd = SHADERS[activeShader];
    if (sd.animated) {
      const anim = (ts) => {
        if (!lastFrameRef.current) lastFrameRef.current = ts;
        timeRef.current += (ts - lastFrameRef.current) / 1000;
        lastFrameRef.current = ts;
        renderFrame(timeRef.current);
        animFrameRef.current = requestAnimationFrame(anim);
      };
      animFrameRef.current = requestAnimationFrame(anim);
      return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
    } else { renderFrame(0); }
  }, [image, activeShader, params, setupGL, renderFrame, activeFormat]);

  // ── Image loading ──
  const handleImageLoad = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const mx = 1200;
        if (img.width > mx || img.height > mx) {
          const sc = mx / Math.max(img.width, img.height);
          const c = document.createElement("canvas"); c.width = img.width * sc; c.height = img.height * sc;
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          const si = new Image(); si.onload = () => { setImage(si); setImageSrc(c.toDataURL()); }; si.src = c.toDataURL();
        } else { setImage(img); setImageSrc(e.target.result); }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = e => { e.preventDefault(); setIsDragging(false); handleImageLoad(e.dataTransfer.files[0]); };

  // ── Exports ──
  const downloadPNG = () => {
    const c = canvasRef.current; if (!c) return;
    const link = document.createElement("a");
    link.download = `shader_${activeShader}_${activeFormat}.png`;
    link.href = c.toDataURL("image/png"); link.click();
  };

  const downloadGIF = async () => {
    const canvas = canvasRef.current; if (!canvas || !image) return;
    setExporting(true); setExportProgress(0);
    const mx = 480, sc = Math.min(1, mx / Math.max(canvas.width, canvas.height));
    const gw = Math.round(canvas.width * sc), gh = Math.round(canvas.height * sc);
    const off = document.createElement("canvas"); off.width = gw; off.height = gh;
    const ctx = off.getContext("2d");
    const enc = new GIFEncoder(gw, gh); enc.setDelay(50);
    const frames = 40;
    await new Promise(r => setTimeout(r, 50));
    for (let i = 0; i < frames; i++) {
      renderFrame(SHADERS[activeShader].animated ? (i / frames) * Math.PI * 2 / (params.u_speed || 1) : 0);
      ctx.clearRect(0, 0, gw, gh); ctx.drawImage(canvas, 0, 0, gw, gh);
      enc.addFrame(ctx); setExportProgress(Math.round(((i+1)/frames)*100));
      await new Promise(r => setTimeout(r, 10));
    }
    const blob = enc.finish(); const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.download = `shader_${activeShader}.gif`; link.href = url; link.click();
    URL.revokeObjectURL(url); setExporting(false); setExportProgress(0); timeRef.current = 0;
  };

  // ── Video Recording (MP4/WebM) ──
  const recordVideo = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !image || recording) return;

    // Detect best supported format
    const mimeTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ];
    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) { mimeType = mt; break; }
    }
    if (!mimeType) {
      alert('Video recording not supported in this browser. Try Chrome or Firefox.');
      return;
    }

    const isMP4 = mimeType.includes('mp4');
    const ext = isMP4 ? 'mp4' : 'webm';

    setRecording(true);
    setRecordProgress(0);
    recordChunksRef.current = [];

    // Capture stream from canvas at 30fps
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000, // 5 Mbps for quality
    });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordChunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(recordChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `shader_${activeShader}_${recordSec}s.${ext}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      setRecording(false);
      setRecordProgress(0);
    };

    // Request data every 100ms for smooth progress
    recorder.start(100);

    // Progress timer
    const duration = recordSec * 1000;
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setRecordProgress(pct);
      if (elapsed >= duration) {
        clearInterval(progressInterval);
        if (recorder.state === 'recording') recorder.stop();
      }
    }, 50);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  // ── Presets ──
  const applyPreset = (p) => {
    setActiveShader(p.shader);
    setTimeout(() => setParams(p.params), 50);
  };

  const savePreset = () => {
    const name = prompt("Preset name:");
    if (!name) return;
    setCustomPresets(prev => [...prev, { name, shader: activeShader, icon: "💾", params: { ...params } }]);
  };

  const resetParams = () => {
    const d = {}; Object.keys(SHADERS[activeShader].uniforms).forEach(k => { d[k] = SHADERS[activeShader].uniforms[k].default; }); setParams(d);
  };

  useEffect(() => { resetParams(); timeRef.current = 0; lastFrameRef.current = 0; }, [activeShader]);

  // ── Compare slider ──
  const handleCompareMove = useCallback(e => {
    if (!draggingCompare || !compareAreaRef.current) return;
    const rect = compareAreaRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    setComparePos(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)));
  }, [draggingCompare]);

  useEffect(() => {
    if (draggingCompare) {
      const up = () => setDraggingCompare(false);
      window.addEventListener("mousemove", handleCompareMove);
      window.addEventListener("mouseup", up);
      window.addEventListener("touchmove", handleCompareMove);
      window.addEventListener("touchend", up);
      return () => { window.removeEventListener("mousemove", handleCompareMove); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", handleCompareMove); window.removeEventListener("touchend", up); };
    }
  }, [draggingCompare, handleCompareMove]);

  // ── Group shaders by category ──
  const grouped = useMemo(() => {
    const g = {};
    Object.entries(SHADERS).forEach(([k, s]) => {
      if (!g[s.cat]) g[s.cat] = [];
      g[s.cat].push({ key: k, ...s });
    });
    return g;
  }, []);

  // ════════════════════ RENDER ════════════════════
  const S = { // Shared styles
    bg: "#08080a", panel: "#0e0e12", border: "#1a1a22", accent: "#8b5cf6", accentDim: "#6d28d9",
    text: "#e0e0e0", muted: "#666", dim: "#444", subtle: "#2a2a35",
  };

  return (
    <div style={{ minHeight: "100vh", background: S.bg, color: S.text, fontFamily: "'JetBrains Mono','SF Mono',monospace", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${S.panel}}::-webkit-scrollbar-thumb{background:#333;border-radius:3px}
        input[type=range]{-webkit-appearance:none;width:100%;height:3px;background:${S.subtle};border-radius:2px;outline:none}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;cursor:pointer;border:2px solid ${S.bg};box-shadow:0 0 6px rgba(139,92,246,0.3)}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        .btn{padding:7px 12px;border:1px solid ${S.border};border-radius:6px;font-size:10px;cursor:pointer;letter-spacing:.04em;font-family:inherit;transition:all .15s}
        .btn:hover{border-color:${S.accent};color:#fff}
        .btn-primary{background:${S.accent};border-color:${S.accent};color:#fff;font-weight:600}
        .btn-primary:hover{background:${S.accentDim}}
        .tab{padding:8px 14px;border:none;background:none;color:${S.muted};font-size:10px;cursor:pointer;letter-spacing:.08em;font-family:inherit;border-bottom:2px solid transparent;transition:all .15s}
        .tab.active{color:#fff;border-bottom-color:${S.accent}}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${S.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, background: S.panel }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 600, letterSpacing: "-.02em", color: "#fff" }}>
            <span style={{ color: S.accent }}>◆</span> shader.lab
            <span style={{ fontSize: 10, color: S.dim, fontWeight: 400, marginLeft: 8 }}>v2.1</span>
          </h1>
        </div>
        {image && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button className="btn" onClick={() => setCompareMode(!compareMode)}
              style={{ background: compareMode ? S.subtle : "transparent", color: compareMode ? "#fff" : S.muted }}>
              {compareMode ? "✕ COMPARE" : "◐ COMPARE"}
            </button>
            <button className="btn" onClick={downloadPNG} style={{ background: "transparent", color: S.muted }}>↓ PNG</button>
            <button className="btn-primary btn" onClick={downloadGIF} disabled={exporting || recording}
              style={{ position: "relative", overflow: "hidden", opacity: exporting ? 0.7 : 1, cursor: exporting ? "wait" : "pointer" }}>
              {exporting ? `GIF ${exportProgress}%` : "↓ GIF"}
              {exporting && <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, background: "#fff", width: `${exportProgress}%`, transition: "width .1s" }} />}
            </button>
            <button className="btn" onClick={recording ? stopRecording : recordVideo} disabled={exporting}
              style={{
                background: recording ? "rgba(239,68,68,.15)" : "transparent",
                borderColor: recording ? "#ef4444" : S.border,
                color: recording ? "#ef4444" : S.muted,
                position: "relative", overflow: "hidden",
              }}>
              {recording ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 1s infinite" }} />
                  {`REC ${recordProgress}%`}
                </span>
              ) : `● MP4 ${recordSec}s`}
              {recording && <div style={{ position: "absolute", bottom: 0, left: 0, height: 2, background: "#ef4444", width: `${recordProgress}%`, transition: "width .05s" }} />}
            </button>
            <select value={recordSec} onChange={e => setRecordSec(Number(e.target.value))}
              style={{
                padding: "5px 4px", background: S.panel, border: `1px solid ${S.border}`,
                borderRadius: 6, color: S.muted, fontSize: 10, fontFamily: "inherit",
                cursor: "pointer", width: 42,
              }}>
              {[2,3,5,8,10,15].map(s => <option key={s} value={s}>{s}s</option>)}
            </select>
            <button className="btn" onClick={() => { setImage(null); setImageSrc(null); }} style={{ background: "transparent", color: S.dim }}>✕</button>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* ── SIDEBAR ── */}
        <div style={{ width: 260, flexShrink: 0, borderRight: `1px solid ${S.border}`, display: "flex", flexDirection: "column", background: S.panel }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${S.border}` }}>
            {[["effects", "EFFECTS"], ["format", "FORMAT"], ["presets", "PRESETS"]].map(([k, l]) => (
              <button key={k} className={`tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {/* ── Effects Tab ── */}
            {tab === "effects" && (
              <>
                {Object.entries(grouped).map(([cat, shaders]) => (
                  <div key={cat} style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 9, color: S.dim, letterSpacing: ".12em", marginBottom: 8, textTransform: "uppercase" }}>
                      {CATEGORIES[cat]}
                    </p>
                    {shaders.map(s => (
                      <button key={s.key} onClick={() => setActiveShader(s.key)} style={{
                        display: "block", width: "100%", padding: "8px 10px", marginBottom: 2,
                        background: activeShader === s.key ? S.subtle : "transparent",
                        border: activeShader === s.key ? `1px solid ${S.border}` : "1px solid transparent",
                        borderRadius: 6, color: activeShader === s.key ? "#fff" : S.muted,
                        fontSize: 12, fontFamily: "'Space Grotesk',sans-serif",
                        fontWeight: activeShader === s.key ? 500 : 400, textAlign: "left", cursor: "pointer", transition: "all .12s",
                      }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {s.label}
                          {s.animated && <span style={{ fontSize: 7, padding: "1px 4px", background: "rgba(139,92,246,.15)", color: S.accent, borderRadius: 3, fontFamily: "inherit" }}>ANIM</span>}
                        </span>
                        <span style={{ display: "block", fontSize: 9, color: S.dim, marginTop: 1 }}>{s.desc}</span>
                      </button>
                    ))}
                  </div>
                ))}

              </>
            )}

            {/* ── Format Tab ── */}
            {tab === "format" && (
              <div>
                <p style={{ fontSize: 9, color: S.dim, letterSpacing: ".1em", marginBottom: 10 }}>CANVAS SIZE</p>
                {Object.entries(FORMATS).map(([k, f]) => (
                  <button key={k} onClick={() => setActiveFormat(k)} style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 10px", marginBottom: 2,
                    background: activeFormat === k ? S.subtle : "transparent",
                    border: activeFormat === k ? `1px solid ${S.border}` : "1px solid transparent",
                    borderRadius: 6, color: activeFormat === k ? "#fff" : S.muted,
                    fontSize: 12, fontFamily: "'Space Grotesk',sans-serif", textAlign: "left", cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 16, opacity: 0.5 }}>{f.icon}</span>
                    <div>
                      <div style={{ fontWeight: activeFormat === k ? 500 : 400 }}>{f.label}</div>
                      <div style={{ fontSize: 9, color: S.dim }}>{f.w > 0 ? `${f.w}×${f.h}` : "Original size"}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* ── Presets Tab ── */}
            {tab === "presets" && (
              <div>
                <p style={{ fontSize: 9, color: S.dim, letterSpacing: ".1em", marginBottom: 10 }}>BUILT-IN</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                  {PRESETS.map((p, i) => (
                    <button key={i} onClick={() => applyPreset(p)} style={{
                      padding: "10px 8px", background: S.subtle, border: `1px solid ${S.border}`,
                      borderRadius: 8, color: "#ccc", fontSize: 10, cursor: "pointer",
                      fontFamily: "'Space Grotesk',sans-serif", textAlign: "center", transition: "all .15s",
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                      <div style={{ fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 8, color: S.dim, marginTop: 2 }}>{SHADERS[p.shader]?.label}</div>
                    </button>
                  ))}
                </div>
                {customPresets.length > 0 && (
                  <>
                    <p style={{ fontSize: 9, color: S.dim, letterSpacing: ".1em", margin: "16px 0 10px" }}>CUSTOM</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                      {customPresets.map((p, i) => (
                        <button key={i} onClick={() => applyPreset(p)} style={{
                          padding: "10px 8px", background: "rgba(139,92,246,.08)", border: `1px solid rgba(139,92,246,.2)`,
                          borderRadius: 8, color: "#ccc", fontSize: 10, cursor: "pointer",
                          fontFamily: "'Space Grotesk',sans-serif", textAlign: "center",
                        }}>
                          <div style={{ fontSize: 18, marginBottom: 4 }}>{p.icon}</div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── MAIN AREA (canvas + params) ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
          {!image ? (
            <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop} onClick={() => fileInputRef.current?.click()}
              style={{
                width: "80%", maxWidth: 500, aspectRatio: "16/10",
                border: `2px dashed ${isDragging ? S.accent : S.border}`,
                borderRadius: 20, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
                transition: "all .2s", background: isDragging ? "rgba(139,92,246,.03)" : "transparent",
              }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: S.panel, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 24, color: S.muted, border: `1px solid ${S.border}` }}>+</div>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, color: S.muted, marginBottom: 6 }}>Drop image or click to upload</p>
              <p style={{ fontSize: 11, color: S.dim }}>PNG, JPG, WebP</p>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handleImageLoad(e.target.files[0])} style={{ display: "none" }} />
            </div>
          ) : (
            <div ref={compareAreaRef} style={{ position: "relative", maxWidth: "90%", maxHeight: "90%", userSelect: "none" }}
              onMouseDown={e => { if (compareMode) setDraggingCompare(true); }}
              onTouchStart={e => { if (compareMode) setDraggingCompare(true); }}>

              {/* Original canvas (hidden, for compare) */}
              <canvas ref={origCanvasRef} style={{ display: "none" }} />

              {/* Compare: original side */}
              {compareMode && imageSrc && (
                <div style={{
                  position: "absolute", top: 0, left: 0, width: `${comparePos * 100}%`, height: "100%",
                  overflow: "hidden", zIndex: 2, borderRadius: "8px 0 0 8px",
                }}>
                  <img src={imageSrc} alt="Original" style={{
                    width: canvasRef.current?.offsetWidth || "100%",
                    height: canvasRef.current?.offsetHeight || "100%",
                    objectFit: "cover", display: "block",
                  }} />
                  <div style={{ position: "absolute", top: 10, left: 10, fontSize: 9, color: "#fff", background: "rgba(0,0,0,.6)", padding: "3px 8px", borderRadius: 4, letterSpacing: ".05em" }}>ORIGINAL</div>
                </div>
              )}

              {/* Compare slider handle */}
              {compareMode && (
                <div style={{
                  position: "absolute", top: 0, left: `${comparePos * 100}%`, width: 3, height: "100%",
                  background: "#fff", zIndex: 3, cursor: "ew-resize", transform: "translateX(-50%)",
                  boxShadow: "0 0 12px rgba(0,0,0,.5)",
                }}>
                  <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                    width: 28, height: 28, borderRadius: "50%", background: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, color: "#000", boxShadow: "0 2px 8px rgba(0,0,0,.4)",
                  }}>◀▶</div>
                </div>
              )}

              {compareMode && (
                <div style={{ position: "absolute", top: 10, right: 10, fontSize: 9, color: "#fff", background: "rgba(139,92,246,.6)", padding: "3px 8px", borderRadius: 4, letterSpacing: ".05em", zIndex: 1 }}>EFFECT</div>
              )}

              <canvas ref={canvasRef} style={{
                maxWidth: "100%", maxHeight: "calc(100vh - 140px)", borderRadius: 8, display: "block",
                boxShadow: "0 4px 40px rgba(0,0,0,.5)",
              }} />

              {/* Export overlay */}
              {exporting && (
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.7)", borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 10 }}>
                  <div style={{ fontSize: 13, color: S.accent, fontFamily: "'Space Grotesk',sans-serif", marginBottom: 12, animation: "pulse 1.5s infinite" }}>Encoding GIF...</div>
                  <div style={{ width: 200, height: 3, background: S.subtle, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${exportProgress}%`, height: "100%", background: `linear-gradient(90deg, ${S.accentDim}, ${S.accent})`, borderRadius: 2, transition: "width .15s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 8 }}>{exportProgress}%</div>
                </div>
              )}

              {/* Recording overlay */}
              {recording && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", zIndex: 10, pointerEvents: "none" }}>
                  <div style={{
                    margin: 12, display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 12px", background: "rgba(0,0,0,.7)", borderRadius: 6,
                    backdropFilter: "blur(4px)",
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", animation: "pulse 1s infinite" }} />
                    <span style={{ fontSize: 11, color: "#fff", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 500 }}>
                      REC {Math.round(recordProgress / 100 * recordSec)}/{recordSec}s
                    </span>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,.3)" }}>
                    <div style={{ height: "100%", background: "#ef4444", width: `${recordProgress}%`, transition: "width .05s", borderRadius: "0 0 8px 8px" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Format indicator */}
          {image && activeFormat !== "free" && (
            <div style={{ position: "absolute", bottom: 14, left: "50%", transform: "translateX(-50%)", padding: "5px 12px", background: S.panel, border: `1px solid ${S.border}`, borderRadius: 6, fontSize: 10, color: S.muted, letterSpacing: ".04em" }}>
              {FORMATS[activeFormat].label} · {FORMATS[activeFormat].w}×{FORMATS[activeFormat].h}
            </div>
          )}
        </div>

        {/* ── PARAMETER BOTTOM PANEL ── */}
        {image && shader && (
          <div style={{ borderTop: `1px solid ${S.border}`, background: S.panel, padding: "10px 20px", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, overflowX: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <p style={{ fontSize: 9, color: S.dim, letterSpacing: ".1em" }}>PARAMETERS</p>
                <button onClick={resetParams} style={{ background: "none", border: "none", color: S.dim, fontSize: 9, cursor: "pointer" }}>RESET</button>
              </div>
              {Object.entries(shader.uniforms).map(([key, u]) => {
                const val = params[key] !== undefined ? params[key] : u.default;
                return (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, minWidth: 180 }}>
                    <label style={{ fontSize: 10, color: "#999", flexShrink: 0 }}>{u.label}</label>
                    <input type="range" min={u.min} max={u.max} step={u.step} value={val}
                      style={{ flex: 1, minWidth: 80 }}
                      onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) }))} />
                    <span style={{ fontSize: 10, color: S.muted, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 32, textAlign: "right" }}>
                      {u.labels ? u.labels[Math.round(val)] : val.toFixed(u.step < 1 ? 2 : 0)}
                    </span>
                  </div>
                );
              })}
              <button className="btn" onClick={savePreset} style={{ flexShrink: 0, background: "transparent", color: S.muted }}>
                💾 SAVE PRESET
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
