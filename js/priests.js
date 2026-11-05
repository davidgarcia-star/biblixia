import * as THREE from 'three';
import { createHuman, animateHuman, bakeStatic } from './human.js';
import { pace } from './pace.js';
import { makeAnimal } from './scenes.js';
import { arkContents, arkGlassGold } from './arkcontents.js';

/* =========================================================
   SERVICIO DEL TABERNÁCULO (en todos los niveles)
   - Sacerdotes con túnica de lino, cinto y gorro (Éxodo 28:39-43)
   - Sacerdotes lavándose manos y pies en la fuente de bronce (Éxodo 30:17-21)
   - Corderos para el sacrificio junto al altar de bronce (Éxodo 29:38-42)
   - Levitas (hijos de Coat) llevando el arca del pacto sobre los hombros con sus varas (Números 4:15; 7:9; 1 Crónicas 15:15)
   - Levitas guardando la entrada del atrio (Números 3:7-8)
   ========================================================= */
const SKINS = [0xc68e6a, 0xa8714f, 0xb98260, 0x9a6444];
const priestLook = (r, k) => ({ outfit: 'robe', robe: 0xf4f0e6, mantle: null, sash: [0x1f3a8a, 0x5b2a7a, 0xb3122e][k % 3], hair: 'turban', cloth: 0xf4f0e6,
  beard: { color: [0x2a1a10, 0x3a2a1c, 0x5a4632][k % 3], len: .07 + r() * .06 }, hairColor: 0x2a1a10, skin: SKINS[k % 4], detail: .55, gender: 'm' });
const leviteLook = (r, k) => ({ outfit: 'robe', robe: [0xd8c9a8, 0xcbb994, 0xe6dcc6][k % 3], mantle: [0x6a3d24, 0x4a5a3a, 0x3e4f6b][k % 3], sash: 0x5a3a1e, hair: 'cloth', cloth: 0xe8dcc0,
  beard: { color: 0x2a1a10, len: .06 + r() * .05 }, hairColor: 0x2a1a10, skin: SKINS[(k + 1) % 4], detail: .5, gender: 'm' });

function arkOfCovenant() {
  // 2.5 × 1.5 × 1.5 codos (≈ 1.1 × .68 × .68 m), cubierta de oro, propiciatorio con dos querubines y dos varas (Éxodo 25:10-22)
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: 1, roughness: .22, emissive: 0x5a3800, emissiveIntensity: .35 });
  const wood = new THREE.MeshStandardMaterial({ color: 0xc89a3a, metalness: .8, roughness: .3 });
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  const body = add(new THREE.BoxGeometry(1.1, .62, .68), arkGlassGold(), 0, 0, 0); body.renderOrder = 2; g.add(arkContents(1.1, .62));
  add(new THREE.BoxGeometry(1.16, .06, .74), gold, 0, .34, 0);
  add(new THREE.BoxGeometry(1.16, .05, .74), gold, 0, -.3, 0);
  for (const sx of [-1, 1]) {
    const ch = new THREE.Group(); ch.position.set(sx * .4, .38, 0); ch.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(ch);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.07, .22, 4, 10), gold); body.position.y = .16; ch.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.06, 12, 10), gold); head.position.set(0, .3, .04); ch.add(head);
    for (const w of [-1, 1]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(.03, .26, .34), gold); wing.position.set(w * .1, .32, .12); wing.rotation.set(-.9, 0, w * .35); ch.add(wing); }
  }
  for (const sz of [-1, 1]) add(new THREE.CylinderGeometry(.025, .025, 2.9, 10), wood, 0, -.12, sz * .4).rotation.z = Math.PI / 2;
  return g;
}

