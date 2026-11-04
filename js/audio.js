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
  // Pasos: suelo duro (calle), arena o pasto; al correr suenan más fuertes y secos
  step(surface = 'hard', run = false) {
    const a = this.unlock(); if (!a || !this.sfxOn) return;
    const t = a.currentTime, src = a.createBufferSource(); src.buffer = this.noise; src.playbackRate.value = (run ? 1.25 : 1) * (.9 + Math.random() * .2);
    const f = a.createBiquadFilter(); f.type = surface === 'hard' ? 'bandpass' : 'lowpass';
    f.frequency.value = surface === 'hard' ? 1800 : surface === 'sand' ? 700 : 900; f.Q.value = surface === 'hard' ? 1.2 : .7;
    const g = a.createGain(); const v = (run ? .32 : .22) * (surface === 'hard' ? 1 : 1.3);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + (surface === 'hard' ? .09 : .16));
    src.connect(f).connect(g).connect(this.sfx); src.start(t); src.stop(t + .25);
    if (surface === 'hard') this.note(110 + Math.random() * 20, .06, { type: 'sine', vol: run ? .09 : .06, wet: false });
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
      const u = new SpeechSynthesisUtterance(text); u.lang = 'es-ES'; u.rate = rate; u.pitch = pitch ?? (male ? .8 : 1.25); u.volume = 1;
      const vs = this.voices.length ? this.voices : speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
      const pick = vs.find(v => male ? /(male|hombre|jorge|diego|pablo|carlos|juan|enrique|alvaro|raul)/i.test(v.name) : /(female|mujer|monica|paulina|helena|laura|sabina|elvira|lucia|ximena)/i.test(v.name)) || vs[0];
      if (pick) u.voice = pick;
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
