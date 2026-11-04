const THREE_clamp = (v, a, b) => Math.min(b, Math.max(a, v));
// Música instrumental, efectos, pasos y voces (sin archivos externos)
export class Sound {
  constructor() {
    this.ctx = null; this.timer = null;
    this.musicOn = true; this.sfxOn = true;
    this.voices = [];
    if ('speechSynthesis' in window) {
      const load = () => { this.voices = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang)); };
      load(); try { speechSynthesis.addEventListener('voiceschanged', load); } catch (e) {}
    }
  }
  unlock() {
    if (!this.ctx) {
      try {
        const a = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = a.createGain(); this.master.connect(a.destination);
        this.music = a.createGain(); this.music.gain.value = this.musicOn ? 1 : 0; this.music.connect(this.master);
        this.sfx = a.createGain(); this.sfx.gain.value = this.sfxOn ? 1 : 0; this.sfx.connect(this.master);
        const len = a.sampleRate * 2.2, buf = a.createBuffer(2, len, a.sampleRate);
        for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
        this.rev = a.createConvolver(); this.rev.buffer = buf;
        this.revGain = a.createGain(); this.revGain.gain.value = .35; this.rev.connect(this.revGain).connect(this.master);
        const nb = a.createBuffer(1, a.sampleRate * .25, a.sampleRate), nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 2.5);
        this.noise = nb;
      } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  setMusic(on) { this.musicOn = on; if (this.music) this.music.gain.value = on ? 1 : 0; }
  setSfx(on) { this.sfxOn = on; if (this.sfx) this.sfx.gain.value = on ? 1 : 0; if (!on && 'speechSynthesis' in window) speechSynthesis.cancel(); }
  note(freq, dur, { type = 'sine', vol = .1, when = 0, attack = .01, slide = 0, filter = 0, wet = true, bus = 'sfx' } = {}) {
    const a = this.unlock(); if (!a) return;
    if (bus === 'sfx' && !this.sfxOn) return;
    const t = a.currentTime + when, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    let node = o;
    if (filter) { const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); node = f; }
    node.connect(g); g.connect(bus === 'music' ? this.music : this.sfx);
    if (wet && this.rev && (bus === 'music' ? this.musicOn : this.sfxOn)) g.connect(this.rev);
    o.start(t); o.stop(t + dur + .05);
  }
  // Pasos realistas: talón + punta del pie, con el timbre de cada suelo (calle, arena, pasto, madera y agua),
  // pequeñas variaciones en cada pisada y un pie a cada lado (estéreo)
  step(surface = 'hard', run = false) {
    const a = this.unlock(); if (!a || !this.sfxOn || !this.noise) return;
    const t = a.currentTime, V = (run ? 1 : .72) * (.85 + Math.random() * .3);
    this._foot = !this._foot;
    let out = this.sfx;
    if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = this._foot ? .12 : -.12; p.connect(this.sfx); out = p; }
    const burst = (when, dur, type, freq, q, vol, rate = 1, attack = .003) => {
      const src = a.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = rate * (.92 + Math.random() * .16);
      const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = a.createGain(), t0 = t + when; g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + attack); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      src.connect(f).connect(g).connect(out); src.start(t0, Math.random() * .05); src.stop(t0 + dur + .03);
    };
    const thud = (when, f0, dur, vol, type = 'sine') => {
      const o = a.createOscillator(), g = a.createGain(), t0 = t + when; o.type = type;
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f0 * .55, t0 + dur);
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + .004); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      o.connect(g).connect(out); o.start(t0); o.stop(t0 + dur + .02);
    };
    const toe = run ? .03 : .055;
    if (surface === 'sand') {
      thud(0, 70, .09, .1 * V);
      for (let i = 0; i < 5; i++) burst(i * .018 + Math.random() * .01, .05, 'bandpass', 1300 + Math.random() * 1600, 1.4, (.1 + Math.random() * .08) * V);
      burst(toe + .02, .07, 'lowpass', 900, .6, .07 * V);
    } else if (surface === 'grass') {
      burst(0, .14, 'bandpass', 1100, .8, .13 * V, .8, .02);
      burst(.02, .1, 'highpass', 4200, .6, .05 * V, 1, .01);
      thud(0, 75, .07, .07 * V);
    } else if (surface === 'wood') {
      thud(0, 150, .11, .2 * V, 'triangle'); thud(0, 95, .14, .12 * V);
      burst(0, .045, 'bandpass', 1200, 2, .1 * V);
      burst(toe, .04, 'bandpass', 2000, 2, .06 * V);
    } else if (surface === 'water') {
      burst(0, .22, 'bandpass', 1300 + Math.random() * 500, 1, .22 * V, 1, .012);
      burst(.03, .3, 'highpass', 3500, .5, .07 * V, 1, .02);
      thud(.04, 260 + Math.random() * 80, .12, .05 * V);
    } else {
      thud(0, 95 + Math.random() * 20, .08, .16 * V);
      burst(0, .045, 'bandpass', 2000 + Math.random() * 700, 1.6, .2 * V);
      burst(toe, .03, 'highpass', 3200, .8, .09 * V);
      if (run) burst(toe + .015, .06, 'highpass', 5000, .5, .03, 1.3, .01); // roce de la suela
    }
  }
  // Brazada al nadar: chapoteo de agua y burbujas
  swim(vol = 1) {
    const a = this.unlock(); if (!a || !this.sfxOn || !this.noise) return;
    const t = a.currentTime;
    [[0, .28, 1400, .2], [.06, .35, 700, .12]].forEach(([w, d, f, v]) => {
      const src = a.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = .7 + Math.random() * .3;
      const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * (.85 + Math.random() * .3); bp.Q.value = .9;
      const g = a.createGain(); g.gain.setValueAtTime(.0001, t + w); g.gain.exponentialRampToValueAtTime(v * vol, t + w + .03); g.gain.exponentialRampToValueAtTime(.0001, t + w + d);
      src.connect(bp).connect(g).connect(this.sfx); src.start(t + w); src.stop(t + w + d + .05);
    });
    for (let i = 0; i < 3; i++) this.note(500 + Math.random() * 500, .05, { type: 'sine', vol: .025 * vol, when: .1 + i * .05 + Math.random() * .04, slide: 300, wet: false });
  }
  // Zambullida al entrar al agua
  splash(vol = 1) {
    const a = this.unlock(); if (!a || !this.sfxOn || !this.noise) return;
    const t = a.currentTime, src = a.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = .5;
    const bp = a.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.setValueAtTime(3500, t); bp.frequency.exponentialRampToValueAtTime(500, t + .5);
    const g = a.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.45 * vol, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .55);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t); src.stop(t + .6);
    for (let i = 0; i < 5; i++) this.note(300 + Math.random() * 600, .06, { type: 'sine', vol: .03 * vol, when: .15 + i * .06, slide: 250, wet: false });
  }
  // Sonido con posición: volumen según la distancia y lado izquierdo/derecho
  _bus(vol, pan) {
    const a = this.ctx, g = a.createGain(); g.gain.value = vol;
    let out = g;
    if (a.createStereoPanner) { const p = a.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); p.connect(this.sfx); } else g.connect(this.sfx);
    return out;
  }
  stepAt(vol, pan) {
    const a = this.unlock(); if (!a || !this.sfxOn || vol < .01) return;
    const t = a.currentTime, src = a.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = 1.4 + Math.random() * .3;
    const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    const g = a.createGain(); g.gain.setValueAtTime(.22, t); g.gain.exponentialRampToValueAtTime(.0001, t + .12);
    src.connect(f).connect(g).connect(this._bus(vol, pan)); src.start(t); src.stop(t + .2);
  }
  // Risas y voces de niños jugando (sílabas cantadas con formantes)
  kidVoice(vol, pan, kind = 0) {
    const a = this.unlock(); if (!a || !this.sfxOn || vol < .01) return;
    const bus = this._bus(vol, pan), t0 = a.currentTime, base = 380 + Math.random() * 160;
    const n = kind === 0 ? 4 + (Math.random() * 3 | 0) : 2 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (kind === 0 ? .13 : .22), o = a.createOscillator(), g = a.createGain(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter();
      o.type = 'sawtooth'; const p0 = base * (kind === 0 ? 1.25 - i * .04 : 1 + (i % 2) * .25);
      o.frequency.setValueAtTime(p0, t); o.frequency.linearRampToValueAtTime(p0 * (kind === 0 ? .82 : 1.12), t + .1);
      f1.type = 'bandpass'; f1.frequency.value = kind === 0 ? 900 : 700 + Math.random() * 500; f1.Q.value = 6;
      f2.type = 'bandpass'; f2.frequency.value = kind === 0 ? 2400 : 1800 + Math.random() * 800; f2.Q.value = 8;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.18, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + (kind === 0 ? .11 : .2));
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(bus); o.start(t); o.stop(t + .25);
    }
  }
  // Personas conversando a lo lejos (sílabas de voz adulta, sin palabras)
  chatter(vol, pan, female = false) {
    const a = this.unlock(); if (!a || !this.sfxOn || vol < .01) return;
    const bus = this._bus(vol * .8, pan), t0 = a.currentTime, base = (female ? 200 : 115) * (.9 + Math.random() * .2);
    const n = 3 + (Math.random() * 4 | 0);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (.14 + Math.random() * .08), o = a.createOscillator(), g = a.createGain(), f1 = a.createBiquadFilter(), f2 = a.createBiquadFilter();
      o.type = 'sawtooth'; const p0 = base * (1 + (Math.random() - .5) * .25);
      o.frequency.setValueAtTime(p0, t); o.frequency.linearRampToValueAtTime(p0 * (i === n - 1 ? .85 : 1.05), t + .12);
      f1.type = 'bandpass'; f1.frequency.value = 500 + Math.random() * 400; f1.Q.value = 5;
      f2.type = 'bandpass'; f2.frequency.value = 1200 + Math.random() * 900; f2.Q.value = 7;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.13, t + .025); g.gain.exponentialRampToValueAtTime(.0001, t + .13);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(bus); o.start(t); o.stop(t + .16);
    }
  }
  // Sonidos de animales sintetizados (volumen y lado según la posición)
  animal(kind, vol, pan) {
    const a = this.unlock(); if (!a || !this.sfxOn || vol < .01) return;
    const bus = this._bus(vol, pan), t = a.currentTime;
    const voice = (f0, f1, dur, { type = 'sawtooth', vib = 0, vibR = 6, formants = [800, 1600], q = 5, gain = .25, at = .03, when = 0 } = {}) => {
      const o = a.createOscillator(), g = a.createGain(); o.type = type; const t0 = t + when;
      o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vibR; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t0); l.stop(t0 + dur + .05); }
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + at); g.gain.setValueAtTime(gain, t0 + dur * .7); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      for (const f of formants) { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; o.connect(bp); bp.connect(g); }
      g.connect(bus); o.start(t0); o.stop(t0 + dur + .05);
    };
    const noise = (dur, f, gain = .3, when = 0) => { const src = a.createBufferSource(); src.buffer = this.noise; src.loop = true; const bp = a.createBiquadFilter(); bp.type = 'lowpass'; bp.frequency.value = f; const g = a.createGain(); const t0 = t + when; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + .1); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); src.connect(bp).connect(g).connect(bus); src.start(t0); src.stop(t0 + dur + .05); };
    switch (kind) {
      case 'elefante': voice(420, 900, .9, { vib: 30, vibR: 9, formants: [900, 1800, 2600], gain: .35, at: .08 }); noise(.8, 1800, .12); break;
      case 'leon': case 'leona': voice(140, 70, 1.4, { vib: 18, vibR: 22, formants: [300, 700], q: 3, gain: .45, at: .15 }); noise(1.3, 500, .28); break;
      case 'oso': voice(110, 80, 1, { vib: 14, vibR: 25, formants: [250, 600], q: 3, gain: .4, at: .1 }); noise(.9, 400, .2); break;
      case 'oveja': voice(520, 480, .7, { vib: 40, vibR: 11, formants: [700, 1300, 2500], gain: .3 }); break;
      case 'caballo': case 'cebra': voice(900, 500, 1.0, { vib: 60, vibR: 13, formants: [1000, 2200], gain: .28 }); noise(.4, 3000, .08, .6); break;
      case 'camello': voice(160, 120, .9, { vib: 20, vibR: 8, formants: [350, 900], q: 3, gain: .35 }); break;
      case 'mono': for (let i = 0; i < 4; i++) voice(500 + i * 90, 800 + i * 120, .18, { formants: [900, 2000], gain: .25, when: i * .16 }); break;
      case 'gallo': voice(600, 900, .25, { formants: [1100, 2500], gain: .25 }); voice(900, 1300, .35, { formants: [1200, 2600], gain: .25, when: .25 }); voice(1300, 700, .6, { vib: 30, formants: [1100, 2400], gain: .25, when: .6 }); break;
      case 'gallina': for (let i = 0; i < 3; i++) voice(700, 600, .1, { formants: [1100, 2300], gain: .22, when: i * .14 }); voice(800, 1000, .3, { formants: [1200, 2400], gain: .2, when: .45 }); break;
      case 'ciervo': voice(700, 900, .35, { formants: [900, 1800], gain: .22 }); break;
      case 'jirafa': voice(90, 85, .8, { type: 'sine', formants: [180], q: 2, gain: .2 }); break;
      default: voice(300, 250, .5, { formants: [600, 1200], gain: .25 });
    }
  }
  // Rugido de león: gruñido grave que crece y se apaga, con respiración áspera
  roar(vol = 1) {
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    const t = a.currentTime + .03, out = a.createGain(); out.gain.value = .55 * vol; out.connect(this.sfx); if (this.rev) out.connect(this.rev);
    // compresor para que se oiga fuerte también en el altavoz del celular
    const comp = a.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 6; comp.attack.value = .003; comp.release.value = .2; comp.connect(out);
    const dist = a.createWaveShaper(), cur = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; cur[i] = Math.tanh(x * 5); } dist.curve = cur;
    // formantes de garganta (frecuencias medias que sí suenan en un teléfono)
    const fm = a.createGain(); fm.connect(comp);
    for (const [f, q, g] of [[420, 2.2, 2.2], [850, 2.6, 2.4], [1500, 3.5, 1.4], [2600, 5, .5]]) { const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; const bg = a.createGain(); bg.gain.value = g; dist.connect(bp).connect(bg).connect(fm); }
    const low = a.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = 260; const lg0 = a.createGain(); lg0.gain.value = .12; dist.connect(low).connect(lg0).connect(comp);
    const env = (g, peak, at, hold, rel, t0) => { g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + at); g.gain.setValueAtTime(peak, t0 + at + hold); g.gain.exponentialRampToValueAtTime(.0001, t0 + at + hold + rel); };
    const growl = (f0, fp, t0, dur, gain) => {
      const g = a.createGain(); g.connect(dist); env(g, gain, dur * .22, dur * .3, dur * .48, t0);
      for (const [type, mul, det] of [['sawtooth', 1, 0], ['sawtooth', 1, 14], ['square', .5, -8]]) {
        const o = a.createOscillator(); o.type = type; o.detune.value = det;
        o.frequency.setValueAtTime(f0 * mul, t0); o.frequency.linearRampToValueAtTime(fp * mul, t0 + dur * .3); o.frequency.exponentialRampToValueAtTime(f0 * .6 * mul, t0 + dur);
        const lfo = a.createOscillator(), lgn = a.createGain(); lfo.frequency.value = 24 + Math.random() * 8; lgn.gain.value = fp * .12 * mul; lfo.connect(lgn).connect(o.frequency);
        o.connect(g); o.start(t0); o.stop(t0 + dur + .1); lfo.start(t0); lfo.stop(t0 + dur + .1);
      }
      // aspereza (ruido) que sigue al gruñido
      const src = a.createBufferSource(); src.buffer = this.noise; src.loop = true; src.playbackRate.value = .7; const ng = a.createGain(); env(ng, gain * .55, dur * .2, dur * .3, dur * .5, t0); src.connect(ng).connect(dist); src.start(t0); src.stop(t0 + dur + .1);
    };
    growl(150, 260, t, 2.2, .9); growl(120, 200, t + 2.35, 1.1, .5);
  }
  // Grito de águila: chillidos agudos descendentes con trino
  eagle(vol = 1) {
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    const t = a.currentTime + .02, out = a.createGain(); out.gain.value = .5 * vol; out.connect(this.sfx); if (this.rev) out.connect(this.rev);
    const cry = (t0, dur, f0, f1) => {
      const o = a.createOscillator(), g = a.createGain(), l = a.createOscillator(), lg = a.createGain(), hp = a.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * 1.08, t0 + dur * .15); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      l.frequency.value = 38; lg.gain.value = 160; l.connect(lg).connect(o.frequency);
      hp.type = 'bandpass'; hp.frequency.value = 3000; hp.Q.value = 1.2; o.connect(hp).connect(g).connect(out);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(.5, t0 + .03); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      [o, l].forEach(n => { n.start(t0); n.stop(t0 + dur + .05); });
    };
    cry(t, .9, 3400, 1900); cry(t + 1.0, .28, 3000, 2400); cry(t + 1.32, .28, 3000, 2300); cry(t + 1.64, .45, 3100, 2000);
  }
  // Carro que pasa: motor + llantas, con efecto de acercarse y alejarse
  carPass(vol, pan, dir = 1) {
    const a = this.unlock(); if (!a || !this.sfxOn || vol < .02) return;
    const bus = this._bus(vol, pan), t = a.currentTime, dur = 1.8;
    const o = a.createOscillator(), o2 = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.setValueAtTime(95, t); o.frequency.linearRampToValueAtTime(70, t + dur); o2.frequency.setValueAtTime(48, t); o2.frequency.linearRampToValueAtTime(36, t + dur);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1300, t + dur * .45); lp.frequency.linearRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + dur * .45); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(bus); [o, o2].forEach(n => { n.start(t); n.stop(t + dur + .05); });
    const src = a.createBufferSource(); src.buffer = this.noise; src.loop = true; const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = .6; const ng = a.createGain();
    ng.gain.setValueAtTime(.0001, t); ng.gain.exponentialRampToValueAtTime(.35, t + dur * .45); ng.gain.exponentialRampToValueAtTime(.0001, t + dur); src.connect(bp).connect(ng).connect(bus); src.start(t); src.stop(t + dur + .05);
  }
  // Pito / bocina de carro (dos tonos)
  honk(vol = 1, pan = 0) {
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    const bus = this._bus(.5 * vol, pan), t = a.currentTime;
    for (const [w, d] of [[0, .22], [.3, .45]]) for (const f of [415, 523]) {
      const o = a.createOscillator(), g = a.createGain(), lp = a.createBiquadFilter(); o.type = 'square'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 2200;
      g.gain.setValueAtTime(.0001, t + w); g.gain.exponentialRampToValueAtTime(.22, t + w + .02); g.gain.setValueAtTime(.22, t + w + d - .04); g.gain.exponentialRampToValueAtTime(.0001, t + w + d);
      o.connect(lp).connect(g).connect(bus); o.start(t + w); o.stop(t + w + d + .05);
    }
  }
  // Sonidos de la vida diaria
  life(kind) {
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    const t = a.currentTime;
    const nz = (when, dur, f, q, gain, type = 'bandpass') => { const src = a.createBufferSource(); src.buffer = this.noise; src.loop = true; const bp = a.createBiquadFilter(); bp.type = type; bp.frequency.value = f; bp.Q.value = q; const g = a.createGain(); g.gain.setValueAtTime(.0001, t + when); g.gain.exponentialRampToValueAtTime(gain, t + when + .02); g.gain.exponentialRampToValueAtTime(.0001, t + when + dur); src.connect(bp).connect(g).connect(this.sfx); src.start(t + when); src.stop(t + when + dur + .05); };
    if (kind === 'eat') for (let i = 0; i < 5; i++) nz(i * .22, .12, 1800 + Math.random() * 800, 1.5, .5);
    else if (kind === 'water' || kind === 'coffee') for (let i = 0; i < 3; i++) { this.note(320 - i * 30, .16, { type: 'sine', vol: .14, when: i * .3, slide: 180 }); nz(i * .3, .1, 600, 3, .2); }
    else if (kind === 'shower') { nz(0, 1.4, 5000, .4, .25, 'highpass'); nz(0, 1.4, 1800, .7, .12); }
    else if (kind === 'worship') [[262, 330, 392], [349, 440, 523], [392, 494, 587]].forEach((ch, i) => ch.forEach(f => this.note(f, 1.2, { type: 'triangle', vol: .05, when: i * .5 })));
    else if (kind === 'sleep' || kind === 'rest') [523, 440, 349, 262].forEach((f, i) => this.note(f, .9, { type: 'sine', vol: .07, when: i * .35 }));
  }
  // Ritmo de alabanza (batería, palmas y acordes) mientras estás en la iglesia
  worshipBeat(step) {
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    const t = a.currentTime, b = step % 8;
    const kick = a.createOscillator(), kg = a.createGain(); kick.frequency.setValueAtTime(130, t); kick.frequency.exponentialRampToValueAtTime(45, t + .18); kg.gain.setValueAtTime(.35, t); kg.gain.exponentialRampToValueAtTime(.001, t + .25); kick.connect(kg).connect(this.sfx); kick.start(t); kick.stop(t + .3);
    if (b % 2 === 1) { const src = a.createBufferSource(); src.buffer = this.noise; const hp = a.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 1800; hp.Q.value = .8; const g = a.createGain(); g.gain.setValueAtTime(.4, t); g.gain.exponentialRampToValueAtTime(.001, t + .15); src.connect(hp).connect(g).connect(this.sfx); src.start(t); src.stop(t + .2); }
    if (b === 0 || b === 4) { const chords = [[262, 330, 392], [220, 262, 330], [349, 440, 523], [392, 494, 587]]; const ch = chords[(step >> 2) % 4]; ch.forEach(f => this.note(f, 1.9, { type: 'triangle', vol: .045, attack: .08 })); this.note(ch[0] / 2, 1.9, { type: 'sine', vol: .08 }); }
  }
  coin() { this.note(1318, .12, { type: 'triangle', vol: .14 }); this.note(1976, .5, { type: 'triangle', vol: .12, when: .07 }); this.note(2637, .6, { type: 'sine', vol: .05, when: .12 }); }
  talk() { this.note(587, .4, { type: 'sine', vol: .07 }); this.note(880, .6, { type: 'sine', vol: .05, when: .1 }); }
  // Efecto al recibir un regalo: campanitas que suben + destello
  gift() {
    [784, 988, 1175, 1568, 1976].forEach((f, i) => this.note(f, .7, { type: 'triangle', vol: .11, when: i * .07 }));
    [2637, 3136, 3951].forEach((f, i) => this.note(f, .9, { type: 'sine', vol: .04, when: .38 + i * .06 }));
    this.note(196, 1.2, { type: 'sine', vol: .08, attack: .05, when: .05 });
  }
  jump() { this.note(220, .18, { type: 'sine', vol: .08, slide: 440, wet: false }); }
  hurt() { this.note(330, .5, { type: 'sawtooth', vol: .07, slide: 110, filter: 900 }); this.note(392, .35, { type: 'square', vol: .05, filter: 1200, when: .02 }); }
  click() { this.note(880, .06, { type: 'sine', vol: .06, wet: false }); }
  win() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.note(f, .9, { type: 'triangle', vol: .1, when: i * .12 })); }
  lose() { [392, 349, 311, 262].forEach((f, i) => this.note(f, .7, { type: 'sine', vol: .12, when: i * .22 })); }

  // Voz del navegador en español (Hola, Shalom)
  say(text, { male = true, rate = .95, pitch } = {}) {
    if (!this.sfxOn || !('speechSynthesis' in window)) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = rate; u.volume = 1;
      const all = speechSynthesis.getVoices(), es = all.filter(v => /^es/i.test(v.lang));
      const nm = v => (v.name + ' ' + (v.voiceURI || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const M = /(male|hombre|masculin|jorge|diego|pablo|carlos|juan|enrique|alvaro|raul|alonso|gonzalo|jose|tomas|andres|manuel|antonio|miguel|federico|alejandro|eduardo|dario|gerardo|lorenzo|esd|eef|eem|esa)/;
      const F = /(female|mujer|femen|monica|paulina|helena|laura|sabina|elvira|lucia|ximena|marisol|angelica|francisca|dalia|soledad|isabela|isabel|elena|carmen|sofia|valentina|paloma|marta|teresa|esc|eea|eec)/;
      const isF = v => F.test(nm(v)) || /google espa/.test(nm(v)), isM = v => M.test(nm(v)) && !F.test(nm(v));
      let pick = male ? es.find(isM) : es.find(isF);
      // si no hay una voz del género pedido, se usa otra y se ajusta el tono (más grave para hombres, más agudo para mujeres)
      let adj = 0;
      if (!pick) { pick = male ? (es.find(v => !isF(v)) || es[0]) : (es.find(v => !isM(v)) || es[0]); adj = male ? -.3 : .3; if (pick && male && isF(pick)) adj = -.55; if (pick && !male && isM(pick)) adj = .55; }
      if (pick) u.voice = pick;
      u.pitch = THREE_clamp(pitch ?? ((male ? .82 : 1.12) + adj), .1, 2);
      speechSynthesis.speak(u);
    } catch (e) {}
  }


  // Música instrumental: acordes suaves (pad) + arpegio, progresión I–V–vi–IV en Re
  startMusic() {
    this.stopMusic(); if (!this.unlock()) return;
    const chords = [[146.8, 185, 220, 293.7], [110, 164.8, 220, 277.2], [123.5, 185, 246.9, 293.7], [98, 146.8, 196, 246.9]];
    let step = 0;
    const tick = () => {
      if (!this.musicOn) { step++; return; }
      const ch = chords[Math.floor(step / 8) % chords.length], m = { bus: 'music' };
      if (step % 8 === 0) {
        ch.forEach(f => { this.note(f, 3.4, { ...m, type: 'sine', vol: .035, attack: .8, filter: 1200 }); this.note(f * 2, 3.2, { ...m, type: 'triangle', vol: .012, attack: 1, filter: 1600 }); });
        this.note(ch[0] / 2, 3.2, { ...m, type: 'sine', vol: .07, attack: .1, wet: false });
      }
      const arp = [0, 2, 1, 3, 2, 1, 3, 2][step % 8];
      this.note(ch[arp] * 4, .6, { ...m, type: 'sine', vol: .022, attack: .005 });
      step++;
    };
    tick(); this.timer = setInterval(tick, 400);
  }
  stopMusic() { if (this.timer) clearInterval(this.timer); this.timer = null; }
}
