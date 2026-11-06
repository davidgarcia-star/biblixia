import * as THREE from 'three';
import { arkContents, arkGlassGold } from './arkcontents.js';
import { bakeStatic, createHuman } from './human.js';
import { pace } from './pace.js';
import { makeAnimal } from './scenes.js';

/* =========================================================
   EL TABERNÁCULO (Éxodo 25–27; 30; 36–40)
   Escala ampliada para el juego: 1 codo = 0,8 m (proporciones exactas). Entrada al oriente (+X). Norte = −Z.
   ========================================================= */
export const C = 0.8;

function tex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 8;
  return t;
}
function cherub(g, x, y, s, color) {
  g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = color; g.strokeStyle = color; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, 6, 5, 11, 0, 0, 7); g.fill();          // cuerpo
  g.beginPath(); g.arc(0, -9, 5, 0, 7); g.fill();                      // cabeza
  for (const s2 of [-1, 1]) {                                          // alas
    g.beginPath(); g.moveTo(s2 * 3, -2);
    g.quadraticCurveTo(s2 * 22, -26, s2 * 30, -6); g.quadraticCurveTo(s2 * 20, -8, s2 * 26, 6); g.quadraticCurveTo(s2 * 14, 2, s2 * 4, 6); g.closePath(); g.fill();
  }
  g.restore();
}
function embroidered(withCherubim, vertical = true) {
  return tex(512, 512, (g, W, H) => {
    const cols = ['#20408f', '#5b2a7a', '#b3122e', '#efe8d8'];
    const n = 16;
    for (let i = 0; i < n; i++) { g.fillStyle = cols[i % 4]; vertical ? g.fillRect(i * W / n, 0, W / n + 1, H) : g.fillRect(0, i * H / n, W, H / n + 1); }
    for (let i = 0; i < 9000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
    if (withCherubim) for (let y = 70; y < H; y += 150) for (let x = 64; x < W; x += 128) cherub(g, x + (y % 300 ? 64 : 0) % W, y, 1.6, '#e6c25a');
    g.strokeStyle = '#d9b44a'; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
  });
}

export async function buildTabernacle({ group, addBox, blockers, cx, cz }) {
  const M = {
    linen: new THREE.MeshStandardMaterial({ map: tex(256, 256, (g, W, H) => { g.fillStyle = '#f3efe4'; g.fillRect(0, 0, W, H); g.strokeStyle = 'rgba(120,110,90,.12)'; for (let i = 0; i < W; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); } }, [4, 1]), roughness: .95, side: THREE.DoubleSide }),
    screen: new THREE.MeshStandardMaterial({ map: embroidered(false), roughness: .9, side: THREE.DoubleSide }),
    veil: new THREE.MeshStandardMaterial({ map: embroidered(true), roughness: .9, side: THREE.DoubleSide }),
    ceiling: new THREE.MeshStandardMaterial({ map: embroidered(true, false), roughness: .9, side: THREE.DoubleSide }),
    gold: new THREE.MeshStandardMaterial({ color: 0xf2c14e, metalness: 1, roughness: .22 }),
    goldBoards: new THREE.MeshStandardMaterial({ color: 0xe5b443, metalness: 1, roughness: .3, map: tex(256, 256, (g, W, H) => { g.fillStyle = '#e8c068'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(90,60,10,.5)'; for (let i = 0; i < W; i += W / 3) g.fillRect(i, 0, 3, H); g.fillRect(0, H * .25, W, 6); g.fillRect(0, H * .5, W, 6); g.fillRect(0, H * .75, W, 6); }, [7, 1]) }),
    bronze: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: .9, roughness: .38 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 1, roughness: .2 }),
    acacia: new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: .7 }),
    skins: new THREE.MeshStandardMaterial({ color: 0x4b4038, roughness: 1, side: THREE.DoubleSide }),
    ram: new THREE.MeshStandardMaterial({ color: 0x8a2018, roughness: .9, side: THREE.DoubleSide }),
    goat: new THREE.MeshStandardMaterial({ color: 0x2a2522, roughness: 1, side: THREE.DoubleSide }),
    bread: new THREE.MeshStandardMaterial({ color: 0xd9a35b, roughness: .85 }),
    water: new THREE.MeshStandardMaterial({ color: 0x6fb3d2, metalness: .9, roughness: .05 }),
    fire: new THREE.MeshStandardMaterial({ color: 0xff7a1a, emissive: 0xff5a00, emissiveIntensity: 3 }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffd070 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9 }),
  };
  const T = new THREE.Group(); group.add(T);
  const S = new THREE.Group(); // piezas estáticas: se unen al final para mejor rendimiento
  const add = (geo, mat, x, y, z, opt = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = opt.cast !== false; m.receiveShadow = true; (opt.live ? T : S).add(m); if (opt.block) blockers.push(m); return m; };
  const box = (w, h, d, mat, x, y, z, opt) => add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, opt);
  const cyl = (r, h, mat, x, y, z, seg = 16) => add(new THREE.CylinderGeometry(r, r, h, seg), mat, x, y, z);
  const zones = [];

  /* ---------------- ATRIO: 100 × 50 codos, 60 columnas, cortinas de 5 codos ---------------- */
  const LX = 100 * C, LZ = 50 * C, HH = 5 * C;
  const x0 = cx - LX / 2, x1 = cx + LX / 2, z0 = cz - LZ / 2, z1 = cz + LZ / 2;
  const gateHalf = 10 * C;              // puerta de 20 codos
  const pillar = (x, z) => {
    box(.38, .2, .38, M.bronze, x, .1, z);                 // basa de bronce
    cyl(.09, HH, M.acacia, x, HH / 2, z, 10);
    box(.24, .14, .24, M.silver, x, HH + .02, z);          // capitel/moldura de plata
    addBox(x - .2, x + .2, z - .2, z + .2, HH + .1);
  };
  const posts = [];
  for (let i = 0; i <= 20; i++) { posts.push([x0 + i * 5 * C, z0], [x0 + i * 5 * C, z1]); }
  for (let j = 1; j < 10; j++) { posts.push([x0, z0 + j * 5 * C], [x1, z0 + j * 5 * C]); }
  for (const [x, z] of posts) { pillar(x, z); await pace(); }               // 42 + 18 = 60 columnas
  // Cortinas laterales
  const hang = (ax, az, bx, bz, mat = M.linen) => {
    const len = Math.hypot(bx - ax, bz - az);
    const p = add(new THREE.PlaneGeometry(len, HH - .25), mat, (ax + bx) / 2, (HH - .25) / 2 + .18, (az + bz) / 2);
    p.rotation.y = Math.atan2(-(bz - az), bx - ax);
    if (mat.map) { p.material = mat.clone(); p.material.map = mat.map.clone(); p.material.map.repeat.set(len / 2.5, 1); p.material.map.needsUpdate = true; }
    // varillas de plata
    const rod = add(new THREE.CylinderGeometry(.025, .025, len, 6), M.silver, (ax + bx) / 2, HH - .05, (az + bz) / 2); rod.rotation.z = Math.PI / 2; rod.rotation.y = p.rotation.y;
  };
  hang(x0, z0, x1, z0); hang(x0, z1, x1, z1); hang(x0, z0, x0, z1);
  hang(x1, z0, x1, cz - gateHalf); hang(x1, cz + gateHalf, x1, z1);
  addBox(x0 - .06, x1 + .06, z0 - .06, z0 + .06, HH); addBox(x0 - .06, x1 + .06, z1 - .06, z1 + .06, HH);
  addBox(x0 - .06, x0 + .06, z0, z1, HH); addBox(x1 - .06, x1 + .06, z0, cz - gateHalf, HH); addBox(x1 - .06, x1 + .06, cz + gateHalf, z1, HH);
  // Cortina de la puerta (azul, púrpura, carmesí y lino), recogida a los lados para poder entrar
  for (const s of [-1, 1]) {
    const w = 3.0, zc = cz + s * (gateHalf - w / 2);
    const p = add(new THREE.PlaneGeometry(w, HH - .25), M.screen, x1, (HH - .25) / 2 + .18, zc); p.rotation.y = Math.PI / 2;
    addBox(x1 - .08, x1 + .08, zc - w / 2, zc + w / 2, HH);
  }
  zones.push({ id: 'atrio', name: 'El atrio', minX: x0, maxX: x1, minZ: z0, maxZ: z1, pri: 0,
    text: 'El atrio medía 100 codos de largo y 50 de ancho. Lo rodeaban cortinas de lino fino torcido de 5 codos de alto, colgadas de 60 columnas con basas de bronce y ganchos y molduras de plata.', ref: 'Éxodo 27:9-18' });
  zones.push({ id: 'puerta', name: 'La puerta del atrio', minX: x1 - 2, maxX: x1 + 3, minZ: cz - gateHalf, maxZ: cz + gateHalf, pri: 1,
    text: 'La única entrada, al oriente: una cortina de 20 codos de azul, púrpura, carmesí y lino fino torcido, obra de recamador, sobre 4 columnas. Hay un solo camino para acercarse a Dios.', ref: 'Éxodo 27:16; Juan 10:9' });

  /* ---------------- ALTAR DE BRONCE: 5 × 5 × 3 codos con cuernos ---------------- */
  const altX = cx + LX / 4, aw = 5 * C, ah = 3 * C;
  box(aw, ah, aw, M.bronze, altX, ah / 2, cz);
  box(aw * .9, .06, aw * .9, M.fire, altX, ah + .01, cz, { cast: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const h = add(new THREE.ConeGeometry(.1, .3, 8), M.bronze, altX + sx * (aw / 2 - .1), ah + .15, cz + sz * (aw / 2 - .1)); }
  box(aw + .1, .08, .05, M.bronze, altX, ah * .5, cz - aw / 2 - .02); box(aw + .1, .08, .05, M.bronze, altX, ah * .5, cz + aw / 2 + .02); // rejilla
  for (const sz of [-1, 1]) { const pole = add(new THREE.CylinderGeometry(.04, .04, aw + 1.2, 8), M.bronze, altX, ah * .45, cz + sz * (aw / 2 + .12)); pole.rotation.z = Math.PI / 2; }
  addBox(altX - aw / 2, altX + aw / 2, cz - aw / 2, cz + aw / 2, ah);
  // Fuego vivo y humo del holocausto que sube al cielo (Levítico 1:9; 6:13)
  const smokeTex = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(235,232,228,.7)'); gr.addColorStop(.55, 'rgba(200,196,190,.3)'); gr.addColorStop(1, 'rgba(190,186,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const smoke = [], smokeCol = new THREE.Color();
  for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 2; T.add(s); smoke.push({ s, k: i / 12, dx: Math.sin(i * 2.1) * .5, dz: Math.cos(i * 1.3) * .5 }); }
  const tongueM = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: .85, depthWrite: false });
  const tongues = [];
  for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.16 + (i % 3) * .05, .7, 6).translate(0, .35, 0), tongueM); f.position.set(altX + Math.sin(i * 2.4) * aw * .3, ah + .04, cz + Math.cos(i * 1.7) * aw * .3); f.castShadow = false; T.add(f); tongues.push(f); }
  zones.push({ id: 'altar', name: 'El altar de bronce', minX: altX - 3, maxX: altX + 3, minZ: cz - 3, maxZ: cz + 3, pri: 2,
    text: 'Altar de madera de acacia cubierto de bronce, de 5 codos de largo y ancho y 3 de alto, con un cuerno en cada esquina y una rejilla de bronce. Allí se ofrecían los holocaustos. El fuego se mantenía encendido continuamente sobre el altar; no se apagaba. Apunta a Cristo, el Cordero de Dios.', ref: 'Éxodo 27:1-8; Levítico 6:13; Juan 1:29' });

  /* ---------------- FUENTE DE BRONCE ---------------- */
  const lavX = cx + 10 * C;
  add(new THREE.CylinderGeometry(.35, .5, .7, 20), M.bronze, lavX, .35, cz);
  add(new THREE.LatheGeometry([[0, 0], [.3, .02], [.75, .2], [.85, .42], [.8, .45]].map(([x, y]) => new THREE.Vector2(x, y)), 32), M.bronze, lavX, .7, cz);
  add(new THREE.CircleGeometry(.76, 32), M.water, lavX, 1.08, cz).rotation.x = -Math.PI / 2;
  addBox(lavX - .8, lavX + .8, cz - .8, cz + .8, 1.15);
  // Ondas suaves en el agua donde el sacerdote se lava las manos (Éxodo 30:18-21)
  const ripples = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 28), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(lavX + .3 - i * .06, 1.088, cz + (i - 1) * .12); r.renderOrder = 2; r.castShadow = r.receiveShadow = false; T.add(r); ripples.push({ r, k: i / 3 }); }
  zones.push({ id: 'fuente', name: 'La fuente de bronce', minX: lavX - 2, maxX: lavX + 2, minZ: cz - 2, maxZ: cz + 2, pri: 2,
    text: 'Entre la tienda y el altar estaba la fuente de bronce con su base, llena de agua, para que Aarón y sus hijos lavaran sus manos y sus pies antes de ministrar.', ref: 'Éxodo 30:17-21; 38:8' });

  /* ---------------- LA TIENDA: 30 × 10 × 10 codos ---------------- */
  const tx0 = cx - 30 * C, tx1 = cx, tz0 = cz - 5 * C, tz1 = cz + 5 * C, TH = 10 * C, wallT = .22;
  // tablas de acacia cubiertas de oro con basas de plata
  const wallN = box(tx1 - tx0, TH, wallT, M.goldBoards, (tx0 + tx1) / 2, TH / 2, tz0 - wallT / 2, { block: true });
  const wallS = box(tx1 - tx0, TH, wallT, M.goldBoards, (tx0 + tx1) / 2, TH / 2, tz1 + wallT / 2, { block: true });
  const wallW = box(wallT, TH, tz1 - tz0 + wallT * 2, M.goldBoards, tx0 - wallT / 2, TH / 2, cz, { block: true });
  box(tx1 - tx0, .18, wallT + .06, M.silver, (tx0 + tx1) / 2, .09, tz0 - wallT / 2); box(tx1 - tx0, .18, wallT + .06, M.silver, (tx0 + tx1) / 2, .09, tz1 + wallT / 2);
  addBox(tx0 - wallT, tx1, tz0 - wallT, tz0, TH); addBox(tx0 - wallT, tx1, tz1, tz1 + wallT, TH); addBox(tx0 - wallT, tx0, tz0, tz1, TH);
  // techo interior: cortinas de lino con querubines
  const ceil = add(new THREE.PlaneGeometry(tx1 - tx0, tz1 - tz0), M.ceiling, (tx0 + tx1) / 2, TH - .02, cz, { cast: false }); ceil.rotation.x = Math.PI / 2;
  ceil.material = M.ceiling.clone(); ceil.material.map = M.ceiling.map.clone(); ceil.material.map.repeat.set(4, 1.4); ceil.material.map.needsUpdate = true;
  // cubiertas exteriores: pelo de cabra, pieles de carnero teñidas de rojo y pieles de marsopa
  const cover = (mat, pad, drop, y) => {
    const w = tx1 - tx0 + pad, d = tz1 - tz0 + pad * 2;
    box(w, .06, d, mat, (tx0 + tx1) / 2 - pad / 2, y, cz, { block: true });
    for (const s of [-1, 1]) box(w, drop, .04, mat, (tx0 + tx1) / 2 - pad / 2, y - drop / 2, cz + s * d / 2, { block: true });
    box(.04, drop, d, mat, tx0 - pad, y - drop / 2, cz, { block: true });
  };
  cover(M.goat, .55, TH - .3, TH + .1);
  cover(M.ram, .65, TH - 1.6, TH + .17);
  cover(M.skins, .72, TH - 1.9, TH + .24);
  // Entrada: 5 columnas cubiertas de oro con basas de bronce y cortina (recogida)
  for (let i = 0; i < 5; i++) { await pace();
    const z = tz0 + (i / 4) * (tz1 - tz0);
    box(.3, .18, .3, M.bronze, tx1, .09, z); cyl(.09, TH, M.gold, tx1, TH / 2, z, 12); box(.2, .14, .2, M.gold, tx1, TH, z);
    if (i !== 2) addBox(tx1 - .15, tx1 + .15, z - .15, z + .15, TH);
  }
  const eh = 5 * C; for (const s of [-1, 1]) { const p = add(new THREE.PlaneGeometry(eh - .9, TH - .3), M.screen, tx1 + .05, (TH - .3) / 2 + .15, cz + s * (eh + .9) / 2); p.rotation.y = Math.PI / 2; }
  const lintel = add(new THREE.PlaneGeometry(tz1 - tz0, .9), M.screen, tx1 + .05, TH - .45, cz); lintel.rotation.y = Math.PI / 2;

  /* ---------------- LUGAR SANTO: 20 codos ---------------- */
  const veilX = tx0 + 10 * C;
  // Mesa de los panes de la Presencia (lado norte): 2 × 1 × 1,5 codos, 12 panes en dos hileras de seis
  const tbX = veilX + 4.5, tbZ = tz0 + 1.1;
  box(2 * C, .06, 1 * C, M.gold, tbX, 1.5 * C, tbZ);
  box(2 * C + .06, .05, 1 * C + .06, M.gold, tbX, 1.5 * C + .05, tbZ);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(.025, 1.5 * C, M.gold, tbX + sx * (C - .06), .75 * C, tbZ + sz * (C / 2 - .05), 8);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) { const b = add(new THREE.CylinderGeometry(.16, .17, .05, 18), M.bread, tbX + sx * .24, 1.5 * C + .06 + k * .055, tbZ); b.scale.set(1, 1, .75); }
  addBox(tbX - .55, tbX + .55, tbZ - .3, tbZ + .3, .8);
  // Candelabro de oro puro (lado sur): 7 lámparas
  const lampGlowMat = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,220,140,.7)'); gr.addColorStop(.35, 'rgba(255,170,60,.25)'); gr.addColorStop(1, 'rgba(255,140,40,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  })();
  const mnX = veilX + 4.5, mnZ = tz1 - 1.1, mH = 1.55;
  add(new THREE.CylinderGeometry(.12, .2, .12, 20), M.gold, mnX, .06, mnZ);
  cyl(.035, mH, M.gold, mnX, mH / 2, mnZ, 12);
  const lampY = mH + .04, lamps = [[0, lampY]];
  [.18, .34, .5].forEach((r, i) => {
    const arc = add(new THREE.TorusGeometry(r, .025, 8, 24, Math.PI), M.gold, mnX, lampY, mnZ); arc.rotation.set(0, Math.PI / 2, Math.PI);
    lamps.push([r, lampY], [-r, lampY]);
  });
  lamps.forEach(([dz]) => {
    add(new THREE.CylinderGeometry(.04, .025, .07, 10), M.gold, mnX, lampY + .02, mnZ + dz);
    const f = add(new THREE.ConeGeometry(.018, .07, 8), M.flame, mnX, lampY + .1, mnZ + dz, { cast: false, live: true }); f.userData.flame = true;
    // halo cálido alrededor de cada llama: las lámparas alumbraban el Lugar Santo (Éxodo 25:37)
    const h = new THREE.Sprite(lampGlowMat); h.position.set(mnX, lampY + .11, mnZ + dz); h.scale.setScalar(.2); h.renderOrder = 2; h.userData.halo = true; T.add(h);
  });
  addBox(mnX - .3, mnX + .3, mnZ - .6, mnZ + .6, 1.7);
  // Altar del incienso de oro: 1 × 1 × 2 codos con cuernos, delante del velo
  const inX = veilX + 1.2;
  box(C, 2 * C, C, M.gold, inX, C, cz);
  box(C + .06, .05, C + .06, M.gold, inX, 2 * C, cz);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.ConeGeometry(.035, .1, 6), M.gold, inX + sx * .21, 2 * C + .07, cz + sz * .21);
  addBox(inX - .3, inX + .3, cz - .3, cz + .3, 1.05);
  // Incienso aromático que Aarón quemaba cada mañana y cada tarde: brasas y un humo suave que sube (Éxodo 30:7-8)
  box(C * .55, .03, C * .55, M.fire, inX, 2 * C + .04, cz, { cast: false });
  const incense = [];
  for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, color: 0xeef0ff })); s.renderOrder = 2; T.add(s); incense.push({ s, k: i / 7 }); }
  zones.push({ id: 'santo', name: 'El Lugar Santo', minX: veilX, maxX: tx1, minZ: tz0, maxZ: tz1, pri: 3,
    text: 'Primera sala de la tienda (20 codos). Al norte, la mesa de los panes de la Presencia con 12 panes en dos hileras de seis; al sur, el candelabro de oro puro con siete lámparas; y delante del velo, el altar de oro del incienso.', ref: 'Éxodo 25:23-40; 26:35; 30:1-8; Levítico 24:5-9' });

  /* ---------------- VELO: 4 columnas con basas de plata ---------------- */
  for (let i = 0; i < 4; i++) { await pace();
    const z = tz0 + (i + .5) / 4 * (tz1 - tz0);
    box(.28, .16, .28, M.silver, veilX, .08, z); cyl(.08, TH, M.gold, veilX, TH / 2, z, 12);
  }
  const vh = 5 * C; for (const s of [-1, 1]) { const p = add(new THREE.PlaneGeometry(vh - .58, TH - .1), M.veil, veilX, (TH - .1) / 2, cz + s * (vh + .58) / 2); p.rotation.y = Math.PI / 2; }
  addBox(veilX - .1, veilX + .1, tz0, cz - .58, TH); addBox(veilX - .1, veilX + .1, cz + .58, tz1, TH);
  zones.push({ id: 'velo', name: 'El velo', minX: veilX - .8, maxX: veilX + .8, minZ: tz0, maxZ: tz1, pri: 4,
    text: 'Velo de azul, púrpura, carmesí y lino fino torcido con querubines bordados, colgado de 4 columnas cubiertas de oro. Separaba el Lugar Santo del Santísimo. Cuando Jesús murió, el velo del templo se rasgó en dos.', ref: 'Éxodo 26:31-33; Mateo 27:51; Hebreos 10:19-20' });

  /* ---------------- LUGAR SANTÍSIMO: 10 × 10 × 10 codos ---------------- */
  const hhX = tx0 + 5 * C;
  // Arca del pacto: 2½ × 1½ × 1½ codos, acacia cubierta de oro
  const aL = 2.5 * C, aW = 1.5 * C, aH = 1.5 * C;
  { const ab = new THREE.Mesh(new THREE.BoxGeometry(aL, aH, aW), arkGlassGold()); ab.position.set(hhX, aH / 2, cz); ab.renderOrder = 2; T.add(ab); const ac = arkContents(aL, aH); ac.position.set(hhX, aH / 2, cz); T.add(ac); }
  box(aL + .04, .04, aW + .04, M.gold, hhX, aH - .05, cz);                 // moldura de oro
  box(aL + .02, .05, aW + .02, M.gold, hhX, aH + .025, cz);               // propiciatorio
  for (const sz of [-1, 1]) { const pole = add(new THREE.CylinderGeometry(.03, .03, aL + 1.6, 10), M.gold, hhX + .4, .18, cz + sz * (aW / 2 + .05)); pole.rotation.z = Math.PI / 2; }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.TorusGeometry(.05, .012, 6, 12), M.gold, hhX + sx * (aL / 2 - .12), .18, cz + sz * (aW / 2 + .01)).rotation.y = 0;
  // Dos querubines de oro, uno frente al otro, con las alas extendidas hacia arriba cubriendo el propiciatorio
  const wingShape = new THREE.Shape(); wingShape.moveTo(0, 0); wingShape.quadraticCurveTo(.12, .42, .52, .5); wingShape.quadraticCurveTo(.3, .3, .34, .12); wingShape.quadraticCurveTo(.2, .1, 0, 0);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: .015, bevelEnabled: false });
  for (const sx of [-1, 1]) {
    const ch = new THREE.Group(); ch.position.set(hhX + sx * (aL / 2 - .12), aH + .05, cz); ch.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2; ch.scale.setScalar(C / .5); S.add(ch);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.06, .16, 6, 12), M.gold); body.position.y = .14; body.rotation.x = .35; ch.add(body);
    const hd = new THREE.Mesh(new THREE.SphereGeometry(.055, 16, 12), M.gold); hd.position.set(0, .3, .07); ch.add(hd);
    for (const s of [-1, 1]) { const w = new THREE.Mesh(wingGeo, M.gold); w.position.set(s * .04, .2, -.02); w.rotation.set(-.35, s > 0 ? -Math.PI / 2 + .25 : Math.PI / 2 - .25, 0); w.scale.set(1, 1, 1); if (s < 0) w.scale.x = -1; ch.add(w); }
    ch.traverse(m => { if (m.isMesh) m.castShadow = true; });
  }
  addBox(hhX - aL / 2 - .05, hhX + aL / 2 + .05, cz - aW / 2 - .1, cz + aW / 2 + .1, aH + .4);
  const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,245,210,.9)'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  gs.position.set(hhX, 1.6, cz); gs.scale.set(2.6, 2.6, 1); T.add(gs);
  const mg = new THREE.Sprite(gs.material); mg.position.set(mnX, lampY + .1, mnZ); mg.scale.set(1.6, 1.2, 1); T.add(mg);
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ map: gs.material.map, color: 0xff9a40, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fg.position.set(altX, ah + .5, cz); fg.scale.set(3, 2, 1); T.add(fg);
  zones.push({ id: 'santisimo', name: 'El Lugar Santísimo', minX: tx0, maxX: veilX - .8, minZ: tz0, maxZ: tz1, pri: 5,
    text: 'Un cubo de 10 codos por lado. Allí solo entraba el sumo sacerdote, una vez al año, en el Día de la Expiación, con la sangre del sacrificio. Ahora, por la sangre de Jesús, tenemos libertad para entrar.', ref: 'Levítico 16; Hebreos 9:7; 10:19' });
  zones.push({ id: 'arca', name: 'El arca del pacto', minX: hhX - 1.6, maxX: hhX + 1.6, minZ: cz - 1.4, maxZ: cz + 1.4, pri: 6,
    text: 'Arca de madera de acacia cubierta de oro puro: 2½ codos de largo, 1½ de ancho y 1½ de alto, con varas para llevarla. Encima, el propiciatorio con dos querubines de oro. Dentro: las tablas del pacto, la vasija de oro con el maná y la vara de Aarón que retoñó.', ref: 'Éxodo 25:10-22; Hebreos 9:4' });

  /* ---------------- Columna de nube sobre la tienda ---------------- */
  const cloudTex = tex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,.85)'); gr.addColorStop(.6, 'rgba(245,245,250,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  const cloudM = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false });
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(cloudM); const y = TH + 5 + i * 1.7;
    s.position.set(hhX + 3 + Math.sin(i * 1.7) * 1.2, y, cz + Math.cos(i * 2.3) * 1.2); s.scale.setScalar(6 + Math.sin(i) * 1.5);
    T.add(s); clouds.push({ s, y, k: i });
  }
  zones.push({ id: 'nube', name: 'La columna de nube', minX: -1e9, maxX: -1e9, minZ: 0, maxZ: 0, pri: 0, text: '', ref: '' });

  await pace();
  // Sacerdotes levitas con vestiduras de lino (Éxodo 28:40-42) y ovejas para el sacrificio (Levítico 1:10)
  const priest = (px, pz, ry, pose) => {
    const h = createHuman({ detail: .5, outfit: 'robe', robe: 0xf4f0e6, mantle: null, sash: [0x20408f, 0x5b2a7a, 0xb3122e][(px * 7 | 0) % 3 < 0 ? 0 : (px * 7 | 0) % 3], hair: 'turban', beard: { len: .07 }, hairColor: 0x2a1a10, skin: 0xa8714f });
    if (pose === 'offer') { for (const [i, sg] of [[0, -1], [1, 1]]) { h.arms[i].shoulder.rotation.set(-.9, 0, sg * -.1); h.arms[i].elbow.rotation.x = -.6; } }
    if (pose === 'wash') { for (const [i, sg] of [[0, -1], [1, 1]]) { h.arms[i].shoulder.rotation.set(-.7, 0, sg * -.15); h.arms[i].elbow.rotation.x = -.9; } }
    const b = bakeStatic(h.root); b.position.set(px, 0, pz); b.rotation.y = ry; S.add(b); addBox(px - .35, px + .35, pz - .35, pz + .35, 1.8);
  };
  priest(altX + aw / 2 + .9, cz - 1.2, -Math.PI / 2, 'offer');
  priest(altX - .4, cz + aw / 2 + .9, Math.PI, 'offer');
  priest(lavX + 1.2, cz + .2, -Math.PI / 2, 'wash');
  priest(x1 - 3, cz - gateHalf + 2, -Math.PI / 2);
  priest(x1 - 3, cz + gateHalf - 2, -Math.PI / 2);
  const sheep = [];
  [[altX + 5, cz + 4], [altX + 6.5, cz + 5.2], [altX + 4.2, cz + 6.2], [x1 - 7, cz - 4]].forEach(([sx2, sz2], i) => { const o = makeAnimal('oveja', .95); o.position.set(sx2, 0, sz2); o.rotation.y = i * 1.7; T.add(o); sheep.push(o); addBox(sx2 - .5, sx2 + .5, sz2 - .5, sz2 + .5, 1); });
  S.updateMatrixWorld(true);
  T.add(bakeStatic(S));
  const flames = [], halos = []; T.traverse(m => { if (m.userData.flame) flames.push(m); if (m.userData.halo) halos.push(m); });
  return {
    zones: zones.filter(z => z.text),
    bounds: { x0, x1, z0, z1 }, gate: [x1, cz],
    holyGift: [veilX + 3.2, cz], holiestGift: [hhX + 2.3, cz + 1.3], aaronSpot: [veilX + 7, cz],
    altar: [altX, cz, aw / 2, ah], laver: [lavX, cz],
    entrance: new THREE.Vector3(x1 + 4, 0, cz),
    update(t) {
      for (const f of flames) f.scale.y = 1 + Math.sin(t * 20 + f.position.z * 30) * .2;
      for (const h of halos) h.scale.setScalar(.2 + Math.sin(t * 13 + h.position.z * 27) * .02 + Math.sin(t * 31 + h.position.z * 11) * .012);
      for (const c of clouds) { c.s.position.y = c.y + Math.sin(t * .3 + c.k) * .6; c.s.material.rotation = t * .02 * (c.k % 2 ? 1 : -1); }
      fg.scale.y = 2 + Math.sin(t * 9) * .3;
      for (const w of ripples) { const u = (t * .45 + w.k) % 1; w.r.scale.setScalar(.04 + u * .34); w.r.material.opacity = (1 - u) * Math.min(1, u * 8) * .5; }
      for (let i = 0; i < tongues.length; i++) { const f = tongues[i]; f.scale.set(1, .7 + Math.abs(Math.sin(t * 11 + i * 1.9)) * .7 + Math.sin(t * 23 + i) * .12, 1); f.rotation.z = Math.sin(t * 6 + i) * .12; }
      let root = T; while (root.parent) root = root.parent;
      const fc = root.fog && root.fog.color, lum = fc ? Math.min(1, (fc.r * .3 + fc.g * .59 + fc.b * .11) * 1.25) : 1; // de noche el humo no brilla
      smokeCol.setRGB(.16 + .7 * lum, .17 + .68 * lum, .2 + .62 * lum);
      // Columna de nube de día y columna de fuego de noche (Éxodo 40:38)
      const day = THREE.MathUtils.smoothstep(lum, .05, .3); cloudM.color.setRGB(1, .45 + .55 * day, .15 + .85 * day);
      for (const m of smoke) {
        m.s.material.color.copy(smokeCol);
        const u = (t * .09 + m.k) % 1, y = ah + .4 + u * 9;
        m.s.position.set(altX + m.dx * (1 - u) + Math.sin(t * .4 + m.k * 9) * u * 1.2 + u * 1.5, y, cz + m.dz * (1 - u) + Math.cos(t * .3 + m.k * 7) * u * .8);
        m.s.scale.setScalar(.9 + u * 3.6); m.s.material.opacity = Math.min(1, u * 6) * (1 - u) * .55; m.s.material.rotation = m.k * 6 + t * .1;
      }
      for (const m of incense) {
        const u = (t * .12 + m.k) % 1;
        m.s.position.set(inX + Math.sin(t * .7 + m.k * 11) * u * .25, 2 * C + .12 + u * 1.7, cz + Math.cos(t * .5 + m.k * 5) * u * .2);
        m.s.scale.setScalar(.12 + u * .55); m.s.material.opacity = Math.min(1, u * 5) * (1 - u) * .35; m.s.material.rotation = m.k * 4 + t * .2;
      }
    },
  };
}

