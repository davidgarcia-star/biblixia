import * as THREE from 'three';
import { createHuman, bakeStatic } from './human.js';
import { pace } from './pace.js';
import { makeAnimal } from './scenes.js';
import { nameSprite } from './characters.js';

/* =========================================================
   LUGARES BÍBLICOS (al norte de la ciudad). Algunos se abren al pasar niveles.
   req = cuántos niveles deben estar disponibles (save.unlocked) para entrar.
   ========================================================= */
const std = o => new THREE.MeshStandardMaterial(o);
function tex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8; return t;
}
const brickTex = (base, line, rep) => tex(256, 256, (g, W, H) => { g.fillStyle = base; g.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 32) for (let x = ((y / 32) % 2) * 32; x < W; x += 64) { g.fillStyle = `rgba(0,0,0,${.05 + Math.random() * .1})`; g.fillRect(x + 2, y + 2, 60, 28); } g.strokeStyle = line; g.lineWidth = 3; for (let y = 0; y < H; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); } for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); } }, rep);

export const PLACES = [
  { id: 'belen', name: 'Belén', req: 1 },
  { id: 'jerico', name: 'Jericó', req: 2 },
  { id: 'babel', name: 'La torre de Babel', req: 3 },
  { id: 'marrojo', name: 'El Mar Rojo', req: 4 },
  { id: 'calvario', name: 'El Calvario', req: 5 },
];

