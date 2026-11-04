import * as THREE from 'three';
import { createHuman, bakeStatic } from './human.js';
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

const SPECIES = {
  elefante: { len: 2.4, leg: 1.4, w: 1.6, color: 0x8a8a8e, neck: .2, head: .7, trunk: true, ears: true, tail: .5 },
  jirafa: { len: 1.5, leg: 1.8, w: .75, map: () => patches('#f2d79a', '#a0602a'), neck: 2.2, head: .32, horns: 'ossi', tail: .7 },
  leon: { len: 1.4, leg: .65, w: .65, color: 0xc8963c, neck: .25, head: .38, mane: 0x7a4a1a, tail: .8 },
  leona: { len: 1.3, leg: .62, w: .6, color: 0xcc9c48, neck: .25, head: .33, tail: .8 },
  cebra: { len: 1.4, leg: .95, w: .6, map: () => stripes('#f4f4f0', '#141414'), neck: .6, head: .35, mane: 0x111111, tail: .5 },
  camello: { len: 1.8, leg: 1.3, w: .8, color: 0xc49a62, neck: .9, head: .32, hump: true, tail: .4 },
  caballo: { len: 1.6, leg: 1.0, w: .65, color: 0x6a3a1e, neck: .7, head: .38, mane: 0x1a0e06, tail: .6 },
  oveja: { len: .9, leg: .4, w: .7, color: 0xf0ebe0, wool: true, neck: .15, head: .22, headColor: 0x2a2420, tail: .15 },
  oso: { len: 1.4, leg: .6, w: .9, color: 0x4a2e1a, neck: .2, head: .4, ears2: true, tail: .1 },
  mono: { len: .55, leg: .42, w: .38, color: 0x5a3a20, neck: .12, head: .24, headColor: 0xc89a70, ears2: true, tail: .9 },
  ciervo: { len: 1.2, leg: .9, w: .5, color: 0x9a6a3a, neck: .55, head: .28, horns: 'antler', tail: .2 },
};
export function makeAnimal(kind, scaleK = 1) {
  const s = SPECIES[kind];
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const mat = s.map ? std({ map: s.map(), roughness: .85 }) : std({ color: s.color, roughness: s.wool ? 1 : .8 });
  const dark = std({ color: 0x1a1410, roughness: .6 });
  const y0 = s.leg;
  // cuerpo
  const bg = s.wool ? new THREE.IcosahedronGeometry(s.w * .62, 1) : new THREE.CapsuleGeometry(s.w / 2, s.len, 8, 16);
  const b = new THREE.Mesh(bg, mat);
  if (s.wool) { b.scale.set(1, .9, s.len / s.w * 1.4); b.position.y = y0 + s.w * .35; }
  else { b.rotation.x = Math.PI / 2; b.position.y = y0 + s.w * .35; }
  body.add(b);
  if (s.hump) { const h = new THREE.Mesh(new THREE.SphereGeometry(s.w * .45, 14, 10), mat); h.position.set(0, y0 + s.w * .85, -.05); h.scale.y = .9; body.add(h); }
  // cuello y cabeza
  const front = s.len / 2 + s.w * .35;
  const neckAng = s.neck > 1 ? .25 : .7;
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(s.w * .18, s.w * .26, s.neck + s.w * .3, 10), mat);
  nk.position.set(0, y0 + s.w * .45 + Math.cos(neckAng) * s.neck / 2, front - s.w * .15 + Math.sin(neckAng) * s.neck / 2); nk.rotation.x = neckAng; body.add(nk);
  const hy = y0 + s.w * .45 + Math.cos(neckAng) * s.neck + s.head * .3, hz = front - s.w * .1 + Math.sin(neckAng) * s.neck + s.head * .3;
  const hm = new THREE.Mesh(new THREE.CapsuleGeometry(s.head * .42, s.head * .9, 6, 12), s.headColor ? std({ color: s.headColor, roughness: .7 }) : mat);
  hm.rotation.x = Math.PI / 2 + .35; hm.position.set(0, hy, hz); body.add(hm);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(s.head * .09, 8, 6), dark); e.position.set(sx * s.head * .34, hy + s.head * .2, hz + s.head * .15); body.add(e); }
  if (s.mane) { const m = new THREE.Mesh(new THREE.SphereGeometry(s.head * (kind === 'leon' ? 1.05 : .5), 14, 10), std({ color: s.mane, roughness: 1 })); m.position.set(0, hy - (kind === 'leon' ? .02 : -s.head * .3), hz - s.head * (kind === 'leon' ? .45 : .9)); if (kind !== 'leon') m.scale.set(.35, 1.6, 1.4); body.add(m); }
  if (s.trunk) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -.4, .25), new THREE.Vector3(0, -.9, .3), new THREE.Vector3(0, -1.15, .45)]);
    const tr = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, .12, 8), mat); tr.position.set(0, hy - .05, hz + s.head * .45); body.add(tr);
    for (const sx of [-1, 1]) { const tk = new THREE.Mesh(new THREE.ConeGeometry(.05, .55, 8), std({ color: 0xf3ecdc })); tk.position.set(sx * .18, hy - .35, hz + .35); tk.rotation.x = 2.3; body.add(tk); }
  }
  if (s.ears) for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.CircleGeometry(.55, 16), std({ color: 0x7e7e82, side: THREE.DoubleSide })); ear.position.set(sx * .45, hy + .05, hz - .25); ear.rotation.y = sx * 1.2; body.add(ear); }
  if (s.ears2) for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), mat); ear.position.set(sx * .2, hy + .25, hz - .05); body.add(ear); }
  if (s.horns === 'ossi') for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(.025, .03, .2, 6), dark); h.position.set(sx * .07, hy + .22, hz - .08); body.add(h); }
  if (s.horns === 'antler') for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(.22, .02, 6, 12, Math.PI), std({ color: 0xd8c8a0 })); a.position.set(sx * .12, hy + .32, hz - .05); a.rotation.set(0, sx * 1.2, 0); body.add(a); }
  if (s.tail) { const t = new THREE.Mesh(new THREE.CylinderGeometry(.02, .04, s.tail, 6), s.mane ? std({ color: s.mane }) : mat); t.position.set(0, y0 + s.w * .3 - s.tail / 2 + .1, -s.len / 2 - s.w * .45); t.rotation.x = -.35; body.add(t); }
  // patas animadas
  const legs = [];
  const lg = new THREE.CylinderGeometry(s.w * .13, s.w * .1, s.leg + s.w * .1, 8); lg.translate(0, -(s.leg + s.w * .1) / 2, 0);
  const legGeo = lg; // la pezuña se pinta con el mismo material (una sola pieza por pata)
  for (const [lx, lz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(lx * s.w * .3, y0 + s.w * .1, lz * s.len * .42);
    const leg = new THREE.Mesh(legGeo, mat); leg.castShadow = true; pivot.add(leg);
    g.add(pivot); legs.push(pivot);
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  // unir el cuerpo estático para rendimiento
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
export function buildArk({ group, addBox, addRamp, blockers, x, z, rnd }) {
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
    const bm = new THREE.Mesh(new THREE.BoxGeometry(.35, .35, inD), beam); bm.position.set(bx, doorY + inH - .2, inZ); A.add(bm);
    for (const sz of [-1, 1]) { const pst = new THREE.Mesh(new THREE.BoxGeometry(.3, inH, .3), beam); pst.position.set(bx, doorY + inH / 2, inZ + sz * (inD / 2 - 4.5)); A.add(pst); }
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
  pairs.forEach((pr, i) => pr.forEach((k, j) => {
    const a = (k === 'gallo' || k === 'gallina') ? makeBird(k) : makeAnimal(k); A.add(a);
    animals.push({ a, d: i * (total / pairs.length), side: j ? 1 : -1, kind: k, small: k === 'gallo' || k === 'gallina' || k === 'mono' || k === 'oveja' });
  }));
  // animales ya acomodados dentro del arca
  const inside = [];
  [['oveja', -30], ['caballo', -40], ['camello', -52], ['cebra', 30], ['jirafa', 42], ['elefante', 55], ['mono', -20], ['oso', 20]].forEach(([k, ox], i) => {
    for (const sd of [0, 1]) { const a = makeAnimal(k); a.position.set(x + ox + sd * 2.6, yA - .2, inZ + (i % 2 ? 1 : -1) * (inD / 2 - 2.2)); a.rotation.y = (i % 2 ? Math.PI : 0) + (sd ? .4 : -.3); A.add(a); inside.push(a); }
  });
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
    noahSpot: [x + 6, rampZ0 - 2], rainbow, lodItems: animals.map(o => o.a).concat(doves.map(d => d.d)), insideItems: inside, doorPos: [x, doorZ],
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
        o.a.userData.legs.forEach((l, i) => l.rotation.x = Math.sin(t * (o.small ? 11 : 6) + (i === 0 || i === 3 ? 0 : Math.PI)) * .45);
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
export function buildValley({ group, addBox, blockers, x, z, rnd }) {
  const bronze = std({ color: 0xb87333, metalness: .85, roughness: .35 });
  const iron = std({ color: 0x55585e, metalness: .8, roughness: .4 });
  const wood = std({ color: 0x6b4a2a, roughness: .8 });
  const V = new THREE.Group(); group.add(V);
  // Arroyo con piedras lisas (1 Samuel 17:40)
  const brook = new THREE.Mesh(new THREE.PlaneGeometry(3, 46), std({ color: 0x4f9ac4, metalness: .6, roughness: .1 })); brook.rotation.x = -Math.PI / 2; brook.position.set(x, .04, z); V.add(brook);
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
