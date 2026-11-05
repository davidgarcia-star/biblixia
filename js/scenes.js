import * as THREE from 'three';
import { createHuman, bakeStatic } from './human.js';
import { pace } from './pace.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nameSprite } from './characters.js';

/* =========================================================
   ESCENAS BÍBLICAS: El arca de Noé (Génesis 6–9) y David y Goliat (1 Samuel 17)
   Escala: 1 codo = 0,5 m
   ========================================================= */
const C = .5;
function tex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t;
}
const std = (o) => new THREE.MeshStandardMaterial(o);

/* ---------------- Animales ---------------- */
const stripes = (base, line, vertical = true, n = 14) => tex(128, 128, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); g.fillStyle = line; for (let i = 0; i < n; i++) { g.beginPath(); const p = i * W / n; if (vertical) { g.moveTo(p, 0); g.bezierCurveTo(p + 6, H * .3, p - 6, H * .7, p + 3, H); g.lineTo(p + 5, H); g.bezierCurveTo(p - 2, H * .7, p + 10, H * .3, p + 4, 0); } g.fill(); } });
const patches = (base, spot) => tex(128, 128, (g, W, H) => { g.fillStyle = spot; g.fillRect(0, 0, W, H); g.fillStyle = base; for (let y = 0; y < H; y += 26) for (let x = 0; x < W; x += 26) { g.beginPath(); g.moveTo(x + 3 + Math.random() * 4, y + 3); g.lineTo(x + 22, y + 2 + Math.random() * 4); g.lineTo(x + 23, y + 22); g.lineTo(x + 2, y + 23); g.fill(); } });

