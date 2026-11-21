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
    // lino fino torcido (Éxodo 27:9): trama tejida, pliegues verticales suaves de la tela colgada
    // y dobladillo arriba (donde cuelga de los ganchos de plata) y abajo, para que no parezca una pared plana
    linen: new THREE.MeshStandardMaterial({ map: tex(256, 256, (g, W, H) => {
      g.fillStyle = '#f3efe4'; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x++) { const s = Math.sin(x / W * Math.PI * 6); g.fillStyle = s < 0 ? `rgba(110,98,74,${(-s * .13).toFixed(3)})` : `rgba(255,255,250,${(s * .10).toFixed(3)})`; g.fillRect(x, 0, 1, H); }
      g.strokeStyle = 'rgba(120,110,90,.12)'; for (let i = 0; i < W; i += 3) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, H); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(W, i); g.stroke(); }
      g.fillStyle = 'rgba(120,108,84,.16)'; g.fillRect(0, 0, W, 7); g.fillRect(0, H - 10, W, 10);
      g.fillStyle = 'rgba(90,80,60,.22)'; g.fillRect(0, 7, W, 1); g.fillRect(0, H - 11, W, 1);
    }, [4, 1]), roughness: .95, side: THREE.DoubleSide }),
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
  // «Todas las estacas del atrio serán de bronce» (Éxodo 27:19), con sus cuerdas (Éxodo 35:18): cada columna queda
  // tensada hacia afuera por una cuerda de lino que baja hasta una estaca de bronce clavada en la arena.
  // Las cuatro columnas de la puerta no llevan cuerda hacia afuera para que la entrada quede libre.
  {
    const ropeM = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 1 });
    const up = new THREE.Vector3(0, 1, 0), out = 1.6, topY = HH - .25;
    for (const [x, z] of posts) {
      let dx = x <= x0 + .01 ? -1 : x >= x1 - .01 ? 1 : 0, dz = z <= z0 + .01 ? -1 : z >= z1 - .01 ? 1 : 0;
      if (dx === 1 && dz === 0 && Math.abs(z - cz) < gateHalf - .01) continue;
      const n = Math.hypot(dx, dz); if (!n) continue; dx /= n; dz /= n;
      const sx = x + dx * out, sz = z + dz * out;
      // estaca de bronce: un poco inclinada hacia afuera, con la cabeza asomando sobre la arena
      const st = add(new THREE.CylinderGeometry(.03, .012, .34, 6), M.bronze, sx, .1, sz, { cast: false });
      st.rotation.set(dz * .35, 0, -dx * .35);
      // cuerda tensa desde lo alto de la columna hasta la cabeza de la estaca
      const a = new THREE.Vector3(x + dx * .1, topY, z + dz * .1), b = new THREE.Vector3(sx, .22, sz);
      const dir = b.clone().sub(a), len = dir.length();
      const rope = add(new THREE.CylinderGeometry(.012, .012, len, 4), ropeM, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2, { cast: false });
      rope.quaternion.setFromUnitVectors(up, dir.normalize());
    }
  }
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
    text: 'El atrio medía 100 por 50 codos y lo rodeaban cortinas de lino fino.', ref: 'Éxodo 27:9-18' });
  zones.push({ id: 'puerta', name: 'La puerta del atrio', minX: x1 - 2, maxX: x1 + 3, minZ: cz - gateHalf, maxZ: cz + gateHalf, pri: 1,
    text: 'La única entrada, al oriente, muestra que hay un solo camino para acercarse a Dios.', ref: 'Éxodo 27:16; Juan 10:9' });

  /* ---------------- ALTAR DE BRONCE: 5 × 5 × 3 codos con cuernos ---------------- */
  const altX = cx + LX / 4, aw = 5 * C, ah = 3 * C;
  box(aw, ah, aw, M.bronze, altX, ah / 2, cz);
  box(aw * .9, .06, aw * .9, M.fire, altX, ah + .01, cz, { cast: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const h = add(new THREE.ConeGeometry(.1, .3, 8), M.bronze, altX + sx * (aw / 2 - .1), ah + .15, cz + sz * (aw / 2 - .1)); }
  box(aw + .1, .08, .05, M.bronze, altX, ah * .5, cz - aw / 2 - .02); box(aw + .1, .08, .05, M.bronze, altX, ah * .5, cz + aw / 2 + .02); // rejilla
  for (const sz of [-1, 1]) { const pole = add(new THREE.CylinderGeometry(.04, .04, aw + 1.2, 8), M.bronze, altX, ah * .45, cz + sz * (aw / 2 + .12)); pole.rotation.z = Math.PI / 2; }
  addBox(altX - aw / 2, altX + aw / 2, cz - aw / 2, cz + aw / 2, ah);
  // «Le harás también un enrejado de bronce en forma de red, y sobre la red harás cuatro anillos de bronce en sus cuatro
  // extremos. Y la pondrás debajo del borde del altar, de manera que la red llegue hasta la mitad del altar» (Éxodo 27:4-5).
  // Red de bronce calada alrededor de los cuatro lados, cornisa también en los lados oriente y occidente, y los cuatro
  // anillos en las esquinas por donde pasan las varas (Éxodo 27:6-7).
  {
    const netTex = tex(64, 64, (g, W, H) => {
      g.clearRect(0, 0, W, H); g.strokeStyle = '#fff'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(W, H); g.moveTo(W, 0); g.lineTo(0, H); g.stroke();
      g.strokeRect(0, 0, W, H);
    });
    const bandH = ah * .3, bandY = ah * .5 - .04 - bandH / 2;
    netTex.repeat.set(Math.round(aw / .26), Math.max(1, Math.round(bandH / .26)));
    netTex.generateMipmaps = false; netTex.minFilter = THREE.LinearFilter; // sin mipmaps para que la red no desaparezca de lejos
    const netM = new THREE.MeshStandardMaterial({ color: 0xc8843e, metalness: .85, roughness: .45, map: netTex, alphaTest: .4 });
    const holeM = new THREE.MeshStandardMaterial({ color: 0x1c120a, roughness: 1 });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2, nx = Math.cos(a), nz = Math.sin(a);
      const pl = add(new THREE.PlaneGeometry(aw - .02, bandH), netM, altX + nx * (aw / 2 + .012), bandY, cz + nz * (aw / 2 + .012), { cast: false });
      pl.rotation.y = Math.PI / 2 - a;
      // fondo oscuro detrás de la red: por los huecos se ve el interior hueco del altar (Éxodo 27:8)
      const bk = add(new THREE.PlaneGeometry(aw - .04, bandH - .02), holeM, altX + nx * (aw / 2 + .005), bandY, cz + nz * (aw / 2 + .005), { cast: false });
      bk.rotation.y = Math.PI / 2 - a;
    }
    // cornisa (borde) en los lados oriente y occidente, a la misma altura que la de los lados norte y sur
    box(.05, .08, aw + .1, M.bronze, altX - aw / 2 - .02, ah * .5, cz); box(.05, .08, aw + .1, M.bronze, altX + aw / 2 + .02, ah * .5, cz);
    // cuatro anillos de bronce con su abrazadera, abrazando las varas
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const rx = altX + sx * (aw / 2 - .3), rz = cz + sz * (aw / 2 + .12);
      add(new THREE.TorusGeometry(.075, .022, 8, 18), M.bronze, rx, ah * .45, rz, { cast: false }).rotation.y = Math.PI / 2;
      box(.05, .04, .12, M.bronze, rx, ah * .45 + .085, cz + sz * (aw / 2 + .06));
    }
  }
  // Fuego vivo y humo del holocausto que sube al cielo (Levítico 1:9; 6:13)
  const smokeTex = tex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, 'rgba(235,232,228,.7)'); gr.addColorStop(.55, 'rgba(200,196,190,.3)'); gr.addColorStop(1, 'rgba(190,186,180,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const smoke = [], smokeCol = new THREE.Color();
  for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0 })); s.renderOrder = 2; T.add(s); smoke.push({ s, k: i / 12, dx: Math.sin(i * 2.1) * .5, dz: Math.cos(i * 1.3) * .5 }); }
  const tongueM = new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: .85, depthWrite: false });
  const tongues = [];
  for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(.16 + (i % 3) * .05, .7, 6).translate(0, .35, 0), tongueM); f.position.set(altX + Math.sin(i * 2.4) * aw * .3, ah + .04, cz + Math.cos(i * 1.7) * aw * .3); f.castShadow = false; T.add(f); tongues.push(f); }
  // Chispas del holocausto que vuelan hacia arriba y se apagan en el aire (Job 5:7: «como las chispas vuelan hacia arriba»)
  const sparkTex = tex(32, 32, (g) => { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,250,220,1)'); gr.addColorStop(.35, 'rgba(255,170,60,.9)'); gr.addColorStop(1, 'rgba(255,90,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); });
  const sparks = [];
  for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 })); s.renderOrder = 3; T.add(s); sparks.push({ s, k: (i * .618) % 1, sp: .55 + (i % 4) * .12, ox: Math.sin(i * 2.7) * aw * .3, oz: Math.cos(i * 1.9) * aw * .3, w: 1.3 + (i % 3) * .7 }); }
  zones.push({ id: 'altar', name: 'El altar de bronce', minX: altX - 3, maxX: altX + 3, minZ: cz - 3, maxZ: cz + 3, pri: 2,
    text: 'En el altar de bronce se ofrecían los holocaustos y apunta a Cristo, el Cordero de Dios.', ref: 'Éxodo 27:1-8; Levítico 6:13; Juan 1:29' });
  // Utensilios de bronce del altar junto a su lado norte: olla para las cenizas, pala, tazón, garfio y brasero (Éxodo 27:3)
  {
    const uz = cz - aw / 2 - .75, bronzeDS = M.bronze.clone(), ash = new THREE.MeshStandardMaterial({ color: 0x8d8780, roughness: 1 });
    bronzeDS.side = THREE.DoubleSide;
    add(new THREE.LatheGeometry([[0, 0], [.17, .01], [.23, .12], [.22, .26], [.18, .32], [.2, .34]].map(([x, y]) => new THREE.Vector2(x, y)), 20), bronzeDS, altX - .9, 0, uz);
    add(new THREE.CircleGeometry(.18, 16), ash, altX - .9, .3, uz, { cast: false }).rotation.x = -Math.PI / 2;
    // pala apoyada en la olla
    const sh = new THREE.Group(); sh.position.set(altX - .55, 0, uz); sh.rotation.z = .42; S.add(sh);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .78, 6), M.bronze); hd.position.y = .5; sh.add(hd);
    const bl = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .025), M.bronze); bl.position.y = .1; bl.rotation.x = .08; sh.add(bl);
    // tazón para la sangre
    add(new THREE.SphereGeometry(.15, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), bronzeDS, altX - .05, .15, uz - .05);
    // garfio de tres dientes tendido en el suelo
    const fk = new THREE.Group(); fk.position.set(altX + .5, .05, uz - .12); fk.rotation.y = .25; S.add(fk);
    const fh = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .7, 6), M.bronze); fh.rotation.z = Math.PI / 2; fk.add(fh);
    const fb = new THREE.Mesh(new THREE.BoxGeometry(.03, .02, .16), M.bronze); fb.position.x = .36; fk.add(fb);
    for (const tz of [-.07, 0, .07]) { const tn = new THREE.Mesh(new THREE.BoxGeometry(.13, .02, .018), M.bronze); tn.position.set(.43, 0, tz); fk.add(tn); }
    // brasero con unas brasas
    add(new THREE.CylinderGeometry(.17, .14, .06, 16), M.bronze, altX + 1.1, .07, uz + .1);
    box(.24, .02, .03, M.bronze, altX + 1.38, .09, uz + .1);
    for (let i = 0; i < 4; i++) add(new THREE.DodecahedronGeometry(.035), M.fire, altX + 1.1 + Math.sin(i * 2.3) * .07, .11, uz + .1 + Math.cos(i * 1.9) * .07, { cast: false });
    addBox(altX - 1.15, altX + 1.5, uz - .3, uz + .3, .36);
  }
  // Lugar de las cenizas al oriente del altar: montón bajo de ceniza con tizones apagados (Levítico 1:16; 6:10-11)
  {
    const ax = altX + aw / 2 + 1.1, az = cz + aw / 2 + .6;
    const ashM = new THREE.MeshStandardMaterial({ color: 0xa59c90, roughness: 1 }), charM = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: .95 });
    const heap = add(new THREE.SphereGeometry(.55, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), ashM, ax, 0, az);
    heap.scale.set(1, .32, .8); heap.castShadow = false;
    const heap2 = add(new THREE.SphereGeometry(.3, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), ashM, ax + .45, 0, az - .25);
    heap2.scale.set(1, .35, 1); heap2.castShadow = false;
    for (let i = 0; i < 5; i++) {
      // cada tizón se apoya sobre la superficie del montón (sin flotar)
      const ox = Math.sin(i * 2.4) * .26, oz = Math.cos(i * 1.8) * .17, q = Math.min(1, Math.hypot(ox / .55, oz / .44));
      const st = add(new THREE.CylinderGeometry(.022, .028, .3 + (i % 2) * .08, 6), charM, ax + ox, .176 * Math.sqrt(1 - q * q) - .005, az + oz, { cast: false });
      st.rotation.set(Math.PI / 2, i * 1.3, 0);
    }
  }

  /* ---------------- FUENTE DE BRONCE ---------------- */
  const lavX = cx + 10 * C;
  // La fuente se hizo con los espejos de bronce de las mujeres que servían a la puerta de la tienda de reunión (Éxodo 38:8):
  // bronce bruñido, más claro y brillante, que refleja el cielo como un espejo
  const mirrorBronze = new THREE.MeshStandardMaterial({ color: 0xd09050, metalness: 1, roughness: .16 });
  add(new THREE.CylinderGeometry(.35, .5, .7, 20), mirrorBronze, lavX, .35, cz);
  // «Harás también una pila de bronce, con su base de bronce, para lavatorio» (Éxodo 30:18): pie ancho escalonado que
  // asienta la base sobre la arena y un anillo moldeado donde la base recibe la pila
  const footBronze = new THREE.MeshStandardMaterial({ color: 0xc08848, metalness: .7, roughness: .42 });
  add(new THREE.CylinderGeometry(.6, .66, .07, 28), footBronze, lavX, .04, cz);
  add(new THREE.CylinderGeometry(.53, .58, .06, 28), footBronze, lavX, .1, cz);
  add(new THREE.TorusGeometry(.36, .035, 8, 28), mirrorBronze, lavX, .68, cz).rotation.x = Math.PI / 2;
  add(new THREE.LatheGeometry([[0, 0], [.3, .02], [.75, .2], [.85, .42], [.8, .45]].map(([x, y]) => new THREE.Vector2(x, y)), 32), mirrorBronze, lavX, .7, cz);
  // borde pulido del lavatorio que atrapa la luz
  add(new THREE.TorusGeometry(.815, .028, 8, 40), mirrorBronze, lavX, 1.15, cz).rotation.x = Math.PI / 2;
  add(new THREE.CircleGeometry(.76, 32), M.water, lavX, 1.08, cz).rotation.x = -Math.PI / 2;
  addBox(lavX - .8, lavX + .8, cz - .8, cz + .8, 1.15);
  // Ondas suaves en el agua donde el sacerdote se lava las manos (Éxodo 30:18-21)
  const ripples = []; for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 28), new THREE.MeshBasicMaterial({ color: 0xe8f4ff, transparent: true, opacity: 0, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.set(lavX + .3 - i * .06, 1.088, cz + (i - 1) * .12); r.renderOrder = 2; r.castShadow = r.receiveShadow = false; T.add(r); ripples.push({ r, k: i / 3 }); }
  zones.push({ id: 'fuente', name: 'La fuente de bronce', minX: lavX - 2, maxX: lavX + 2, minZ: cz - 2, maxZ: cz + 2, pri: 2,
    text: 'En la fuente de bronce los sacerdotes lavaban sus manos y sus pies antes de ministrar. Se hizo con los espejos de bronce de las mujeres que servían a la puerta de la tienda de reunión.', ref: 'Éxodo 30:17-21; 38:8' });

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
  // «Pondrás incienso puro en cada hilera» (Levítico 24:7): un tacita de oro con incienso blanco sobre cada pila de panes
  { const incM = new THREE.MeshStandardMaterial({ color: 0xf3ecd8, roughness: .85 }), topY = 1.5 * C + .06 + 5 * .055 + .025;
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(.055, .038, .04, 16), M.gold, tbX + sx * .24, topY + .02, tbZ, { cast: false });
      const inc = add(new THREE.SphereGeometry(.045, 12, 8), incM, tbX + sx * .24, topY + .038, tbZ, { cast: false }); inc.scale.set(1, .35, 1);
    } }
  // «Le harás también alrededor un borde de un palmo menor de ancho… Le harás cuatro anillos de oro… y harás las varas de madera de acacia y las revestirás de oro» (Éxodo 25:25-28)
  { const rimY = 1.5 * C + .075 + .035, hx = C + .03, hz = C / 2 + .03;
    for (const s of [-1, 1]) {
      box(2 * hx, .07, .025, M.gold, tbX, rimY, tbZ + s * hz, { cast: false });
      box(.025, .07, 2 * hz, M.gold, tbX + s * hx, rimY, tbZ, { cast: false });
    }
    const ringY = 1.5 * C - .16;
    for (const sz of [-1, 1]) {
      const rz = tbZ + sz * (C / 2 + .035);
      for (const sx of [-1, 1]) add(new THREE.TorusGeometry(.04, .011, 6, 12).rotateY(Math.PI / 2), M.gold, tbX + sx * (C - .1), ringY, rz, { cast: false });
      add(new THREE.CylinderGeometry(.022, .022, 2 * C + .3, 8).rotateZ(Math.PI / 2), M.gold, tbX, ringY, rz);
    } }
  // utensilios de oro puro de la mesa: jarros y tazones para las libaciones (Éxodo 25:29), a cada lado de los panes
  { const topY = 1.5 * C + .075;
    for (const sx of [-1, 1]) {
      const jx = tbX + sx * .6;
      add(new THREE.CylinderGeometry(.032, .048, .11, 14), M.gold, jx, topY + .055, tbZ - .15, { cast: false });       // cuerpo del jarro
      add(new THREE.CylinderGeometry(.04, .022, .04, 14), M.gold, jx, topY + .13, tbZ - .15, { cast: false });         // cuello y boca
      add(new THREE.CylinderGeometry(.07, .04, .035, 18), M.gold, jx, topY + .018, tbZ + .16, { cast: false });        // tazón
    } }
  addBox(tbX - .95, tbX + .95, tbZ - .47, tbZ + .47, .8);
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
  // «Tres copas en forma de flor de almendro, una manzana y una flor en un brazo… y una manzana debajo de cada dos brazos» (Éxodo 25:33-35)
  { const knobG = new THREE.SphereGeometry(.05, 12, 8), cupG = new THREE.CylinderGeometry(.045, .016, .075, 12);
    [.18, .34, .5].forEach(r => {
      add(knobG, M.gold, mnX, lampY - r, mnZ, { cast: false }); // manzana bajo cada par de brazos, sobre la caña
      for (const a of [Math.PI * .25, Math.PI * .75]) add(cupG, M.gold, mnX, lampY - r * Math.sin(a) + .01, mnZ + r * Math.cos(a), { cast: false });
    });
    for (const y of [.45, .7, .95]) add(cupG, M.gold, mnX, y, mnZ, { cast: false }); // copas de almendro en la caña central (Éxodo 25:34)
  }
  lamps.forEach(([dz]) => {
    add(new THREE.CylinderGeometry(.04, .025, .07, 10), M.gold, mnX, lampY + .02, mnZ + dz);
    const f = add(new THREE.ConeGeometry(.018, .07, 8), M.flame, mnX, lampY + .1, mnZ + dz, { cast: false, live: true }); f.userData.flame = true;
    // halo cálido alrededor de cada llama: las lámparas alumbraban el Lugar Santo (Éxodo 25:37)
    const h = new THREE.Sprite(lampGlowMat); h.position.set(mnX, lampY + .11, mnZ + dz); h.scale.setScalar(.2); h.renderOrder = 2; h.userData.halo = true; T.add(h);
  });
  // «Sus despabiladeras y sus platillos serán de oro puro» (Éxodo 25:38): dos platillos al pie del candelabro, uno con las tenazas encima
  { const dishG = new THREE.LatheGeometry([[0, 0], [.07, 0], [.095, .02], [.1, .028]].map(([x, y]) => new THREE.Vector2(x, y)), 20);
    const goldDS = M.gold.clone(); goldDS.side = THREE.DoubleSide;
    for (const s of [-1, 1]) add(dishG, goldDS, mnX, .066, mnZ + s * .4, { cast: false });
    for (const a of [-.07, .07]) { const t = add(new THREE.CylinderGeometry(.007, .007, .2, 6).rotateZ(Math.PI / 2), M.gold, mnX, .094, mnZ + .4, { cast: false }); t.rotation.y = a; }
  }
  // «…sus despabiladeras, sus platillos y todos sus utensilios para el aceite con que lo sirven» (Números 4:9):
  // una aceitera de oro con pico y asa junto al platillo, con el aceite puro de olivas para las lámparas (Éxodo 27:20)
  { const jx = mnX + .28, jz = mnZ - .42, fy = .066;
    const jarG = new THREE.LatheGeometry([[0, 0], [.045, 0], [.06, .04], [.058, .08], [.035, .115], [.022, .13], [.03, .15]].map(([x, y]) => new THREE.Vector2(x, y)), 18);
    add(jarG, M.gold, jx, fy, jz, { cast: false });
    add(new THREE.CylinderGeometry(.006, .012, .08, 8), M.gold, jx + .07, fy + .1, jz, { cast: false }).rotation.z = -.95; // pico inclinado hacia arriba
    add(new THREE.TorusGeometry(.035, .007, 6, 12, Math.PI), M.gold, jx - .055, fy + .085, jz, { cast: false }).rotation.z = Math.PI / 2; // asa
  }
  addBox(mnX - .3, mnX + .3, mnZ - .6, mnZ + .6, 1.7);
  // Altar del incienso de oro: 1 × 1 × 2 codos con cuernos, delante del velo
  const inX = veilX + 1.2;
  box(C, 2 * C, C, M.gold, inX, C, cz);
  box(C + .06, .05, C + .06, M.gold, inX, 2 * C, cz);
  // «Sus cuernos serán de una pieza con él… le harás una moldura de oro alrededor» (Éxodo 30:2-3): cuernos en las cuatro esquinas y corona de oro
  { const hx = C / 2 + .03, rimY = 2 * C + .025 + .035, hornG = new THREE.CylinderGeometry(.022, .04, .13, 4).rotateY(Math.PI / 4);
    for (const s of [-1, 1]) {
      box(2 * hx, .07, .025, M.gold, inX, rimY, cz + s * hx, { cast: false });
      box(.025, .07, 2 * hx, M.gold, inX + s * hx, rimY, cz, { cast: false });
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(hornG, M.gold, inX + sx * .36, 2 * C + .025 + .065, cz + sz * .36);
  }
  // «Le harás dos argollas de oro debajo de su moldura… y las varas de madera de acacia, y las revestirás de oro» (Éxodo 30:4-5)
  for (const sz of [-1, 1]) {
    const rz = cz + sz * (C / 2 + .035);
    for (const sx of [-1, 1]) add(new THREE.TorusGeometry(.04, .011, 6, 12).rotateY(Math.PI / 2), M.gold, inX + sx * .24, 2 * C - .14, rz, { cast: false });
    add(new THREE.CylinderGeometry(.022, .022, 1.5, 8).rotateZ(Math.PI / 2), M.gold, inX, 2 * C - .14, rz);
  }
  addBox(inX - .76, inX + .76, cz - .46, cz + .46, 1.05);
  // Incienso aromático que Aarón quemaba cada mañana y cada tarde: brasas y un humo suave que sube (Éxodo 30:7-8)
  box(C * .55, .03, C * .55, M.fire, inX, 2 * C + .04, cz, { cast: false });
  const incense = [];
  for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, color: 0xeef0ff })); s.renderOrder = 2; T.add(s); incense.push({ s, k: i / 7 }); }
  zones.push({ id: 'santo', name: 'El Lugar Santo', minX: veilX, maxX: tx1, minZ: tz0, maxZ: tz1, pri: 3,
    text: 'El Lugar Santo tenía la mesa de los panes, el candelabro de oro y el altar del incienso.', ref: 'Éxodo 25:23-40; 26:35; 30:1-8; Levítico 24:5-9' });

  /* ---------------- VELO: 4 columnas con basas de plata ---------------- */
  // «Lo colgarás de cuatro columnas de acacia revestidas de oro; sus ganchos serán también de oro, sobre cuatro basas de plata» (Éxodo 26:32):
  // cada columna lleva arriba, del lado del Lugar Santo, un gancho de oro de donde cuelga el velo
  const hookArc = new THREE.TorusGeometry(.055, .014, 6, 12, Math.PI), hookStem = new THREE.CylinderGeometry(.014, .014, .1, 6);
  for (let i = 0; i < 4; i++) { await pace();
    const z = tz0 + (i + .5) / 4 * (tz1 - tz0);
    box(.28, .16, .28, M.silver, veilX, .08, z); cyl(.08, TH, M.gold, veilX, TH / 2, z, 12);
    add(hookStem, M.gold, veilX + .1, TH - .16, z, { cast: false }).rotation.z = Math.PI / 2;          // espiga que sale de la columna
    add(hookArc, M.gold, veilX + .205, TH - .16, z, { cast: false }).rotation.z = Math.PI;             // curva del gancho en «U», abierta hacia arriba
  }
  const vh = 5 * C; for (const s of [-1, 1]) { const p = add(new THREE.PlaneGeometry(vh - .58, TH - .1), M.veil, veilX, (TH - .1) / 2, cz + s * (vh + .58) / 2); p.rotation.y = Math.PI / 2; }
  addBox(veilX - .1, veilX + .1, tz0, cz - .58, TH); addBox(veilX - .1, veilX + .1, cz + .58, tz1, TH);
  zones.push({ id: 'velo', name: 'El velo', minX: veilX - .8, maxX: veilX + .8, minZ: tz0, maxZ: tz1, pri: 4,
    text: 'El velo separaba el Lugar Santo del Santísimo y se rasgó en dos cuando Jesús murió.', ref: 'Éxodo 26:31-33; Mateo 27:51; Hebreos 10:19-20' });

  /* ---------------- LUGAR SANTÍSIMO: 10 × 10 × 10 codos ---------------- */
  const hhX = tx0 + 5 * C;
  // Arca del pacto: 2½ × 1½ × 1½ codos, acacia cubierta de oro
  const aL = 2.5 * C, aW = 1.5 * C, aH = 1.5 * C;
  { const ab = new THREE.Mesh(new THREE.BoxGeometry(aL, aH, aW), arkGlassGold()); ab.position.set(hhX, aH / 2, cz); ab.renderOrder = 2; T.add(ab); const ac = arkContents(aL, aH); ac.position.set(hhX, aH / 2, cz); T.add(ac); }
  box(aL + .04, .04, aW + .04, M.gold, hhX, aH - .05, cz);                 // moldura de oro
  box(aL + .02, .05, aW + .02, M.gold, hhX, aH + .025, cz);               // propiciatorio
  for (const sz of [-1, 1]) { const pole = add(new THREE.CylinderGeometry(.03, .03, aL + 1.6, 10), M.gold, hhX + .4, .18, cz + sz * (aW / 2 + .05)); pole.rotation.z = Math.PI / 2; }
  // «Fundirás cuatro anillos de oro para él y los pondrás en sus cuatro pies» (Éxodo 25:12): cada anillo queda de canto,
  // pegado al costado del arca, y la vara de acacia cubierta de oro pasa justo por su centro (antes la vara lo atravesaba de lado)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(new THREE.TorusGeometry(.05, .012, 6, 12).rotateY(Math.PI / 2), M.gold, hhX + sx * (aL / 2 - .12), .18, cz + sz * (aW / 2 + .05), { cast: false });
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
    text: 'Al Lugar Santísimo solo entraba el sumo sacerdote una vez al año con la sangre del sacrificio.', ref: 'Levítico 16; Hebreos 9:7; 10:19' });
  zones.push({ id: 'arca', name: 'El arca del pacto', minX: hhX - 1.6, maxX: hhX + 1.6, minZ: cz - 1.4, maxZ: cz + 1.4, pri: 6,
    text: 'El arca del pacto, cubierta de oro, guardaba las tablas, el maná y la vara de Aarón. Sus varas de acacia cubiertas de oro pasaban por cuatro anillos de oro y nunca se quitaban de ellos.', ref: 'Éxodo 25:10-22; Hebreos 9:4' });

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
  [[altX + 5, cz + 4], [altX + 6.5, cz + 5.2], [altX + 4.2, cz + 6.2], [x1 - 7, cz - 4]].forEach(([sx2, sz2], i) => { const o = makeAnimal('oveja', .95); o.position.set(sx2, 0, sz2); o.rotation.y = i * 1.7; T.add(o); sheep.push({ o, r0: o.rotation.y, per: 9 + i * 2.3, ph: i * 3.7 }); addBox(sx2 - .5, sx2 + .5, sz2 - .5, sz2 + .5, 1); });
  S.updateMatrixWorld(true);
  T.add(bakeStatic(S));
  const flames = [], halos = []; T.traverse(m => { if (m.userData.flame) flames.push(m); if (m.userData.halo) halos.push(m); });
  return {
    zones: zones.filter(z => z.text),
    indoor: [{ name: 'la tienda del tabernáculo', msg: '⏸ En la tienda del tabernáculo el tiempo se detiene', rects: [[tx0, tx1, tz0, tz1], [tx1, tx1 + 4, tz0 - 1, tz1 + 1]], maxY: TH }],
    bounds: { x0, x1, z0, z1 }, gate: [x1, cz],
    holyGift: [veilX + 3.2, cz], holiestGift: [hhX + 2.3, cz + 1.3], aaronSpot: [veilX + 7, cz],
    altar: [altX, cz, aw / 2, ah], laver: [lavX, cz],
    entrance: new THREE.Vector3(x1 + 4, 0, cz),
    update(t) {
      // Las ovejas del atrio no están quietas: de vez en cuando giran despacio en su sitio dando pasitos, como cuando pastan
      for (const m of sheep) {
        const c = (t + m.ph) % m.per, k = THREE.MathUtils.smoothstep(c, 0, 1.6), n = Math.floor((t + m.ph) / m.per);
        const ang = q => m.r0 + (q % 2 ? .55 : 0); // alterna entre dos posturas sin saltos
        m.o.rotation.y = ang(n - 1) + (ang(n) - ang(n - 1)) * k;
        const paso = c < 1.6 ? Math.sin(c * 11) * .35 * Math.sin(c / 1.6 * Math.PI) : 0;
        m.o.userData.legs.forEach((l, j) => { l.rotation.x = (j === 0 || j === 3 ? 1 : -1) * paso; });
      }
      // las siete llamas del candelabro chisporrotean y se mecen un poquito, cada una a su ritmo, como aceite ardiendo de verdad
      for (const f of flames) {
        const k = f.position.z * 30;
        f.scale.y = 1 + Math.sin(t * 20 + k) * .2 + Math.sin(t * 47 + k * 1.7) * .06;
        f.scale.x = f.scale.z = 1 - Math.sin(t * 20 + k) * .08;
        f.rotation.x = Math.sin(t * 3.1 + k) * .09 + Math.sin(t * 8.3 + k * .6) * .03;
      }
      for (const h of halos) h.scale.setScalar(.2 + Math.sin(t * 13 + h.position.z * 27) * .02 + Math.sin(t * 31 + h.position.z * 11) * .012);
      for (const c of clouds) { c.s.position.y = c.y + Math.sin(t * .3 + c.k) * .6; c.s.material.rotation = t * .02 * (c.k % 2 ? 1 : -1); }
      fg.scale.y = 2 + Math.sin(t * 9) * .3;
      // el resplandor del candelabro de oro titila suave con sus siete llamas de aceite (Éxodo 27:20; Levítico 24:2-4)
      { const fl = Math.sin(t * 7.3) * .035 + Math.sin(t * 17.1 + 1.3) * .02 + Math.sin(t * 29.7 + .4) * .012; mg.scale.set(1.6 * (1 + fl * .6), 1.2 * (1 + fl), 1); mg.position.y = lampY + .1 + fl * .05; }
      // la gloria de Dios sobre el propiciatorio, entre los querubines, «respira» despacio con una luz suave (Éxodo 25:22; 40:34)
      { const p = Math.sin(t * 1.1) * .5 + Math.sin(t * 2.7 + 1) * .15; gs.scale.set(2.6 + p * .35, 2.6 + p * .45, 1); gs.position.y = 1.6 + p * .06; }
      for (const w of ripples) { const u = (t * .45 + w.k) % 1; w.r.scale.setScalar(.04 + u * .34); w.r.material.opacity = (1 - u) * Math.min(1, u * 8) * .5; }
      for (const c of sparks) {
        const u = (t * c.sp + c.k) % 1, y = ah + .15 + u * u * 3.2 + u * .8;
        c.s.position.set(altX + c.ox * (1 - u * .4) + Math.sin(t * c.w + c.k * 20) * u * .35 + u * .5, y, cz + c.oz * (1 - u * .4) + Math.cos(t * c.w * .8 + c.k * 13) * u * .3);
        c.s.scale.setScalar(.14 * (1 - u * .6)); c.s.material.opacity = Math.min(1, u * 10) * (1 - u) * (.75 + Math.sin(t * 30 + c.k * 40) * .25);
      }
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
export async function buildCamp({ group, addBox, addObb, cx, cz, rnd, radiusX, radiusZ, lite = false }) {
  // Tiendas de pelo de cabra, como las de los patriarcas (Génesis 18:1; Cantares 1:5)
  // Tela de pelo de cabra tejida en franjas cosidas: fibras, costuras y desgaste (más detalle fuera del modo liviano)
  const hairC = (() => {
    const W2 = lite ? 128 : 512, H2 = lite ? 64 : 256, c = document.createElement('canvas'); c.width = W2; c.height = H2; const x = c.getContext('2d');
    x.fillStyle = '#2b221b'; x.fillRect(0, 0, W2, H2);
    const fr = W2 / 8;
    for (let i = 0; i < 8; i++) { const v = 30 + (Math.random() * 14 | 0); x.fillStyle = `rgb(${v + 10},${v + 2},${v - 6})`; x.fillRect(i * fr, 0, fr, H2); }
    for (let i = 0; i < (lite ? 1500 : 16000); i++) { const l = 2 + Math.random() * (lite ? 2 : 7); x.fillStyle = Math.random() < .45 ? `rgba(210,190,160,${.03 + Math.random() * .06})` : `rgba(0,0,0,${.08 + Math.random() * .12})`; x.fillRect(Math.random() * W2, Math.random() * H2, l, 1); }
    for (let i = 0; i <= 8; i++) { x.fillStyle = 'rgba(205,185,150,.22)'; x.fillRect(i * fr - 1, 0, lite ? 3 : 4, H2); if (!lite) { x.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < H2; y += 9) x.fillRect(i * fr + 2, y, 2, 4); } }
    if (!lite) { const g = x.createLinearGradient(0, 0, 0, H2); g.addColorStop(0, 'rgba(255,240,210,.06)'); g.addColorStop(1, 'rgba(0,0,0,.18)'); x.fillStyle = g; x.fillRect(0, 0, W2, H2); }
    return c;
  })();
  const hairT = new THREE.CanvasTexture(hairC); hairT.colorSpace = THREE.SRGBColorSpace; hairT.wrapS = hairT.wrapT = THREE.RepeatWrapping; hairT.anisotropy = lite ? 1 : 8;
  const hairB = lite ? null : (() => { const b = new THREE.CanvasTexture(hairC); b.wrapS = b.wrapT = THREE.RepeatWrapping; return b; })();
  const sh = new THREE.Shape(); sh.moveTo(-2.6, 0); sh.lineTo(-2.6, .9); sh.quadraticCurveTo(-1.9, 1.9, -1.3, 1.95); sh.quadraticCurveTo(-.65, 1.6, 0, 2.15); sh.quadraticCurveTo(.65, 1.6, 1.3, 1.95); sh.quadraticCurveTo(1.9, 1.9, 2.6, .9); sh.lineTo(2.6, 0); sh.lineTo(-2.6, 0);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 3.4, bevelEnabled: false }); g.translate(0, 0, -1.7);
  const uvA = g.attributes.uv; for (let i = 0; i < uvA.count; i++) uvA.setXY(i, uvA.getX(i) * .35, uvA.getY(i) * .35);
  const tentM = new THREE.MeshStandardMaterial({ map: hairT, roughness: 1, ...(hairB ? { bumpMap: hairB, bumpScale: 1.6 } : {}) }), dark = new THREE.MeshStandardMaterial({ color: 0x0a0806, emissive: 0xffa64a, emissiveMap: (() => {
    // de noche se ve dentro de cada tienda la luz cálida de una lamparita de aceite en el suelo (Proverbios 31:18; Salmo 119:105)
    const c = document.createElement('canvas'); c.width = c.height = 64; const q = c.getContext('2d');
    const gr = q.createRadialGradient(32, 58, 2, 32, 50, 46); gr.addColorStop(0, '#fff'); gr.addColorStop(.35, '#a86a3a'); gr.addColorStop(1, '#000');
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  })(), emissiveIntensity: 0 }), rug = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 1 });
  const cols = [0, 0, 0];
  // Fogatas para cocinar delante de algunas tiendas: anillo de piedras, leña y brasas (Éxodo 16:23; Levítico 6:13)
  const stoneM = new THREE.MeshStandardMaterial({ color: 0x6d655b, roughness: 1, flatShading: true }), woodM = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 1 });
  const emberM = new THREE.MeshBasicMaterial({ color: 0xff7a1e }), fireM = new THREE.MeshBasicMaterial({ color: 0xffc04a });
  const stoneG = new THREE.DodecahedronGeometry(.13), logG = new THREE.CylinderGeometry(.045, .055, .8, 6), emberG = new THREE.CylinderGeometry(.24, .28, .06, 10), fireG = new THREE.ConeGeometry(.13, .38, 7);
  const fireCore = new THREE.MeshBasicMaterial({ color: 0xfff2b0 }), FL = new THREE.Group(), fires = [], firePts = [];
  // Cántaros de barro para el agua junto a la entrada de algunas tiendas (Génesis 24:14-15)
  const jarG = new THREE.LatheGeometry([[0, 0], [.1, 0], [.18, .1], [.21, .24], [.17, .39], [.08, .49], [.065, .55], [.095, .6], [.08, .61]].map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const jarM = new THREE.MeshStandardMaterial({ color: 0xa8603a, roughness: .95, side: THREE.DoubleSide });
  const ropeG = new THREE.CylinderGeometry(.012, .012, 1, 4), ropeM = new THREE.MeshStandardMaterial({ color: 0xb59a6a, roughness: 1 });
  const stakeG = new THREE.CylinderGeometry(.025, .015, .28, 5), stakeM = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 }), UPV = new THREE.Vector3(0, 1, 0);
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
    // Cuerdas tensas y estacas que sujetan la tienda al suelo: «alarga tus cuerdas y refuerza tus estacas» (Isaías 54:2)
    for (const sx of [-1, 1]) for (const lz of [-1.1, 1.1]) {
      const a = new THREE.Vector3(sx * 2.58, .88, lz), b = new THREE.Vector3(sx * 3.2, .06, lz), d = b.clone().sub(a);
      const rp = new THREE.Mesh(ropeG, ropeM); rp.position.copy(a).addScaledVector(d, .5); rp.scale.y = d.length(); rp.quaternion.setFromUnitVectors(UPV, d.normalize()); t.add(rp);
      const sk = new THREE.Mesh(stakeG, stakeM); sk.position.set(sx * 3.2, .1, lz); sk.rotation.z = sx * .35; t.add(sk);
      const wx = x + Math.cos(ry) * sx * 3.2 + Math.sin(ry) * lz, wz = z - Math.sin(ry) * sx * 3.2 + Math.cos(ry) * lz; addBox(wx - .2, wx + .2, wz - .2, wz + .2, .35);
    }
    const r2 = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), rug); r2.rotation.x = -Math.PI / 2; r2.position.set(0, .1, 2.6); t.add(r2);
    if (nTent % 3 === 1) for (const [jx, jz, js] of [[1.55, 2.75, 1], [1.95, 3.05, .8]]) { const j = new THREE.Mesh(jarG, jarM); j.position.set(jx, 0, jz); j.scale.setScalar(js); j.castShadow = true; t.add(j); }
    if (nTent++ % 3 === 0) {
      const f = new THREE.Group(); f.position.set(0, 0, 4.6); t.add(f);
      for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, st = new THREE.Mesh(stoneG, stoneM); st.position.set(Math.cos(a) * .42, .08, Math.sin(a) * .42); st.rotation.set(k, k * 2, 0); st.scale.y = .7; st.castShadow = true; f.add(st); }
      for (let k = 0; k < 3; k++) { const l = new THREE.Mesh(logG, woodM); l.position.y = .16; l.rotation.set(0, k * 2.09, 1.25); l.translateY(-.05); f.add(l); }
      const em = new THREE.Mesh(emberG, emberM); em.position.y = .04; f.add(em);
      const wx = x + Math.sin(ry) * 4.6, wz = z + Math.cos(ry) * 4.6; addBox(wx - .5, wx + .5, wz - .5, wz + .5, 1);
      // las llamas quedan fuera de la malla horneada para que puedan chisporrotear (se animan en update)
      firePts.push([wx, wz]);
      const fl = new THREE.Mesh(fireG, fireM); fl.position.set(wx, .28, wz); fl.userData.k = nTent * 1.7; fl.userData.b = 1; FL.add(fl); fires.push(fl);
      const fi = new THREE.Mesh(fireG, fireCore); fi.position.set(wx, .22, wz); fi.scale.setScalar(.55); fi.userData.k = nTent * 2.3 + 1; fi.userData.b = .55; FL.add(fi); fires.push(fi);
    }
    S.add(t);
    // Choque que sigue la forma real de la tienda (girada): el centro es más alto y los lados bajan.
    // Antes era un cuadrado fijo de 4,4 m que no giraba con la tienda y por las puntas se traspasaba.
    if (addObb) {
      const cs = Math.cos(ry), sn = Math.sin(ry);
      addObb(x, z, ry, 1.35, 1.75, 2.15);
      for (const sx of [-1, 1]) addObb(x + cs * sx * 1.98, z - sn * sx * 1.98, ry, .66, 1.75, 1.75);
    } else addBox(x - 2.7, x + 2.7, z - 2.7, z + 2.7, 2.2);
  }
  // Estandartes de las cuatro divisiones del campamento: Judá al oriente (junto al camino de la entrada), Rubén al sur,
  // Efraín al occidente y Dan al norte, «cada uno junto a su estandarte» (Números 2:2-3, 10, 18, 25)
  const flags = [];
  const poleM = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: .9 }), tipM = new THREE.MeshStandardMaterial({ color: 0xb08a3a, metalness: .6, roughness: .4 });
  for (const [name, col, a, dz] of [['JUDÁ', '#1f5fa8', 0, 10], ['RUBÉN', '#a3241e', Math.PI / 2, 0], ['EFRAÍN', '#2e5a2a', Math.PI, 0], ['DAN', '#b8962e', -Math.PI / 2, 0]]) {
    const x = cx + Math.cos(a) * radiusX * .78, z = cz + Math.sin(a) * radiusZ * .78 + dz; // entre el atrio y las tiendas
    const c = document.createElement('canvas'); c.width = 256; c.height = 160; const q = c.getContext('2d');
    q.fillStyle = col; q.fillRect(0, 0, 256, 160); q.strokeStyle = '#e8d6a0'; q.lineWidth = 10; q.strokeRect(8, 8, 240, 144);
    q.fillStyle = '#f4ead0'; q.font = 'bold 46px Georgia, serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(name, 128, 82);
    const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace;
    const fm = new THREE.MeshStandardMaterial({ map: ft, roughness: .95 });
    const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = Math.atan2(cx - x, cz - z);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 4.4, 6), poleM); pole.position.y = 2.2; pole.castShadow = true; st.add(pole);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.1, .3, 6), tipM); tip.position.y = 4.55; st.add(tip);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.7, 5), poleM); bar.rotation.z = Math.PI / 2; bar.position.set(.85, 4.15, 0); st.add(bar);
    // la tela del estandarte queda fuera de la malla horneada para que ondee con el viento (se anima en update)
    const sf = new THREE.Group(); sf.position.copy(st.position); sf.rotation.y = st.rotation.y; FL.add(sf);
    for (const s of [1, -1]) {
      const fg = new THREE.PlaneGeometry(1.6, 1, 10, 4), fl = new THREE.Mesh(fg, fm); fl.position.set(.85, 3.62, s * .012); if (s < 0) fl.rotation.y = Math.PI; sf.add(fl);
      flags.push({ g: fg, base: Float32Array.from(fg.attributes.position.array), s, k: a * 1.9 });
    }
    S.add(st);
    addBox(x - .3, x + .3, z - .3, z + .3, 4.4);
  }
  S.updateMatrixWorld(true);
  group.add(bakeStatic(S));
  // Humo tenue que sube de las fogatas y se deshace en el aire (Éxodo 16:23)
  const smokeM = new THREE.MeshLambertMaterial({ color: 0x9a948c, transparent: true, opacity: .24, depthWrite: false }), smokeG = new THREE.IcosahedronGeometry(.2, 1), puffs = [];
  for (const f of fires) if (f.userData.b === 1) for (let k = 0; k < 4; k++) {
    const pf = new THREE.Mesh(smokeG, smokeM); pf.userData = { x: f.position.x, z: f.position.z, o: k / 4, k: f.userData.k + k }; pf.renderOrder = 2; FL.add(pf); puffs.push(pf);
  }
  group.add(FL);
  return {
    doorM: dark, // entrada de las tiendas: applyTime la enciende de noche
    firePts, // dónde están las fogatas (para sentir el calor y oír el fuego)
    // las llamas de las fogatas parpadean y se mecen como fuego de verdad
    update(t) {
      for (const f of fires) {
        const k = f.userData.k, b = f.userData.b;
        const sy = 1 + Math.sin(t * 13 + k) * .18 + Math.sin(t * 29 + k * 3) * .1;
        f.scale.set(b * (1 - (sy - 1) * .4), b * sy, b * (1 - (sy - 1) * .4));
        f.rotation.set(Math.sin(t * 5 + k) * .12, t * 2 + k, Math.cos(t * 6 + k) * .12);
      }
      // los estandartes cuelgan de su vara y se mecen con la brisa del desierto: más abajo, más movimiento
      for (const fgl of flags) {
        const P = fgl.g.attributes.position, A = P.array, B = fgl.base;
        for (let i = 0; i < A.length; i += 3) {
          const xw = B[i] * fgl.s, hang = (.5 - B[i + 1]); // xw: posición a lo largo de la vara; hang: 0 arriba, 1 abajo
          A[i + 2] = fgl.s * hang * (Math.sin(t * 2.1 + xw * 2.4 + fgl.k) * .09 + Math.sin(t * 3.7 + xw * 4.1 + fgl.k * 2) * .035);
        }
        P.needsUpdate = true;
      }
      for (const pf of puffs) {
        const u = pf.userData, ph = (t * .22 + u.o) % 1; // 0 = recién salido, 1 = se deshizo
        const drift = ph * ph * .9;
        pf.position.set(u.x + Math.sin(u.k + t * .7) * .12 + drift, .55 + ph * 3.2, u.z + Math.cos(u.k * 1.3 + t * .5) * .12 + drift * .4);
        pf.scale.setScalar((.6 + ph * 2.2) * Math.sin(Math.PI * Math.min(1, ph * 1.15)) + .001);
      }
    },
  };
}
