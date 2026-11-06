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

export async function buildPlaces({ group, addBox, blockers, x0, x1, zN, zS, unlocked, rnd, levelNames }) {
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
    for (let k = 0; k < 6; k++) box(1, .5, .7, hay, px - 3 + k * 1.2, .25, pz - 2.4);
    addBox(px - 1, px + 1, pz - 1.3, pz - .3, 1.1);
    const mary = createHuman({ detail: .6, gender: 'f', outfit: 'robe', robe: 0x2a4a8a, mantle: 0x8ab0e0, sash: 0xe8dcc0, hair: 'cloth', cloth: 0x7aa0d8, hairColor: 0x2a1a10, skin: 0xb98260 });
    mary.arms[0].shoulder.rotation.set(-.5, 0, -.1); mary.arms[0].elbow.rotation.x = -.8; mary.arms[1].shoulder.rotation.set(-.5, 0, .1); mary.arms[1].elbow.rotation.x = -.8;
    const m1 = bakeStatic(mary.root); m1.position.set(px - 1.4, 0, pz - .6); m1.rotation.y = 1.1; S.add(m1);
    const jos = createHuman({ detail: .6, outfit: 'robe', robe: 0x8a6a3a, mantle: 0x5a3a1a, sash: 0x3a2a1a, beard: { len: .07 }, hairColor: 0x3a2412, skin: 0xa8714f });
    jos.arms[1].shoulder.rotation.set(-.3, 0, .25); jos.arms[1].elbow.rotation.x = -.5;
    const j1 = bakeStatic(jos.root); j1.position.set(px + 1.5, 0, pz - .4); j1.rotation.y = -1.1; S.add(j1);
    addBox(px - 1.8, px - 1, pz - 1, pz - .2, 1.8); addBox(px + 1.1, px + 1.9, pz - .8, pz, 1.8);
    for (let k = 0; k < 4; k++) { const sh = makeAnimal('oveja'); const sx3 = px - 6 + k * 3.5, sz3 = pz + 6 + (k % 2) * 2; sh.position.set(sx3, 0, sz3); sh.rotation.y = k; P.add(sh); addBox(sx3 - .6, sx3 + .6, sz3 - .6, sz3 + .6, 1); }
    // estrella
    const starSh = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + Math.PI / 2, r2 = k % 2 ? .45 : 1.2; k ? starSh.lineTo(Math.cos(a) * r2, Math.sin(a) * r2) : starSh.moveTo(Math.cos(a) * r2, Math.sin(a) * r2); }
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starSh, { depth: .25, bevelEnabled: false }), std({ color: 0xfff2b0, emissive: 0xffd34d, emissiveIntensity: 3 })); star.position.set(px, 13, pz); P.add(star); out.live.push({ kind: 'spin', obj: star });
    const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe9a0 })); sg.scale.set(9, 9, 1); sg.position.set(px, 13, pz); P.add(sg);
    out.zones.push({ id: 'belen', name: 'Belén: el nacimiento de Jesús', minX: px - w / 2, maxX: px + w / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'En Belén nació Jesús y fue acostado en un pesebre.',
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
        for (let j = 0; j < 4; j++) { const rb = box(1 + rnd() * 1.4, .6 + rnd() * .6, 1 + rnd(), wallM, mx + (rnd() - .5) * 3, .3, mz + (rnd() - .5) * 3); rb.rotation.set(rnd(), rnd() * 3, rnd() * .5); }
      } else {
        const wl = box(len + .3, Hh, 1.4, wallM, mx, Hh / 2, mz); wl.rotation.y = -Math.atan2(zB - zA, xB - xA);
        const cx2 = Math.cos(-wl.rotation.y), sx2 = Math.sin(-wl.rotation.y);
        addBox(mx - Math.abs(cx2) * len / 2 - .7, mx + Math.abs(cx2) * len / 2 + .7, mz - Math.abs(sx2) * len / 2 - .7, mz + Math.abs(sx2) * len / 2 + .7, Hh);
        if (k === 6) { // casa de Rahab sobre el muro
          const hs = box(3, 2.6, 2.6, std({ color: 0xc8a878, roughness: .95 }), mx, Hh + 1.3, mz); hs.rotation.y = wl.rotation.y;
          const cord = add(new THREE.CylinderGeometry(.04, .04, 5, 6), std({ color: 0xc8102e, emissive: 0x500010 }), mx, Hh - 1, mz - 1); cord.position.x += 0;
        }
      }
    }
    const house = std({ color: 0xc8a878, roughness: .95 });
    for (let k = 0; k < 7; k++) { const a = k * 2.1, rr = 4 + (k % 3) * 3; const hx = px + Math.cos(a) * rr, hz = pz + Math.sin(a) * rr * .7; box(3, 2.4 + (k % 2), 3, house, hx, 1.2, hz); addBox(hx - 1.5, hx + 1.5, hz - 1.5, hz + 1.5, 3); }
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
    out.zones.push({ id: 'babel', name: 'La torre de Babel', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'En Babel el SEÑOR confundió la lengua de los hombres que querían una torre hasta el cielo.',
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
      addBox(px + (sx < 0 ? -ww / 2 : gap / 2), px + (sx < 0 ? -gap / 2 : ww / 2), pz + 2 - L2 / 2, pz + 2 + L2 / 2, 999);
    }
    const sea = std({ color: 0xd8c49a, roughness: 1 });
    const path = new THREE.Mesh(new THREE.PlaneGeometry(gap, L2), sea); path.rotation.x = -Math.PI / 2; path.position.set(px, .12, pz + 2); P.add(path);
    for (let k = 0; k < 18; k++) { const st = add(new THREE.SphereGeometry(.2 + rnd() * .2, 8, 6), std({ color: 0x8a7a68 }), px + (rnd() - .5) * gap, .05, pz + 2 + (rnd() - .5) * L2); st.scale.y = .4; }
    // Moisés con la vara extendida
    const mo = createHuman({ detail: .6, outfit: 'robe', robe: 0xd8c9a8, mantle: 0x6a3d24, beard: { color: 0xe8e4dc, len: .16 }, hairColor: 0xe0dcd2, hair: 'long', age: 1, skin: 0xa8714f });
    mo.arms[1].shoulder.rotation.set(-2.4, 0, .2); mo.arms[1].elbow.rotation.x = -.2;
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(.02, .025, 1.9, 8), std({ color: 0x6b4a2a })); staff.position.set(0, -.3, .1); staff.rotation.x = -.3; mo.arms[1].hand.add(staff);
    const mb = bakeStatic(mo.root); mb.position.set(px, 0, zS - 14); mb.rotation.y = Math.PI; S.add(mb); addBox(px - .4, px + .4, zS - 14.4, zS - 13.6, 1.8);
    out.zones.push({ id: 'marrojo', name: 'El Mar Rojo abierto', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'El SEÑOR abrió el Mar Rojo e Israel lo cruzó en seco.',
      ref: 'Éxodo 14:21-22, 29-31' });
    out.coins.push([px, pz - 4, 0], [px, pz + 14, 0]);
    out.treasures.marrojo = [px, pz + 5, 0];
  }

  function calvario(px, pz, ww) {
    // Las tres cruces y la tumba vacía (Mateo 27:33; 28:6)
    const hill = add(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: 0x9a8a62, roughness: 1 }), px - 5, 0, pz - 6); hill.scale.set(12, 4, 10); blockers.push(hill);
    addBox(px - 13, px + 3, pz - 12, pz, 2.6);
    const wood = std({ color: 0x5a3a20, roughness: .9 });
    for (const [dx, h] of [[-4, 5], [0, 6], [4, 5]]) { box(.35, h, .35, wood, px - 5 + dx, 3.6 + h / 2 - .2, pz - 6); box(2.6, .3, .3, wood, px - 5 + dx, 3.6 + h - 1.3, pz - 6); }
    // tumba en la roca con la piedra removida
    const rock = std({ color: 0x8a8478, roughness: 1 });
    const tomb = box(9, 5, 6, rock, px + 8, 2.5, pz + 6); blockers.push(tomb); addBox(px + 3.5, px + 12.5, pz + 3, pz + 9, 5);
    box(2.2, 2.6, .2, std({ color: 0x050403 }), px + 8, 1.3, pz + 2.95);
    const st = add(new THREE.CylinderGeometry(1.6, 1.6, .5, 24), rock, px + 11.2, 1.6, pz + 2.6); st.rotation.x = Math.PI / 2; addBox(px + 10, px + 12.4, pz + 2.2, pz + 3, 3);
    const lg = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff3c8 })); lg.scale.set(5, 5, 1); lg.position.set(px + 8, 1.6, pz + 2.7); P.add(lg);
    // huerto
    for (let k = 0; k < 6; k++) { const tr = add(new THREE.IcosahedronGeometry(1.4, 1), std({ color: 0x3f6b2a, roughness: .9 }), px + 3 + k * 2.4, 2.6, pz + 12); add(new THREE.CylinderGeometry(.12, .16, 2, 6), wood, px + 3 + k * 2.4, 1, pz + 12); addBox(px + 2.8 + k * 2.4, px + 3.2 + k * 2.4, pz + 11.8, pz + 12.2, 4); }
    out.zones.push({ id: 'calvario', name: 'El Calvario y la tumba vacía', minX: px - ww / 2, maxX: px + ww / 2, minZ: zN, maxZ: zS, pri: 2,
      text: 'En el Calvario Jesús dio su vida por nosotros y al tercer día resucitó.',
      ref: 'Juan 19:17-18, 41-42; Mateo 28:1-6' });
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