/* Especies: medidas aproximadas reales (m). legs: largo de pata; body: [largo, alto, ancho] */
const SPECIES = {
  elefante: { body: [2.9, 1.9, 1.7], leg: 1.5, legR: .26, neck: .5, head: [.95, .95, .8], color: '#86868a', snout: 'trunk', ears: 'elephant', tail: .9, feet: 'pad' },
  jirafa: { body: [1.9, 1.15, .8], leg: 2.0, legR: .09, neck: 2.3, neckUp: 1.25, head: [.55, .3, .25], pattern: 'giraffe', color: '#e9c27a', ears: 'small', horns: 'ossicone', tail: .9, mane: '#6a3a1a' },
  leon: { body: [1.75, .85, .6], leg: .75, legR: .1, neck: .35, head: [.45, .42, .4], color: '#c9964a', mane: '#6a3a12', maneBig: true, ears: 'round', tail: .95, tuft: '#3a2410', feet: 'paw' },
  leona: { body: [1.6, .78, .55], leg: .72, legR: .09, neck: .35, head: [.42, .36, .34], color: '#cfa05a', ears: 'round', tail: .9, tuft: '#4a3018', feet: 'paw' },
  cebra: { body: [1.6, .85, .58], leg: 1.0, legR: .07, neck: .75, neckUp: .9, head: [.6, .32, .25], pattern: 'zebra', color: '#f2f2ee', mane: '#111', ears: 'horse', tail: .6, tuft: '#111' },
  camello: { body: [2.0, 1.0, .75], leg: 1.45, legR: .08, neck: 1.0, neckUp: .7, neckCurve: true, head: [.55, .3, .26], color: '#c7a06a', hump: 1, ears: 'small', tail: .5 },
  caballo: { body: [1.85, .95, .62], leg: 1.05, legR: .08, neck: .85, neckUp: .95, head: [.62, .34, .26], color: '#7a4422', mane: '#1a0e06', ears: 'horse', tail: .8, tuft: '#1a0e06' },
  oveja: { body: [1.05, .62, .6], leg: .45, legR: .045, neck: .2, head: [.32, .24, .2], color: '#efe9dc', headColor: '#2a2420', wool: true, ears: 'sheep', tail: .15 },
  oso: { body: [1.7, 1.05, .9], leg: .65, legR: .14, neck: .3, head: [.5, .42, .42], color: '#4a2e1a', ears: 'round', tail: .1, feet: 'paw' },
  ciervo: { body: [1.35, .7, .45], leg: .95, legR: .055, neck: .55, neckUp: 1, head: [.4, .24, .2], color: '#9a6a3a', ears: 'horse', horns: 'antler', tail: .18 },
  mono: { body: [.55, .42, .35], leg: .42, legR: .045, neck: .12, head: [.24, .22, .22], color: '#5a3a20', headColor: '#c89a70', ears: 'monkey', tail: .9, monkey: true },
};
const furCache = {};
function furTex(sp) {
  const key = sp.color + (sp.pattern || '') + (sp.wool ? 'w' : '');
  if (furCache[key]) return furCache[key];
  return furCache[key] = tex(256, 256, (g, W, H) => {
    g.fillStyle = sp.color; g.fillRect(0, 0, W, H);
    if (sp.pattern === 'zebra') { g.fillStyle = '#111'; for (let i = 0; i < 22; i++) { const x = i * W / 22; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, H * .3, x - 8, H * .7, x + 4, H); g.lineTo(x + 7, H); g.bezierCurveTo(x - 1, H * .7, x + 14, H * .3, x + 5, 0); g.fill(); } }
    if (sp.pattern === 'giraffe') { g.fillStyle = '#9a5a24'; for (let y = 0; y < H; y += 30) for (let x = (y / 30 % 2) * 15; x < W; x += 30) { g.beginPath(); const r = 11 + Math.random() * 3; for (let k = 0; k < 7; k++) { const a = k / 7 * 6.283, rr = r * (.8 + Math.random() * .3); k ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.fill(); } }
    // pelaje fino
    for (let i = 0; i < (sp.wool ? 9000 : 6000); i++) { const x = Math.random() * W, y = Math.random() * H; g.strokeStyle = Math.random() < .5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.lineWidth = sp.wool ? 2 : 1; g.beginPath(); g.moveTo(x, y); sp.wool ? g.arc(x, y, 2, 0, 6) : g.lineTo(x + 1, y + 4); g.stroke(); }
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,.12)'); gr.addColorStop(.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(255,255,255,.08)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
}
// Tubo que se adelgaza a lo largo de una curva (cuellos, colas, trompa)
function taperTube(pts, r0, r1, seg = 14, rad = 10) {
  const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, seg, 1, rad, false), p = g.attributes.position;
  const frames = curve.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, c = curve.getPointAt(t), r = THREE.MathUtils.lerp(r0, r1, t);
    for (let j = 0; j <= rad; j++) { const k = i * (rad + 1) + j; const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k)).sub(c); p.setXYZ(k, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r); }
  }
  g.computeVertexNormals(); return g;
}
// Torso con forma (lomo, pecho más hondo, grupa)
function torsoGeo(L, Hh, Wd) {
  const prof = [[0, -L / 2], [.35, -L / 2 + .05 * L], [.72, -L * .38], [.88, -L * .2], [.92, 0], [.98, L * .18], [1, L * .32], [.85, L * .44], [.4, L / 2], [0, L / 2 + .02]];
  const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 22); g.rotateX(Math.PI / 2);
  const p = g.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i); y = y > 0 ? y * .92 : y * 1.08; p.setXYZ(i, x * Wd / 2, y * Hh / 2, p.getZ(i)); }
  g.computeVertexNormals(); return g;
}
export function makeAnimal(kind, scaleK = 1) {
  const s = SPECIES[kind];
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const furM = std({ map: furTex(s), roughness: .9 });
  const dark = std({ color: 0x15110e, roughness: .5 }), hoofM = std({ color: 0x2a2018, roughness: .6 });
  const headM = s.headColor ? std({ color: s.headColor, roughness: .8 }) : furM;
  const [L, Hh, Wd] = s.body, y0 = s.leg + Hh * .35, add = (geo, m, x, y, z, parent = body) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  // cuerpo
  if (s.wool) { for (let i = 0; i < 26; i++) { const a = Math.random() * 6.28, b2 = Math.random() * 3.14; add(new THREE.SphereGeometry(Wd * .32, 10, 8), furM, Math.cos(a) * Math.sin(b2) * Wd * .32, y0 + Math.cos(b2) * Hh * .3, (Math.random() - .5) * L * .75); } add(new THREE.SphereGeometry(Wd * .45, 14, 10), furM, 0, y0, 0).scale.set(1, .95, L / Wd * 1.05); }
  else add(torsoGeo(L, Hh, Wd), furM, 0, y0, 0);
  if (s.hump) { const h = add(new THREE.SphereGeometry(Wd * .45, 16, 12), furM, 0, y0 + Hh * .5, -.05); h.scale.set(1, 1.05, 1.4); }
  // cuello y cabeza
  const nb = new THREE.Vector3(0, y0 + Hh * .2, L * .4), up = s.neckUp ?? .5;
  const nt = new THREE.Vector3(0, nb.y + s.neck * up, nb.z + s.neck * (1 - up * .5) * .6);
  const mid = s.neckCurve ? new THREE.Vector3(0, nb.y - .1, nb.z + s.neck * .55) : nb.clone().lerp(nt, .5);
  add(taperTube([nb, mid, nt], Hh * .32, s.head[1] * .42, 10, 10), furM, 0, 0, 0);
  const head = new THREE.Group(); head.position.copy(nt); head.rotation.x = s.neck > 1 ? .35 : .55; body.add(head);
  const [hl, hh, hw] = s.head;
  const skull = add(new THREE.SphereGeometry(.5, 18, 14), headM, 0, 0, 0, head); skull.scale.set(hw, hh, hh * 1.05);
  const muzzle = add(new THREE.CylinderGeometry(hw * .32, hw * .42, hl * .75, 14), headM, 0, -hh * .12, hl * .42, head); muzzle.rotation.x = Math.PI / 2 + .1;
  add(new THREE.SphereGeometry(hw * .33, 12, 10), headM, 0, -hh * .16, hl * .8, head).scale.set(1, .85, .8);
  for (const sx of [-1, 1]) {
    add(new THREE.SphereGeometry(Math.max(.018, hh * .07), 10, 8), dark, sx * hw * .42, hh * .12, hl * .12, head);
    add(new THREE.SphereGeometry(Math.max(.01, hh * .035), 8, 6), dark, sx * hw * .14, -hh * .14, hl * .97, head);
    if (s.ears === 'horse' || s.ears === 'small') { const e = add(new THREE.ConeGeometry(hw * .14, hh * (s.ears === 'horse' ? .55 : .35), 8), furM, sx * hw * .3, hh * .48, -hl * .05, head); e.rotation.z = -sx * .25; }
    if (s.ears === 'round' || s.ears === 'monkey') { const e = add(new THREE.SphereGeometry(hw * .16, 10, 8), headM, sx * hw * (s.ears === 'monkey' ? .52 : .36), hh * (s.ears === 'monkey' ? .05 : .42), -hl * .05, head); e.scale.set(.6, 1, .5); }
    if (s.ears === 'sheep') { const e = add(new THREE.SphereGeometry(hw * .2, 10, 8), headM, sx * hw * .55, hh * .1, 0, head); e.scale.set(1.4, .45, .7); }
    if (s.ears === 'elephant') { const e = add(new THREE.SphereGeometry(.55, 16, 12, 0, Math.PI), std({ color: 0x7a7a7e, roughness: .9, side: THREE.DoubleSide }), sx * hw * .48, 0, -hl * .15, head); e.scale.set(.12, 1.1, .9); e.rotation.y = sx * .5; }
    if (s.horns === 'ossicone') add(new THREE.CylinderGeometry(.025, .035, .16, 8), dark, sx * hw * .18, hh * .55, -hl * .1, head);
    if (s.horns === 'antler') { const a = add(taperTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * .12, .25, -.05), new THREE.Vector3(sx * .28, .45, .05)], .025, .012, 8, 6), std({ color: 0xd8c8a0, roughness: .7 }), sx * hw * .2, hh * .4, -hl * .05, head); add(taperTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * .05, .15, .12)], .014, .008, 5, 5), std({ color: 0xd8c8a0 }), sx * hw * .2 + sx * .14, hh * .4 + .26, -hl * .08, head); }
  }
  if (s.snout === 'trunk') {
    add(taperTube([new THREE.Vector3(0, -hh * .1, hl * .5), new THREE.Vector3(0, -hh * .6, hl * .75), new THREE.Vector3(0, -hh * 1.3, hl * .7), new THREE.Vector3(0, -hh * 1.75, hl * .9)], .19, .07, 16, 10), headM, 0, 0, 0, head);
    for (const sx of [-1, 1]) add(taperTube([new THREE.Vector3(sx * hw * .25, -hh * .3, hl * .45), new THREE.Vector3(sx * hw * .28, -hh * .75, hl * .75), new THREE.Vector3(sx * hw * .22, -hh * .8, hl * 1.05)], .055, .02, 8, 8), std({ color: 0xf3ecdc, roughness: .4 }), 0, 0, 0, head);
  }
  if (s.mane) {
    const mm = std({ color: s.mane, roughness: 1 });
    if (s.maneBig) { for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = .32 + Math.random() * .06; const c = add(new THREE.ConeGeometry(.07, .26, 6), mm, Math.cos(a) * r * .9, Math.sin(a) * r, -hl * .25, head); c.rotation.set(Math.PI / 2 - .4, 0, a - Math.PI / 2); } add(new THREE.SphereGeometry(.36, 14, 10), mm, 0, 0, -hl * .32, head).scale.set(1, 1.05, .8); }
    else { const crest = add(taperTube([nb.clone().add(new THREE.Vector3(0, Hh * .25, -.05)), mid.clone().add(new THREE.Vector3(0, Hh * .25, -.1)), nt.clone().add(new THREE.Vector3(0, hh * .45, -.15))], .05, .035, 10, 6), mm, 0, 0, 0); crest.scale.x = .5; }
  }
  // cola
  if (s.tail) { const tb = new THREE.Vector3(0, y0 + Hh * .3, -L / 2); const tl = add(taperTube([tb, tb.clone().add(new THREE.Vector3(0, -s.tail * .3, -.12)), tb.clone().add(new THREE.Vector3(0, -s.tail * (s.monkey ? .2 : .9), s.monkey ? -.35 : -.16))].concat(s.monkey ? [tb.clone().add(new THREE.Vector3(0, s.tail * .2, -.5))] : []), .035 * Wd * 2, .012 * Wd * 2, 10, 6), furM, 0, 0, 0); if (s.tuft) add(new THREE.SphereGeometry(.06, 8, 6), std({ color: s.tuft }), 0, y0 + Hh * .3 - s.tail * .9, -L / 2 - .16).scale.y = 1.8; }
  // patas con rodilla (animadas)
  const legs = [];
  for (const [lx, lz, hind] of [[-1, 1, 0], [1, 1, 0], [-1, -1, 1], [1, -1, 1]]) {
    const pivot = new THREE.Group(); pivot.position.set(lx * Wd * .3, y0 - Hh * .05, lz * L * .36);
    const up2 = s.leg * .5, lo = s.leg * .55;
    const thigh = new THREE.Mesh(taperTube([new THREE.Vector3(0, .05, 0), new THREE.Vector3(0, -up2 * .5, hind ? -.05 : .02), new THREE.Vector3(0, -up2, hind ? .06 : 0)], s.legR * (hind ? 1.9 : 1.6), s.legR, 8, 8), furM); pivot.add(thigh);
    const knee = new THREE.Group(); knee.position.set(0, -up2, hind ? .06 : 0); pivot.add(knee);
    const shin = new THREE.Mesh(taperTube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -lo * .5, hind ? -.03 : 0), new THREE.Vector3(0, -lo + .04, 0)], s.legR * .9, s.legR * .75, 6, 8), furM); knee.add(shin);
    const foot = new THREE.Mesh(s.feet === 'paw' ? new THREE.SphereGeometry(s.legR * 1.2, 10, 8) : new THREE.CylinderGeometry(s.legR * .8, s.legR * 1.05, .08, 10), s.feet ? furM : hoofM); foot.position.y = -lo + .04; if (s.feet === 'paw') foot.scale.set(1, .6, 1.4); knee.add(foot);
    g.add(pivot); legs.push(pivot); pivot.userData.knee = knee; pivot.userData.hind = hind;
  }
  if (s.monkey) { for (const sx of [-1, 1]) add(taperTube([new THREE.Vector3(sx * Wd * .4, y0 + Hh * .2, L * .3), new THREE.Vector3(sx * Wd * .5, y0 - .1, L * .4), new THREE.Vector3(sx * Wd * .45, .05, L * .45)], .05, .035, 8, 6), furM, 0, 0, 0); }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const baked = bakeStatic(body); g.remove(body); g.add(baked);
  g.scale.setScalar(scaleK);
  g.userData = { legs, kind };
  return g;
}

