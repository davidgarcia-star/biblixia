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