/* Tiendas del campamento de Israel alrededor del tabernáculo */
export async function buildCamp({ group, addBox, cx, cz, rnd, radiusX, radiusZ }) {
  // Tiendas de pelo de cabra, como las de los patriarcas (Génesis 18:1; Cantares 1:5)
  const hairT = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#2a221c'; x.fillRect(0, 0, 128, 64); for (let i = 0; i < 128; i += 16) { x.fillStyle = 'rgba(200,180,150,.18)'; x.fillRect(i, 0, 3, 64); } for (let i = 0; i < 1500; i++) { x.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.04)' : 'rgba(0,0,0,.1)'; x.fillRect(Math.random() * 128, Math.random() * 64, 2, 1); } const t = new THREE.CanvasTexture(x.canvas); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; })();
  const sh = new THREE.Shape(); sh.moveTo(-2.6, 0); sh.lineTo(-2.6, .9); sh.quadraticCurveTo(-1.9, 1.9, -1.3, 1.95); sh.quadraticCurveTo(-.65, 1.6, 0, 2.15); sh.quadraticCurveTo(.65, 1.6, 1.3, 1.95); sh.quadraticCurveTo(1.9, 1.9, 2.6, .9); sh.lineTo(2.6, 0); sh.lineTo(-2.6, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false }); g.translate(0, 0, -1.7);
  const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * .35, uvA.getY(i) * .35);
  const tentM = new THREE.MeshStandardMaterial({ map: hairT, roughness: 1 }), dark = new THREE.MeshStandardMaterial({ color: 0x0a0806 }), rug = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 1 });
  const cols = [0, 0, 0];
  // Fogatas para cocinar delante de algunas tiendas: anillo de piedras, leña y brasas (Éxodo 16:23; Levítico 6:13)
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x6d655b, roughness: 1, flatShading: true }), woodM = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 1 });
  const emberM = new THREE.MeshBasicMaterial({ color: 0xff7a1e }), fireM = new THREE.MeshBasicMaterial({ color: 0xffc04a });
  const stoneG = new THREE.DodecahedronGeometry(.13), logG = new THREE.CylinderGeometry(.045, .055, .8, 6), emberG = new THREE.CylinderGeometry(.24, .28, .06, 10), fireG = new THREE.ConeGeometry(.13, .38, 7);
  let nTent = 0;
  const pts = [];
  for (let i = 0; i < 36; i++) {
    const a = i / 36 * Math.PI * 2;
    const x = cx + Math.cos(a) * radiusX * (.92 + rnd() * .16), z = cz + Math.sin(a) * radiusZ * (.92 + rnd() * .16);
    pts.push([x, z]);
  }
  const S = new THREE.Group();
  for (const [x, z] of pts) {
    if (Math.abs(z - cz) < 6 && x > cx) continue; // camino libre hacia la puerta del atrio
    const ry = Math.atan2(cx - x, cz - z) + Math.PI / 2;
    const t = new THREE.Group(); t.position.set(x, 0, z); t.rotation.y = ry;
    const m = new THREE.Mesh(g, tentM); m.castShadow = m.receiveShadow = true; t.add(m);
    const op = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.4), dark); op.position.set(0, .7, 1.76); t.add(op);
    for (const sx of [-2.4, 0, 2.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 2.2, 5), new THREE.MeshStandardMaterial({ color: 0x5a3a1e })); p.position.set(sx, 1.1, 2.1); t.add(p); }
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), rug); r2.rotation.x = -Math.PI / 2; r2.position.set(0, .1, 2.6); t.add(r2);
    if (nTent++ % 3 === 0) {
      const f = new THREE.Group(); f.position.set(0, 0, 4.6); t.add(f);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, st = new THREE.Mesh(stoneG, stoneM); st.position.set(Math.cos(a) * .42, .08, Math.sin(a) * .42); st.rotation.set(k, k * 2, 0); st.scale.y = .7; st.castShadow = true; f.add(st); }
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(logG, woodM); l.position.y = .16; l.rotation.set(0, k * 2.09, 1.25); l.translateY(-.05); f.add(l); }
      const em = new THREE.Mesh(emberG, emberM); em.position.y = .04; f.add(em);
      const fl = new THREE.Mesh(fireG, fireM); fl.position.y = .28; f.add(fl);
      const wx = x + Math.sin(ry) * 4.6, wz = z + Math.cos(ry) * 4.6; addBox(wx - .5, wx + .5, wz - .5, wz + .5, 1);
    }
    S.add(t);
    addBox(x - 2.2, x + 2.2, z - 2.2, z + 2.2, 2.2);
  }
  S.updateMatrixWorld(true);
  group.add(bakeStatic(S));
}