/* ---------------- Gallo y gallina (caminan en dos patas) ---------------- */
export function makeBird(kind) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const rooster = kind === 'gallo';
  const feathers = std({ color: rooster ? 0x8a3a1a : 0xd8c4a0, roughness: .9 });
  const red = std({ color: 0xd42020, roughness: .6 }), yellow = std({ color: 0xf0b020, roughness: .6 }), dark = std({ color: 0x111111 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), feathers); b.scale.set(.85, .9, 1.2); b.position.y = .42; body.add(b);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, .2, 10), feathers); nk.position.set(0, .58, .16); nk.rotation.x = .4; body.add(nk);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.08, 12, 10), feathers); hd.position.set(0, .7, .22); body.add(hd);
  const bk = new THREE.Mesh(new THREE.ConeGeometry(.025, .07, 6), yellow); bk.position.set(0, .69, .31); bk.rotation.x = Math.PI / 2; body.add(bk);
  const cm = new THREE.Mesh(new THREE.BoxGeometry(.02, rooster ? .09 : .05, .12), red); cm.position.set(0, .79, .22); body.add(cm);
  const wt = new THREE.Mesh(new THREE.SphereGeometry(.025, 8, 6), red); wt.position.set(0, .63, .29); wt.scale.y = 1.6; body.add(wt);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.012, 6, 4), dark); e.position.set(sx * .06, .72, .27); body.add(e); }
  const tailM = rooster ? std({ color: 0x1a3a2a, metalness: .4, roughness: .4, side: THREE.DoubleSide }) : feathers;
  for (let i = 0; i < (rooster ? 5 : 3); i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), tailM); t.scale.set(.15, rooster ? 1.4 : .8, .6); t.position.set((i - (rooster ? 2 : 1)) * .03, .55 + (rooster ? .12 : 0), -.24); t.rotation.x = -.6 - i * .08; body.add(t); }
  const legs = [];
  const lg = new THREE.CylinderGeometry(.012, .012, .25, 6); lg.translate(0, -.125, 0);
  for (const sx of [-1, 1]) { const pv = new THREE.Group(); pv.position.set(sx * .07, .28, 0); const l = new THREE.Mesh(lg, yellow); pv.add(l); const f = new THREE.Mesh(new THREE.BoxGeometry(.06, .015, .09), yellow); f.position.set(0, -.25, .03); pv.add(f); g.add(pv); legs.push(pv); }
  g.traverse(m => { if (m.isMesh) m.castShadow = true; });
  const baked = bakeStatic(body); g.remove(body); g.add(baked);
  g.userData = { legs, kind };
  return g;
}
function makeFlyer(color, size = 1) {
  const m = std({ color, roughness: .7, side: THREE.DoubleSide });
  const d = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), m); b.scale.set(.8, .8, 1.7); d.add(b);
  const hd = new THREE.Mesh(new THREE.SphereGeometry(.1, 8, 6), m); hd.position.set(0, .05, .3); d.add(hd);
  const wl = new THREE.Mesh(new THREE.PlaneGeometry(.8, .32), m); wl.geometry.translate(-.4, 0, 0); wl.rotation.x = -Math.PI / 2;
  const wr = new THREE.Mesh(new THREE.PlaneGeometry(.8, .32), m); wr.geometry.translate(.4, 0, 0); wr.rotation.x = -Math.PI / 2;
  const tl = new THREE.Mesh(new THREE.PlaneGeometry(.22, .4), m); tl.rotation.x = -Math.PI / 2; tl.position.z = -.4; d.add(wl, wr, tl);
  d.scale.setScalar(size);
  return { d, wl, wr };
}