export async function buildPriests({ group, tab, r, addBox }) {
  const live = [];
  const b = tab.bounds, [altX, cz, aw] = tab.altar || [(b.x0 + b.x1) / 2 + 8, (b.z0 + b.z1) / 2, 2.4], [lavX] = tab.laver || [altX - 6];
  const place = (look, x, z, ry, y = 0, solid = true) => { const h = createHuman(look); h.root.position.set(x, y, z); h.root.rotation.y = ry; group.add(h.root); if (solid && (x || z)) addBox(x - .3, x + .3, z - .3, z + .3, 1.8); return h; };
  const still = (look, x, z, ry, pose) => {
    const h = createHuman(look);
    if (pose === 'pray') for (const a of h.arms) { a.shoulder.rotation.x = -2.6; a.shoulder.rotation.z = a === h.arms[0] ? -.35 : .35; a.elbow.rotation.x = -.3; }
    if (pose === 'hold') for (const a of h.arms) { a.shoulder.rotation.x = -.6; a.elbow.rotation.x = -1.1; }
    const s = bakeStatic(h.root); s.position.set(x, 0, z); s.rotation.y = ry; group.add(s); addBox(x - .3, x + .3, z - .3, z + .3, 1.8); return s;
  };

  // Sacerdotes en la fuente de bronce (se lavan manos y pies)
  for (const sz of [-1, 1]) {
    const h = place(priestLook(r, sz > 0 ? 0 : 1), lavX, cz + sz * 1.25, sz > 0 ? Math.PI : 0);
    live.push({ h, kind: 'wash', ph: sz });
  }
  // Sacerdotes junto al altar con los corderos del sacrificio
  const ax = altX + aw + 1.4;
  live.push({ h: place(priestLook(r, 2), ax, cz - 1.6, -Math.PI / 2), kind: 'idle', ph: 0 });
  still(priestLook(r, 0), ax, cz + 1.8, -Math.PI / 2, 'hold');
  for (let k = 0; k < 3; k++) { await pace();
    const lamb = makeAnimal('oveja', .62); lamb.position.set(ax + 1.6 + (k % 2) * .9, 0, cz - 1 + k * 1); lamb.rotation.y = -Math.PI / 2 + (r() - .5) * .6; group.add(lamb);
    live.push({ o: lamb, kind: 'lamb', ph: k * 1.7 });
  }
  // Levitas guardando la entrada del atrio
  const [gx, gz] = tab.gate || [b.x1, cz];
  for (const sz of [-1, 1]) { still(leviteLook(r, sz > 0 ? 0 : 1), gx + 1.6, gz + sz * 4.4, Math.PI / 2); }
  // Levitas adorando con las manos levantadas cerca del atrio
  for (let k = 0; k < 3; k++) { await pace(); still(leviteLook(r, k + 2), gx + 3 + (k % 2) * .6, gz - 6.6 - k * 1.1, Math.PI / 2, 'pray'); }
  // ===== Procesión del arca del pacto, como en 1 Crónicas 15 (David la sube a Jerusalén) =====
  // Va lejos del arca de Noé: camina por el desierto, al norte del campamento.
  const ark = arkOfCovenant(); group.add(ark);
  const silver = new THREE.MeshStandardMaterial({ color: 0xdfe3ea, metalness: 1, roughness: .25 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xc58a3a, metalness: 1, roughness: .3, side: THREE.DoubleSide });
  const woodM = new THREE.MeshStandardMaterial({ color: 0x7a4a24, roughness: .7 });
  const strM = new THREE.MeshStandardMaterial({ color: 0xf2e6c0, roughness: .4 });
  // trompeta de plata (Números 10:2), sale de la boca hacia adelante
  const trumpet = h => { const tg = new THREE.Group(); tg.position.set(0, -.045, .09); tg.rotation.x = Math.PI / 2 - .35;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.011, .011, .62, 8), silver); tube.position.y = .31; tg.add(tube);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(.075, .014, .13, 14, 1, true), silver); bell.position.y = .66; tg.add(bell);
    h.head.add(tg); };
  // címbalos de bronce (1 Crónicas 15:19), uno en cada mano
  const cymbals = h => { for (const a of h.arms) { const c = new THREE.Mesh(new THREE.SphereGeometry(.11, 16, 6, 0, Math.PI * 2, 0, .5), bronze); c.scale.y = .5; c.position.set(0, -.07, 0); c.rotation.z = a === h.arms[0] ? -Math.PI / 2 : Math.PI / 2; a.hand.add(c); } };
  // lira / arpa (1 Crónicas 15:16, 21), en la mano izquierda
  const lyre = h => { const L = new THREE.Group(); L.position.set(0, -.06, .06); L.rotation.set(.3, 0, 0);
    for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(.012, .014, .42, 6), woodM); arm.position.set(sx * .09, .2, 0); arm.rotation.z = -sx * .18; L.add(arm); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .3, 6), woodM); top.rotation.z = Math.PI / 2; top.position.y = .4; L.add(top);
    const base = new THREE.Mesh(new THREE.BoxGeometry(.2, .05, .06), woodM); L.add(base);
    for (let k = 0; k < 6; k++) { const st = new THREE.Mesh(new THREE.CylinderGeometry(.002, .002, .38, 3), strM); st.position.set(-.06 + k * .024, .2, .01); L.add(st); }
    h.arms[0].hand.add(L); };
  // efod de lino de David (1 Crónicas 15:27; 2 Samuel 6:14)
  const ephod = h => { const e = new THREE.Mesh(new THREE.BoxGeometry(.3, .34, .03), new THREE.MeshStandardMaterial({ color: 0xfbf8ef, roughness: .8 })); e.position.set(0, .22, .135); h.spine.add(e);
    for (const sx of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.05, .02, .26), e.material); st.position.set(sx * .1, .43, 0); h.spine.add(st); } };
  const musicLook = (k, extra = {}) => ({ ...leviteLook(r, k), robe: 0xf4f0e6, mantle: null, sash: [0x1f3a8a, 0x5b2a7a, 0xb3122e][k % 3], ...extra }); // vestidos de lino fino (1 Crónicas 15:27)
  const members = [];
  const join = (look, role, off, lat, prop) => { const h = place(look, 0, 0, 0); if (prop) prop(h); members.push({ h, role, off, lat, ph: members.length * .7 }); return h; };
  // Delante: Quenanías, jefe del canto (15:22, 27)
  join(musicLook(0), 'lead', 22, 0);
  // Hemán, Asaf y Etán con címbalos de bronce (15:19)
  [-1.1, 0, 1.1].forEach((l, k) => join(musicLook(k + 1), 'cymbal', 19.5, l, cymbals));
  // levitas con arpas y liras (15:20-21)
  [-.7, .7].forEach((l, k) => join(musicLook(k + 2), 'lyre', 17, l, lyre));
  // David danzando con toda su fuerza delante del SEÑOR, con efod de lino (2 Samuel 6:14; 1 Crónicas 15:27, 29)
  join({ ...leviteLook(r, 1), robe: 0xfbf8ef, mantle: null, sash: 0xd4a72c, hair: 'short', hairColor: 0x5a2e14, beard: { color: 0x5a2e14, len: .06 }, skin: 0xc68e6a }, 'dance', 13.5, 0, ephod);
  // Berequías y Elcana, porteros del arca, delante (15:23)
  [-.7, .7].forEach((l, k) => join(leviteLook(r, k), 'walk', 10.5, l));
  // Siete sacerdotes tocando las trompetas delante del arca (15:24)
  [[8.2, -.9], [8.2, 0], [8.2, .9], [6.4, -.9], [6.4, 0], [6.4, .9], [4.6, 0]].forEach(([o, l], k) => join(priestLook(r, k), 'trumpet', o, l, trumpet));
  // Los levitas llevan el arca sobre los hombros con las varas (15:2, 15; Números 4:15; 7:9)
  const carriers = [];
  for (let k = 0; k < 4; k++) { await pace(); carriers.push(place(musicLook(k), 0, 0, 0)); }
  // Obed-edom y Jehías, porteros del arca, detrás (15:24)
  [-.7, .7].forEach((l, k) => join(leviteLook(r, k + 2), 'walk', -3.4, l));
  let path = { x0: b.x0 - 5.5, x1: b.x1 + 5.5, z0: b.z0 - 5.5, z1: b.z1 + 5.5 };
  let per = 2 * (path.x1 - path.x0) + 2 * (path.z1 - path.z0);
  const at = s => { s = ((s % per) + per) % per; const W = path.x1 - path.x0, H = path.z1 - path.z0;
    if (s < W) return [path.x0 + s, path.z0, 1, 0]; s -= W; if (s < H) return [path.x1, path.z0 + s, 0, 1]; s -= H; if (s < W) return [path.x1 - s, path.z1, -1, 0]; s -= W; return [path.x0, path.z1 - s, 0, -1]; };
  const proc = { s: 0, sp: .9 };
  const pathZone = () => ({ id: 'procesion-arca', name: 'Los levitas llevan el arca del pacto', minX: path.x0 - 6, maxX: path.x1 + 6, minZ: path.z0 - 6, maxZ: path.z1 + 6, pri: 3,
    text: 'David reunió a los sacerdotes y a los levitas para subir el arca del pacto. Solo los levitas debían llevarla: los hijos de los levitas la cargaron sobre los hombros con las varas, como Moisés había mandado. Delante iban los cantores con címbalos de bronce, arpas y liras; los porteros Berequías y Elcana delante del arca y Obed-edom y Jehías detrás; siete sacerdotes tocaban las trompetas delante del arca de Dios. David, vestido de lino fino con un efod de lino, danzaba con toda su fuerza delante del SEÑOR. ¡Nadie debía tocar el arca!',
    ref: '1 Crónicas 15:2-29; 2 Samuel 6:14; Números 4:15' });

  const tmp = new THREE.Vector3();
  return {
    // la procesión camina por el desierto, lejos del arca de Noé; devuelve la zona con su explicación
    setProcessionPath(p) { path = p; per = 2 * (path.x1 - path.x0) + 2 * (path.z1 - path.z0); return pathZone(); },
    update(dt, t, camPos) {
      const near = Math.hypot((b.x0 + b.x1) / 2 - camPos.x, (b.z0 + b.z1) / 2 - camPos.z) < 160;
      for (const l of live) { const o = l.h ? l.h.root : l.o; o.visible = near; }
      const pn = Math.hypot((path.x0 + path.x1) / 2 - camPos.x, (path.z0 + path.z1) / 2 - camPos.z) < 140;
      ark.visible = pn; for (const c of carriers) c.root.visible = pn; for (const m of members) m.h.root.visible = pn;
      if (!near && !pn) return;
      if (near) for (const l of live) {
        if (l.kind === 'wash') {
          animateHuman(l.h, dt, { speed: 0, onGround: true, vy: 0, land: 0, t });
          const w = Math.sin(t * 5 + l.ph) * .25;
          for (const [i, a] of l.h.arms.entries()) { a.shoulder.rotation.x = -1.05 + (i ? w : -w); a.shoulder.rotation.z = (i ? 1 : -1) * -.25; a.elbow.rotation.x = -.95; }
          l.h.spine.rotation.x = .35; l.h.head.rotation.x = .3;
        } else if (l.kind === 'idle') animateHuman(l.h, dt, { speed: 0, onGround: true, vy: 0, land: 0, t });
        else if (l.kind === 'lamb') { l.o.rotation.z = Math.sin(t * 1.3 + l.ph) * .02; l.o.position.y = Math.abs(Math.sin(t * .8 + l.ph)) * .01; }
      }
      if (!pn) return;
      proc.s += proc.sp * dt;
      const [x, z, dx, dz] = at(proc.s), hd = Math.atan2(dx, dz);
      ark.position.set(x, 1.48, z); ark.rotation.y = hd + Math.PI / 2;
      // cada levita en un extremo de las varas
      const fx = dx, fz = dz, rx = dz, rz = -dx;
      [[1.25, .4], [1.25, -.4], [-1.25, .4], [-1.25, -.4]].forEach(([f, s], i) => {
        const h = carriers[i]; h.root.position.set(x + fx * f + rx * s, 0, z + fz * f + rz * s); h.root.rotation.y = hd;
        animateHuman(h, dt, { speed: proc.sp * 1.2, onGround: true, vy: 0, land: 0, t });
        const a = h.arms[s > 0 ? 0 : 1]; a.shoulder.rotation.x = -2.5; a.shoulder.rotation.z = (s > 0 ? -1 : 1) * .25; a.elbow.rotation.x = -1.4;
      });
      // el resto de la procesión sigue el mismo camino
      for (const m of members) {
        const [mx, mz, mdx, mdz] = at(proc.s + m.off), h = m.h;
        h.root.position.set(mx + mdz * m.lat, 0, mz - mdx * m.lat); h.root.rotation.y = Math.atan2(mdx, mdz);
        if (m.role === 'dance') {
          // David salta y gira de gozo (2 Samuel 6:16)
          animateHuman(h, dt, { speed: proc.sp * 1.2, onGround: true, vy: 0, land: 0, t, praise: 1.2 });
          h.root.position.y = Math.abs(Math.sin(t * 4 + m.ph)) * .28; h.root.rotation.y += Math.sin(t * 1.3) * 1.2;
          continue;
        }
        animateHuman(h, dt, { speed: proc.sp * 1.2, onGround: true, vy: 0, land: 0, t });
        if (m.role === 'trumpet') for (const [i, a] of h.arms.entries()) { a.shoulder.rotation.x = -1.35; a.shoulder.rotation.z = (i ? 1 : -1) * -.45; a.elbow.rotation.x = -1.25; }
        else if (m.role === 'cymbal') { const c = Math.abs(Math.sin(t * 3.2 + m.ph)); for (const [i, a] of h.arms.entries()) { a.shoulder.rotation.x = -1.25; a.shoulder.rotation.z = (i ? 1 : -1) * (-.15 - c * .45); a.elbow.rotation.x = -.7; a.hand.rotation.z = (i ? 1 : -1) * .3; } }
        else if (m.role === 'lyre') { const [l, rr] = h.arms; l.shoulder.rotation.x = -.85; l.shoulder.rotation.z = .1; l.elbow.rotation.x = -1.1; rr.shoulder.rotation.x = -.9; rr.shoulder.rotation.z = .35; rr.elbow.rotation.x = -1.3 + Math.sin(t * 7 + m.ph) * .15; }
        else if (m.role === 'lead') { const a = h.arms[1]; a.shoulder.rotation.x = -2.5 + Math.sin(t * 3) * .2; a.shoulder.rotation.z = .3; a.elbow.rotation.x = -.3; }
      }
    },
  };
}