export async function buildPlaces({ group, addBox, addObb, blockers, x0, x1, zN, zS, unlocked, rnd, levelNames }) {
  const P = new THREE.Group(); group.add(P);
  const S = new THREE.Group(); // piezas fijas (se unen al final)
  const out = { zones: [], coins: [], treasures: {}, labels: [], places: [], live: [] };
  const n = PLACES.length, w = (x1 - x0) / n, cz = (zN + zS) / 2;
  const add = (geo, mat, x, y, z, live) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; (live ? P : S).add(m); return m; };
  const box = (sx, sy, sz, mat, x, y, z) => add(new THREE.BoxGeometry(sx, sy, sz), mat, x, y, z);
  const ground = std({ polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, map: tex(256, 256, g => { g.fillStyle = '#c9b48a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,240,200,.12)' : 'rgba(110,80,40,.12)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } }, [12, 6]), roughness: 1 });
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + 4, zS - zN + 4), ground); gp.rotation.x = -Math.PI / 2; gp.position.set((x0 + x1) / 2, .1, cz); gp.receiveShadow = true; P.add(gp);
  // separadores entre lugares (piedras bajas)
  const stone = std({ map: brickTex('#a89a82', 'rgba(70,60,45,.5)', [4, 1]), roughness: .95 });
  for (let i = 1; i < n; i++) { const sx = x0 + i * w; box(.8, .7, zS - zN - 30, stone, sx, .35, cz + 6); addBox(sx - .4, sx + .4, zN + 15, zS - 3, .7); }

  for (const [i, pl] of PLACES.entries()) { await pace();
    const px = x0 + w * (i + .5), locked = unlocked < pl.req;
    out.places.push({ ...pl, x: px, z: cz, locked, x0: x0 + w * i, x1: x0 + w * (i + 1) });
    const lab = nameSprite(pl.name, locked ? `🔒 Se abre al completar el nivel ${levelNames[pl.req - 2] || ''}` : 'Lugar bíblico'); lab.position.set(px, 9, zS - 6); lab.scale.set(5, 1.25, 1); P.add(lab);
    if (locked) {
      // barrera dorada con candado
      const bm = new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: .28, side: THREE.DoubleSide, depthWrite: false });
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.6, 6), bm); bar.position.set(px, 3, zS - 2); P.add(bar); out.live.push({ kind: 'barrier', obj: bar });
      addBox(x0 + w * i + .4, x0 + w * (i + 1) - .4, zS - 2.3, zS - 1.7, 999);
    }
    const B = { belen, jerico, babel, marrojo, calvario }[pl.id];
    B(px, cz, w, zN, zS, locked);
  }

  function belen(px, pz) {
    // Establo con pesebre (Lucas 2:7) y la estrella (Mateo 2:9)
    const wood = std({ color: 0x7a5232, roughness: .85 }), thatch = std({ color: 0xb89a5a, roughness: 1 }), hay = std({ color: 0xd8b04a, roughness: 1 });
    for (const [sx, sz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) box(.3, 4, .3, wood, px + sx, 2, pz + sz);
    const roof = add(new THREE.ConeGeometry(6.5, 2.4, 4, 1), thatch, px, 5.1, pz); roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, .95);
    box(8.6, 2.6, .25, wood, px, 1.3, pz - 3.1); box(.25, 2.6, 6.2, wood, px - 4.2, 1.3, pz); box(.25, 2.6, 6.2, wood, px + 4.2, 1.3, pz);
    addBox(px - 4.4, px + 4.4, pz - 3.3, pz - 2.9, 3); addBox(px - 4.4, px - 4, pz - 3.3, pz + 3, 3); addBox(px + 4, px + 4.4, pz - 3.3, pz + 3, 3);
    box(1.6, .6, .8, wood, px, .55, pz - .8); box(1.4, .25, .65, hay, px, .9, pz - .8);
    const baby = add(new THREE.CapsuleGeometry(.12, .35, 4, 10), std({ color: 0xf2ead8 }), px, 1.07, pz - .8); baby.rotation.z = Math.PI / 2;
    add(new THREE.SphereGeometry(.09, 12, 10), std({ color: 0xc8956a }), px + .3, 1.1, pz - .8);
    // «le envolvió en pañales» (Lucas 2:7): fajas de tela alrededor del niño
    { const faja = std({ color: 0xd9ccae, roughness: 1 }); for (const fx of [-.17, -.02, .13]) { const f = add(new THREE.TorusGeometry(.124, .014, 6, 18), faja, px + fx, 1.07, pz - .8); f.rotation.y = Math.PI / 2; } }
    for (let k = 0; k < 6; k++) box(1, .5, .7, hay, px - 3 + k * 1.2, .25, pz - 2.4);
    // paja suelta esparcida por el suelo del establo, caída del pesebre y de las pacas (Lucas 2:7); apenas sobre el piso de la escena (y = 0.1) para que no parpadee
    { const straw = std({ color: 0xe0bc5c, roughness: 1 }); let sd = 7; const sr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
      for (let k = 0; k < 28; k++) {
        const a = sr() * Math.PI * 2, d = .9 + sr() * 2.2, sx = px + Math.cos(a) * d * 1.4, sz = pz - .8 + Math.sin(a) * d * .7;
        if (Math.abs(sx - px) > 3.6 || sz < pz - 2.85 || sz > pz + 2.8) continue;
        const s = box(.32 + sr() * .3, .012, .025, straw, sx, .114 + (k % 3) * .004, sz); s.rotation.y = sr() * Math.PI;
      } }
    addBox(px - 1, px + 1, pz - 1.3, pz - .3, 1.1);
    const mary = createHuman({ detail: .6, gender: 'f', outfit: 'robe', robe: 0x2a4a8a, mantle: 0x8ab0e0, sash: 0xe8dcc0, hair: 'cloth', cloth: 0x7aa0d8, hairColor: 0x2a1a10, skin: 0xb98260 });
    mary.arms[0].shoulder.rotation.set(-.5, 0, -.1); mary.arms[0].elbow.rotation.x = -.8; mary.arms[1].shoulder.rotation.set(-.5, 0, .1); mary.arms[1].elbow.rotation.x = -.8;
    const m1 = bakeStatic(mary.root); m1.position.set(px - 1.4, 0, pz - .6); m1.rotation.y = 1.1; S.add(m1);
    const jos = createHuman({ detail: .6, outfit: 'robe', robe: 0x8a6a3a, mantle: 0x5a3a1a, sash: 0x3a2a1a, beard: { len: .07 }, hairColor: 0x3a2412, skin: 0xa8714f });
    jos.arms[1].shoulder.rotation.set(-.3, 0, .25); jos.arms[1].elbow.rotation.x = -.5;
    const j1 = bakeStatic(jos.root); j1.position.set(px + 1.5, 0, pz - .4); j1.rotation.y = -1.1; S.add(j1);
    addBox(px - 1.8, px - 1, pz - 1, pz - .2, 1.8); addBox(px + 1.1, px + 1.9, pz - .8, pz, 1.8);
    const ovejas = [];
    for (let k = 0; k < 4; k++) { const sh = makeAnimal('oveja'); const sx3 = px - 6 + k * 3.5, sz3 = pz + 6 + (k % 2) * 2; sh.position.set(sx3, 0, sz3); sh.rotation.y = k; P.add(sh); addBox(sx3 - .6, sx3 + .6, sz3 - .6, sz3 + .6, 1); ovejas.push({ o: sh, r0: k, per: 8 + k * 2.1, ph: k * 2.9 }); }
    // corderito junto a su madre que de vez en cuando da un saltito juguetón: «los collados como corderitos» (Salmo 114:4)
    const lamb = makeAnimal('oveja'); lamb.scale.setScalar(.55); const lx0 = px - .8, lz0 = pz + 8.7; lamb.position.set(lx0, 0, lz0); lamb.rotation.y = 2.4; P.add(lamb);
    addBox(lx0 - .35, lx0 + .35, lz0 - .35, lz0 + .35, .6);
    // las ovejas de los pastores no están quietas: de vez en cuando giran despacio en su sitio dando pasitos, como cuando pastan (Lucas 2:8)
    out.live.push({ kind: 'fn', update: t => {
      { const c = t % 3.7, hop = c < .9 ? Math.sin(c / .9 * Math.PI * 2) : 0, up = Math.max(0, hop);
        lamb.position.y = up * .22; lamb.rotation.x = c < .9 ? -hop * .12 : 0; lamb.rotation.y = 2.4 + Math.sin(t * .23) * .5;
        const legs = lamb.userData.legs; if (legs) legs.forEach((l, j) => { l.rotation.x = up * (j < 2 ? -.5 : .5); }); }
      for (const m of ovejas) {
        const c = (t + m.ph) % m.per, k = THREE.MathUtils.smoothstep(c, 0, 1.6), n = Math.floor((t + m.ph) / m.per), ang = q => m.r0 + (q % 2 ? .6 : 0);
        m.o.rotation.y = ang(n - 1) + (ang(n) - ang(n - 1)) * k;
        const paso = c < 1.6 ? Math.sin(c * 11) * .35 * Math.sin(c / 1.6 * Math.PI) : 0;
        const legs = m.o.userData.legs; if (legs) legs.forEach((l, j) => { l.rotation.x = (j === 0 || j === 3 ? 1 : -1) * paso; });
      }
    } });
    // pastores con su cayado que vinieron a ver al niño: «Vamos, pues, hasta Belén» (Lucas 2:15-16)
    const staffM = std({ color: 0x6b4a2a, roughness: .9 });
    for (const [sx4, sz4, robe, mantle, cloth, skin] of [[-2.9, 4.1, 0x8a7a5a, 0x5a4a32, 0xd8cdb0, 0xa8714f], [3.1, 4.4, 0x6a5a44, 0x9a8a6a, 0x8a3a2a, 0x8a5a3a]]) {
      const ps = createHuman({ detail: .6, outfit: 'robe', robe, mantle, sash: 0x3a2a1a, hair: 'cloth', cloth, beard: { len: .06 }, hairColor: 0x2a1a10, skin });
      ps.arms[1].shoulder.rotation.set(-.35, 0, .12); ps.arms[1].elbow.rotation.x = -.7;
      ps.arms[0].shoulder.rotation.set(-.2, 0, -.05); ps.arms[0].elbow.rotation.x = -.3;
      // cayado: vara recta con la curva arriba
      const st = new THREE.Mesh(new THREE.CylinderGeometry(.022, .026, 1.9, 8), staffM); st.position.set(-.34, .95, .3); ps.root.add(st);
      const hook = new THREE.Mesh(new THREE.TorusGeometry(.1, .022, 6, 12, Math.PI), staffM); hook.position.set(-.24, 1.9, .3); ps.root.add(hook);
      const pb = bakeStatic(ps.root); const gx = px + sx4, gz = pz + sz4; pb.position.set(gx, 0, gz); pb.rotation.y = Math.atan2(px - gx, pz - .8 - gz); S.add(pb);
      addBox(gx - .4, gx + .4, gz - .4, gz + .4, 1.8);
    }
    // lámpara de aceite de barro sobre el muro del establo, con llama que titila
    {
      const clay = std({ color: 0x9a5a34, roughness: .9 }), lx = px + 2.4, ly = 2.6, lz = pz - 3.1;
      const lamp = add(new THREE.SphereGeometry(.13, 12, 8), clay, lx, ly + .06, lz); lamp.scale.set(1.3, .5, 1);
      const spout = add(new THREE.CylinderGeometry(.03, .045, .14, 8), clay, lx + .17, ly + .08, lz); spout.rotation.z = Math.PI / 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(.035, .12, 8), new THREE.MeshBasicMaterial({ color: 0xffc04a }));
      flame.position.set(lx + .25, ly + .15, lz); P.add(flame);
      const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffa040, opacity: .8 }));
      fg.scale.set(1.1, 1.1, 1); fg.position.set(lx + .25, ly + .16, lz); P.add(fg);
      out.live.push({ kind: 'fn', update: t => { const f = .85 + Math.sin(t * 11) * .08 + Math.sin(t * 17.3) * .07; flame.scale.set(1, f, 1); fg.material.opacity = .55 + f * .3; } });
    }
    // fogata de los pastores junto al rebaño: «velaban y guardaban las vigilias de la noche sobre su rebaño» (Lucas 2:8)
    {
      const fx0 = px + 8.4, fz0 = pz + 7, fy = .1; // lejos de la moneda (px + 8, pz + 3) y de las ovejas
      const stone = std({ color: 0x7c766c, roughness: 1 }), log = std({ color: 0x5a3a22, roughness: .95 }), coal = std({ color: 0x2a1a12, emissive: 0xff5a1a, emissiveIntensity: .9, roughness: 1 });
      const stG = new THREE.DodecahedronGeometry(.16, 0);
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; const s = add(stG, stone, fx0 + Math.cos(a) * .62, fy + .08, fz0 + Math.sin(a) * .62); s.scale.set(1.1, .7, 1); s.rotation.set(k, k * 1.7, 0); }
      add(new THREE.CylinderGeometry(.42, .42, .04, 14), coal, fx0, fy + .03, fz0);
      for (let k = 0; k < 3; k++) { const l = add(new THREE.CylinderGeometry(.06, .07, .9, 7), log, fx0, fy + .16, fz0); l.rotation.set(Math.PI / 2 - .35, k / 3 * Math.PI * 2, 0, 'YXZ'); }
      const fm = new THREE.MeshBasicMaterial({ color: 0xffa23a, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false });
      const fm2 = new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false });
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(.26, .75, 9), fm); f1.position.set(fx0, fy + .5, fz0); P.add(f1);
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(.14, .45, 8), fm2); f2.position.set(fx0, fy + .4, fz0); P.add(f2);
      const fgl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xff8a30, opacity: .7 }));
      fgl.scale.set(3, 3, 1); fgl.position.set(fx0, fy + .55, fz0); P.add(fgl);
      addBox(fx0 - .75, fx0 + .75, fz0 - .75, fz0 + .75, .5);
      // humo gris que sube de la fogata, se ensancha y se desvanece (5 sprites reutilizados, sin luces nuevas)
      const humo = [];
      for (let k = 0; k < 5; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, color: 0x8a847c, opacity: 0 })); s.position.set(fx0, fy + .9, fz0); P.add(s); humo.push(s); }
      out.live.push({ kind: 'fn', update: t => {
        const a = .85 + Math.sin(t * 9.1) * .1 + Math.sin(t * 15.7) * .07, b = .9 + Math.sin(t * 12.3 + 1) * .1;
        f1.scale.set(1 + Math.sin(t * 7) * .06, a, 1); f1.rotation.y = t * .8; f2.scale.set(1, b, 1);
        fgl.material.opacity = .5 + a * .25; fgl.scale.set(2.8 + a * .4, 2.8 + a * .4, 1);
        for (let k = 0; k < humo.length; k++) {
          const c = ((t / 4.5) + k / humo.length) % 1, s = humo[k], sz = .5 + c * 1.6;
          s.position.set(fx0 + Math.sin(t * .4 + k) * .25 + c * .6, fy + .9 + c * 3.2, fz0 + c * .3);
          s.scale.set(sz, sz, 1); s.material.opacity = Math.sin(c * Math.PI) * .32;
        }
      } });
    }
    // estrella
    const starSh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, r2 = k % 2 ? .45 : 1.2; k ? starSh.lineTo(Math.cos(a) * r2, Math.sin(a) * r2) : starSh.moveTo(Math.cos(a) * r2, Math.sin(a) * r2); }
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starSh, { depth: .25, bevelEnabled: false }), std({ color: 0xfff2b0, emissive: 0xffd34d, emissiveIntensity: 3 })); star.position.set(px, 13, pz); P.add(star); out.live.push({ kind: 'spin', obj: star });
    const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9a0 })); sg.scale.set(9, 9, 1); sg.position.set(px, 13, pz); P.add(sg);
    // haz de luz suave que baja de la estrella sobre el establo: «se detuvo sobre el lugar donde estaba el niño» (Mateo 2:9)
    const beamG = new THREE.CylinderGeometry(.25, 2.6, 6.6, 24, 1, true);
    { const pos = beamG.attributes.position, col = new Float32Array(pos.count * 3); for (let k = 0; k < pos.count; k++) { const v = .35 + .65 * (pos.getY(k) / 6.6 + .5); col[k * 3] = v; col[k * 3 + 1] = v * .92; col[k * 3 + 2] = v * .6; } beamG.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
    const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: true }));
    beam.position.set(px, 13 - 3.4, pz); beam.renderOrder = 2; P.add(beam);
    // la estrella titila: su resplandor late suave y el haz de luz «respira» (Mateo 2:9-10)
    out.live.push({ kind: 'fn', update: t => { const tw = 1 + Math.sin(t * 2.1) * .07 + Math.sin(t * 5.3) * .04; sg.scale.set(9 * tw, 9 * tw, 1); sg.material.opacity = .82 + (tw - 1) * 1.6; beam.material.opacity = .13 + (tw - 1) * .35 + .03; } });
    out.zones.push({ id: 'belen', name: 'Belén: el nacimiento de Jesús', minX: px - w / 2, maxX: px + w / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'En Belén nació Jesús: María «le envolvió en pañales y le acostó en un pesebre».',
      ref: 'Miqueas 5:2; Lucas 2:4-14; Mateo 2:9-11' });
    out.coins.push([px - 8, pz + 10, 0], [px + 8, pz + 3, 0]);
    out.treasures.belen = [px + 2.5, pz + 1.5, 0];
  }

  function jerico(px, pz, ww) {
    // Murallas que cayeron (Josué 6:20) y la casa de Rahab con el cordón escarlata (Josué 2:18)
    const wallM = std({ map: brickTex('#b49a72', 'rgba(80,60,40,.5)', [6, 1]), roughness: .95 });
    const R = Math.min(ww / 2 - 4, 18), Hh = 6;
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2, a2 = (k + 1) / 24 * Math.PI * 2, xA = px + Math.cos(a) * R, zA = pz + Math.sin(a) * R * .8, xB = px + Math.cos(a2) * R, zB = pz + Math.sin(a2) * R * .8;
      const len = Math.hypot(xB - xA, zB - zA), mx = (xA + xB) / 2, mz = (zA + zB) / 2;
      const fallen = k % 3 !== 0 && !(k === 6 || k === 7);
      if (fallen) {
        // piedras caídas del muro: ahora son sólidas (antes no tenían choque y el jugador las atravesaba)
        for (let j = 0; j < 4; j++) {
          const w = 1 + rnd() * 1.4, h = .6 + rnd() * .6, d = 1 + rnd(), bx = mx + (rnd() - .5) * 3, bz = mz + (rnd() - .5) * 3;
          const rb = box(w, h, d, wallM, bx, .3, bz), rx = rnd(), ry = rnd() * 3, rz = rnd() * .5;
          rb.rotation.order = 'YXZ'; rb.rotation.set(rx, ry, rz);
          const hx = Math.abs(w / 2 * Math.cos(rz)) + Math.abs(h / 2 * Math.sin(rz)), hz = Math.abs(d / 2 * Math.cos(rx)) + Math.abs(h / 2 * Math.sin(rx));
          const top = .3 + Math.abs(h / 2 * Math.cos(rx) * Math.cos(rz)) + Math.abs(d / 2 * Math.sin(rx)) + Math.abs(w / 2 * Math.sin(rz));
          if (addObb) addObb(bx, bz, ry, hx * .9, hz * .9, top); else addBox(bx - hx, bx + hx, bz - hz, bz + hz, top);
        }
      } else {
        const wl = box(len + .3, Hh, 1.4, wallM, mx, Hh / 2, mz); wl.rotation.y = -Math.atan2(zB - zA, xB - xA);
        // choque girado igual que el muro (antes era una caja recta que dejaba huecos y paredes invisibles)
        if (addObb) addObb(mx, mz, wl.rotation.y, (len + .3) / 2, .7, Hh);
        else { const cx2 = Math.cos(-wl.rotation.y), sx2 = Math.sin(-wl.rotation.y); addBox(mx - Math.abs(cx2) * len / 2 - .7, mx + Math.abs(cx2) * len / 2 + .7, mz - Math.abs(sx2) * len / 2 - .7, mz + Math.abs(sx2) * len / 2 + .7, Hh); }
        if (k === 6) { // casa de Rahab sobre el muro
          const hs = box(3, 2.6, 2.6, std({ color: 0xc8a878, roughness: .95 }), mx, Hh + 1.3, mz); hs.rotation.y = wl.rotation.y;
          // ventana por la que bajó a los espías y el cordón escarlata atado a ella, por fuera del muro (Josué 2:15, 18)
          const rg = new THREE.Group(); rg.position.set(mx, 0, mz); rg.rotation.y = wl.rotation.y; P.add(rg);
          const out2 = (Math.sin(wl.rotation.y) * (mx - px) + Math.cos(wl.rotation.y) * (mz - pz)) >= 0 ? 1 : -1;
          const win = new THREE.Mesh(new THREE.BoxGeometry(.7, .6, .06), std({ color: 0x2a1c12, roughness: 1 })); win.position.set(0, Hh + 1.5, out2 * 1.32); rg.add(win);
          const sill = new THREE.Mesh(new THREE.BoxGeometry(.85, .08, .16), std({ color: 0x8a6a44, roughness: .9 })); sill.position.set(0, Hh + 1.18, out2 * 1.36); rg.add(sill);
          const piv = new THREE.Group(); piv.position.set(0, Hh + 1.2, out2 * 1.4); rg.add(piv);
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 5.4, 6), std({ color: 0xc8102e, emissive: 0x500010 })); cord.position.y = -2.7; piv.add(cord);
          out.live.push({ kind: 'fn', update: t => { piv.rotation.x = -out2 * (.05 + Math.sin(t * 1.3) * .035 + Math.sin(t * 2.9) * .015); piv.rotation.z = Math.sin(t * .9) * .03; } });
        }
      }
    }
    const house = std({ color: 0xc8a878, roughness: .95 });
    // casas de adobe con azotea plana rodeada de un pretil (Deuteronomio 22:8), puerta de madera mirando a la plaza y una ventanita
    const doorM = std({ color: 0x5a3a22, roughness: .9 }), holeM = std({ color: 0x241810, roughness: 1 }), lintelM = std({ color: 0x7a5634, roughness: .9 });
    for (let k = 0; k < 7; k++) {
      const a = k * 2.1, rr = 4 + (k % 3) * 3; const hx = px + Math.cos(a) * rr, hz = pz + Math.sin(a) * rr * .7, hh = 2.4 + (k % 2), top = 1.2 + hh / 2;
      box(3, hh, 3, house, hx, 1.2, hz); addBox(hx - 1.5, hx + 1.5, hz - 1.5, hz + 1.5, top + .32); // choque a la altura real (antes 3 m: se flotaba sobre las casas bajas)
      box(3, .32, .14, house, hx, top + .16, hz - 1.43); box(3, .32, .14, house, hx, top + .16, hz + 1.43);       // pretil (frente y fondo)
      box(.14, .32, 2.72, house, hx - 1.43, top + .16, hz); box(.14, .32, 2.72, house, hx + 1.43, top + .16, hz);  // pretil (lados)
      const dx = px - hx, dz = pz - hz, alongX = Math.abs(dx) > Math.abs(dz), sg = alongX ? Math.sign(dx) || 1 : Math.sign(dz) || 1;
      const face = 1.5 + .025;                                    // un poco por fuera de la pared: sin parpadeo
      if (alongX) {
        box(.05, 1.75, .9, doorM, hx + sg * face, .875 + .1, hz);   // puerta
        box(.09, .14, 1.15, lintelM, hx + sg * (face + .02), 1.9, hz); // dintel de madera
        box(.05, .4, .45, holeM, hx + sg * face, Math.min(top - .55, 2.1), hz + (k % 2 ? 1 : -1) * .95); // ventanita
      } else {
        box(.9, 1.75, .05, doorM, hx, .875 + .1, hz + sg * face);
        box(1.15, .14, .09, lintelM, hx, 1.9, hz + sg * (face + .02));
        box(.45, .4, .05, holeM, hx + (k % 2 ? 1 : -1) * .95, Math.min(top - .55, 2.1), hz + sg * face);
      }
    }
    out.zones.push({ id: 'jerico', name: 'Jericó', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'Por la fe cayeron los muros de Jericó después de rodearlos siete días.',
      ref: 'Josué 2:18-21; 6:15-25; Hebreos 11:30-31' });
    out.coins.push([px, pz + 2, 0], [px - 9, pz - 6, 0]);
    out.treasures.jerico = [px + 2, pz - 3, 0];
  }

  function babel(px, pz, ww) {
    // Zigurat de ladrillo cocido y betún (Génesis 11:3-4)
    const bm = std({ map: brickTex('#a8643a', 'rgba(60,30,15,.6)', [6, 3]), roughness: .95 });
    let s0 = Math.min(ww - 10, 30), y = 0;
    for (let k = 0; k < 6; k++) {
      const sz = s0 * (1 - k * .15), h2 = 4.2 - k * .3;
      const tier = box(sz, h2, sz * .85, bm, px, y + h2 / 2, pz); if (k === 0) addBox(px - sz / 2, px + sz / 2, pz - sz * .425, pz + sz * .425, h2);
      blockers.push(tier);
      y += h2;
    }
    // andamios: la torre quedó sin terminar
    const scaf = std({ color: 0x7a5232, roughness: .8 });
    for (let k = 0; k < 6; k++) box(.15, 4, .15, scaf, px - 4 + k * 1.6, y + 2, pz - 3);
    box(9, .15, .15, scaf, px, y + 3.6, pz - 3);
    // Ladrillos cocidos apilados y una vasija de asfalto junto a la base (Génesis 11:3)
    const fz = pz + s0 * .425 + 2.6;
    const brickM = std({ color: 0xa8582e, roughness: .95 }), brickM2 = std({ color: 0x8e4524, roughness: .95 });
    for (const sx of [-1, 1]) {
      const bx = px + sx * s0 * .28;
      for (let ly = 0; ly < 4; ly++) for (let ix = 0; ix < 3; ix++) for (let iz = 0; iz < 2; iz++) {
        if (ly === 3 && (ix + iz) % 2) continue; // la capa de arriba queda incompleta
        const rot = ly % 2; // las capas se cruzan como en una pila real
        const b = box(rot ? .26 : .52, .2, rot ? .52 : .26, (ix + iz + ly) % 3 ? brickM : brickM2,
          bx + (rot ? (ix - 1) * .28 : (ix - 1) * .54), .1 + ly * .205, fz + (rot ? (iz - .5) * .54 : (iz - .5) * .28));
        b.castShadow = ly === 3;
      }
      addBox(bx - .85, bx + .85, fz - .55, fz + .55, .85);
    }
    const potX = px + s0 * .28 + 1.6;
    add(new THREE.CylinderGeometry(.38, .3, .55, 14), std({ color: 0x6e4a2c, roughness: .9 }), potX, .275, fz);
    const pitch = add(new THREE.CircleGeometry(.34, 14), std({ color: 0x0c0a08, roughness: .15, metalness: .1 }), potX, .53, fz);
    pitch.rotation.x = -Math.PI / 2;
    addBox(potX - .4, potX + .4, fz - .4, fz + .4, .6);
    out.zones.push({ id: 'babel', name: 'La torre de Babel', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'Usaron ladrillo en lugar de piedra y asfalto en lugar de mezcla, pero el SEÑOR confundió su lengua cuando quisieron una torre hasta el cielo.',
      ref: 'Génesis 11:1-9' });
    out.coins.push([px - s0 / 2 - 3, pz + 6, 0], [px + s0 / 2 + 3, pz - 6, 0]);
    out.treasures.babel = [px, pz + s0 * .45 + 2, 0];
  }

  function marrojo(px, pz, ww) {
    // El mar abierto en dos con paredes de agua y camino en seco (Éxodo 14:21-22)
    const water = std({ color: 0x2a7ab0, roughness: .05, metalness: .3, transparent: true, opacity: .78 });
    const L2 = zS - zN - 26, gap = 7;
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(ww / 2 - gap / 2 - 1, 9, L2, 6, 6, 12), water);
      const pa = wall.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { const yy = pa.getY(i); if (yy > 0) pa.setX(i, pa.getX(i) + Math.sin(pa.getZ(i) * .3) * .4); }
      wall.geometry.computeVertexNormals();
      wall.position.set(px + sx * (gap / 2 + (ww / 2 - gap / 2 - 1) / 2), 4.5, pz + 2); P.add(wall); out.live.push({ kind: 'wave', obj: wall, base: 4.5 });
      { // espuma blanca en la cresta de cada pared: «se amontonaron las aguas… se cuajaron los abismos» (Éxodo 15:8)
        const Wd = ww / 2 - gap / 2 - 1, n = Math.max(12, Math.floor(L2 / .7));
        const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), std({ color: 0xf4fbff, emissive: 0x9fc4dc, emissiveIntensity: .15, roughness: .9, transparent: true, opacity: .9 }), n);
        foam.castShadow = foam.receiveShadow = false; foam.raycast = () => {}; foam.frustumCulled = false;
        const dm = new THREE.Object3D(), fd = [];
        for (let i = 0; i < n; i++) {
          const z = -L2 / 2 + (i + .5) * (L2 / n), x = -sx * Wd / 2 + Math.sin(z * .3) * .4 + sx * (.1 + rnd() * .45);
          fd.push({ x, z: z + (rnd() - .5) * .3, s: .3 + rnd() * .35, ph: rnd() * 6.28 });
        }
        const upd = t => { for (let i = 0; i < n; i++) { const q = fd[i], k = 1 + Math.sin(t * 2.2 + q.ph) * .14; dm.position.set(q.x, 4.47 + Math.sin(t * 1.7 + q.ph) * .05, q.z); dm.scale.set(q.s * 1.2 * k, q.s * .38 * k, q.s * 2.1); dm.updateMatrix(); foam.setMatrixAt(i, dm.matrix); } foam.instanceMatrix.needsUpdate = true; };
        upd(0); wall.add(foam); out.live.push({ kind: 'fn', update: upd });
      }
      addBox(px + (sx < 0 ? -ww / 2 : gap / 2), px + (sx < 0 ? -gap / 2 : ww / 2), pz + 2 - L2 / 2, pz + 2 + L2 / 2, 999);
    }
    // peces que nadan dentro de las paredes de agua, a la vista desde el camino seco (Éxodo 15:8)
    const fishGeo = new THREE.SphereGeometry(.22, 10, 6).scale(.45, .55, 1.6), tailGeo = new THREE.ConeGeometry(.17, .3, 4).rotateX(-Math.PI / 2).scale(.25, 1, 1);
    const fishMats = [0xc9d3dc, 0xe0a040, 0x5a7f9a, 0xd8664a].map(c => std({ color: c, roughness: .4, metalness: .25 }));
    const fishes = [];
    for (let k = 0; k < 14; k++) {
      const sx = k % 2 ? 1 : -1, f = new THREE.Group(), m = fishMats[k % fishMats.length];
      const body = new THREE.Mesh(fishGeo, m), tail = new THREE.Mesh(tailGeo, m); tail.position.z = -.42; f.add(body, tail);
      const sc = .8 + rnd() * .7; f.scale.setScalar(sc); f.traverse(o => { o.castShadow = false; });
      P.add(f);
      fishes.push({ f, tail, x: px + sx * (gap / 2 + .5 + rnd() * 1.6), y: 1.2 + rnd() * 6, z0: pz + 2, L: L2 / 2 - 3, ph: rnd() * 6.28, sp: (.06 + rnd() * .05) * (rnd() < .5 ? 1 : -1) });
    }
    out.live.push({ kind: 'fn', update(t) {
      for (const q of fishes) {
        const a = t * q.sp + q.ph, z = q.z0 + Math.sin(a) * q.L, dir = Math.cos(a) * Math.sign(q.sp) >= 0 ? 1 : -1;
        q.f.position.set(q.x + Math.sin(t * .7 + q.ph) * .15, q.y + Math.sin(t * 1.1 + q.ph) * .25, z);
        q.f.rotation.y = dir > 0 ? 0 : Math.PI; q.tail.rotation.y = Math.sin(t * 9 + q.ph) * .45;
      }
    } });
    const sea = std({ color: 0xd8c49a, roughness: 1 });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(gap, L2), sea); path.rotation.x = -Math.PI / 2; path.position.set(px, .12, pz + 2); P.add(path);
    for (let k = 0; k < 18; k++) { const st = add(new THREE.SphereGeometry(.2 + rnd() * .2, 8, 6), std({ color: 0x8a7a68 }), px + (rnd() - .5) * gap, .05, pz + 2 + (rnd() - .5) * L2); st.scale.y = .4; }
    // Moisés con la vara extendida
    const mo = createHuman({ detail: .6, outfit: 'robe', robe: 0xd8c9a8, mantle: 0x6a3d24, beard: { color: 0xe8e4dc, len: .16 }, hairColor: 0xe0dcd2, hair: 'long', age: 1, skin: 0xa8714f });
    mo.arms[1].shoulder.rotation.set(-2.4, 0, .2); mo.arms[1].elbow.rotation.x = -.2;
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, 1.9, 8), std({ color: 0x6b4a2a })); staff.position.set(0, -.3, .1); staff.rotation.x = -.3; mo.arms[1].hand.add(staff);
    const mb = bakeStatic(mo.root); mb.position.set(px, 0, zS - 14); mb.rotation.y = Math.PI; S.add(mb); addBox(px - .4, px + .4, zS - 14.4, zS - 13.6, 1.8);
    { // la columna de nube y de fuego se puso detrás de Israel, entre ellos y los egipcios (Éxodo 14:19-20, 24)
      const cx = px + Math.min(ww * .3, 7), czp = zS - 8, col = new THREE.Group(); col.position.set(cx, 0, czp); P.add(col);
      const cloudM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, emissive: 0xfff4dc, emissiveIntensity: .25, roughness: 1, transparent: true, opacity: .5, depthWrite: false });
      const fireM = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending });
      const puffs = [];
      const puffG = new THREE.SphereGeometry(1, 14, 10);
      for (let k = 0; k < 11; k++) {
        const r0 = 1.05 + Math.sin(k * 1.7) * .3, m = new THREE.Mesh(puffG, cloudM);
        m.position.y = 1 + k * 1.25; m.scale.set(r0, r0 * 1.25, r0 * (.9 + Math.cos(k * 2.3) * .12)); m.userData.a = k * 2.4;
        m.castShadow = m.receiveShadow = false; m.raycast = () => {}; col.add(m); puffs.push(m);
      }
      const core = new THREE.Mesh(new THREE.CylinderGeometry(.45, .7, 13, 12, 1, true), fireM); core.position.y = 7; core.raycast = () => {}; col.add(core);
      out.live.push({ kind: 'fn', update(t) {
        col.rotation.y = t * .25;
        for (let k = 0; k < puffs.length; k++) { const q = puffs[k]; q.position.x = Math.sin(t * .6 + q.userData.a) * .35; q.position.z = Math.cos(t * .5 + q.userData.a * 1.3) * .35; }
        fireM.opacity = .35 + Math.sin(t * 2.3) * .08 + Math.sin(t * 5.1) * .04;
      } });
    }
    out.zones.push({ id: 'marrojo', name: 'El Mar Rojo abierto', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'El SEÑOR abrió el Mar Rojo e Israel lo cruzó en seco.',
      ref: 'Éxodo 14:19-22, 29-31' });
    out.coins.push([px, pz - 4, 0], [px, pz + 14, 0]);
    out.treasures.marrojo = [px, pz + 5, 0];
  }

  function calvario(px, pz, ww) {
    // Las tres cruces y la tumba vacía (Mateo 27:33; 28:6)
    const hill = add(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0x9a8a62, roughness: 1 }), px - 5, 0, pz - 6); hill.scale.set(12, 4, 10); blockers.push(hill);
    addBox(px - 13, px + 3, pz - 12, pz, 2.6);
    const wood = std({ color: 0x5a3a20, roughness: .9 });
    for (const [dx, h] of [[-4, 5], [0, 6], [4, 5]]) { box(.35, h, .35, wood, px - 5 + dx, 3.6 + h / 2 - .2, pz - 6); box(2.6, .3, .3, wood, px - 5 + dx, 3.6 + h - 1.3, pz - 6); }
    // letrero sobre la cruz de Jesús: «JESÚS EL NAZARENO, EL REY DE LOS JUDÍOS» (Juan 19:19-20, en hebreo, latín y griego)
    const titT = tex(512, 160, (g, W, H) => {
      g.fillStyle = '#e9dcbc'; g.fillRect(0, 0, W, H); g.strokeStyle = '#6b4a2a'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      g.fillStyle = '#2a1a0e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 34px serif'; g.fillText('ישוע הנצרי מלך היהודים', W / 2, 36);
      g.font = 'bold 40px serif'; g.fillText('I · N · R · I', W / 2, 82);
      g.font = 'bold 19px serif'; g.fillText('JESÚS EL NAZARENO, EL REY DE LOS JUDÍOS', W / 2, 126);
    }); titT.wrapS = titT.wrapT = THREE.ClampToEdgeWrapping;
    box(1.5, .48, .06, std({ map: titT, roughness: .9 }), px - 5, 3.6 + 6 - .55, pz - 6 + .21);
    // tumba en la roca con la piedra removida
    const rock = std({ color: 0x8a8478, roughness: 1 });
    const tomb = box(9, 5, 6, rock, px + 8, 2.5, pz + 6); blockers.push(tomb); addBox(px + 3.5, px + 12.5, pz + 3, pz + 9, 5);
    box(2.2, 2.6, .2, std({ color: 0x050403 }), px + 8, 1.3, pz + 2.95);
    const st = add(new THREE.CylinderGeometry(1.6, 1.6, .5, 24), rock, px + 11.2, 1.6, pz + 2.6); st.rotation.x = Math.PI / 2; addBox(px + 10, px + 12.4, pz + 2.2, pz + 3, 3);
    const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff3c8 })); lg.scale.set(5, 5, 1); lg.position.set(px + 8, 1.6, pz + 2.7); P.add(lg);
    { // el ángel vestido de blanco junto al sepulcro vacío señala la entrada: «No está aquí, porque ha resucitado» (Mateo 28:2-6)
      const ax = px + 9.75, az = pz + 1.55; // entre la entrada y la piedra removida, lejos del tesoro
      const an = createHuman({ detail: .6, outfit: 'robe', robe: 0xfbfaf4, mantle: 0xf1ead2, sash: 0xe8c860, hairColor: 0xe9cf8c, hair: 'long', skin: 0xd9a77e });
      an.arms[1].shoulder.rotation.set(-.35, 0, 1.15); an.arms[1].elbow.rotation.x = -.15; // brazo extendido hacia la entrada de la tumba
      an.arms[0].shoulder.rotation.set(-.5, 0, -.12); an.arms[0].elbow.rotation.x = -1.1;  // la otra mano al pecho
      const ab = bakeStatic(an.root); ab.position.set(ax, 0, az); ab.rotation.y = Math.PI; S.add(ab); addBox(ax - .35, ax + .35, az - .35, az + .35, 1.8);
      // alas blancas: dos plumajes planos a la espalda que se mecen despacio (sin sombras, una sola geometría)
      const wsh = new THREE.Shape(); wsh.moveTo(0, 0); wsh.bezierCurveTo(.35, .55, .95, .85, 1.25, .75); wsh.bezierCurveTo(1.05, .45, .95, .05, .7, -.45);
      wsh.bezierCurveTo(.5, -.75, .25, -.85, .12, -.7); wsh.lineTo(0, 0);
      const wG = new THREE.ShapeGeometry(wsh, 12), wM = std({ color: 0xffffff, emissive: 0xfff6dc, emissiveIntensity: .35, roughness: .8, side: THREE.DoubleSide });
      const wings = new THREE.Group(); wings.position.set(ax, 1.32, az + .12); wings.rotation.y = Math.PI; P.add(wings);
      const ws = [];
      for (const sx of [-1, 1]) { const piv = new THREE.Group(); piv.position.x = sx * .06; const w = new THREE.Mesh(wG, wM); w.scale.set(sx * .62, .62, .62); w.castShadow = w.receiveShadow = false; w.raycast = () => {}; piv.add(w); wings.add(piv); ws.push([piv, sx]); }
      const ag = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff1c8, opacity: .55 }));
      ag.scale.set(3, 3.6, 1); ag.position.set(ax, 1.15, az + .25); ag.raycast = () => {}; P.add(ag);
      out.live.push({ kind: 'fn', update: t => { const f = Math.sin(t * 1.4) * .12; for (const [piv, sx] of ws) piv.rotation.y = sx * (.55 + f); ag.material.opacity = .45 + Math.sin(t * 1.1) * .1; } });
    }
    // huerto
    for (let k = 0; k < 6; k++) { const tr = add(new THREE.IcosahedronGeometry(1.4, 1), std({ color: 0x3f6b2a, roughness: .9 }), px + 3 + k * 2.4, 2.6, pz + 12); add(new THREE.CylinderGeometry(.12, .16, 2, 6), wood, px + 3 + k * 2.4, 1, pz + 12); addBox(px + 2.8 + k * 2.4, px + 3.2 + k * 2.4, pz + 11.8, pz + 12.2, 4); }
    // flores silvestres en el huerto junto al sepulcro (Juan 19:41): pocas instancias, un solo dibujado por color
    {
      const stemG = new THREE.CylinderGeometry(.02, .02, .3, 4); stemG.translate(0, .15, 0);
      const headG = new THREE.IcosahedronGeometry(.09, 0); headG.translate(0, .32, 0);
      const stems = new THREE.InstancedMesh(stemG, std({ color: 0x4f7a32, roughness: 1 }), 36);
      const heads = [0xffffff, 0xf3d24a, 0xd9608a].map(c => new THREE.InstancedMesh(headG, std({ color: c, roughness: .8 }), 12));
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), v = new THREE.Vector3();
      for (let k = 0; k < 36; k++) {
        const fx = px + 2 + ((k * 37) % 100) / 100 * 13, fz = pz + 10 + ((k * 53) % 100) / 100 * 4;
        e.set((((k * 17) % 10) - 5) * .03, k * 1.7, 0); q.setFromEuler(e); const sc = .8 + ((k * 29) % 10) / 20; s.set(sc, sc, sc); v.set(fx, 0, fz);
        m4.compose(v, q, s); stems.setMatrixAt(k, m4); heads[k % 3].setMatrixAt((k / 3) | 0, m4);
      }
      for (const im of [stems, ...heads]) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); P.add(im); }
    }
    out.zones.push({ id: 'calvario', name: 'El Calvario y la tumba vacía', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'En el Calvario Jesús dio su vida por nosotros y al tercer día resucitó.',
      ref: 'Juan 19:17-19, 41-42; Mateo 28:1-6' });
    out.coins.push([px - 5, pz - 6, 2.6], [px + 8, pz - 2, 0]);
    out.treasures.calvario = [px + 4, pz + 1, 0];
  }

  S.updateMatrixWorld(true);
  P.add(bakeStatic(S));
  return out;
}

let _glow = null;
function glowT() {
  if (_glow) return _glow;
  _glow = tex(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,245,210,1)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  return _glow;
}