/* ---------------- EL ARCA DE NOÉ ---------------- */
export async function buildArk({ group, addBox, addRamp, blockers, x, z, rnd }) {
  const L = 300 * C, Wd = 50 * C, H = 30 * C;           // 150 × 25 × 15 m
  const planks = tex(512, 256, (g, W, Hh) => {
    g.fillStyle = '#6a4526'; g.fillRect(0, 0, W, Hh);
    for (let y = 0; y < Hh; y += 16) { g.fillStyle = `rgba(${40 + Math.random() * 30},${25 + Math.random() * 15},10,.5)`; g.fillRect(0, y, W, 2); for (let x = (y / 16 % 2) * 60; x < W; x += 120) g.fillRect(x, y, 2, 16); }
    for (let i = 0; i < 4000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,220,170,.05)' : 'rgba(0,0,0,.08)'; g.fillRect(Math.random() * W, Math.random() * Hh, 6, 1); }
  }, [12, 3]);
  const wood = std({ map: planks, roughness: .85 });
  const pitch = std({ color: 0x2a1e14, roughness: .6 });
  const A = new THREE.Group(); group.add(A);
  // Casco con fondo redondeado (sección transversal extruida)
  const sh = new THREE.Shape();
  sh.moveTo(-Wd / 2, H * .55); sh.lineTo(-Wd / 2, H * .25); sh.quadraticCurveTo(-Wd / 2, 0, -Wd / 3, 0); sh.lineTo(Wd / 3, 0); sh.quadraticCurveTo(Wd / 2, 0, Wd / 2, H * .25); sh.lineTo(Wd / 2, H * .55);
  sh.lineTo(Wd / 2, H * .55); sh.lineTo(-Wd / 2, H * .55);
  const hullG = new THREE.ExtrudeGeometry(sh, { depth: L, bevelEnabled: false }); hullG.translate(0, 0, -L / 2); hullG.rotateY(Math.PI / 2);
  const hull = new THREE.Mesh(hullG, pitch); hull.position.set(x, 0, z); A.add(hull);
  // Cuerpo superior de madera (tres pisos)
  const hide = new THREE.MeshBasicMaterial({ visible: false });
  const upH = H * .45, upY = H * .55 + upH / 2;
  const up = new THREE.Mesh(new THREE.BoxGeometry(L - 2, upH, Wd - .6), [wood, wood, wood, wood, wood, hide]); up.position.set(x, upY, z); A.add(up);
  // cara norte con el hueco de la puerta (Génesis 6:16)
  const doorW = 6, doorH = 5;
  const nf = new THREE.Shape(); nf.moveTo(-(L - 2) / 2, -upH / 2); nf.lineTo((L - 2) / 2, -upH / 2); nf.lineTo((L - 2) / 2, upH / 2); nf.lineTo(-(L - 2) / 2, upH / 2); nf.lineTo(-(L - 2) / 2, -upH / 2);
  const hole = new THREE.Path(); const hb = -upH / 2 + .2; hole.moveTo(-doorW / 2, hb); hole.lineTo(-doorW / 2, hb + doorH); hole.lineTo(doorW / 2, hb + doorH); hole.lineTo(doorW / 2, hb); hole.lineTo(-doorW / 2, hb); nf.holes.push(hole);
  const nTex = planks.clone(); nTex.repeat.set(1 / 12.3, 1 / 2.25); nTex.needsUpdate = true;
  const north = new THREE.Mesh(new THREE.ShapeGeometry(nf), std({ map: nTex, roughness: .85 })); north.position.set(x, upY, z - (Wd - .6) / 2); north.rotation.y = Math.PI; A.add(north);
  // marco de la puerta
  for (const sx of [-1, 1]) { const jamb = new THREE.Mesh(new THREE.BoxGeometry(.4, doorH + .4, .6), pitch); jamb.position.set(x + sx * (doorW / 2 + .2), H * .55 + .2 + doorH / 2, z - Wd / 2 + .3); A.add(jamb); }
  const lint = new THREE.Mesh(new THREE.BoxGeometry(doorW + .8, .4, .6), pitch); lint.position.set(x, H * .55 + .4 + doorH, z - Wd / 2 + .3); A.add(lint);
  // Ventana a un codo del techo (Génesis 6:16) y techo a dos aguas
  const win = new THREE.Mesh(new THREE.BoxGeometry(L - 6, C * 2, Wd - .2), std({ color: 0x1a120a })); win.position.set(x, H - C * 1.2, z); A.add(win);
  const roofSh = new THREE.Shape(); roofSh.moveTo(-Wd / 2 - .6, 0); roofSh.lineTo(0, 3.2); roofSh.lineTo(Wd / 2 + .6, 0); roofSh.lineTo(-Wd / 2 - .6, 0);
  const roofG = new THREE.ExtrudeGeometry(roofSh, { depth: L - 1, bevelEnabled: false }); roofG.translate(0, 0, -(L - 1) / 2); roofG.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(roofG, wood); roof.position.set(x, H - .2, z); A.add(roof);
  // franjas de los tres pisos
  for (const k of [1, 2]) {
    const by = H * .55 + k * H * .15;
    const strip = (w, d, px, pz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, .35, d), pitch); b.position.set(px, by, pz); A.add(b); };
    strip(L - 1.8, .25, x, z + (Wd - .4) / 2); strip(.25, Wd - .4, x - (L - 1.8) / 2, z); strip(.25, Wd - .4, x + (L - 1.8) / 2, z);
    if (by < H * .55 + .2 + doorH + .4) { strip((L - 1.8) / 2 - 3.6, .25, x - 3.6 - ((L - 1.8) / 2 - 3.6) / 2, z - (Wd - .4) / 2); strip((L - 1.8) / 2 - 3.6, .25, x + 3.6 + ((L - 1.8) / 2 - 3.6) / 2, z - (Wd - .4) / 2); }
    else strip(L - 1.8, .25, x, z - (Wd - .4) / 2);
  }
  // Puerta al costado (Génesis 6:16) con rampa
  const doorY = H * .55 + .2, doorZ = z - Wd / 2;
  // Rampa con una sola inclinación que sube hasta la puerta, y plataforma (la hoja de la puerta bajada)
  const leafLen = 5, rampLen = 30, rampEnd = doorZ - leafLen, rampZ0 = rampEnd - rampLen;
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(doorW, .4, leafLen), wood); doorLeaf.position.set(x, doorY, doorZ - leafLen / 2); A.add(doorLeaf);
  const slope = Math.atan2(doorY, rampLen), rl = Math.hypot(rampLen, doorY);
  const ramp = new THREE.Mesh(new THREE.BoxGeometry(doorW, .4, rl), wood); ramp.position.set(x, doorY / 2, (rampZ0 + rampEnd) / 2); ramp.rotation.x = -slope; A.add(ramp);
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.15, .15, rl), pitch); rail.position.set(x + sx * (doorW / 2 - .1), doorY / 2 + 1, (rampZ0 + rampEnd) / 2); rail.rotation.x = -slope; A.add(rail);
    for (let i = 0; i <= 6; i++) { const t = i / 6, py = doorY * t; const post = new THREE.Mesh(new THREE.BoxGeometry(.15, 1, .15), pitch); post.position.set(x + sx * (doorW / 2 - .1), py + .5, rampZ0 + rampLen * t); A.add(post); }
    const prop = new THREE.Mesh(new THREE.BoxGeometry(.3, doorY, .3), wood); prop.position.set(x + sx * (doorW / 2 - .3), doorY / 2, rampEnd - .3); A.add(prop);
  }
  // INTERIOR del arca (cubierta del medio): se puede entrar
  const inW = L - 4, inD = Wd - 1.6, inH = doorH + .1, inZ = z + .3;
  const inTex = planks.clone(); inTex.repeat.set(30, 2); inTex.needsUpdate = true;
  const inMat = std({ map: inTex, color: 0xd8b890, roughness: .9, side: THREE.BackSide });
  const room = new THREE.Mesh(new THREE.BoxGeometry(inW, inH, inD), inMat); room.position.set(x, doorY + inH / 2, inZ); room.receiveShadow = false; room.castShadow = false; A.add(room);
  const hay = std({ color: 0xd8b04a, roughness: 1 }), lampM = std({ color: 0xffe0a0, emissive: 0xffb050, emissiveIntensity: 2.5 }), beam = std({ color: 0x5a3a1e, roughness: .8 });
  for (let i = -6; i <= 6; i++) {
    const bx = x + i * 10;
    const bm = new THREE.Mesh(new THREE.BoxGeometry(.35, .35, inD - .06), beam); bm.position.set(bx, doorY + inH - .2, inZ); A.add(bm);
    for (const sz of [-1, 1]) { const pst = new THREE.Mesh(new THREE.BoxGeometry(.3, inH - .06, .3), beam); pst.position.set(bx, doorY + inH / 2, inZ + sz * (inD / 2 - 4.5)); A.add(pst); }
    const lp = new THREE.Mesh(new THREE.SphereGeometry(.18, 10, 8), lampM); lp.position.set(bx + 5, doorY + inH - .9, inZ); A.add(lp);
  }
  // establos a ambos lados con cercas y heno
  for (const sz of [-1, 1]) {
    const fz = inZ + sz * (inD / 2 - 4.5);
    const fence = new THREE.Mesh(new THREE.BoxGeometry(inW - 1, .12, .12), beam); fence.position.set(x, doorY + 1.1, fz); A.add(fence);
    const fence2 = fence.clone(); fence2.position.y = doorY + .6; A.add(fence2);
    for (let i = -14; i <= 14; i++) { if (sz < 0 && Math.abs(i) < 1) continue; const h2 = new THREE.Mesh(new THREE.BoxGeometry(1.4, .7, .9), hay); h2.position.set(x + i * 5 + 2, doorY + .35, inZ + sz * (inD / 2 - 1.5)); h2.rotation.y = (i * 37 % 10) * .05; A.add(h2); }
  }
  A.traverse(m => { if (m.isMesh && m !== room) { m.castShadow = true; m.receiveShadow = true; } });
  blockers.push(hull, room);
  // colisiones: casco bajo la cubierta, paredes con el hueco de la puerta, rampa y plataforma
  addBox(x - L / 2, x + L / 2, doorZ + .4, z + Wd / 2, doorY);
  addBox(x - L / 2, x + L / 2, z + Wd / 2 - .6, z + Wd / 2, H + 3);
  addBox(x - L / 2, x - L / 2 + 2.2, doorZ, z + Wd / 2, H + 3); addBox(x + L / 2 - 2.2, x + L / 2, doorZ, z + Wd / 2, H + 3);
  addBox(x - L / 2, x - doorW / 2, doorZ - .1, doorZ + .9, H + 3); addBox(x + doorW / 2, x + L / 2, doorZ - .1, doorZ + .9, H + 3);
  addBox(x - doorW / 2, x + doorW / 2, doorZ - .1, doorZ + .9, doorY);   // umbral
  for (const sz of [-1, 1]) { const fz = inZ + sz * (inD / 2 - 4.5); if (sz < 0) { addBox(x - inW / 2, x - 3, fz - .15, fz + .15, doorY + 1.2); addBox(x + 3, x + inW / 2, fz - .15, fz + .15, doorY + 1.2); } else addBox(x - inW / 2, x + inW / 2, fz - .15, fz + .15, doorY + 1.2); }
  addRamp(x - doorW / 2, x + doorW / 2, rampZ0, rampEnd, 0, doorY + .2);
  addBox(x - doorW / 2, x + doorW / 2, rampEnd, doorZ + .9, doorY + .2);
  // Arcoíris (Génesis 9:13)
  const cols = [0xff3b30, 0xff9500, 0xffcc00, 0x34c759, 0x007aff, 0x3f37c9, 0x9b59b6];
  const rainbow = new THREE.Group(); A.add(rainbow);
  cols.forEach((c, i) => { const r = new THREE.Mesh(new THREE.TorusGeometry(150 - i * 3.2, 1.6, 6, 80, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .32, depthWrite: false, fog: false })); r.position.set(x, -10, z + 120); rainbow.add(r); });

  // Animales que entran de dos en dos (Génesis 7:8-9)
  const pairs = [['elefante', 'elefante'], ['jirafa', 'jirafa'], ['leon', 'leona'], ['cebra', 'cebra'], ['gallo', 'gallina'], ['camello', 'camello'], ['mono', 'mono'], ['caballo', 'caballo'], ['oveja', 'oveja'], ['oso', 'oso'], ['ciervo', 'ciervo']];
  const yA = doorY + .2;
  const path = [new THREE.Vector3(x - 70, 0, rampZ0 - 6), new THREE.Vector3(x - 4, 0, rampZ0 - 6), new THREE.Vector3(x, 0, rampZ0 - 1), new THREE.Vector3(x, 0, rampZ0), new THREE.Vector3(x, yA, rampEnd), new THREE.Vector3(x, yA, doorZ), new THREE.Vector3(x, yA, doorZ + 6), new THREE.Vector3(x + 9, yA, doorZ + 6)];
  const seg = []; let total = 0; for (let i = 1; i < path.length; i++) { const l = path[i].distanceTo(path[i - 1]); seg.push(l); total += l; }
  const at = (d, out) => { d = ((d % total) + total) % total; for (let i = 0; i < seg.length; i++) { if (d <= seg[i]) return out.lerpVectors(path[i], path[i + 1], d / seg[i]); d -= seg[i]; } return out.copy(path[path.length - 1]); };
  const animals = [];
  for (const [i, pr] of pairs.entries()) for (const [j, k] of pr.entries()) { await pace();
    const a = (k === 'gallo' || k === 'gallina') ? makeBird(k) : makeAnimal(k); A.add(a);
    animals.push({ a, d: i * (total / pairs.length), side: j ? 1 : -1, kind: k, small: k === 'gallo' || k === 'gallina' || k === 'mono' || k === 'oveja' });
  }
  // animales ya acomodados dentro del arca
  const inside = [];
  for (const [i, [k, ox]] of [['oveja', -30], ['caballo', -40], ['camello', -52], ['cebra', 30], ['jirafa', 42], ['elefante', 55], ['mono', -20], ['oso', 20]].entries()) { await pace();
    for (const sd of [0, 1]) { const a = makeAnimal(k); const ax2 = x + ox + sd * 2.6, az2 = inZ + (i % 2 ? 1 : -1) * (inD / 2 - 2.2); a.position.set(ax2, yA - .2, az2); a.rotation.y = (i % 2 ? Math.PI : 0) + (sd ? .4 : -.3); A.add(a); inside.push(a); const rr = { elefante: 1.6, jirafa: 1, camello: 1.2, caballo: 1, oso: 1, cebra: .9, oveja: .6, mono: .4 }[k] || .8; addBox(ax2 - rr, ax2 + rr, az2 - rr, az2 + rr, yA + 2); }
  }
  // estiércol en los establos (de ahí el olor)
  const dung = std({ color: 0x4a3418, roughness: .9 });
  for (let i = 0; i < 22; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(.22 + Math.random() * .15, 8, 6), dung); d.scale.y = .35; d.position.set(x - 60 + i * 5.6 + Math.random() * 2, yA - .17, inZ + (i % 2 ? 1 : -1) * (inD / 2 - 3.2 + Math.random())); A.add(d); }
  for (const k of ['gallo', 'gallina', 'gallina']) { const b = makeBird(k); b.position.set(x - 8 + inside.length * .5, yA - .2, inZ + 4); b.rotation.y = inside.length; A.add(b); inside.push(b); }
  // palomas volando
  // aves: palomas, guacamayos y águilas volando en parejas alrededor del arca
  const doves = [];
  const flock = [[0xf6f6f2, 1], [0xf6f6f2, 1], [0xd82a2a, 1.2], [0xd82a2a, 1.2], [0x1e6ad8, 1.2], [0x1e6ad8, 1.2], [0x2aa84a, 1.1], [0x2aa84a, 1.1], [0x6a4a2a, 2.2], [0x6a4a2a, 2.2], [0xf2c230, 1], [0xf2c230, 1]];
  flock.forEach(([c, sz], i) => { const f = makeFlyer(c, sz); A.add(f.d); doves.push({ ...f, k: i, r: 22 + (i % 6) * 4, h: H + 6 + (i % 4) * 2.5, sp: .25 + (i % 3) * .06 }); });
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
  return {
    zones: [{ id: 'arca-noe', name: 'El arca de Noé', minX: x - L / 2 - 6, maxX: x + L / 2 + 6, minZ: rampZ0 - 10, maxZ: doorZ, pri: 3,
      text: 'Dios mandó a Noé hacer un arca de madera de gofer, cubierta de brea por dentro y por fuera: 300 codos de largo, 50 de ancho y 30 de alto, con una ventana arriba, una puerta al costado y tres pisos. Entraron Noé, su familia y los animales de dos en dos, y Dios cerró la puerta. Después del diluvio puso su arco en las nubes como señal de su pacto.',
      ref: 'Génesis 6:14-22; 7:7-16; 9:12-16' },
      { id: 'arca-dentro', name: 'Dentro del arca', minX: x - L / 2, maxX: x + L / 2, minZ: doorZ + .5, maxZ: z + Wd / 2, pri: 4,
        text: 'El arca tenía tres pisos y compartimientos. Noé guardó en ella toda clase de alimento para su familia y para los animales. Ocho personas se salvaron: Noé, su esposa, sus tres hijos (Sem, Cam y Jafet) y sus esposas. Todo lo hizo Noé conforme a lo que Dios le mandó.',
        ref: 'Génesis 6:14-16, 21-22; 7:13; 1 Pedro 3:20' }],
    noahSpot: [x + 6, rampZ0 - 2], rainbow,
    // pasillo de la rampa y la puerta: ahí los animales de la fila no empujan al jugador (si no, no se podía salir)
    passage: { minX: x - doorW / 2 - 1.5, maxX: x + doorW / 2 + 1.5, minZ: rampZ0 - 3, maxZ: doorZ + 10 },
    exitPos: [x - 7, rampZ0 - 1], lodItems: animals.map(o => o.a).concat(doves.map(d => d.d)), insideItems: inside, doorPos: [x, doorZ],
    update(t, dt) {
      for (const o of animals) {
        if (o.skip) continue;
        o.d += dt * 1.6;
        at(o.d, tmp); at(o.d + .5, tmp2);
        const dir = tmp2.clone().sub(tmp); dir.y = 0;
        const offset = new THREE.Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(o.side * (o.small ? .8 : 1.4));
        o.a.position.copy(tmp).add(offset);
        if (dir.lengthSq() > 1e-6) o.a.rotation.y = Math.atan2(dir.x, dir.z);
        const dd = ((o.d % total) + total) % total;
        o.a.userData.inPath = dd < total - 3.2; o.a.visible = o.a.userData.inPath && !o.a.userData.far;
        o.a.userData.legs.forEach((l, i) => { const ph = t * (o.small ? 11 : 5.5) + (i === 0 || i === 3 ? 0 : Math.PI); l.rotation.x = Math.sin(ph) * .4; if (l.userData.knee) l.userData.knee.rotation.x = (l.userData.hind ? -1 : 1) * Math.max(0, Math.cos(ph)) * .6; });
      }
      for (const d of doves) {
        const a = t * d.sp + Math.floor(d.k / 2) * 1.05 + (d.k % 2) * .08;
        d.d.position.set(x + Math.cos(a) * d.r * 1.6, d.h + Math.sin(a * 2) * 2 + (d.k % 2) * .6, z + Math.sin(a) * d.r);
        d.d.rotation.y = -a; const f = Math.sin(t * (d.r > 25 ? 9 : 14) + d.k) * .6; d.wl.rotation.z = f; d.wr.rotation.z = -f;
      }
    },
  };
}

/* ---------------- DAVID Y GOLIAT ---------------- */
export async function buildValley({ group, addBox, blockers, x, z, rnd }) {
  const bronze = std({ color: 0xb87333, metalness: .85, roughness: .35 });
  const iron = std({ color: 0x55585e, metalness: .8, roughness: .4 });
  const wood = std({ color: 0x6b4a2a, roughness: .8 });
  const V = new THREE.Group(); group.add(V);
  // Arroyo con piedras lisas (1 Samuel 17:40)
  const brook = new THREE.Mesh(new THREE.PlaneGeometry(3, 46), std({ color: 0x4f9ac4, metalness: .6, roughness: .1 })); brook.rotation.x = -Math.PI / 2; brook.position.set(x, .12, z); V.add(brook);
  for (let i = 0; i < 40; i++) { const st = new THREE.Mesh(new THREE.SphereGeometry(.12 + rnd() * .18, 8, 6), std({ color: 0x9a948a, roughness: .9 })); st.position.set(x + (rnd() - .5) * 4, .05, z + (rnd() - .5) * 44); st.scale.y = .5; V.add(st); }
  // GOLIAT: seis codos y un palmo (≈ 2,9 m), casco de bronce, cota de malla, lanza y escudero (1 Samuel 17:4-7)
  const gx = x + 9, gz = z;
  const gol = createHuman({ detail: .6, outfit: 'robe', robe: 0x8a6a3a, mantle: 0x5a2a1a, sash: 0x3a2a1a, beard: { color: 0x2a1a10, len: .1 }, hairColor: 0x1a100a, hair: 'long', skin: 0xa06a48, eye: 0x2a1a10, age: 1 });
  gol.arms[1].shoulder.rotation.set(-.35, 0, .2); gol.arms[1].elbow.rotation.x = -.6;
  gol.arms[0].shoulder.rotation.set(-.4, 0, -.25); gol.arms[0].elbow.rotation.x = -1.2;
  const helm = new THREE.Mesh(new THREE.SphereGeometry(.125, 20, 12, 0, Math.PI * 2, 0, Math.PI * .55), bronze); helm.position.set(0, .04, -.005); helm.scale.set(.98, 1.1, 1.08); gol.head.add(helm);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(.02, .1, .2), std({ color: 0x9a1a1a })); crest.position.set(0, .17, -.02); gol.head.add(crest);
  const mail = new THREE.Mesh(new THREE.CylinderGeometry(.23, .27, .62, 24), std({ map: tex(64, 64, (g) => { g.fillStyle = '#9a6a2a'; g.fillRect(0, 0, 64, 64); for (let y = 0; y < 64; y += 8) for (let x2 = (y / 8 % 2) * 4; x2 < 64; x2 += 8) { g.fillStyle = '#d0954a'; g.beginPath(); g.arc(x2 + 4, y + 4, 4, 0, Math.PI); g.fill(); } }, [6, 4]), metalness: .7, roughness: .4 }));
  mail.position.y = 1.18; mail.scale.z = .78; gol.root.add(mail);
  for (const s of [-1, 1]) { const gr = new THREE.Mesh(new THREE.CylinderGeometry(.06, .05, .38, 12), bronze); gr.position.set(s * .09, .3, .06); gol.root.add(gr); } // grebas de bronce
  const spear = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 3.2, 10), wood); shaft.position.y = 1.6; spear.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.07, .45, 8), iron); tip.position.y = 3.4; spear.add(tip);
  spear.position.set(.34, 0, .25); gol.root.add(spear);
  const sword = new THREE.Mesh(new THREE.BoxGeometry(.05, .7, .02), iron); sword.position.set(-.25, .85, .05); sword.rotation.z = .2; gol.root.add(sword);
  const golBaked = bakeStatic(gol.root); golBaked.scale.setScalar(1.66); golBaked.position.set(gx, 0, gz); golBaked.rotation.y = -Math.PI / 2; V.add(golBaked);
  addBox(gx - .7, gx + .7, gz - .7, gz + .7, 3);
  // Escudero con un gran escudo (1 Samuel 17:7)
  const shield = (r) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .06, 24), bronze); s.rotation.x = Math.PI / 2; return s; };
  const makeSoldier = (opt = {}) => {
    const h = createHuman({ detail: .55, outfit: 'robe', robe: opt.robe ?? 0xb8a070, mantle: 0x6a2a1a, sash: 0x2a1a10, beard: { len: .04 }, hairColor: 0x1a120a, skin: [0xa8714f, 0x9a6444, 0xb98260][(rnd() * 3) | 0] });
    h.arms[1].shoulder.rotation.set(-.3, 0, .2); h.arms[1].elbow.rotation.x = -.7;
    h.arms[0].shoulder.rotation.set(-.6, 0, -.2); h.arms[0].elbow.rotation.x = -1.1;
    // casco filisteo con penacho
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.11, .115, .05, 18), bronze); band.position.y = .07; h.head.add(band);
    for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(.015, .12, .015), std({ color: 0xe8dcc0 })); const a = i / 12 * Math.PI * 2; f.position.set(Math.cos(a) * .1, .15, Math.sin(a) * .1); h.head.add(f); }
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, 2.2, 6), wood); sp.position.set(.34, 1.1, .2); h.root.add(sp);
    const sh = shield(opt.big ? .55 : .32); sh.position.set(-.3, 1.0, .3); if (opt.big) sh.scale.set(1, 1, 1); h.root.add(sh);
    return bakeStatic(h.root);
  };
  const placeOne = (bk, px, pz) => { bk.position.set(px, 0, pz); bk.rotation.y = -Math.PI / 2; V.add(bk); addBox(px - .4, px + .4, pz - .4, pz + .4, 1.8); };
  placeOne(makeSoldier({ big: true }), gx - 1.6, gz + 1.8);   // el escudero
  // Ejército filisteo en formación (1 Samuel 17:1-3): una sola malla instanciada para que sea liviano
  const ranks = [];
  for (let row = 0; row < 4; row++) for (let i = 0; i < 9; i++) ranks.push([gx + 6 + row * 2.1 + (i % 2) * .3, gz - 12 + i * 3 + (row % 2) * 1.5, row]);
  // soldado sencillo (pocas caras) para el ejército del fondo
  const tpl = (() => {
    const g = new THREE.Group(); const skinM = std({ color: 0xa8714f, roughness: .6 }), robeM = std({ color: 0xa89060, roughness: .95 }), red = std({ color: 0x7a2a1a, roughness: .9 }), feather = std({ color: 0xe8dcc0 });
    const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); g.add(m); return m; };
    add(new THREE.CylinderGeometry(.17, .27, 1.3, 10), robeM, 0, .68, 0);
    add(new THREE.CylinderGeometry(.19, .17, .35, 10), red, 0, 1.38, 0);
    add(new THREE.CylinderGeometry(.05, .06, .12, 8), skinM, 0, 1.58, 0);
    add(new THREE.SphereGeometry(.11, 10, 8), skinM, 0, 1.7, .01);
    add(new THREE.SphereGeometry(.085, 8, 6, 0, Math.PI * 2, Math.PI * .5, Math.PI * .5), std({ color: 0x2a1a10 }), 0, 1.65, .03);
    add(new THREE.CylinderGeometry(.115, .115, .05, 12), bronze, 0, 1.78, 0);
    add(new THREE.CylinderGeometry(.12, .1, .13, 12, 1, true), feather, 0, 1.87, 0);
    for (const sx of [-1, 1]) { add(new THREE.CylinderGeometry(.045, .04, .55, 6), robeM, sx * .22, 1.2, .08, -.5, sx * .15); add(new THREE.SphereGeometry(.04, 6, 4), skinM, sx * .24, .98, .22); }
    add(new THREE.CylinderGeometry(.02, .025, 2.2, 5), wood, .3, 1.1, .2);
    add(new THREE.ConeGeometry(.04, .2, 5), iron, .3, 2.25, .2);
    add(new THREE.CylinderGeometry(.32, .32, .05, 14), bronze, -.27, 1.0, .3, Math.PI / 2);
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
    return bakeStatic(g);
  })();
  const o = new THREE.Object3D();
  tpl.children.forEach(m => {
    const im = new THREE.InstancedMesh(m.geometry, m.material, ranks.length);
    ranks.forEach(([px, pz, row], k) => { o.position.set(px, Math.max(0, (row - 1) * .35), pz); o.rotation.set(0, -Math.PI / 2 + (Math.sin(k * 7.3) * .15), 0); o.scale.setScalar(.96 + (k % 5) * .02); o.updateMatrix(); im.setMatrixAt(k, o.matrix); });
    im.castShadow = true; im.receiveShadow = true; V.add(im);
  });
  ranks.forEach(([px, pz]) => addBox(px - .35, px + .35, pz - .35, pz + .35, 1.8));
  // Nombre de Goliat
  const gl = nameSprite('GOLIAT', 'Gigante de Gat · filisteo'); gl.position.set(gx, 3.55, gz); gl.scale.set(2.2, .55, 1); V.add(gl);
  const fl = nameSprite('Los filisteos', 'Ejército enemigo'); fl.position.set(gx + 9, 3.2, gz); fl.scale.set(2.2, .55, 1); V.add(fl);
  const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0x7a8a4a, roughness: 1 })); hill.scale.set(16, 3, 30); hill.position.set(gx + 30, -.5, gz); V.add(hill);
  // Tiendas filisteas
  for (let i = 0; i < 5; i++) { const tnt = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.6, 6), std({ color: 0x8a3a2a, roughness: 1 })); tnt.position.set(gx + 19, 1.3, gz - 12 + i * 6); tnt.castShadow = true; V.add(tnt); addBox(gx + 17.5, gx + 20.5, gz - 13.5 + i * 6, gz - 10.5 + i * 6, 2.6); }

  // DAVID con su honda girando (animado)
  const dv = createHuman({ detail: .85, outfit: 'robe', robe: 0xd8c6a0, mantle: 0x8a5a2a, sash: 0x6a3a1a, hairColor: 0x8a4a22, hair: 'short', skin: 0xc68e6a, eye: 0x5a3a1a });
  dv.root.scale.setScalar(.95);
  const bag = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), std({ color: 0x7a5a3a })); bag.position.set(-.2, .95, .06); bag.scale.set(1, 1.2, .7); dv.root.add(bag); // bolsa de pastor
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, 1.6, 8), wood); staff.position.set(-.3, .8, .1); staff.rotation.z = .08; dv.root.add(staff);
  const dx = x - 9, dz = z;
  dv.root.position.set(dx, 0, dz); dv.root.rotation.y = Math.PI / 2; V.add(dv.root);
  addBox(dx - .4, dx + .4, dz - .4, dz + .4, 1.8);
  dv.arms[1].shoulder.rotation.set(-2.9, 0, .25); dv.arms[1].elbow.rotation.x = -.25;
  dv.arms[0].shoulder.rotation.set(.25, 0, -.12); dv.arms[0].elbow.rotation.x = -.5;
  const stone = new THREE.Mesh(new THREE.SphereGeometry(.05, 10, 8), std({ color: 0x8a8478 })); V.add(stone);
  const pouch = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), std({ color: 0x5a3a1e })); pouch.scale.y = .5; V.add(pouch);
  const ropeGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const rope = new THREE.Line(ropeGeo, new THREE.LineBasicMaterial({ color: 0x3a2a1a })); V.add(rope);
  const hp = new THREE.Vector3(), sp = new THREE.Vector3();
  V.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  {
    const arm = dv.arms[1].shoulder;
    const bakedDv = bakeStatic(dv.root, [arm]);
    const armSet = new Set(); arm.traverse(o => armSet.add(o));
    dv.root.traverse(o => { if (o.isMesh && !armSet.has(o)) o.visible = false; });
    dv.root.add(bakedDv);
  }
  blockers.push(hill);

  return {
    zones: [
      { id: 'goliat', name: 'David y Goliat', minX: x - 16, maxX: x + 24, minZ: z - 22, maxZ: z + 22, pri: 3,
        text: 'En el valle de Ela, el gigante Goliat de Gat, de seis codos y un palmo de alto, con casco de bronce, cota de malla y una lanza enorme, desafiaba al ejército de Israel. El joven pastor David escogió cinco piedras lisas del arroyo y, con su honda, lo enfrentó en el nombre del SEÑOR de los ejércitos. La batalla es del SEÑOR.',
        ref: '1 Samuel 17:4-7, 40-50' },
    ],
    davidSpot: [dx, dz], davidNPC: dv, goliathPos: [gx, gz], group: V,
    update(t, dt) {
      // honda girando sobre la cabeza
      dv.arms[1].shoulder.rotation.y = Math.sin(t * 9) * .25;
      dv.root.updateMatrixWorld(true);
      dv.arms[1].hand.getWorldPosition(hp);
      const a = t * 9;
      sp.set(hp.x + Math.cos(a) * .7, hp.y + .12, hp.z + Math.sin(a) * .7);
      stone.position.copy(sp); pouch.position.copy(sp);
      const pos = rope.geometry.attributes.position; pos.setXYZ(0, hp.x, hp.y, hp.z); pos.setXYZ(1, sp.x, sp.y, sp.z); pos.needsUpdate = true;
      dv.head.rotation.y = Math.sin(t * .8) * .08;
    },
  };
}
