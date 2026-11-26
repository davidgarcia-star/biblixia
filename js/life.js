import * as THREE from 'three';
import { createHuman, animateHuman, bakeStatic, PEOPLE_SKINS, randomStout } from './human.js';
import { pace } from './pace.js';
import { buildFood, buildChairs, buildBedroomTV, buildBathroom } from './hogar.js';

/* =========================================================
   VIDA EN LA CIUDAD: peatones, niños, comerciantes,
   la casa del jugador y un edificio de oficinas con varios pisos.
   ========================================================= */
const SKINS = PEOPLE_SKINS;
const TOPS = [0x1f5c70, 0x7a3b6e, 0xc0392b, 0x2e2e38, 0xe0a31a, 0x2e7d4f, 0x2a4a9a, 0xe87aa0, 0xf2f0e8, 0x8a5a2a];
const BOTS = [0x2b3a57, 0x22243a, 0x1a1a1e, 0x6a4a2a, 0x5a6a3a, 0xe8dcc0];
const STYLES = ['camiseta', 'camisa', 'abrigo', 'mangalarga', 'chaqueta', 'traje'];

function person(r, { kid = false, detail = .45, gender } = {}) {
  const f = gender ? gender === 'f' : r() < .5;
  const o = { detail, gender: f ? 'f' : 'm', skin: SKINS[(r() * SKINS.length) | 0], top: TOPS[(r() * TOPS.length) | 0], pants: BOTS[(r() * BOTS.length) | 0],
    skirt: BOTS[(r() * BOTS.length) | 0], legwear: f ? ['falda', 'pantalon', 'vestido', 'pantalon'][(r() * 4) | 0] : 'pantalon', topStyle: kid ? 'camiseta' : STYLES[(r() * STYLES.length) | 0],
    hair: f ? 'long' : 'short', hairColor: [0x1d130c, 0x3a2314, 0x5a3a1e, 0x2a1a10][(r() * 4) | 0], tie: 0x8a1c24, shoes: 0xf2f2f0, name: '', stout: kid ? 1 : randomStout(r) };
  const h = createHuman(o); if (kid) h.root.scale.setScalar(.62 + r() * .1);
  return h;
}

export async function buildLife({ W, group, addBox, addRamp, blockers, M, r, CURB, BLOCK, blocks, playerName, npcSpots }) {
  const walkers = [], acts = [], live = [], houseUpd = [], officeUpd = [];
  // reloj de pared redondo: sus manecillas marcan la hora real del dispositivo (se reutiliza en la casa y en la cafetería)
  const makeClock = R => {
    const ck = new THREE.Group(), c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#1c1d20'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, r0 = k % 5 ? 116 : 106; g.lineWidth = k % 5 ? 2 : 6; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 122, 128 - Math.cos(a) * 122); g.strokeStyle = '#1c1d20'; g.stroke(); }
    g.font = '700 26px system-ui, sans-serif'; for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2; g.fillText(String(k), 128 + Math.sin(a) * 86, 129 - Math.cos(a) * 86); }
    const ft = new THREE.CanvasTexture(c); ft.colorSpace = THREE.SRGBColorSpace;
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(R + .03, R + .03, .05, 40), mat(0x1c1d20, { roughness: .35, metalness: .4 })); rim.rotation.x = Math.PI / 2; ck.add(rim);
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshStandardMaterial({ map: ft, roughness: .6 })); face.position.z = .027; ck.add(face);
    const hand = (len, w, m, z) => { const p = new THREE.Group(); p.position.z = z; const b = new THREE.Mesh(new THREE.BoxGeometry(w, len, .006), m); b.position.y = len / 2 - .03; p.add(b); ck.add(p); return p; };
    const handM = mat(0x1c1d20, { roughness: .4 }), hH = hand(R * .55, .022, handM, .033), hM = hand(R * .8, .014, handM, .038), hS = hand(R * .88, .006, mat(0xc0282a), .043);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .02, 12), mat(0xc0282a)); pin.rotation.x = Math.PI / 2; pin.position.z = .046; ck.add(pin);
    ck.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    ck.userData.update = () => { const d = new Date(), s = d.getSeconds() + d.getMilliseconds() / 1000, m = d.getMinutes() + s / 60, h = (d.getHours() % 12) + m / 60; hS.rotation.z = -s / 60 * Math.PI * 2; hM.rotation.z = -m / 60 * Math.PI * 2; hH.rotation.z = -h / 12 * Math.PI * 2; };
    return ck;
  };
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
  const box = (w, h, d, m, x, y, z, { cast = true, recv = true, parent = group } = {}) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = recv; parent.add(b); return b; };
  const cyl = (rt, rb, h, m, x, y, z, seg = 16) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); c.position.set(x, y, z); c.castShadow = true; c.receiveShadow = true; group.add(c); return c; };
  const solid = (minX, maxX, minZ, maxZ, top, bottom = 0) => addBox(minX, maxX, minZ, maxZ, top, bottom);
  // arbolito de Navidad (solo en temporada): pino de tres pisos en maceta roja, bolitas de colores, estrella dorada,
  // lucecitas que titilan por turnos y regalitos debajo; se usa en la sala de la casa y en la cafetería de las oficinas
  const xmasTree = (tx, tz, base, upd) => {
    cyl(.24, .19, .34, mat(0xa3161f, { roughness: .45 }), tx, base + .17, tz, 18);
    cyl(.05, .06, .3, mat(0x5a3d26, { roughness: .9 }), tx, base + .45, tz, 8);
    const pineM = mat(0x1f5a32, { roughness: .85 }), pineM2 = mat(0x2a6e3e, { roughness: .85 });
    const tiers = [[.62, .78, .92], [.48, .66, 1.36], [.32, .56, 1.76]];   // radio, alto, altura del centro
    for (let k = 0; k < tiers.length; k++) { const [rr, hh, yy] = tiers[k]; const c = new THREE.Mesh(new THREE.ConeGeometry(rr, hh, 14), k % 2 ? pineM2 : pineM); c.position.set(tx, base + yy, tz); c.rotation.y = k * .4; c.castShadow = true; c.receiveShadow = true; group.add(c); }
    const ballG = new THREE.SphereGeometry(.045, 10, 8), ballMs = [0xc0182a, 0xe0b230, 0x2f62c8, 0xd9dde2].map(c => mat(c, { roughness: .2, metalness: .5 }));
    const lightG = new THREE.SphereGeometry(.022, 6, 5), lightMs = [0xffd36b, 0xff5a5a, 0x7fd0ff].map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.2 }));
    let n = 0;
    for (const [rr, hh, yy] of tiers) {
      for (let k = 0; k < 9; k++, n++) {
        const a = k / 9 * Math.PI * 2 + n * .37, low = k % 2 === 0, f = low ? .82 : .45; // bolitas abajo del piso, luces más arriba
        const y = base + yy - hh / 2 + (1 - f) * hh + .02, rad = rr * f + .02;
        const o = new THREE.Mesh(low ? ballG : lightG, low ? ballMs[n % 4] : lightMs[n % 3]);
        o.position.set(tx + Math.cos(a) * rad, y, tz + Math.sin(a) * rad); o.raycast = () => {}; group.add(o);
      }
    }
    // estrella dorada de cinco puntas que brilla en la punta del árbol
    const sh = new THREE.Shape();
    for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? .05 : .12; k ? sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const starM = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb000, emissiveIntensity: .9, metalness: .6, roughness: .3 });
    const star = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false }), starM);
    star.position.set(tx, base + 2.12, tz - .015); star.rotation.y = .6; group.add(star);
    // regalitos envueltos debajo del árbol (del lado de la sala), con cinta en cruz y lazo encima
    for (const [a, w, h, d, pc, rc] of [[.05, .26, .2, .22, 0x2f62c8, 0xe0b230], [.8, .2, .16, .2, 0xc0182a, 0xf2f2f0], [1.5, .24, .24, .18, 0x2a8a4a, 0xc0182a]]) {
      const gx = tx + Math.cos(a) * .44, gz = tz + Math.sin(a) * .44, gy = base + h / 2 + .002;
      const gift = box(w, h, d, mat(pc, { roughness: .5 }), gx, gy, gz); gift.rotation.y = a;
      const ribM = mat(rc, { roughness: .35, metalness: .2 });
      const r1 = box(w + .006, h + .006, .03, ribM, gx, gy, gz, { cast: false }); r1.rotation.y = a;
      const r2 = box(.03, h + .006, d + .006, ribM, gx, gy, gz, { cast: false }); r2.rotation.y = a;
      for (const s of [-1, 1]) { const lo = box(.07, .035, .025, ribM, gx, gy + h / 2 + .02, gz, { cast: false }); lo.rotation.set(0, a, s * .5); lo.position.x += Math.cos(a) * s * .03; lo.position.z -= Math.sin(a) * s * .03; }
    }
    upd.push(t => {
      for (let k = 0; k < 3; k++) lightMs[k].emissiveIntensity = .35 + (Math.sin(t * 2.2 + k * 2.1) * .5 + .5) * 1.5;
      starM.emissiveIntensity = .7 + Math.sin(t * 1.3) * .3;
    });
    solid(tx - .6, tx + .6, tz - .6, tz + .6, base + 2.2);
  };
  const act = (x, z, y, label, fn, rad = 1.6) => acts.push({ x, z, y, label, fn, r: rad });
  // vapor suave que sube de las cafeteras (se anima solo cuando el jugador está cerca)
  const steams = []; let steamTex = null;
  const steam = (x, y, z) => {
    if (!steamTex) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); steamTex = new THREE.CanvasTexture(c); }
    const puffs = [];
    for (let k = 0; k < 4; k++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); sp.scale.setScalar(.12); sp.position.set(x, y, z); sp.renderOrder = 3; group.add(sp); puffs.push({ sp, ph: k / 4 }); }
    steams.push({ x, y, z, puffs });
  };
  const sign = (text, sub, x, y, z, ry = 0) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#1a1206'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#f5c542'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116);
    g.fillStyle = '#ffd34d'; g.font = '800 ' + (sub ? 44 : 60) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText(text, 256, sub ? 62 : 86); if (sub) { g.fillStyle = '#e9dcc0'; g.font = '600 24px system-ui, sans-serif'; g.fillText(sub, 256, 100); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .35 }));
    m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return m;
  };
  const staticHuman = (opts, x, y, z, ry, pose) => {
    const h = createHuman({ detail: .5, stout: randomStout(r), ...opts });
    if (pose === 'sit') { for (const l of h.legs) { l.thigh.rotation.x = -1.5; l.knee.rotation.x = 1.5; } h.hips.position.y = .52; for (const a of h.arms) { a.shoulder.rotation.x = -.6; a.elbow.rotation.x = -.7; } }
    if (pose === 'work') { for (const a of h.arms) { a.shoulder.rotation.x = -.7; a.elbow.rotation.x = -.9; } }
    const b = bakeStatic(h.root); b.position.set(x, y, z); b.rotation.y = ry; group.add(b);
    if (pose === 'sit') { const ch = new THREE.Mesh(new THREE.BoxGeometry(.5, .08, .5), mat(0x2a2e35)); ch.position.set(x, y + .44, z); group.add(ch); const bk = new THREE.Mesh(new THREE.BoxGeometry(.5, .55, .06), mat(0x2a2e35)); bk.position.set(x - Math.sin(ry) * .26, y + .72, z - Math.cos(ry) * .26); bk.rotation.y = ry; group.add(bk); }
    return b;
  };

  const towers = blocks.filter(b => b[2] === 'casa' || b[2] === 'oficinas' || b[2] === 'tower' || b[2] === 'plaza');

  /* ---------- Casa del jugador ---------- */
  const casa = blocks.find(b => b[2] === 'casa');
  if (casa) {
    const [x0, z0] = casa, cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2, fy = CURB;
    const HW = 7, HD = 5.5, H = 3.3, T = .22;               // medio ancho, media profundidad, alto, grosor de pared
    // casa moderna: paredes blancas, piso de porcelanato claro, techo plano con alero y detalles negros y de madera
    const wallM = mat(0xf6f5f2, { roughness: .75 }), trimM = mat(0x6b4a32, { roughness: .55 }), floorM = mat(0xdcd8d0, { roughness: .3 });
    const darkM = mat(0x24272c, { roughness: .45, metalness: .3 }), woodM = mat(0xa8743f, { roughness: .55 }), frameM = mat(0x111214, { roughness: .35, metalness: .5 });
    // jardín, camino de losas y luces bajas
    const lawnT = M.grass.map.clone(); lawnT.repeat.set(BLOCK / 4, BLOCK / 4); lawnT.needsUpdate = true;
    box(BLOCK - 2, .04, BLOCK - 2, new THREE.MeshStandardMaterial({ map: lawnT, bumpMap: lawnT, bumpScale: 2, roughness: 1 }), cx, fy + .02, cz, { cast: false });
    const pathL = BLOCK / 2 - HD - 1;
    for (let k = 0; k < 6; k++) box(1.6, .08, pathL / 6 - .25, mat(0xcfccc6, { roughness: .6 }), cx, fy + .05, z0 + 1 + (k + .5) * pathL / 6, { cast: false });
    const ledM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0c8, emissiveIntensity: 2 });
    for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) { box(.1, .45, .1, darkM, cx + sx * 1.15, fy + .22, z0 + 2 + k * pathL / 3, { cast: false }); box(.11, .06, .11, ledM, cx + sx * 1.15, fy + .42, z0 + 2 + k * pathL / 3, { cast: false }); }
    { // buzón moderno con el número de la casa junto a la entrada del camino de losas
      const bx = cx + 2.2, bz = z0 + 1.1;
      box(.08, 1.05, .08, darkM, bx, fy + .53, bz);                                     // poste
      box(.3, .34, .48, darkM, bx, fy + 1.2, bz);                                       // caja del buzón
      box(.24, .03, .04, mat(0xc9ccd0, { metalness: .8, roughness: .25 }), bx, fy + 1.3, bz - .25, { cast: false }); // ranura metálica
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#24272c'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#f2c14e'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 44px system-ui, sans-serif'; g.fillText('7', 64, 34);
      const nt = new THREE.CanvasTexture(c); nt.colorSpace = THREE.SRGBColorSpace;
      const num = new THREE.Mesh(new THREE.PlaneGeometry(.26, .13), new THREE.MeshStandardMaterial({ map: nt, roughness: .5 }));
      num.position.set(bx, fy + 1.12, bz - .245); num.rotation.y = Math.PI; group.add(num);
      const flag = box(.03, .2, .05, mat(0xc0282a, { roughness: .5 }), bx + .17, fy + 1.3, bz + .1, { cast: false }); flag.rotation.z = -.2; // banderita roja
      if (window.Navidad && window.Navidad.activo) {
        // adorno navideño del buzón (solo en temporada, como la corona): ramita de pino enrollada al poste con bayas rojas
        // y un moño rojo de dos lazos con cintas colgantes mirando hacia la calle (pocas mallas, sin luces nuevas)
        const pineM = mat(0x1f5a2c, { roughness: .9 }), bowM = mat(0xc8102e, { roughness: .4 });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.075, .035, 6, 14), pineM); ring.rotation.x = Math.PI / 2; ring.position.set(bx, fy + .82, bz); group.add(ring);
        const berryG = new THREE.SphereGeometry(.018, 6, 5);
        for (let k = 0; k < 5; k++) { const a = k * 1.26 + .4, b = new THREE.Mesh(berryG, bowM); b.position.set(bx + Math.cos(a) * .1, fy + .83 + (k % 2) * .02, bz + Math.sin(a) * .1); group.add(b); }
        const fz = bz - .125;
        for (const sx of [-1, 1]) {
          const loop = new THREE.Mesh(new THREE.TorusGeometry(.055, .017, 6, 10), bowM); loop.position.set(bx + sx * .06, fy + .87, fz); loop.scale.set(1, .7, 1); group.add(loop);
          const tail = new THREE.Mesh(new THREE.BoxGeometry(.03, .13, .008), bowM); tail.position.set(bx + sx * .03, fy + .78, fz); tail.rotation.z = sx * .35; group.add(tail);
        }
        const knot = new THREE.Mesh(new THREE.SphereGeometry(.024, 8, 6), bowM); knot.position.set(bx, fy + .87, fz); group.add(knot);
      }
      solid(bx - .16, bx + .16, bz - .25, bz + .25, fy + 1.37);
    }
    box(HW * 2, .14, HD * 2, floorM, cx, fy + .07, cz, { cast: false });
    const X0 = cx - HW, X1 = cx + HW, Z0 = cz - HD, Z1 = cz + HD, DW = 1.4;
    const wall = (ax, az, bx, bz, m = wallM) => { const w = Math.abs(bx - ax) || T, d = Math.abs(bz - az) || T; const mm = box(w, H, d, m, (ax + bx) / 2, fy + H / 2, (az + bz) / 2); blockers.push(mm); solid(Math.min(ax, bx) - T / 2, Math.max(ax, bx) + T / 2, Math.min(az, bz) - T / 2, Math.max(az, bz) + T / 2, fy + H); };
    // ventanal de piso a techo (vidrio de verdad: se ve hacia dentro y hacia fuera)
    const winGlass = new THREE.MeshStandardMaterial({ color: 0x9cc4d4, metalness: .2, roughness: .03, transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide });
    const glassWall = (ax, az, bx, bz, panels = 3) => {
      const alongX = Math.abs(bx - ax) > Math.abs(bz - az), L = alongX ? bx - ax : bz - az;
      box(alongX ? Math.abs(L) : .04, H - .1, alongX ? .04 : Math.abs(L), winGlass, (ax + bx) / 2, fy + H / 2, (az + bz) / 2, { cast: false, recv: false });
      for (let k = 0; k <= panels; k++) { const t = k / panels, px = ax + (bx - ax) * t, pz = az + (bz - az) * t; box(.07, H, .07, frameM, px, fy + H / 2, pz, { cast: false }); }
      box(alongX ? Math.abs(L) : .08, .08, alongX ? .08 : Math.abs(L), frameM, (ax + bx) / 2, fy + .18, (az + bz) / 2, { cast: false });
      solid(Math.min(ax, bx) - T / 2, Math.max(ax, bx) + T / 2, Math.min(az, bz) - T / 2, Math.max(az, bz) + T / 2, fy + H);
    };
    // fondo: ventanal hacia el patio y la piscina en la sala; pared en el dormitorio
    glassWall(X0 + .5, Z1, cx + 1.4, Z1, 4); wall(X0, Z1, X0 + .5, Z1); wall(cx + 1.4, Z1, X1, Z1);
    wall(X0, Z0, X0, Z1); wall(X1, Z0, X1, Z1);
    // frente: ventanal en la sala, puerta pivotante y pared del baño (con ventanita alta)
    wall(X0, Z0, X0 + .5, Z0); glassWall(X0 + .5, Z0, cx - 1.6, Z0, 3); wall(cx - 1.6, Z0, cx - DW / 2, Z0, darkM); wall(cx + DW / 2, Z0, X1, Z0);
    box(DW + .3, .5, T + .05, darkM, cx, fy + H - .25, Z0);                            // dintel
    const door = box(.08, H - .55, DW - .2, woodM, cx - DW / 2 + .2, fy + (H - .55) / 2 + .14, Z0 - .4, { cast: true }); door.rotation.y = Math.PI / 2 - 1.1; // puerta de madera abierta
    box(.03, .9, .04, frameM, cx - DW / 2 + .55, fy + 1.1, Z0 - .9, { cast: false });
    { // alfombra de bienvenida de fibra de coco delante de la puerta (la lee quien llega a la casa)
      const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#9a6a3a'; g.fillRect(0, 0, 256, 128);
      for (let k = 0; k < 900; k++) { g.fillStyle = Math.random() < .5 ? 'rgba(60,35,15,.25)' : 'rgba(210,160,100,.22)'; g.fillRect(Math.random() * 256, Math.random() * 128, 1 + Math.random() * 2, 1); }
      g.strokeStyle = '#3b2412'; g.lineWidth = 7; g.strokeRect(9, 9, 238, 110);
      g.fillStyle = '#3b2412'; g.textAlign = 'center'; g.font = '900 34px system-ui, sans-serif'; g.fillText('BIENVENIDOS', 128, 62);
      g.font = '700 15px system-ui, sans-serif'; g.fillText('Josué 24:15', 128, 92);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      const fiber = mat(0x7a5230, { roughness: 1 });
      const mt = new THREE.Mesh(new THREE.BoxGeometry(1.3, .025, .72), [fiber, fiber, new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), fiber, fiber, fiber]);
      mt.position.set(cx + .1, fy + .1, Z0 - .62); mt.rotation.y = Math.PI; mt.receiveShadow = true; group.add(mt);
    }
    // apliques de pared a ambos lados de la puerta: cuerpo negro con luz cálida hacia arriba y hacia abajo
    for (const sx of [-1.15, 1.05]) {
      const sz = Z0 - (sx < 0 ? .16 : .225);
      box(.16, .34, .1, darkM, cx + sx, fy + 2.1, sz, { cast: false });
      for (const dy of [-.18, .18]) box(.12, .025, .07, ledM, cx + sx, fy + 2.1 + dy, sz, { cast: false, recv: false });
    }
    { // polillas que revolotean alrededor de los apliques de la puerta solo de noche (de día y al atardecer no se ven)
      const mothM = new THREE.MeshStandardMaterial({ color: 0xd8cfb8, emissive: 0x6a5f48, roughness: 1, side: THREE.DoubleSide }); // reflejan la luz del aplique
      const wingG = new THREE.PlaneGeometry(.06, .04); wingG.rotateX(-Math.PI / 2); wingG.translate(.03, 0, 0);
      const moths = [];
      for (const sx of [-1.15, 1.05]) for (let k = 0; k < 3; k++) {
        const mo = new THREE.Group(), wings = [];
        for (const s of [-1, 1]) { const w = new THREE.Mesh(wingG, mothM); w.scale.x = s; w.raycast = () => {}; mo.add(w); wings.push([w, s]); }
        mo.visible = false; group.add(mo);
        moths.push({ mo, wings, x: cx + sx, z: Z0 - (sx < 0 ? .16 : .225) - .2, ph: k * 2.1 + sx * 3, sp: 1.6 + k * .45 });
      }
      houseUpd.push(t => {
        const night = !!(M.lamp && M.lamp.emissiveIntensity > 5);
        for (const m of moths) {
          m.mo.visible = night; if (!night) continue;
          const a = t * m.sp + m.ph, r0 = .16 + Math.sin(t * 1.3 + m.ph) * .07;   // vuelo errático en lazos junto a la luz
          m.mo.position.set(m.x + Math.cos(a) * r0, fy + 2.1 + Math.sin(a * 1.7) * .22, m.z + Math.sin(a) * r0 * .7);
          m.mo.rotation.y = -a;
          const f = Math.sin(t * 30 + m.ph) * .9;                                     // aleteo muy rápido
          for (const [w, s] of m.wings) w.rotation.z = s * f;
        }
      });
    }
    { // dos maceteros altos de concreto con arbustos redondos a los lados de la entrada
      const potM = mat(0x8d8a85, { roughness: .9 }), soilM = mat(0x3a2a1c, { roughness: 1 });
      const leafM = [mat(0x2f6b2a, { roughness: .85 }), mat(0x3d7d33, { roughness: .85 })];
      const bushG = new THREE.IcosahedronGeometry(.3, 1);
      for (const sx of [-1.6, 1.55]) {
        const px = cx + sx, pz = Z0 - .5;
        box(.52, .62, .52, potM, px, fy + .14 + .31, pz);
        box(.44, .02, .44, soilM, px, fy + .14 + .6, pz, { cast: false });
        for (const [ox, oy, oz, s] of [[0, .88, 0, 1], [-.1, .8, .09, .7], [.11, .82, -.08, .72]]) {
          const b = new THREE.Mesh(bushG, leafM[(ox > 0) | 0]); b.position.set(px + ox, fy + .14 + oy, pz + oz); b.scale.setScalar(s); b.rotation.set(s * 3, s * 5, 0); b.castShadow = true; group.add(b);
        }
        solid(px - .27, px + .27, pz - .27, pz + .27, fy + .76);
      }
      { // florecitas rojas de cayena en los arbustos y un colibrí que de día va de un macetero al otro a libar
        // «Mirad las aves del cielo, que no siembran, ni siegan, ni recogen en graneros, y sin embargo, vuestro Padre celestial las alimenta» (Mateo 6:26)
        const flM = mat(0xd8243a, { roughness: .6 }), ctrM = mat(0xf2c94c, { roughness: .6 }), flG = new THREE.SphereGeometry(.042, 7, 5), ctG = new THREE.SphereGeometry(.013, 5, 4);
        const spots = [];
        for (const sx of [-1.6, 1.55]) {
          const px = cx + sx, pz = Z0 - .5, by = fy + .14 + .88;
          for (const [a, h] of [[-1.9, .05], [-1.4, .16], [-1.05, -.04], [-2.3, -.08], [-.6, .1]]) {   // del lado de la calle (‑z)
            const fx = px + Math.cos(a) * .325, fz = pz + Math.sin(a) * .325, f = new THREE.Mesh(flG, flM);
            f.position.set(fx, by + h, fz); f.scale.set(1, .55, 1); f.rotation.set(Math.sin(a) * .9, 0, Math.cos(a) * .9); f.raycast = () => {}; group.add(f);
            const c = new THREE.Mesh(ctG, ctrM); c.position.set(fx + Math.cos(a) * .03, by + h + .006, fz + Math.sin(a) * .03); c.raycast = () => {}; group.add(c);
          }
          spots.push([px + Math.cos(-1.4) * .48, by + .16, pz + Math.sin(-1.4) * .48, px, pz]);       // punto donde se queda suspendido
        }
        const hb = new THREE.Group(), greenM = mat(0x2f9e6a, { metalness: .35, roughness: .35 }), throatM = mat(0xc4123a, { metalness: .3, roughness: .35 });
        const hbBody = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), greenM); hbBody.scale.set(.8, .8, 1.5); hbBody.rotation.x = .5; hb.add(hbBody);
        const hbHead = new THREE.Mesh(new THREE.SphereGeometry(.021, 8, 6), greenM); hbHead.position.set(0, .03, .03); hb.add(hbHead);
        const thr = new THREE.Mesh(new THREE.SphereGeometry(.016, 7, 5), throatM); thr.position.set(0, .018, .038); hb.add(thr);   // gorguera roja
        const bill = new THREE.Mesh(new THREE.CylinderGeometry(.002, .004, .06, 5), mat(0x151515)); bill.rotation.x = Math.PI / 2; bill.position.set(0, .03, .08); hb.add(bill); // pico largo y fino
        const tl = new THREE.Mesh(new THREE.ConeGeometry(.011, .04, 4), greenM); tl.rotation.x = -Math.PI / 2 - .6; tl.position.set(0, -.02, -.05); hb.add(tl);
        const wingM = new THREE.MeshStandardMaterial({ color: 0x9fb8b0, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false });
        const wingG = new THREE.PlaneGeometry(.075, .022); wingG.translate(.0375, 0, 0);
        const hbW = [];
        for (const s of [-1, 1]) { const w = new THREE.Mesh(wingG, wingM); w.scale.x = s; w.position.set(s * .012, .015, 0); hb.add(w); hbW.push([w, s]); }
        hb.traverse(o => { if (o.isMesh) o.raycast = () => {}; });
        hb.name = 'colibri'; hb.visible = false; group.add(hb);
        const CYC = 9;   // 3,5 s libando en cada macetero y 1 s de vuelo entre uno y otro
        houseUpd.push(t => {
          const on = (M.timeMode || 'dia') === 'dia';
          hb.visible = on; if (!on) return;
          const c = t % (CYC * 2), i = c < CYC ? 0 : 1, k = c % CYC;
          const A = spots[i], B = spots[1 - i];
          let x, y, z, yaw;
          if (k < 7.6) {                                                    // suspendido frente a las flores, entrando y saliendo el pico
            const sub = Math.floor(k / 2.6), dip = Math.max(0, Math.sin((k % 2.6) / 2.6 * Math.PI * 2)) * .06;
            const ox = (sub - 1) * .07;
            const dx = A[3] - A[0], dz = A[4] - A[2], L = Math.hypot(dx, dz);
            x = A[0] + dx / L * dip + ox; z = A[2] + dz / L * dip; y = A[1] + Math.sin(t * 5) * .012 - sub * .03;
            yaw = Math.atan2(dx, dz);
          } else {                                                          // vuela rápido en arco al otro macetero
            const p = (k - 7.6) / 1.4, e = p * p * (3 - 2 * p);
            x = A[0] + (B[0] - A[0]) * e; z = A[2] + (B[2] - A[2]) * e - Math.sin(p * Math.PI) * .5; y = A[1] + (B[1] - A[1]) * e + Math.sin(p * Math.PI) * .35;
            yaw = Math.atan2(B[0] - A[0], B[2] - A[2]);
          }
          hb.position.set(x, y, z); hb.rotation.y = yaw;
          const f = Math.sin(t * 70) * 1.1;                                 // aleteo zumbante
          for (const [w, s] of hbW) w.rotation.z = s * f;
        });
      }
    }
    { // bebedero de piedra para pajaritos en el jardín delantero, con un gorrión que se inclina a beber
      const bbx = cx - 6, bbz = z0 + 6.5, stoneM = mat(0xb9b2a6, { roughness: .95 });
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(.12, .2, .72, 10), stoneM); ped.position.set(bbx, fy + .04 + .36, bbz); ped.castShadow = true; ped.receiveShadow = true; group.add(ped);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(.28, .32, .08, 12), stoneM); base.position.set(bbx, fy + .08, bbz); base.receiveShadow = true; group.add(base);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(.46, .3, .14, 16), stoneM); bowl.position.set(bbx, fy + .83, bbz); bowl.castShadow = true; bowl.receiveShadow = true; group.add(bowl);
      const water = new THREE.Mesh(new THREE.CircleGeometry(.4, 18), new THREE.MeshStandardMaterial({ color: 0x5f9fb8, roughness: .08, metalness: .1 }));
      water.rotation.x = -Math.PI / 2; water.position.set(bbx, fy + .905, bbz); group.add(water);
      // gorrión sentado en el borde: cuerpo, cabeza, pico y cola; baja la cabeza para beber de vez en cuando
      const bird = new THREE.Group(), brownM = mat(0x7a5634, { roughness: .8 }), bellyM = mat(0xd8c6a8, { roughness: .8 });
      const body = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 6), brownM); body.scale.set(1, .85, 1.35); bird.add(body);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), bellyM); belly.position.set(0, -.018, .01); belly.scale.set(.95, .8, 1.2); bird.add(belly);
      const neck = new THREE.Group(); neck.position.set(0, .03, .06); bird.add(neck);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.038, 8, 6), brownM); head.position.set(0, .025, .02); neck.add(head);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(.012, .035, 5), mat(0x3a3028, { roughness: .6 })); beak.rotation.x = Math.PI / 2; beak.position.set(0, .02, .06); neck.add(beak);
      const tail = box(.05, .012, .07, brownM, 0, .015, -.1, { cast: false, parent: bird }); tail.rotation.x = -.35;
      bird.traverse(o => { if (o.isMesh) o.raycast = () => {}; });
      bird.position.set(bbx + .42, fy + .96, bbz); bird.rotation.y = -Math.PI / 2; group.add(bird);   // en el borde mirando al agua
      // ondita en el agua cada vez que el gorrión toca el agua con el pico: un anillo que se abre y se desvanece
      const rippleM = new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const ripple = new THREE.Mesh(new THREE.RingGeometry(.026, .036, 24), rippleM);
      ripple.rotation.x = -Math.PI / 2; ripple.position.set(bbx + .22, fy + .908, bbz); ripple.raycast = () => {}; ripple.visible = false; ripple.userData.live = true; group.add(ripple);
      houseUpd.push(t => {
        const c = t % 5.5, dip = c < .9 ? Math.sin(c / .9 * Math.PI) : 0;                   // cada 5,5 s baja a beber
        neck.rotation.x = dip * .9; bird.rotation.x = dip * .25;
        const rk = (c - .45) / 1.6;                                                          // la onda nace al tocar el agua
        ripple.visible = rk > 0 && rk < 1;
        if (ripple.visible) { ripple.scale.setScalar(1 + rk * 5); rippleM.opacity = .55 * (1 - rk); }
        tail.rotation.x = -.35 - dip * .3 + (c > 3 && c < 3.25 ? Math.sin((c - 3) * 25) * .2 : 0); // meneíto de cola
      });
      solid(bbx - .45, bbx + .45, bbz - .45, bbz + .45, fy + .9);
    }
    { // gato atigrado anaranjado durmiendo enroscado en la grama junto a la entrada: respira, mueve la cola y una oreja
      const kx = cx - 2.45, kz = Z0 - .75, ky = fy + .04;
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#d98a3d'; g.fillRect(0, 0, 128, 64); g.strokeStyle = 'rgba(160,88,30,.55)'; g.lineWidth = 3;
      for (let k = 0; k < 12; k++) { g.beginPath(); for (let y = 8; y <= 56; y += 4) g.lineTo(k * 10.7 + 4 + Math.sin(y * .25 + k) * 2, y); g.stroke(); } // rayas suaves del atigrado
      const furT = new THREE.CanvasTexture(c); furT.colorSpace = THREE.SRGBColorSpace;
      const furM = new THREE.MeshStandardMaterial({ map: furT, roughness: .9 }), plainM = mat(0xd98a3d, { roughness: .9 }), creamM = mat(0xf1e2c8, { roughness: .9 });
      const cat = new THREE.Group(); cat.name = 'gatoCasa'; cat.position.set(kx, ky, kz); cat.rotation.y = .6; group.add(cat);
      const torso = new THREE.Group(); cat.add(torso);
      const body = new THREE.Mesh(new THREE.SphereGeometry(.16, 14, 10), furM); body.scale.set(1.35, .6, 1); body.position.y = .095; torso.add(body);
      const head = new THREE.Group(); head.position.set(.17, .09, .06); cat.add(head);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(.075, 12, 9), plainM); skull.scale.set(1, .85, 1); head.add(skull);
      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 6), creamM); muzzle.position.set(.055, -.02, 0); muzzle.scale.set(.8, .7, 1.1); head.add(muzzle);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.009, 6, 4), mat(0xc77a7a)); nose.position.set(.083, -.008, 0); head.add(nose);
      for (const s of [-1, 1]) { const eye = box(.004, .004, .024, mat(0x2a1a10), .06, .018, s * .03, { cast: false, parent: head }); eye.rotation.y = s * .2; } // ojitos cerrados
      const earG = new THREE.ConeGeometry(.028, .055, 4), ears = [];
      for (const s of [-1, 1]) { const e = new THREE.Mesh(earG, plainM); e.position.set(-.005, .062, s * .04); e.rotation.x = s * .35; head.add(e); ears.push(e); }
      for (const s of [-1, 1]) { const paw = new THREE.Mesh(new THREE.SphereGeometry(.03, 8, 6), creamM); paw.scale.set(1.6, .7, 1); paw.position.set(.19, .022, s * .045 - .03); cat.add(paw); } // patitas delanteras
      // cola que rodea el cuerpo y su puntita que se mueve
      const tail = new THREE.Mesh(new THREE.TorusGeometry(.2, .028, 7, 18, Math.PI * 1.1), furM); tail.rotation.x = -Math.PI / 2; tail.position.set(0, .035, 0); tail.rotation.z = Math.PI * .95; cat.add(tail);
      const tip = new THREE.Group(); tip.position.set(.2 * Math.cos(Math.PI * .95 + Math.PI * 1.1), .035, -.2 * Math.sin(Math.PI * .95 + Math.PI * 1.1)); cat.add(tip); tip.rotation.y = 1.73;
      const tipM = new THREE.Mesh(new THREE.CylinderGeometry(.022, .028, .09, 7), furM); tipM.rotation.z = Math.PI / 2; tipM.position.x = .045; tip.add(tipM);
      cat.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.raycast = () => {}; } });
      houseUpd.push(t => {
        const br = Math.sin(t * 2.4) * .5 + .5;                                             // respiración tranquila
        torso.scale.set(1 + br * .025, 1 + br * .06, 1 + br * .025); head.position.y = .09 + br * .006;
        const c2 = t % 7; tip.rotation.y = 1.73 + (c2 < 1.2 ? Math.sin(c2 / 1.2 * Math.PI * 2) * .5 : 0); // la puntita de la cola se mueve
        const c3 = t % 9.5; ears[1].rotation.z = c3 > 6 && c3 < 6.3 ? Math.sin((c3 - 6) * 30) * .35 : 0; // sacudida de oreja
      });
      solid(kx - .3, kx + .3, kz - .3, kz + .3, ky + .2);
    }
    { // aspersor de impacto en la grama delantera: de día va regando en abanico, girando de un lado a otro con chorritos que caen en arco
      // «Él riega los montes desde sus aposentos; del fruto de sus obras se sacia la tierra» (Salmo 104:13). De tarde y de noche se apaga.
      const sx = cx - 4.5, sz = z0 + 9.2, sy = fy + .04;
      const blackM = mat(0x1d1f22, { roughness: .6 }), brassM = mat(0xc9a24a, { metalness: .8, roughness: .3 });
      box(.16, .05, .16, blackM, sx, sy + .025, sz, { cast: false });                              // base enterrada en la grama
      box(.035, .16, .035, blackM, sx, sy + .13, sz, { cast: false });                             // tubo
      const head = new THREE.Group(); head.position.set(sx, sy + .22, sz); group.add(head);
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.014, .02, .14, 8), brassM); nozzle.rotation.z = Math.PI / 2 - .7; nozzle.position.x = .05; head.add(nozzle); // boquilla inclinada
      const arm = new THREE.Mesh(new THREE.BoxGeometry(.12, .015, .02), brassM); arm.position.set(.02, .05, 0); head.add(arm); // brazo del martillito
      head.traverse(o => { if (o.isMesh) { o.raycast = () => {}; } });
      const N = 150, pos = new Float32Array(N * 3), seed = [];
      for (let k = 0; k < N; k++) { seed.push([Math.random(), .85 + Math.random() * .3, (Math.random() - .5) * .14]); pos[k * 3] = sx; pos[k * 3 + 1] = sy + .26; pos[k * 3 + 2] = sz; } // arrancan en la boquilla (así el ocultado por distancia las ubica bien)
      const dropG = new THREE.BufferGeometry(); dropG.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dc = document.createElement('canvas'); dc.width = dc.height = 32; const dg = dc.getContext('2d'), gr = dg.createRadialGradient(16, 16, 2, 16, 16, 15);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(225,244,255,.8)'); gr.addColorStop(1, 'rgba(225,244,255,0)'); dg.fillStyle = gr; dg.fillRect(0, 0, 32, 32); // gotita redonda
      const drops = new THREE.Points(dropG, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(dc), color: 0xeaf7ff, size: .08, transparent: true, opacity: .85, depthWrite: false }));
      drops.frustumCulled = false; drops.raycast = () => {}; group.add(drops);
      const VH = 3, VY = 2.6, G = 9.8, LIFE = 2 * VY / G;
      const ang = tt => -Math.PI / 2 + Math.sin(tt * .45) * 1.1;                                  // barre un abanico mirando hacia la calle
      houseUpd.push(t => {
        const on = (M.timeMode || 'dia') === 'dia';
        drops.visible = on; if (!on) return;
        const a = ang(t); head.rotation.y = -a; arm.rotation.y = Math.sin(t * 14) * .35;          // el martillito golpea y la cabeza avanza
        for (let k = 0; k < N; k++) {
          const [ph, sp, jit] = seed[k], p = (t / LIFE + ph) % 1, tau = p * LIFE, a0 = ang(t - tau) + jit; // cada gota sale en la dirección que tenía la boquilla
          const d = VH * sp * tau;
          pos[k * 3] = sx + Math.cos(a0) * d; pos[k * 3 + 1] = Math.max(sy + .05, sy + .26 + VY * sp * tau - .5 * G * tau * tau); pos[k * 3 + 2] = sz + Math.sin(a0) * d;
        }
        dropG.attributes.position.needsUpdate = true;
      });
    }
    { // casita de madera del perro «FIEL» en el jardín delantero, con su perro echado delante: jadea, mueve la cola y mira a los lados
      // «El justo se preocupa de la vida de su ganado» (Proverbios 12:10)
      const hx = cx + 10.5, hz = z0 + 10, hy = fy + .04;
      const plankM = mat(0xb5793f, { roughness: .8 }), roofM = mat(0x8c2f24, { roughness: .7 }), holeM = mat(0x16110c, { roughness: 1 });
      box(1.0, .8, 1.1, plankM, hx, hy + .4, hz);                                                   // cuerpo de la casita
      for (let k = 1; k < 5; k++) box(1.02, .015, 1.12, mat(0x8f5c2e, { roughness: .9 }), hx, hy + k * .16, hz, { cast: false }); // juntas de las tablas
      const gable = new THREE.Shape(); gable.moveTo(-.5, 0); gable.lineTo(.5, 0); gable.lineTo(0, .38); gable.closePath();
      const gG = new THREE.ShapeGeometry(gable);
      for (const s of [-1, 1]) { const gm = new THREE.Mesh(gG, plankM); gm.position.set(hx, hy + .8, hz + s * .55); if (s < 0) gm.rotation.y = Math.PI; group.add(gm); } // frontones
      const slope = Math.atan2(.38, .5), rl = Math.hypot(.5, .38) + .1;
      for (const s of [-1, 1]) { const r = box(rl, .05, 1.3, roofM, hx + s * .25, hy + .8 + .19 + .03, hz); r.rotation.z = -s * slope; } // techo a dos aguas
      box(.06, .06, 1.32, mat(0x5a1c15, { roughness: .7 }), hx, hy + 1.2, hz, { cast: false });   // cumbrera
      // puerta en arco (hueco oscuro) en el frente, hacia la calle
      const arch = new THREE.Shape(); arch.moveTo(-.2, 0); arch.lineTo(.2, 0); arch.lineTo(.2, .38); arch.absarc(0, .38, .2, 0, Math.PI, false); arch.closePath();
      const door = new THREE.Mesh(new THREE.ShapeGeometry(arch, 10), holeM); door.position.set(hx, hy + .02, hz - .556); door.rotation.y = Math.PI; door.raycast = () => {}; group.add(door);
      { // letrero con el nombre sobre la puerta
        const c = document.createElement('canvas'); c.width = 128; c.height = 48; const g = c.getContext('2d');
        g.fillStyle = '#f3e3c3'; g.fillRect(0, 0, 128, 48); g.strokeStyle = '#6b4220'; g.lineWidth = 4; g.strokeRect(3, 3, 122, 42);
        g.fillStyle = '#6b2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 30px Georgia, serif'; g.fillText('FIEL', 64, 26);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(.34, .13), new THREE.MeshStandardMaterial({ map: t, roughness: .8 }));
        pl.position.set(hx, hy + .9, hz - .56); pl.rotation.y = Math.PI; pl.raycast = () => {}; group.add(pl);
      }
      solid(hx - .55, hx + .55, hz - .6, hz + .6, hy + 1.2);
      // plato de acero con agua junto a la casita
      const steelM = mat(0xc4cad0, { metalness: .85, roughness: .25 });
      const bwl = new THREE.Mesh(new THREE.CylinderGeometry(.17, .13, .07, 18, 1, true), steelM); bwl.position.set(hx + .78, hy + .035, hz - .7); group.add(bwl);
      const bwW = new THREE.Mesh(new THREE.CircleGeometry(.155, 18), new THREE.MeshStandardMaterial({ color: 0x6aa7c0, roughness: .05, metalness: .1 }));
      bwW.rotation.x = -Math.PI / 2; bwW.position.set(hx + .78, hy + .055, hz - .7); bwW.raycast = () => {}; group.add(bwW);
      // el perro, echado como esfinge delante de la puerta (frente local +x, girado para mirar hacia la calle)
      const coatM = mat(0xc8924a, { roughness: .9 }), lightM = mat(0xeed7ad, { roughness: .9 }), darkN = mat(0x1a1410, { roughness: .4 });
      const dog = new THREE.Group(); dog.position.set(hx - .05, hy, hz - 1.15); dog.rotation.y = Math.PI / 2 + .25; group.add(dog);
      const torso = new THREE.Group(); dog.add(torso);
      const body = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), coatM); body.scale.set(1.65, .72, .82); body.position.set(-.06, .15, 0); torso.add(body);
      const chest = new THREE.Mesh(new THREE.SphereGeometry(.14, 12, 9), lightM); chest.scale.set(.9, 1.1, .95); chest.position.set(.2, .2, 0); torso.add(chest);
      for (const s of [-1, 1]) { const hip = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), coatM); hip.scale.set(1.3, .8, .7); hip.position.set(-.24, .1, s * .12); dog.add(hip); } // ancas
      for (const s of [-1, 1]) {                                                                   // patas delanteras estiradas
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(.04, .045, .3, 8), coatM); leg.rotation.z = Math.PI / 2; leg.position.set(.36, .045, s * .075); dog.add(leg);
        const paw = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), lightM); paw.scale.set(1.3, .65, 1); paw.position.set(.52, .035, s * .075); dog.add(paw);
      }
      const collar = new THREE.Mesh(new THREE.TorusGeometry(.09, .016, 6, 16), mat(0xc0282a, { roughness: .5 })); collar.position.set(.3, .3, 0); collar.rotation.y = Math.PI / 2; collar.rotation.x = .5; dog.add(collar);
      const tag = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .006, 10), mat(0xe0b230, { metalness: .8, roughness: .3 })); tag.rotation.z = Math.PI / 2; tag.position.set(.37, .22, 0); dog.add(tag);
      const head = new THREE.Group(); head.position.set(.34, .38, 0); dog.add(head);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 9), coatM); skull.scale.set(1.05, .95, .9); head.add(skull);
      const snout = new THREE.Mesh(new THREE.SphereGeometry(.055, 10, 7), lightM); snout.scale.set(1.5, .8, .9); snout.position.set(.1, -.03, 0); head.add(snout);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(.02, 8, 6), darkN); nose.position.set(.18, -.015, 0); head.add(nose);
      for (const s of [-1, 1]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(.014, 8, 6), darkN); eye.position.set(.075, .03, s * .048); head.add(eye); }
      const ears = [];
      for (const s of [-1, 1]) {                                                                   // orejas caídas
        const piv = new THREE.Group(); piv.position.set(-.01, .06, s * .075); head.add(piv);
        const ear = new THREE.Mesh(new THREE.BoxGeometry(.06, .12, .02), mat(0xa8763a, { roughness: .9 })); ear.position.y = -.05; ear.rotation.x = s * .25; piv.add(ear); ears.push([piv, s]);
      }
      const tongue = new THREE.Mesh(new THREE.BoxGeometry(.05, .012, .035), mat(0xe0707a, { roughness: .5 })); tongue.position.set(.13, -.075, 0); head.add(tongue);
      const tail = new THREE.Group(); tail.position.set(-.38, .12, 0); dog.add(tail);
      const tailM = new THREE.Mesh(new THREE.CylinderGeometry(.018, .032, .26, 7), coatM); tailM.rotation.z = Math.PI / 2 + .35; tailM.position.set(-.12, -.04, 0); tail.add(tailM);
      dog.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.raycast = () => {}; } });
      houseUpd.push(t => {
        const pant = Math.sin(t * 9) * .5 + .5;                                                    // jadeo rápido con la lengua afuera
        torso.scale.set(1, 1 + pant * .035, 1 + pant * .02); tongue.position.y = -.075 - pant * .012;
        tail.rotation.y = Math.sin(t * 7.5) * .55;                                                 // mueve la cola contento
        const c = t % 9, look = c < 2.2 ? Math.sin(c / 2.2 * Math.PI) * .6 : c > 5 && c < 6.8 ? -Math.sin((c - 5) / 1.8 * Math.PI) * .5 : 0;
        head.rotation.y = look; head.rotation.z = Math.sin(t * .8) * .05;                          // mira a un lado y al otro
        const e = t % 6.5; for (const [piv, s] of ears) piv.rotation.x = s * (e > 4 && e < 4.25 ? Math.sin((e - 4) * 40) * .25 : 0); // sacudida de orejas
      });
      solid(hx - .45, hx + .45, hz - 1.75, hz - .6, hy + .45);
    }
    { // dos mariposas que revolotean alrededor de los arbustos de los maceteros de la entrada, batiendo las alas
      const wingG = new THREE.CircleGeometry(.055, 10); wingG.translate(.05, 0, 0);
      for (const [px, col, ph] of [[cx - 1.6, 0xf2a33a, 0], [cx + 1.55, 0xf4f1e6, 2.1]]) {
        const bfM = new THREE.MeshStandardMaterial({ color: col, roughness: .7, side: THREE.DoubleSide });
        const bf = new THREE.Group(), wings = [];
        const bodyB = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .07, 5), mat(0x1c1a18)); bodyB.rotation.x = Math.PI / 2; bf.add(bodyB);
        for (const s of [-1, 1]) { const piv = new THREE.Group(); const w = new THREE.Mesh(wingG, bfM); w.rotation.x = -Math.PI / 2; w.scale.set(s, 1, 1); piv.add(w); bf.add(piv); wings.push([piv, s]); }
        bf.traverse(o => { if (o.isMesh) { o.castShadow = false; o.raycast = () => {}; } });
        group.add(bf);
        const pz = Z0 - .5, by = fy + 1.25;
        houseUpd.push(t => {
          const a = t * .9 + ph, r0 = .45 + Math.sin(t * .7 + ph) * .15;           // vuelo en lazos irregulares sobre el arbusto
          bf.position.set(px + Math.cos(a) * r0, by + Math.sin(t * 2.3 + ph) * .14, pz + Math.sin(a * 1.3) * r0 * .8);
          bf.rotation.y = -a * 1.15 + Math.PI;
          const f = Math.sin(t * 22 + ph) * .9 + .3;                                 // aleteo rápido
          for (const [piv, s] of wings) piv.rotation.z = s * f;
        });
      }
    }
    { // timbre con videocámara junto a la puerta: placa negra brillante, lente y aro de luz azul que respira suavemente
      const bx = cx + 1.05, bz = Z0 - T / 2 - .085, by = fy + 1.3;     // sobre el panel de madera, debajo del aplique
      box(.075, .17, .03, mat(0x15171a, { roughness: .15, metalness: .4 }), bx, by, bz, { cast: false });
      const lens = cyl(.016, .016, .012, mat(0x050608, { roughness: .05, metalness: .6 }), bx, by + .05, bz - .018, 12); lens.rotation.x = Math.PI / 2;
      const ringM = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, emissive: 0x3aa8ff, emissiveIntensity: 1.2 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.022, .005, 6, 20), ringM); ring.position.set(bx, by - .03, bz - .017); group.add(ring);
      const btn = cyl(.013, .013, .01, mat(0xd9dde2, { metalness: .7, roughness: .3 }), bx, by - .03, bz - .018, 12); btn.rotation.x = Math.PI / 2;
      houseUpd.push(t => { ringM.emissiveIntensity = .7 + (Math.sin(t * 1.6) * .5 + .5) * 1.1; });
    }
    { // corona navideña en la pared oscura junto a la puerta (solo en temporada: 1 nov – 9 ene, o con ?navidad=1)
      const on = !!(window.Navidad && window.Navidad.activo); // misma regla que navidad.js (1 nov – 9 ene)
      if (on) {
        const wx = cx - 1.15, wy = fy + 1.5, wz = Z0 - T / 2 - .045;
        const leafG = new THREE.TorusGeometry(.2, .065, 8, 22), leaf = new THREE.Mesh(leafG, mat(0x1d5a30, { roughness: .9 }));
        leaf.position.set(wx, wy, wz); leaf.castShadow = true; group.add(leaf);
        const sprigM = mat(0x2a7340, { roughness: .85 }), sprigG = new THREE.ConeGeometry(.035, .12, 5);
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, s = new THREE.Mesh(sprigG, sprigM); s.position.set(wx + Math.cos(a) * .2, wy + Math.sin(a) * .2, wz - .03); s.rotation.z = a + (k % 2 ? .6 : -.6); group.add(s); }
        const berryM = mat(0xc01f2a, { roughness: .35 }), berryG = new THREE.SphereGeometry(.022, 8, 6);
        for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2 + .3, b = new THREE.Mesh(berryG, berryM); b.position.set(wx + Math.cos(a) * .2, wy + Math.sin(a) * .2, wz - .07); group.add(b); }
        // lazo rojo abajo, con sus dos cintas
        const bowM = mat(0xb3121f, { roughness: .45 });
        for (const s of [-1, 1]) { const lo = box(.12, .07, .025, bowM, wx + s * .065, wy - .2, wz - .085, { cast: false }); lo.rotation.z = s * .35; const cinta = box(.035, .16, .015, bowM, wx + s * .045, wy - .3, wz - .08, { cast: false }); cinta.rotation.z = s * .25; }
        box(.045, .05, .03, bowM, wx, wy - .2, wz - .095, { cast: false });
      }
    }
    box(1.6, .35, .06, winGlass, cx + 4.6, fy + H - .55, Z0 - .12, { cast: false });   // ventanita alta del baño
    // revestimiento exterior: panel de madera vertical a la derecha de la puerta y franja negra
    for (let k = 0; k < 16; k++) box(.07, H - .2, .05, woodM, cx + DW / 2 + .2 + k * .14, fy + H / 2, Z0 - T / 2 - .04, { cast: false });
    box(.9, H, .06, darkM, X1 - .45, fy + H / 2, Z0 - T / 2 - .04, { cast: false });
    { // llave de agua exterior y carrete con manguera verde enrollada en la pared lateral, para regar el jardín
      const wx = X0 - T / 2, hz = Z0 + 2.2, steelM = mat(0xb8bec4, { metalness: .85, roughness: .25 }), hoseM = mat(0x2f8a3a, { roughness: .55 });
      box(.04, .5, .36, darkM, wx - .02, fy + .75, hz, { cast: false });                                // placa de montaje
      const axle = cyl(.035, .035, .34, steelM, wx - .19, fy + .75, hz, 10); axle.rotation.z = Math.PI / 2; // eje del carrete
      for (const d of [-.3, -.08]) { const disc = cyl(.24, .24, .025, darkM, wx + d, fy + .75, hz, 22); disc.rotation.z = Math.PI / 2; } // tapas del carrete
      const hoseG = new THREE.TorusGeometry(.15, .028, 8, 22);
      for (let k = 0; k < 4; k++) { const ring = new THREE.Mesh(hoseG, hoseM); ring.position.set(wx - .12 - k * .053, fy + .75, hz); ring.rotation.y = Math.PI / 2; ring.castShadow = true; group.add(ring); }
      const crank = box(.03, .16, .03, steelM, wx - .33, fy + .82, hz, { cast: false }); crank.rotation.x = .3;         // manivela
      cyl(.02, .02, .08, darkM, wx - .37, fy + .88, hz + .02, 8).rotation.z = Math.PI / 2;
      const drop = cyl(.026, .026, .54, hoseM, wx - .19, fy + .32, hz + .03, 8); drop.rotation.x = .12;                 // tramo que baja del carrete
      const lay = cyl(.026, .026, .5, hoseM, wx - .3, fy + .06, hz + .2, 8); lay.rotation.set(Math.PI / 2, 0, .5);      // tramo tendido en la grama
      const noz = cyl(.032, .022, .16, mat(0xe0a31a, { roughness: .45 }), wx - .45, fy + .07, hz + .45, 10); noz.rotation.set(Math.PI / 2, 0, .5); // pistola de riego
      // llave de paso de bronce sobre el carrete
      const tap = cyl(.022, .022, .14, mat(0xb08a3a, { metalness: .8, roughness: .3 }), wx - .07, fy + 1.15, hz, 10); tap.rotation.z = Math.PI / 2;
      cyl(.008, .008, .06, steelM, wx - .1, fy + 1.19, hz, 6);                                                         // vástago
      cyl(.05, .05, .02, mat(0xc0282a, { roughness: .5 }), wx - .1, fy + 1.22, hz, 12);                                // maneral rojo
      cyl(.018, .018, .32, mat(0xb08a3a, { metalness: .8, roughness: .3 }), wx - .03, fy + 1.0, hz, 8);                 // tubo hacia el carrete
      solid(wx - .36, wx, hz - .26, hz + .3, fy + 1.0);
    }
    // pared interior entre la sala y el dormitorio/baño (con paso)
    wall(cx + 1.5, Z0 + 4.2, cx + 1.5, Z1);
    // techo plano con alero grueso, franja de luz LED y alero sobre la entrada
    const roof = box(HW * 2 + 1.4, .3, HD * 2 + 1.4, mat(0xf2f1ee, { roughness: .7 }), cx, fy + H + .15, cz, { cast: false }); blockers.push(roof);
    box(HW * 2 + 1.5, .32, .06, darkM, cx, fy + H + .15, Z0 - .72, { cast: false }); box(HW * 2 + 1.5, .32, .06, darkM, cx, fy + H + .15, Z1 + .72, { cast: false });
    box(.06, .32, HD * 2 + 1.5, darkM, X0 - .72, fy + H + .15, cz, { cast: false }); box(.06, .32, HD * 2 + 1.5, darkM, X1 + .72, fy + H + .15, cz, { cast: false });
    box(HW * 2 + 1.2, .03, .05, ledM, cx, fy + H - .02, Z0 - .6, { cast: false });
    box(3.4, .18, 1.8, darkM, cx, fy + H - .35, Z0 - 1, { cast: false });                    // alero de la entrada
    for (const sx of [-1, 1]) box(.12, H - .35, .12, frameM, cx + sx * 1.6, fy + (H - .35) / 2, Z0 - 1.8, { cast: false });
    // segundo volumen en la azotea (estudio) para darle forma moderna
    box(5.5, 1.8, 4.2, wallM, cx - 3.5, fy + H + 1.2, cz + 1.4, { cast: true });
    box(5.5, 1.8, .05, winGlass, cx - 3.5, fy + H + 1.2, cz - .72, { cast: false });
    box(5.9, .2, 4.6, darkM, cx - 3.5, fy + H + 2.2, cz + 1.4, { cast: false });
    const lampM = new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffe0a0, emissiveIntensity: 2 });
    // de noche las lámparas del techo brillan más cálidas y se ven desde la calle a través del ventanal (applyTime las ajusta)
    // las luces exteriores (balizas del camino, apliques de la puerta y franja LED del alero) tienen fotocelda:
    // de día quedan casi apagadas y al caer la noche se encienden con fuerza
    ledM.userData.day = .35; ledM.userData.dusk = 2.5; ledM.userData.night = 5;
    M.homeLamps = [lampM, ledM];
    { const night = M.lamp && M.lamp.emissiveIntensity > 5, dusk = !night && M.timeMode === 'atardecer'; for (const m of M.homeLamps) m.emissiveIntensity = night ? (m.userData.night ?? 4.5) : dusk && m.userData.dusk != null ? m.userData.dusk : (m.userData.day ?? 2); }
    for (const [lx, lz] of [[cx - 3, cz], [cx + 4, cz + 2]]) { box(.9, .04, .9, lampM, lx, fy + H - .05, lz, { cast: false }); }
    // luz empotrada bajo el alero de la entrada (aro negro + difusor cálido): de noche ilumina la llegada a la puerta
    for (const lz of [Z0 - .65, Z0 - 1.4]) {
      cyl(.13, .13, .02, darkM, cx, fy + H - .45, lz, 20).castShadow = false;
      cyl(.1, .1, .02, lampM, cx, fy + H - .462, lz, 20).castShadow = false;
    }
    // letrero de pie sobre el borde del alero de la entrada (antes quedaba metido bajo el alero y el techo, y se cortaba)
    sign('MI CASA', '', cx, fy + H + .01, Z0 - 1.86, Math.PI).scale.setScalar(.8);
    box(2.12, .04, .06, darkM, cx, fy + H - .25, Z0 - 1.83, { cast: false });         // listón que lo sostiene
    if (window.Navidad && window.Navidad.activo) {
      // luces navideñas colgadas en ondas a lo largo del borde del techo del frente (solo en temporada, como la corona):
      // bombillitos de 4 colores que titilan por turnos; de día casi apagados y de noche brillan con fuerza
      const L = HW * 2 + 1.4, zF = Z0 - .78, yTop = fy + H + .02, n = Math.round(L / .32), sag = .12;
      const pts = [];
      for (let k = 0; k <= n * 4; k++) { const u = k / (n * 4), x = cx - L / 2 + u * L, w = (u * n) % 1; pts.push(new THREE.Vector3(x, yTop - Math.sin(w * Math.PI) * sag, zF)); }
      const wire = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 8, .008, 4, false), darkM);
      wire.raycast = () => {}; group.add(wire);
      const cols = [0xff3040, 0x30e060, 0x3a8cff, 0xffc830], bulbG = new THREE.SphereGeometry(.038, 8, 6), capG = new THREE.CylinderGeometry(.014, .014, .03, 6);
      const xmM = cols.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .4, roughness: .3 }));
      const dummy = new THREE.Object3D(), per = [[], [], [], []];
      for (let k = 0; k < n; k++) per[k % 4].push(new THREE.Vector3(cx - L / 2 + (k + .5) / n * L, yTop - sag - .055, zF));
      const caps = new THREE.InstancedMesh(capG, darkM, n); caps.raycast = () => {};
      per.forEach((list, c) => {
        const im = new THREE.InstancedMesh(bulbG, xmM[c], list.length); im.raycast = () => {};
        list.forEach((p, i) => { dummy.position.copy(p); dummy.scale.set(1, 1.45, 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
        group.add(im);
      });
      for (let k = 0; k < n; k++) { dummy.position.set(cx - L / 2 + (k + .5) / n * L, yTop - sag - .005, zF); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); caps.setMatrixAt(k, dummy.matrix); }
      group.add(caps);
      const lvl = () => (M.lamp && M.lamp.emissiveIntensity > 5) ? 4 : M.timeMode === 'atardecer' ? 2.4 : .5;
      houseUpd.push(t => { const b = lvl(); xmM.forEach((m, c) => { const on = Math.sin(t * 2.2 - c * Math.PI / 2) > -.35; m.emissiveIntensity = b * (on ? 1 : .18); }); });
      xmM.forEach(m => { m.emissiveIntensity = lvl(); });
    }
    const glass = winGlass;
    // patio trasero: terraza de madera y piscina (no se puede caminar dentro)
    const pX = cx - 2, pZ = Z1 + 5, pW = 8, pD = 3.6;
    box(pW + 2.4, .1, pD + 2.4, woodM, pX, fy + .06, pZ, { cast: false });
    box(pW + .4, .14, pD + .4, mat(0xe9e6df, { roughness: .5 }), pX, fy + .1, pZ, { cast: false });
    {
      // agua de la piscina con reflejos de luz (cáusticas) que se mueven despacio, como el sol sobre el agua
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = 'rgb(4,23,32)'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(150,228,255,.5)'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let k = 0; k < 9; k++) {
        g.beginPath(); const y0 = k * 14.2 + 4;
        for (let x = 0; x <= 128; x += 4) { const y = y0 + Math.sin(x / 128 * Math.PI * 4 + k * 1.7) * 4 + Math.sin(x / 128 * Math.PI * 2 + k) * 2; x ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.stroke();
      }
      const wt = new THREE.CanvasTexture(c); wt.colorSpace = THREE.SRGBColorSpace; wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(2.2, 1);
      const waterM = new THREE.MeshStandardMaterial({ color: 0x29a8d8, emissiveMap: wt, roughness: .05, metalness: .1, emissive: 0xffffff, emissiveIntensity: 1, transparent: true, opacity: .9 });
      box(pW, .02, pD, waterM, pX, fy + .17, pZ, { cast: false });
      houseUpd.push(t => { wt.offset.set(t * .018, Math.sin(t * .35) * .04 + t * .01); });
      // luces sumergidas de la piscina: tres focos redondos en cada lado largo, bajo el agua; al atardecer y de noche
      // se encienden y el agua brilla turquesa desde adentro (sin luces nuevas en la escena, solo brillo del material)
      const lensM = new THREE.MeshStandardMaterial({ color: 0xbfefff, emissive: 0x8fe6ff, emissiveIntensity: .05, roughness: .2 });
      const lensG = new THREE.CircleGeometry(.13, 20); lensG.rotateX(-Math.PI / 2);
      for (const sz of [-1, 1]) for (const dx of [-2.6, 0, 2.6]) {
        const L = new THREE.Mesh(lensG, lensM); L.position.set(pX + dx, fy + .164, pZ + sz * (pD / 2 - .28));
        L.raycast = () => {}; L.castShadow = false; group.add(L);
      }
      const dayC = new THREE.Color(0x29a8d8), nightC = new THREE.Color(0x3fd6f0);
      let lastN = -1;
      houseUpd.push(() => {
        const n = (M.lamp && M.lamp.emissiveIntensity > 5) ? 1 : M.timeMode === 'atardecer' ? .55 : 0;
        if (n === lastN) return; lastN = n;
        lensM.emissiveIntensity = n ? 1.2 + n * 2.2 : .05;
        waterM.color.copy(dayC).lerp(nightC, n); waterM.emissiveIntensity = 1 + n * .9;
      });
    }
    solid(pX - pW / 2, pX + pW / 2, pZ - pD / 2, pZ + pD / 2, fy + 1.4);
    {
      // escalerilla de acero inoxidable: dos pasamanos curvos que salen del agua y se apoyan en la terraza
      const steelM = new THREE.MeshStandardMaterial({ color: 0xdfe4ea, metalness: .9, roughness: .22 });
      const ez = pZ + pD / 2, lx = pX - 2.5;
      const curve = new THREE.CatmullRomCurve3([[0, -.04, -.2], [0, .55, -.2], [0, .86, -.1], [0, .92, .08], [0, .78, .28], [0, .45, .34], [0, -.06, .34]].map(([x, y, z]) => new THREE.Vector3(x, y, z)));
      const railG = new THREE.TubeGeometry(curve, 24, .025, 8, false);
      for (const s of [-.28, .28]) {
        const rail = new THREE.Mesh(railG, steelM); rail.position.set(lx + s, fy + .17, ez); rail.castShadow = true; rail.raycast = () => {}; group.add(rail);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .03, 12), steelM); foot.position.set(lx + s, fy + .125, ez + .34); foot.raycast = () => {}; group.add(foot); // tapita que fija el tubo a la terraza
      }
    }
    {
      // flotador salvavidas rojo y blanco que se mece y va a la deriva despacio sobre el agua de la piscina
      const ring = new THREE.Group(); group.add(ring);
      const tG = new THREE.TorusGeometry(.32, .1, 10, 8, Math.PI / 4);
      for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(tG, mat(k % 2 ? 0xf4f2ee : 0xd6262b, { roughness: .45 })); s.rotation.z = k * Math.PI / 4; ring.add(s); }
      ring.rotation.x = -Math.PI / 2;
      ring.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.raycast = () => {}; } });
      const fx0 = pX + 1.6, fz0 = pZ - .2, fyW = fy + .19;
      ring.position.set(fx0, fyW, fz0);
      houseUpd.push(t => {
        ring.position.set(fx0 + Math.sin(t * .11) * 1.9, fyW + Math.sin(t * 1.3) * .012, fz0 + Math.sin(t * .17) * .7);
        ring.rotation.z = t * .08; ring.rotation.y = Math.sin(t * 1.1) * .035;
      });
    }
    {
      // tumbonas junto a la piscina: antes estaban encimadas una sobre otra y flotaban sobre la grama;
      // ahora la terraza de madera se alarga, y quedan tres tumbonas separadas, mirando al agua, con 4 patas de aluminio
      // y una toalla de rayas doblada a los pies
      const lx = pX + 6.5;
      box(2.6, .1, pD + 2.4, woodM, lx, fy + .06, pZ, { cast: false });
      const lounM = mat(0xf2f2f0), legM = new THREE.MeshStandardMaterial({ color: 0xc9ced4, metalness: .85, roughness: .3 });
      const legG = new THREE.CylinderGeometry(.025, .025, .26, 8);
      const tc = document.createElement('canvas'); tc.width = 64; tc.height = 8; const tg = tc.getContext('2d');
      ['#2f7fc1', '#ffffff', '#f2b33d', '#ffffff'].forEach((c, k) => { tg.fillStyle = c; tg.fillRect(k * 16, 0, 16, 8); });
      const towT = new THREE.CanvasTexture(tc); towT.colorSpace = THREE.SRGBColorSpace;
      const towM = new THREE.MeshStandardMaterial({ map: towT, roughness: 1 });
      [-1.15, 0, 1.15].forEach((dz, k) => {
        const lz = pZ + dz;
        const seat = box(1.9, .12, .7, lounM, lx, fy + .35, lz); seat.rotation.z = .05;
        box(.12, .5, .7, lounM, lx + .92, fy + .58, lz);
        for (const [ax, az] of [[-.82, -.28], [-.82, .28], [.82, -.28], [.82, .28]]) {
          const l = new THREE.Mesh(legG, legM); l.position.set(lx + ax, fy + .23, lz + az); l.raycast = () => {}; group.add(l);
        }
        if (k !== 1) { const tw = box(.34, .05, .62, towM, lx - .6, fy + .405, lz, { cast: false }); tw.rotation.z = .05; tw.raycast = () => {}; }
      });
    }
    // --- Sala y cocina (lado izquierdo) ---
    const sofaM = mat(0x8c8a86, { roughness: .95 });
    box(2.4, .45, .9, sofaM, cx - 4, fy + .23, Z1 - .8); box(2.4, .7, .25, sofaM, cx - 4, fy + .6, Z1 - .35); solid(cx - 5.2, cx - 2.8, Z1 - 1.3, Z1 - .2, fy + .45);
    {
      // apoyabrazos acolchados y cojines decorativos de colores recostados en el respaldo del sofá
      for (const s of [-1, 1]) box(.16, .62, 1.0, sofaM, cx - 4 + s * 1.14, fy + .45, Z1 - .77);
      const cushG = new THREE.SphereGeometry(.2, 14, 10); cushG.scale(1.1, 1, .38);
      for (const [dx, col, ry] of [[-.72, 0xc9a13b, .12], [.72, 0x3f7f86, -.12], [-.28, 0xe8e2d4, .05]]) {
        const cu = new THREE.Mesh(cushG, mat(col, { roughness: 1 }));
        cu.position.set(cx - 4 + dx, fy + .64, Z1 - .58); cu.rotation.set(-.22, ry, dx * .04);
        cu.castShadow = true; cu.receiveShadow = true; group.add(cu);
      }
    }
    box(1.2, .06, .7, trimM, cx - 4, fy + .45, Z1 - 2.1); for (const [a, b] of [[-.5, -.28], [.5, -.28], [-.5, .28], [.5, .28]]) box(.06, .42, .06, trimM, cx - 4 + a, fy + .21, Z1 - 2.1 + b);
    // tele
    box(2, 1.1, .06, mat(0x101216, { roughness: .2, metalness: .3 }), cx - 4, fy + 1.45, Z0 + .55);
    box(2.6, .45, .45, darkM, cx - 4, fy + .36, Z0 + .55); box(2.62, .03, .47, woodM, cx - 4, fy + .6, Z0 + .55); solid(cx - 5.3, cx - 2.7, Z0 + .3, Z0 + .8, fy + .6);
    {
      // barra de sonido bajo la tele y dos portarretratos con fotos de la familia en los extremos del mueble
      const top = fy + .615;
      // pie de la tele: antes la pantalla flotaba frente al ventanal; ahora un cuello y una base la apoyan en el mueble
      const standM = mat(0x22252b, { roughness: .4, metalness: .5 });
      box(.1, .3, .05, standM, cx - 4, top + .15, Z0 + .52, { cast: false });
      box(.5, .02, .18, standM, cx - 4, top + .01, Z0 + .5, { cast: false });
      box(1.1, .07, .1, mat(0x15171b, { roughness: .5, metalness: .2 }), cx - 4, top + .035, Z0 + .66, { cast: false });
      box(1.04, .05, .005, mat(0x2a2d33, { roughness: 1 }), cx - 4, top + .035, Z0 + .713, { cast: false }); // rejilla
      const photo = (seed) => {
        const c = document.createElement('canvas'); c.width = 64; c.height = 80; const g = c.getContext('2d');
        const sky = g.createLinearGradient(0, 0, 0, 80); sky.addColorStop(0, seed ? '#f6c27a' : '#8fc6ee'); sky.addColorStop(1, seed ? '#f3e2b8' : '#dff0fa');
        g.fillStyle = sky; g.fillRect(0, 0, 64, 80);
        g.fillStyle = seed ? '#d9b56e' : '#6fae5a'; g.fillRect(0, 58, 64, 22);
        g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(seed ? 14 : 50, 16, 7, 0, 7); g.fill();
        const ppl = seed ? [[22, 1, '#2f6db3'], [42, 1, '#b8434a']] : [[16, 1, '#2f6db3'], [32, .7, '#f0b43a'], [48, 1, '#b8434a']];
        for (const [x, s, col] of ppl) { g.fillStyle = col; g.fillRect(x - 6 * s, 64 - 26 * s, 12 * s, 26 * s); g.fillStyle = '#8a5a3c'; g.beginPath(); g.arc(x, 64 - 31 * s, 5 * s, 0, 7); g.fill(); }
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
      };
      const frameM = mat(0x6b4a2a, { roughness: .6 });
      [[-5.12, .25, 0], [-2.88, -.25, 1]].forEach(([dx, ry, seed]) => {
        const f = new THREE.Group(); f.position.set(cx + dx, top, Z0 + .6); f.rotation.y = ry; group.add(f);
        const fr = new THREE.Mesh(new THREE.BoxGeometry(.2, .25, .02), frameM); fr.position.set(0, .125, 0); fr.rotation.x = -.12; fr.castShadow = true; f.add(fr);
        const pic = new THREE.Mesh(new THREE.PlaneGeometry(.16, .2), new THREE.MeshStandardMaterial({ map: photo(seed), roughness: .4 }));
        pic.position.set(0, 0, .011); fr.add(pic);
        f.traverse(o => { if (o.isMesh) o.raycast = () => {}; });
      });
    }
    // alfombra y planta grande
    {
      // alfombra tejida de la sala: fondo gris con trama, doble borde y rombos en el centro, y flecos de algodón en los dos extremos
      const c = document.createElement('canvas'); c.width = 256; c.height = 188; const g = c.getContext('2d');
      g.fillStyle = '#8a8f96'; g.fillRect(0, 0, 256, 188);
      for (let y = 0; y < 188; y += 3) { g.fillStyle = y % 6 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.fillRect(0, y, 256, 1); }
      g.strokeStyle = '#5d636b'; g.lineWidth = 8; g.strokeRect(10, 10, 236, 168);
      g.strokeStyle = '#c9b48a'; g.lineWidth = 3; g.strokeRect(22, 22, 212, 144);
      g.fillStyle = 'rgba(201,180,138,.55)';
      for (const [x, y, s] of [[128, 94, 30], [78, 94, 14], [178, 94, 14]]) { g.beginPath(); g.moveTo(x, y - s); g.lineTo(x + s, y); g.lineTo(x, y + s); g.lineTo(x - s, y); g.closePath(); g.fill(); }
      const rt = new THREE.CanvasTexture(c); rt.colorSpace = THREE.SRGBColorSpace; rt.anisotropy = 4;
      const sideM = mat(0x7b8087, { roughness: 1 }), topM = new THREE.MeshStandardMaterial({ map: rt, roughness: 1 });
      const rug = box(3, .015, 2.2, [sideM, sideM, topM, sideM, sideM, sideM], cx - 4, fy + .15, Z1 - 2.2, { cast: false });
      rug.raycast = () => {};
      const fringeG = new THREE.BoxGeometry(.012, .004, .07), fringeM = mat(0xece4cf, { roughness: 1 });
      const fr = new THREE.InstancedMesh(fringeG, fringeM, 2 * 38), dm = new THREE.Object3D();
      let n = 0;
      for (const s of [-1, 1]) for (let k = 0; k < 38; k++) {
        dm.position.set(cx - 4 - 1.44 + k * (2.88 / 37), fy + .145, Z1 - 2.2 + s * 1.13); dm.rotation.set(0, (Math.sin(k * 3.7 + s) * .12), 0); dm.updateMatrix(); fr.setMatrixAt(n++, dm.matrix);
      }
      fr.castShadow = false; fr.receiveShadow = true; fr.raycast = () => {}; group.add(fr);
    }
    {
      // Biblia abierta sobre la mesa de centro: tapa de cuero, páginas con renglones y cinta roja
      const bb = new THREE.Group(); bb.position.set(cx - 4.15, fy + .48, Z1 - 2.12); bb.rotation.y = .35; group.add(bb);
      const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
      g.fillStyle = '#f6efdc'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#9a8f7c';
      for (let y = 14; y < 150; y += 7) g.fillRect(12, y, 104 - ((y * 37) % 23), 2);
      g.fillStyle = '#a8322c'; g.fillRect(12, 8, 26, 3);
      const pt = new THREE.CanvasTexture(c); pt.colorSpace = THREE.SRGBColorSpace;
      const coverM = mat(0x3a2116, { roughness: .7 }), edgeM = mat(0xece4cf, { roughness: .9 }), pageM = new THREE.MeshStandardMaterial({ map: pt, roughness: .9 });
      const cover = new THREE.Mesh(new THREE.BoxGeometry(.46, .015, .32), coverM); cover.position.y = .008; bb.add(cover);
      for (const s of [-1, 1]) {
        const blockP = new THREE.Mesh(new THREE.BoxGeometry(.21, .03, .29), edgeM); blockP.position.set(s * .112, .03, 0); blockP.rotation.z = s * .06; bb.add(blockP);
        const page = new THREE.Mesh(new THREE.PlaneGeometry(.2, .28), pageM); page.rotation.set(-Math.PI / 2, -s * .06, 0); page.position.set(s * .112, .049, 0); bb.add(page);
      }
      const rib = new THREE.Mesh(new THREE.BoxGeometry(.012, .003, .2), mat(0xb3202a, { roughness: .6 })); rib.position.set(.01, .05, .12); rib.rotation.y = .15; bb.add(rib);
      bb.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
      // taza de café humeante sobre un posavasos de corcho, junto a la Biblia abierta (para leer la Palabra con un cafecito)
      const mx = cx - 3.62, mz = Z1 - 2.28, ty = fy + .48, mugM = mat(0x2f6f78, { roughness: .4 });
      const parts = [
        cyl(.07, .07, .008, mat(0xb08a5a, { roughness: 1 }), mx, ty + .004, mz, 16),
        cyl(.045, .04, .095, mugM, mx, ty + .056, mz, 14),
        cyl(.041, .041, .004, mat(0x3a2414, { roughness: .2 }), mx, ty + .094, mz, 14)
      ];
      const handle = new THREE.Mesh(new THREE.TorusGeometry(.024, .007, 6, 12), mugM); handle.position.set(mx + .052, ty + .058, mz); group.add(handle); parts.push(handle);
      for (const p of parts) { p.castShadow = false; p.receiveShadow = true; p.raycast = () => {}; }
      steam(mx, ty + .17, mz);
    }
    {
      // planta grande en maceta (ficus de hoja de violín) en la esquina, junto al sofá y el ventanal
      const plX = cx - 6.1, plZ = Z1 - .6, potH = .55;
      cyl(.28, .21, potH, mat(0x2b2d31, { roughness: .5, metalness: .2 }), plX, fy + .14 + potH / 2, plZ, 20);
      cyl(.25, .25, .03, mat(0x3a2a1c, { roughness: 1 }), plX, fy + .14 + potH - .04, plZ, 16);
      const stemM = mat(0x5a4330, { roughness: .9 }), leafM = mat(0x2f6a2c, { roughness: .6, side: THREE.DoubleSide }), leafM2 = mat(0x3d7f35, { roughness: .6, side: THREE.DoubleSide });
      const stem = cyl(.025, .035, 1.25, stemM, plX, fy + .14 + potH + .6, plZ, 8); stem.castShadow = false;
      const leafG = new THREE.SphereGeometry(.13, 10, 6); leafG.scale(1, 1.55, .22);
      for (let k = 0; k < 16; k++) {
        const a = k * 2.4, hy = .25 + (k / 16) * .95, rr = .1 + .1 * Math.sin(k * 1.7) ** 2 + (1 - k / 16) * .08;
        const lf = new THREE.Mesh(leafG, k % 3 ? leafM : leafM2);
        lf.position.set(plX + Math.cos(a) * rr, fy + .14 + potH + hy, plZ + Math.sin(a) * rr);
        lf.rotation.set(0, -a + Math.PI / 2, 0, 'YXZ'); lf.rotateX(.45 + .3 * (1 - k / 16));
        lf.castShadow = true; lf.receiveShadow = true; group.add(lf);
      }
      solid(plX - .3, plX + .3, plZ - .3, plZ + .3, fy + .14 + potH);
    }
    if (window.Navidad && window.Navidad.activo) {
      // arbolito de Navidad en la esquina de la sala junto al ventanal (solo en temporada, igual que la corona):
      // pino de tres pisos en maceta roja, bolitas de colores, estrella dorada y lucecitas que titilan por turnos
      xmasTree(X0 + .8, Z0 + .85, fy + .14, houseUpd);
    }
    // cocina: mueble, fregadero, estufa, nevera, cafetera y mesa
    const counterM = mat(0xdedad2, { roughness: .4 }), cabM = mat(0x6a4a2a);
    box(.7, .9, 3.2, cabM, X0 + .45, fy + .45, cz + 1.2); box(.75, .05, 3.25, counterM, X0 + .45, fy + .92, cz + 1.2); solid(X0, X0 + .85, cz - .4, cz + 2.8, fy + .95);
    box(.5, .1, .6, mat(0x9aa4ae, { metalness: .8, roughness: .2 }), X0 + .45, fy + .93, cz + 2.2);          // fregadero
    cyl(.02, .02, .3, mat(0xc0c8d0, { metalness: .9, roughness: .2 }), X0 + .25, fy + 1.1, cz + 2.2, 8);
    box(.6, .9, .7, mat(0xf2f2f0, { roughness: .3 }), X0 + .45, fy + .45, cz - 1); box(.62, 1.9, .7, mat(0xe8eaec, { roughness: .25, metalness: .2 }), X0 + .45, fy + .95, cz - 1.9); solid(X0, X0 + .85, cz - 2.3, cz - .6, fy + 1.9);
    { // estufa: tope de vitrocerámica negra con 4 hornillas, perillas al frente, ventana y tirador del horno, y una olla tapada
      const sx = X0 + .45, sz = cz - 1, front = X0 + .75, glassM = mat(0x0c0d10, { roughness: .12, metalness: .3 });
      const ringM = mat(0x3a1a14, { roughness: .5 }), knobM = mat(0x1a1b1e, { roughness: .4 }), steelM = mat(0xc0c8d0, { metalness: .9, roughness: .22 });
      box(.54, .012, .64, glassM, sx, fy + .906, sz, { cast: false });
      for (const [dx, dz, r0] of [[-.12, -.15, .09], [-.12, .15, .07], [.12, -.15, .07], [.12, .15, .09]]) cyl(r0, r0, .004, ringM, sx + dx, fy + .914, sz + dz, 20).castShadow = false;
      for (const dz of [-.24, -.08, .08, .24]) { const k = cyl(.025, .025, .03, knobM, front + .012, fy + .82, sz + dz, 12); k.rotation.z = Math.PI / 2; k.castShadow = false; }
      box(.006, .32, .5, glassM, front + .003, fy + .42, sz, { cast: false });                                  // ventana del horno
      const hd = cyl(.012, .012, .5, steelM, front + .04, fy + .66, sz, 8); hd.rotation.x = Math.PI / 2; hd.castShadow = false; // tirador
      const potM = mat(0x9aa2aa, { metalness: .85, roughness: .3 });
      cyl(.085, .08, .12, potM, sx - .12, fy + .976, sz - .15, 18);                                            // olla sobre la hornilla grande
      cyl(.088, .088, .012, potM, sx - .12, fy + 1.042, sz - .15, 18).castShadow = false;                      // tapa
      cyl(.012, .016, .025, knobM, sx - .12, fy + 1.06, sz - .15, 8).castShadow = false;                       // agarradera de la tapa
      // paño de cocina a cuadros colgado del tirador del horno
      const tc = document.createElement('canvas'); tc.width = tc.height = 64; const tg = tc.getContext('2d');
      tg.fillStyle = '#f4efe4'; tg.fillRect(0, 0, 64, 64); tg.fillStyle = 'rgba(178,34,52,.75)';
      for (let k = 0; k < 64; k += 16) { tg.fillRect(k, 0, 8, 64); tg.fillRect(0, k, 64, 8); }
      const tt = new THREE.CanvasTexture(tc); tt.colorSpace = THREE.SRGBColorSpace; tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(2, 3);
      const towel = new THREE.Mesh(new THREE.BoxGeometry(.008, .34, .2), new THREE.MeshStandardMaterial({ map: tt, roughness: .95 }));
      towel.position.set(front + .055, fy + .5, sz + .1); towel.castShadow = false; towel.raycast = () => {}; group.add(towel);
    }
    { // jarra de cerámica con cucharas de madera sobre el mueble de la cocina
      const jx = X0 + .32, jz = cz + 1.35, top = fy + .945, woodM = mat(0xa8784a, { roughness: .75 });
      cyl(.06, .052, .15, mat(0xe9e3d6, { roughness: .35 }), jx, top + .075, jz, 16).castShadow = false;
      [[-.02, .01, .18], [.02, -.015, -.15], [0, .02, .05]].forEach(([dx, dz, tilt]) => {
        const h = cyl(.007, .007, .26, woodM, jx + dx, top + .2, jz + dz, 6); h.rotation.z = tilt; h.castShadow = false;
        const head = new THREE.Mesh(new THREE.SphereGeometry(.022, 10, 6).scale(1, 1.4, .45), woodM);
        head.position.set(jx + dx - Math.sin(tilt) * .14, top + .33, jz + dz); head.castShadow = false; group.add(head);
      });
    }
    { // nevera de acero: junta entre congelador y refrigerador, y dos tiradores verticales de acero inoxidable
      const steelM = mat(0xc8ced4, { metalness: .9, roughness: .22 });
      box(.006, .012, .66, mat(0x8a9096, { roughness: .5 }), X0 + .763, fy + 1.3, cz - 1.9, { cast: false });
      box(.05, .45, .03, steelM, X0 + .785, fy + 1.58, cz - 1.62, { cast: false });
      box(.05, .75, .03, steelM, X0 + .785, fy + .82, cz - 1.62, { cast: false });
    }
    const coffee = box(.22, .3, .2, mat(0x1a1a1e, { roughness: .3 }), X0 + .45, fy + 1.1, cz + .4); coffee.castShadow = false; steam(X0 + .45, fy + 1.3, cz + .4);
    {
      // reloj de pared sobre el mueble de la cocina: sus manecillas marcan la hora real del dispositivo
      const ck = makeClock(.3); ck.position.set(X0 + T / 2 + .035, fy + 2.35, cz + 1.2); ck.rotation.y = Math.PI / 2; group.add(ck);
      houseUpd.push(ck.userData.update);
    }
    box(1.4, .06, .9, trimM, cx - 1.8, fy + .76, cz - 1.6); for (const [a, b] of [[-.6, -.35], [.6, -.35], [-.6, .35], [.6, .35]]) box(.06, .74, .06, trimM, cx - 1.8 + a, fy + .37, cz - 1.6 + b); solid(cx - 2.5, cx - 1.1, cz - 2.05, cz - 1.15, fy + .78);
    // comida servida en la mesa: arroz, habichuelas, pollo, ensalada, jugo, pan y frutas
    { const food = buildFood(group, cx - 1.8, fy + .79, cz - 1.6); if (food.userData.update) houseUpd.push(food.userData.update); }
    buildChairs(group, cx - 1.8, fy + .14, cz - 1.6, [[-.95, 0, -Math.PI / 2], [.95, 0, Math.PI / 2]]);
    {
      // cuadro de paisaje en la pared interior de la sala (antes lisa): verdes pastos y aguas de reposo con Salmos 23:2 (LBLA)
      const c = document.createElement('canvas'); c.width = 768; c.height = 480; const g = c.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, 260); sky.addColorStop(0, '#7fb4e0'); sky.addColorStop(1, '#f6dcb0');
      g.fillStyle = sky; g.fillRect(0, 0, 768, 480);
      g.fillStyle = 'rgba(255,240,200,.9)'; g.beginPath(); g.arc(560, 120, 38, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,.75)'; for (const [x, y, r] of [[150, 80, 26], [185, 72, 32], [222, 84, 24], [420, 60, 20], [448, 54, 26]]) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
      const hill = (col, y0, amp, f, ph) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 480); for (let x = 0; x <= 768; x += 8) g.lineTo(x, y0 + Math.sin(x / 768 * Math.PI * f + ph) * amp); g.lineTo(768, 480); g.closePath(); g.fill(); };
      hill('#8fae6a', 230, 26, 2, .5); hill('#6f9a4a', 270, 22, 3, 1.8); hill('#5a8a3a', 320, 14, 2.4, 3);
      // arroyo tranquilo que serpentea entre los pastos
      g.fillStyle = '#9fd0e8'; g.beginPath(); g.moveTo(330, 300);
      for (let y = 300; y <= 400; y += 10) g.lineTo(330 + Math.sin(y / 30) * 40 - (y - 300) * .9, y);
      for (let y = 400; y >= 300; y -= 10) g.lineTo(330 + Math.sin(y / 30) * 40 + (y - 300) * 1.6 + 14, y);
      g.closePath(); g.fill();
      // ovejitas pastando
      for (const [x, y, s] of [[160, 345, 1], [215, 362, 1.15], [560, 350, 1.05], [610, 372, 1.2]]) {
        g.fillStyle = '#fbfaf5'; for (const [dx, dy] of [[-9, 0], [0, -5], [9, 0], [0, 3]]) { g.beginPath(); g.arc(x + dx * s, y + dy * s, 9 * s, 0, 7); g.fill(); }
        g.fillStyle = '#3a3330'; g.beginPath(); g.ellipse(x + 17 * s, y - 2 * s, 5 * s, 4 * s, 0, 0, 7); g.fill();
        g.fillRect(x - 8 * s, y + 8 * s, 2.5 * s, 7 * s); g.fillRect(x + 6 * s, y + 8 * s, 2.5 * s, 7 * s);
      }
      g.fillStyle = 'rgba(30,24,16,.62)'; g.fillRect(0, 404, 768, 76);
      g.fillStyle = '#fff6df'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 600 24px Georgia, serif';
      g.fillText('«En lugares de verdes pastos me hace descansar;', 384, 428); g.fillText('junto a aguas de reposo me conduce» – Salmos 23:2', 384, 458);
      const pt = new THREE.CanvasTexture(c); pt.colorSpace = THREE.SRGBColorSpace; pt.anisotropy = 4;
      const wx = cx + 1.5 - T / 2, pz = cz + 2.4, py = fy + 1.72;
      box(.04, .98, 1.5, trimM, wx - .02, py, pz, { cast: false });
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .875), new THREE.MeshStandardMaterial({ map: pt, roughness: .8 }));
      pic.position.set(wx - .045, py, pz); pic.rotation.y = -Math.PI / 2; pic.receiveShadow = true; pic.raycast = () => {}; group.add(pic);
    }
    {
      // abanico de techo sobre la mesa del comedor: aspas de madera que giran suavemente
      const fan = new THREE.Group(); fan.position.set(cx - 1.8, fy + H, cz - 1.6); group.add(fan);
      const metM = mat(0x2a2b2e, { roughness: .35, metalness: .6 }), bladeM = mat(0x8a6240, { roughness: .7 });
      const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; fan.add(o); return o; };
      add(new THREE.CylinderGeometry(.09, .09, .04, 16), metM, -.02);            // base en el techo
      add(new THREE.CylinderGeometry(.015, .015, .4, 8), metM, -.22);            // varilla
      add(new THREE.CylinderGeometry(.11, .13, .14, 18), metM, -.48);           // motor
      const lamp = add(new THREE.SphereGeometry(.09, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xfff4d8, emissive: 0xffe0a0, emissiveIntensity: 1.2, roughness: .4 }), -.56);
      const rot = new THREE.Group(); rot.position.y = -.52; fan.add(rot);
      const bladeG = new THREE.BoxGeometry(.62, .014, .14).translate(.42, 0, 0);
      for (let k = 0; k < 5; k++) { const b = new THREE.Mesh(bladeG, bladeM); b.rotation.set(0, k / 5 * Math.PI * 2, .08); rot.add(b); }
      fan.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.raycast = () => {}; } });
      lamp.receiveShadow = false;
      houseUpd.push(t => { rot.rotation.y = t * 3.2; });
    }
    // --- Dormitorio (lado derecho, al fondo) ---
    const bedX = cx + 4.6, bedZ = Z1 - 1.4;
    box(1.8, .4, 2.2, trimM, bedX, fy + .2, bedZ); box(1.7, .22, 2.05, mat(0xf4f2ec, { roughness: .9 }), bedX, fy + .5, bedZ); box(1.72, .1, 1.3, mat(0x7a3b6e, { roughness: .9 }), bedX, fy + .62, bedZ - .3);
    box(1.2, .14, .4, mat(0xffffff, { roughness: .9 }), bedX, fy + .66, bedZ + .75); box(1.8, .9, .1, trimM, bedX, fy + .65, bedZ + 1.1); solid(bedX - .95, bedX + .95, bedZ - 1.1, bedZ + 1.15, fy + .62);
    {
      // manta tejida doblada al pie de la cama: color arena con franjas crema y vino, y caída a los dos lados del colchón
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = '#c9b79a'; g.fillRect(0, 0, 128, 64);
      for (let y = 0; y < 64; y += 3) { g.fillStyle = y % 6 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)'; g.fillRect(0, y, 128, 1); } // punto tejido
      for (const [y, col] of [[10, '#f3ead8'], [16, '#7a2e3a'], [46, '#7a2e3a'], [52, '#f3ead8']]) { g.fillStyle = col; g.fillRect(0, y, 128, 3); }
      const mt = new THREE.CanvasTexture(c); mt.colorSpace = THREE.SRGBColorSpace; mt.anisotropy = 4;
      const throwM = new THREE.MeshStandardMaterial({ map: mt, roughness: 1 });
      const tz = bedZ - .78;
      box(1.76, .05, .34, throwM, bedX, fy + .697, tz, { cast: false });                       // parte de arriba, sobre el edredón
      for (const s of [-1, 1]) box(.03, .3, .34, throwM, bedX + s * .895, fy + .55, tz, { cast: false }); // caída por los lados
    }
    {
      // cuadro enmarcado sobre la cabecera de la cama con Josué 24:15 (LBLA)
      const c = document.createElement('canvas'); c.width = 512; c.height = 220; const g = c.getContext('2d');
      g.fillStyle = '#f7f1e3'; g.fillRect(0, 0, 512, 220); g.strokeStyle = '#b8913a'; g.lineWidth = 4; g.strokeRect(14, 14, 484, 192);
      g.fillStyle = '#3a2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'italic 700 42px Georgia, serif'; g.fillText('«Pero yo y mi casa,', 256, 66); g.fillText('serviremos al SEÑOR»', 256, 118);
      g.fillStyle = '#8a6420'; g.font = '700 28px Georgia, serif'; g.fillText('JOSUÉ 24:15', 256, 174);
      const pt = new THREE.CanvasTexture(c); pt.colorSpace = THREE.SRGBColorSpace; pt.anisotropy = 4;
      const pz = Z1 - T / 2, py = fy + 2.05;
      box(1.42, .64, .04, trimM, bedX, py, pz - .02, { cast: false });
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .56), new THREE.MeshStandardMaterial({ map: pt, roughness: .8 }));
      pic.position.set(bedX, py, pz - .045); pic.rotation.y = Math.PI; pic.receiveShadow = true; group.add(pic);
    }
    {
      // mesita de noche junto a la cabecera, con gaveta y lámpara de pantalla tela que da luz cálida
      const nx = bedX - 1.22, nz = Z1 - T / 2 - .3, nwM = trimM;
      box(.46, .5, .4, nwM, nx, fy + .39, nz); box(.5, .03, .44, mat(0x5a3d24, { roughness: .5 }), nx, fy + .655, nz);
      box(.38, .16, .01, mat(0x6e4c2e, { roughness: .6 }), nx, fy + .5, nz - .205, { cast: false });
      const knob = new THREE.Mesh(new THREE.SphereGeometry(.018, 10, 6), mat(0xc9a24a, { metalness: .8, roughness: .3 })); knob.position.set(nx, fy + .5, nz - .22); group.add(knob);
      for (const [a, b] of [[-.2, -.17], [.2, -.17], [-.2, .17], [.2, .17]]) box(.04, .14, .04, nwM, nx + a, fy + .07, nz + b, { cast: false });
      cyl(.07, .09, .04, mat(0x2a2b2e, { roughness: .4, metalness: .5 }), nx + .06, fy + .69, nz + .03, 14);
      cyl(.012, .012, .26, mat(0xc9a24a, { metalness: .8, roughness: .3 }), nx + .06, fy + .84, nz + .03, 8);
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(.09, .15, .2, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd48a, emissiveIntensity: .75, roughness: .9, side: THREE.DoubleSide }));
      shade.position.set(nx + .06, fy + 1.02, nz + .03); shade.castShadow = false; group.add(shade);
      solid(nx - .25, nx + .25, nz - .22, nz + .22, fy + .67);
      {
        // la Biblia sobre la mesita de noche: tapas de cuero negro, cantos dorados y una cruz dorada en la portada
        // («Lámpara es a mis pies tu palabra, y luz para mi camino», Salmo 119:105)
        const bib = new THREE.Group(), coverM = mat(0x17140f, { roughness: .55 }), goldM = mat(0xd4ad4f, { metalness: .85, roughness: .3 });
        const part = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); bib.add(o); };
        part(.15, .006, .21, coverM, 0, .003, 0); part(.15, .006, .21, coverM, 0, .039, 0); part(.008, .042, .21, coverM, -.071, .021, 0);
        part(.14, .03, .2, goldM, .003, .021, 0);                               // hojas con canto dorado
        part(.012, .002, .09, goldM, .006, .043, 0); part(.05, .002, .012, goldM, .006, .043, -.018); // cruz en la tapa
        bib.position.set(nx - .12, fy + .67, nz - .06); bib.rotation.y = .28;
        bib.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.raycast = () => {}; } });
        group.add(bib);
      }
      {
        // reloj despertador digital sobre la mesita: dígitos rojos con la hora real del dispositivo y los dos puntos que parpadean
        const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
        const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace; ct.userData.keep = true;
        let last = '';
        const draw = () => {
          const d = new Date(), h = d.getHours() % 12 || 12, m = String(d.getMinutes()).padStart(2, '0'), on = d.getSeconds() % 2 === 0;
          const key = h + ':' + m + on; if (key === last) return; last = key;
          g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 128, 64);
          g.textBaseline = 'middle'; g.textAlign = 'right'; g.fillStyle = '#ff3b2f'; g.shadowColor = '#ff3b2f'; g.shadowBlur = 6;
          g.font = '700 40px "Courier New", monospace'; g.fillText(String(h), 50, 34); g.textAlign = 'left'; g.fillText(m, 62, 34);
          if (on) { g.fillRect(53, 22, 5, 5); g.fillRect(53, 40, 5, 5); }
          g.shadowBlur = 0; g.font = '700 11px system-ui, sans-serif'; g.fillStyle = '#c42a22'; g.fillText(d.getHours() < 12 ? 'AM' : 'PM', 110, 14);
          ct.needsUpdate = true;
        };
        draw();
        const ck = new THREE.Group(), caseM = mat(0x1d1e22, { roughness: .4, metalness: .2 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(.13, .065, .055), caseM); body.position.y = .0325; ck.add(body);
        const top = new THREE.Mesh(new THREE.BoxGeometry(.04, .008, .02), mat(0x3a3c42, { roughness: .5 })); top.position.set(.03, .069, 0); ck.add(top); // botón de posponer
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(.112, .05), new THREE.MeshBasicMaterial({ map: ct, toneMapped: false })); scr.position.set(0, .034, .0285); ck.add(scr);
        ck.position.set(nx + .165, fy + .67, nz - .12); ck.rotation.y = 2.75;    // mirando hacia la cama y hacia quien entra al cuarto
        ck.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = o !== scr; o.raycast = () => {}; } });
        group.add(ck);
        houseUpd.push(draw);
      }
    }
    {
      // pantuflas de felpa en el piso junto a la cama, listas para levantarse (decorativas, sin colisión)
      const soleM = mat(0xe8e1d4, { roughness: .95 }), plushM = mat(0x5b6f8f, { roughness: 1 });
      const soleG = new THREE.CylinderGeometry(.5, .5, 1, 18).scale(.095, .028, .14);
      const upG = new THREE.SphereGeometry(.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(.1, .07, .12);
      [[-.08, .12], [.08, -.02]].forEach(([dx, rot], i) => {
        const s = new THREE.Group();
        const sole = new THREE.Mesh(soleG, soleM); sole.position.y = .014; s.add(sole);
        const up = new THREE.Mesh(upG, plushM); up.position.set(0, .026, -.06); s.add(up);
        s.position.set(bedX - 1.12 + dx, fy + .142, bedZ - .25 + i * .03); s.rotation.y = rot;
        s.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.raycast = () => {}; } });
        group.add(s);
      });
    }
    // --- Baño cerrado (esquina del frente a la derecha), con puerta desde el pasillo ---
    const BX0 = cx + 3.2, BZ1 = Z0 + 4.2, DZ0 = Z0 + 2.5, DZ1 = Z0 + 3.5;
    wall(BX0, BZ1, X1, BZ1);                                            // separa el baño del dormitorio
    wall(BX0, Z0, BX0, DZ0); wall(BX0, DZ1, BX0, BZ1);                  // pared con la puerta
    box(T, .7, DZ1 - DZ0, wallM, BX0, fy + H - .35, (DZ0 + DZ1) / 2);   // dintel
    box(.06, 2.3, .08, trimM, BX0 - .12, fy + 1.15, DZ0 + .02, { cast: false }); box(.06, 2.3, .08, trimM, BX0 - .12, fy + 1.15, DZ1 - .02, { cast: false });
    const bath = buildBathroom(group, { bx0: BX0, bx1: X1, bz0: Z0, bz1: BZ1, fy, H, T, solid });
    // televisor del dormitorio en la pared del baño, mirando a la cama
    const tv = buildBedroomTV(group, bedX, fy + .14, BZ1 + T / 2); solid(bedX - .86, bedX + .86, BZ1, BZ1 + .5, fy + .74);
    houseUpd.push(bath.update);
    // acciones
    act(bedX - 1.3, bedZ, fy, '😴 Dormir', () => life.fx('sleep'));
    act(bedX, BZ1 + 1.3, fy, '📺 Encender / apagar la tele', () => { const on = tv.toggle(); life.fx(on ? 'tvon' : 'tvoff'); }, 1.2);
    act(bath.shower.x - .2, bath.shower.z, fy, '🚿 Bañarse en la ducha', () => life.fx('shower'), 1.1);
    act(bath.tub.x, bath.tub.z, fy, '🛁 Darse un baño de espuma', () => life.fx('bath'), 1.1);
    act(bath.sink.x, bath.sink.z, fy, '🧼 Lavarse las manos y la cara', () => life.fx('wash'), 1);
    act(X0 + 1.3, cz + 2.2, fy, '💧 Tomar agua', () => life.fx('water'));
    act(X0 + 1.3, cz + .4, fy, '☕ Tomar café', () => life.fx('coffee'));
    act(cx - 1.8, cz - 2.6, fy, '🍽 Comer', () => life.fx('eat'));
    act(cx - 4, Z1 - 1.8, fy, '🛋 Descansar en el sofá', () => life.fx('rest'));
    act(cx - 3.6, Z1 - 3, fy, '📖 Leer la Biblia', () => life.fx('read'), 1.1);
    W.house = { cx, cz, door: [cx, Z0 - 1.5], minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 };
    if (W.indoor) W.indoor.push({ name: 'tu casa', msg: '⏸ En tu casa el tiempo se detiene', rects: [[X0, X1, Z0, Z1], [cx - 4, cx + 4, Z0 - 4, Z0]], maxY: fy + H + .5 });
    W.zones.push({ id: 'bano', name: 'Baño', minX: BX0, maxX: X1, minZ: Z0, maxZ: BZ1, pri: 6, text: 'Tu baño está listo: al entrar te pones la bata de baño.', ref: 'Salmo 51:7' });
    W.zones.push({ id: 'casa', name: 'Mi casa', minX: X0, maxX: X1, minZ: Z0, maxZ: Z1, pri: 5, text: 'Bienvenido a tu casa: aquí puedes dormir, comer, bañarte y descansar.', ref: 'Josué 24:15' });
  }

  await pace();
  /* ---------- Edificio de oficinas (3 pisos, escaleras, cafetería y trabajadores) ---------- */
  const of = blocks.find(b => b[2] === 'oficinas');
  if (of) {
    const [x0, z0] = of, cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
    const HW = 11, HD = 8, FH = 3.5, FLOORS = 3, T = .25, base = CURB;
    const X0 = cx - HW, X1 = cx + HW, Z0 = cz - HD, Z1 = cz + HD;
    const glass = new THREE.MeshStandardMaterial({ color: 0x7fb4d0, metalness: .35, roughness: .06, transparent: true, opacity: .32, depthWrite: false });
    const frameM = mat(0x2a2e35, { metalness: .7, roughness: .35 }), slabM = mat(0xcfcac0, { roughness: .6 }), floorM = mat(0x8a96a4, { roughness: .35 });
    const fy = i => base + i * FH;
    // escaleras: rampa 1→2 a la derecha, 2→3 a la izquierda (a lo largo de z)
    const SZ0 = Z0 + 2.2, SZ1 = Z0 + 11.2, SW = 2.2;
    const stairs = [[X1 - .3 - SW, X1 - .3], [X0 + .3, X0 + .3 + SW]];
    // pantallas de las computadoras con contenido de verdad: documento, gráfica de barras y hoja de cálculo
    const screenMs = ['doc', 'chart', 'sheet'].map(kind => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 150; const g = c.getContext('2d');
      g.fillStyle = '#eef2f7'; g.fillRect(0, 0, 256, 150);
      g.fillStyle = kind === 'sheet' ? '#1f7a45' : kind === 'chart' ? '#c2552a' : '#2a5ab8'; g.fillRect(0, 0, 256, 16);
      for (let k = 0; k < 3; k++) { g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(246 - k * 11, 8, 3.2, 0, Math.PI * 2); g.fill(); }
      if (kind === 'doc') {
        g.fillStyle = '#ffffff'; g.fillRect(50, 22, 156, 124);
        g.fillStyle = '#2a3a55'; g.fillRect(62, 32, 90, 7);
        for (let k = 0; k < 11; k++) { g.fillStyle = '#9aa6b8'; g.fillRect(62, 48 + k * 8.5, k % 4 === 3 ? 70 : 132, 3); }
      } else if (kind === 'chart') {
        g.fillStyle = '#ffffff'; g.fillRect(12, 24, 232, 118); g.strokeStyle = '#8a94a6'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(30, 30); g.lineTo(30, 130); g.lineTo(236, 130); g.stroke();
        const hs = [40, 58, 46, 72, 64, 88, 80]; hs.forEach((h, k) => { g.fillStyle = k % 2 ? '#e0a31a' : '#2a7ad8'; g.fillRect(42 + k * 27, 128 - h, 17, h); });
      } else {
        g.fillStyle = '#ffffff'; g.fillRect(0, 16, 256, 134); g.strokeStyle = '#c9d2dc'; g.lineWidth = 1;
        for (let yy = 30; yy < 150; yy += 12) { g.beginPath(); g.moveTo(0, yy); g.lineTo(256, yy); g.stroke(); }
        for (let xx = 28; xx < 256; xx += 46) { g.beginPath(); g.moveTo(xx, 16); g.lineTo(xx, 150); g.stroke(); }
        g.fillStyle = '#dfe9f3'; g.fillRect(0, 16, 256, 14);
        for (let row = 0; row < 9; row++) for (let col = 0; col < 5; col++) { g.fillStyle = col === 0 ? '#3a4a60' : '#7a8698'; g.fillRect(34 + col * 46, 35 + row * 12, 14 + ((row * 7 + col * 3) % 5) * 5, 3); }
      }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: .85, roughness: .4 });
    });
    let wbM = null;
    // calendario de escritorio (de caballete) en cada escritorio: muestra la fecha real del dispositivo y cambia solo al pasar el día
    const calC = document.createElement('canvas'); calC.width = 128; calC.height = 100; const calG = calC.getContext('2d');
    const calTex = new THREE.CanvasTexture(calC); calTex.colorSpace = THREE.SRGBColorSpace; calTex.anisotropy = 4; calTex.userData.keep = true;
    let calDia = '';
    const pintaCal = () => {
      const d = new Date(), key = d.toDateString(); if (key === calDia) return; calDia = key;
      const MES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
      const DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
      calG.fillStyle = '#fbfaf6'; calG.fillRect(0, 0, 128, 100);
      calG.fillStyle = '#c0392b'; calG.fillRect(0, 0, 128, 26);
      calG.fillStyle = '#fff'; calG.textAlign = 'center'; calG.textBaseline = 'middle'; calG.font = '800 15px system-ui, sans-serif'; calG.fillText(MES[d.getMonth()], 64, 14);
      calG.fillStyle = '#1e2228'; calG.font = '800 50px system-ui, sans-serif'; calG.fillText(String(d.getDate()), 64, 60);
      calG.fillStyle = '#6a6f78'; calG.font = '600 13px system-ui, sans-serif'; calG.fillText(DIA[d.getDay()], 64, 90);
      calTex.needsUpdate = true;
    };
    pintaCal();
    { let calT = 0; officeUpd.push(t => { if (t - calT > 5) { calT = t; pintaCal(); } }); }
    const calM = new THREE.MeshStandardMaterial({ map: calTex, roughness: .6 }), calBackM = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: .6, side: THREE.DoubleSide });
    const calGeo = new THREE.PlaneGeometry(.13, .1), calRingG = new THREE.TorusGeometry(.007, .0018, 4, 10);
    for (let i = 0; i < FLOORS; i++) { await pace();
      const y = fy(i);
      // losa con hueco sobre la escalera que llega a este piso
      const hole = i > 0 ? stairs[(i - 1) % 2] : null;
      const pieces = hole ? [[X0, hole[0], Z0, Z1], [hole[1], X1, Z0, Z1], [hole[0], hole[1], Z0, SZ0], [hole[0], hole[1], SZ1, Z1]] : [[X0, X1, Z0, Z1]];
      for (const [a, b, c, d] of pieces) { if (b - a < .05 || d - c < .05) continue; const s = box(b - a, .3, d - c, i ? slabM : floorM, (a + b) / 2, y - .15 + (i ? 0 : .1), (c + d) / 2, { cast: false }); if (i) { blockers.push(s); solid(a, b, c, d, y, y - .3); } else solid(a, b, c, d, y + .05, 0); }
      // techo de cada piso con luces
      const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.6 });
      for (let k = -2; k <= 2; k++) box(1.6, .04, .3, lampM, cx + k * 4, y + FH - .32, cz, { cast: false });
      // escritorios, computadoras, sillas y trabajadores
      const deskM = mat(0xe6e2da, { roughness: .4 }), pcM = mat(0x15171c, { roughness: .3 }), keyM = mat(0x9aa0aa, { roughness: .6 });
      const mugMs = [mat(0xf7f4ee, { roughness: .35 }), mat(0xc0392b, { roughness: .35 }), mat(0x2a5ab8, { roughness: .35 })], cafM = mat(0x3a2414, { roughness: .2 });
      const penMs = [mat(0x2a5ab8, { roughness: .5 }), mat(0xd03a2a, { roughness: .5 }), mat(0x1a1a1e, { roughness: .5 })];
      const asaG = new THREE.TorusGeometry(.024, .006, 6, 12, Math.PI); asaG.rotateZ(-Math.PI / 2);
      const binG = new THREE.CylinderGeometry(.13, .1, .3, 14, 1, true), binM = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: .6, roughness: .45, side: THREE.DoubleSide });
      const paperG = new THREE.IcosahedronGeometry(.045, 0), paperM = mat(0xf4f2ec, { roughness: .95, flatShading: true });
      const succPotG = new THREE.CylinderGeometry(.042, .032, .07, 12), succPotM = mat(0xf3f1ec, { roughness: .35 }), succSoilM = mat(0x3a2a1c, { roughness: 1 });
      const succLeafG = new THREE.SphereGeometry(.016, 6, 4); succLeafG.scale(1, 2, 1); const succLeafM = mat(0x6fa86a, { roughness: .6 });
      const desks = i === 0 ? [] : [[cx - 5, cz - 1], [cx - 1, cz - 1], [cx + 3, cz - 1], [cx - 5, cz + 4], [cx - 1, cz + 4], [cx + 3, cz + 4]];
      desks.forEach(([dx, dz], k) => {
        box(1.8, .06, .9, deskM, dx, y + .75, dz); box(1.7, .72, .06, deskM, dx, y + .37, dz + .4); solid(dx - .9, dx + .9, dz - .45, dz + .45, y + .78, y);
        box(.6, .38, .04, pcM, dx, y + 1.0, dz + .2); box(.55, .32, .01, screenMs[(k + i) % screenMs.length], dx, y + 1.0, dz + .165, { cast: false });
        box(.06, .14, .05, pcM, dx, y + .85, dz + .24, { cast: false }); box(.26, .015, .16, pcM, dx, y + .785, dz + .24, { cast: false });   // pie del monitor
        // teclado con sus teclas claras y ratón al lado, apoyados sobre el escritorio
        box(.46, .02, .15, pcM, dx, y + .79, dz - .08, { cast: false }); box(.42, .006, .115, keyM, dx, y + .804, dz - .08, { cast: false });
        box(.06, .022, .1, pcM, dx + .36, y + .791, dz - .08, { cast: false });
        // taza de café con su asa y un portalápices con bolígrafos de colores sobre el escritorio
        { const mx = dx - .6, mz = dz + .02, ty = y + .78;
          cyl(.04, .036, .09, mugMs[(k + i) % mugMs.length], mx, ty + .045, mz, 12);
          cyl(.034, .034, .004, cafM, mx, ty + .082, mz, 10);
          const asa = new THREE.Mesh(asaG, mugMs[(k + i) % mugMs.length]); asa.position.set(mx + .037, ty + .047, mz); group.add(asa);
          const hx = dx + .64, hz = dz + .22;
          cyl(.032, .032, .085, pcM, hx, ty + .0425, hz, 10);
          penMs.forEach((pm, q) => { const pen = cyl(.005, .005, .14, pm, hx + (q - 1) * .014, ty + .1, hz + (q % 2 ? .01 : -.008), 5); pen.rotation.z = (q - 1) * .18; pen.castShadow = false; }); }
        // suculenta en una macetita blanca de cerámica junto al monitor, con tierra oscura y hojas carnosas
        { const sx = dx - .6, sz = dz + .3, ty = y + .78;
          const pot = new THREE.Mesh(succPotG, succPotM); pot.position.set(sx, ty + .035, sz); pot.castShadow = false; group.add(pot);
          cyl(.036, .036, .004, succSoilM, sx, ty + .066, sz, 10).castShadow = false;
          for (let q = 0; q < 6; q++) { const a = q / 6 * Math.PI * 2 + k, lf = new THREE.Mesh(succLeafG, succLeafM);
            lf.position.set(sx + Math.cos(a) * .018, ty + .085, sz + Math.sin(a) * .018); lf.rotation.set(Math.sin(a) * .7, 0, -Math.cos(a) * .7); lf.castShadow = false; group.add(lf); }
          const top = new THREE.Mesh(succLeafG, succLeafM); top.position.set(sx, ty + .1, sz); top.castShadow = false; group.add(top); }
        // calendario de caballete junto al monitor, inclinado hacia quien trabaja, con dos argollas arriba
        { const qx = dx + .45, qz = dz + .3, ty = y + .78, k2 = .3, hh = .05 * Math.cos(k2), dz2 = .05 * Math.sin(k2);
          const fr = new THREE.Mesh(calGeo, calM); fr.rotation.set(-k2, Math.PI, 0, 'YXZ'); fr.position.set(qx, ty + hh, qz); group.add(fr);
          const bk = new THREE.Mesh(calGeo, calBackM); bk.rotation.set(k2, Math.PI, 0, 'YXZ'); bk.position.set(qx, ty + hh, qz + 2 * dz2); group.add(bk);
          for (const ox of [-.035, .035]) { const rg = new THREE.Mesh(calRingG, pcM); rg.rotation.y = Math.PI / 2; rg.position.set(qx + ox, ty + 2 * hh, qz + dz2); group.add(rg); } }
        // papelera de malla metálica junto al escritorio, con una bola de papel arrugado adentro
        { const px = dx + 1.08, pz = dz + .15;
          const bin = new THREE.Mesh(binG, binM); bin.position.set(px, y + .15, pz); bin.castShadow = true; group.add(bin);
          cyl(.1, .1, .008, binM, px, y + .004, pz, 14).castShadow = false;                     // fondo de la papelera
          const ball = new THREE.Mesh(paperG, paperM); ball.position.set(px + .02, y + .05, pz - .01); ball.rotation.set(k, k * 2, 0); group.add(ball);
          solid(px - .13, px + .13, pz - .13, pz + .13, y + .3, y); }
        if (r() < .75) staticHuman({ gender: r() < .5 ? 'f' : 'm', skin: SKINS[(r() * SKINS.length) | 0], top: TOPS[(r() * TOPS.length) | 0], pants: BOTS[(r() * 3) | 0], topStyle: ['camisa', 'traje', 'mangalarga'][(r() * 3) | 0], legwear: 'pantalon', hair: r() < .5 ? 'long' : 'short' }, dx, y, dz - .6, 0, 'sit');
      });
      // dispensador de agua en cada piso
      const wx = X1 - 1, wz = Z1 - 1;
      box(.4, 1.0, .4, mat(0xf2f2f0, { roughness: .3 }), wx, y + .5, wz); cyl(.16, .16, .45, new THREE.MeshStandardMaterial({ color: 0x7fc4ff, transparent: true, opacity: .6, roughness: .05 }), wx, y + 1.23, wz);
      solid(wx - .25, wx + .25, wz - .25, wz + .25, y + 1.5, y);
      // llaves de agua caliente (roja) y fría (azul), bandeja de goteo y tubo de vasitos de papel
      for (const [dz, c] of [[-.08, 0xd03a2a], [.08, 0x2a7ad8]]) { const tp = cyl(.025, .025, .07, mat(c, { roughness: .35 }), wx - .235, y + .8, wz + dz, 10); tp.rotation.z = Math.PI / 2; }
      box(.12, .02, .3, mat(0x9aa2aa, { metalness: .6, roughness: .3 }), wx - .26, y + .62, wz, { cast: false });
      cyl(.045, .045, .32, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: .55, roughness: .1 }), wx, y + .78, wz - .25, 12);
      cyl(.04, .03, .05, mat(0xf4f1ea, { roughness: .8 }), wx, y + .6, wz - .25, 12);
      act(wx - .9, wz, y, '💧 Tomar agua', () => life.fx('water'));
      // planta de lengua de suegra (sansevieria) en maceta, en la esquina opuesta de cada piso
      { const px = X0 + 1, pz = Z1 - 1, pH = .42;
        cyl(.22, .17, pH, mat(0xe8e4dc, { roughness: .35 }), px, y + pH / 2, pz, 18);
        cyl(.2, .2, .03, mat(0x3a2a1c, { roughness: 1 }), px, y + pH - .03, pz, 14);
        const bladeG = new THREE.ConeGeometry(.045, 1, 4); bladeG.scale(1, 1, .3); bladeG.translate(0, .5, 0);
        const bM = [mat(0x2e5e2a, { roughness: .55 }), mat(0x4a7a34, { roughness: .55 }), mat(0x3c6b2e, { roughness: .55 })];
        for (let k = 0; k < 11; k++) {
          const a = k * 2.39, rr = .03 + (k % 4) * .03, h = .55 + ((k * 7) % 5) * .09;
          const bl = new THREE.Mesh(bladeG, bM[k % 3]); bl.scale.set(1, h, 1);
          bl.position.set(px + Math.cos(a) * rr, y + pH - .03, pz + Math.sin(a) * rr);
          bl.rotation.set(0, -a, 0, 'YXZ'); bl.rotateX(.06 + rr * 1.6);
          bl.castShadow = true; group.add(bl);
        }
        solid(px - .25, px + .25, pz - .25, pz + .25, y + pH + .5, y); }
      // extintor rojo sobre su soporte de piso, con manguera negra, manómetro y letrero «EXTINTOR» (seguridad de la oficina)
      { const ex = X1 - .45, ez = Z1 - 2.1, redM = mat(0xc4161c, { roughness: .32, metalness: .15 }), blkM = mat(0x16171a, { roughness: .5 }), steelM = mat(0xb8bdc4, { metalness: .85, roughness: .25 });
        box(.34, .025, .34, blkM, ex, y + .013, ez, { cast: false });                                   // base del soporte
        box(.035, 1.75, .035, steelM, ex + .14, y + .875, ez);                                          // poste del soporte
        box(.05, .05, .2, steelM, ex + .1, y + .72, ez, { cast: false });                               // gancho que sostiene el extintor
        cyl(.085, .085, .5, redM, ex, y + .32, ez, 18);                                                  // cuerpo del cilindro
        const dome = new THREE.Mesh(new THREE.SphereGeometry(.085, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), redM); dome.position.set(ex, y + .57, ez); dome.castShadow = true; group.add(dome);
        cyl(.03, .035, .07, blkM, ex, y + .68, ez, 10);                                                  // válvula
        box(.16, .018, .035, blkM, ex - .05, y + .73, ez, { cast: false }).rotation.z = .25;             // palanca
        const gauge = cyl(.022, .022, .012, mat(0xf2f2ee, { roughness: .4 }), ex - .035, y + .68, ez, 12); gauge.rotation.z = Math.PI / 2; gauge.castShadow = false; // manómetro
        const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(ex - .02, y + .66, ez + .03), new THREE.Vector3(ex - .1, y + .55, ez + .07), new THREE.Vector3(ex - .1, y + .3, ez + .07), new THREE.Vector3(ex - .09, y + .16, ez + .05)]), 12, .012, 6), blkM); group.add(hose); // manguera
        box(.005, .14, .1, mat(0xf4f1ea, { roughness: .6 }), ex - .086, y + .34, ez, { cast: false });   // etiqueta de instrucciones
        const c = document.createElement('canvas'); c.width = 128; c.height = 160; const g = c.getContext('2d');
        g.fillStyle = '#c4161c'; g.fillRect(0, 0, 128, 160); g.fillStyle = '#fff'; g.textAlign = 'center';
        g.beginPath(); g.moveTo(64, 22); g.bezierCurveTo(30, 60, 40, 96, 64, 104); g.bezierCurveTo(88, 96, 98, 60, 64, 22); g.fill();   // llama
        g.font = '800 22px system-ui, sans-serif'; g.fillText('EXTINTOR', 64, 140);
        const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(.2, .25), new THREE.MeshStandardMaterial({ map: st, roughness: .5, emissive: 0x330000 }));
        plate.position.set(ex + .115, y + 1.6, ez); plate.rotation.y = -Math.PI / 2; group.add(plate);
        solid(ex - .18, ex + .18, ez - .18, ez + .18, y + 1.75, y); }
      // fotocopiadora con bandejas de papel, tapa oscura y panel de control con pantallita verde
      if (i > 0) {
        const kx = X0 + .9, kz = Z1 - 2.6, cpM = mat(0xdcdcd8, { roughness: .45 }), dkM = mat(0x3a3d44, { roughness: .4 });
        box(.6, .9, .7, cpM, kx, y + .45, kz);
        box(.62, .05, .72, dkM, kx, y + .925, kz, { cast: false });
        for (const ty of [.22, .45]) box(.02, .14, .55, dkM, kx + .31, y + ty, kz, { cast: false });
        box(.3, .012, .5, mat(0xfafafa, { roughness: .9 }), kx + .4, y + .7, kz, { cast: false });
        box(.2, .02, .52, dkM, kx + .4, y + .69, kz, { cast: false });
        box(.12, .04, .22, dkM, kx + .26, y + .97, kz - .18, { cast: false });
        box(.004, .025, .1, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x3ad07a, emissiveIntensity: 1.1 }), kx + .321, y + .975, kz - .2, { cast: false });
        solid(kx - .3, kx + .55, kz - .36, kz + .36, y + .95, y);
      }
      // rampa / escalera hacia el piso de arriba
      if (i < FLOORS - 1) {
        const [sa, sb] = stairs[i % 2], st = 14;
        for (let k = 0; k < st; k++) { const zz = SZ0 + (k + .5) * (SZ1 - SZ0) / st; box(sb - sa, .12, (SZ1 - SZ0) / st + .02, frameM, (sa + sb) / 2, y + (k + 1) / st * FH - .06, zz); }
        addRamp(sa, sb, SZ0, SZ1, y, y + FH);
        box(.05, 1, SZ1 - SZ0, frameM, i % 2 ? sb : sa, y + FH * .5 + .5, (SZ0 + SZ1) / 2);
      }
      // pizarra blanca con ruedas junto a los trabajadores: lista de tareas escrita con marcador y un versículo (Colosenses 3:23, LBLA)
      if (i > 0) {
        if (!wbM) {
          const c = document.createElement('canvas'); c.width = 512; c.height = 320; const g = c.getContext('2d');
          g.fillStyle = '#fbfcfd'; g.fillRect(0, 0, 512, 320);
          g.fillStyle = 'rgba(120,140,160,.07)'; for (let k = 0; k < 6; k++) g.fillRect(40 + k * 70, 20 + (k % 3) * 40, 120, 14);   // rastros de borrador
          g.textBaseline = 'middle'; g.fillStyle = '#1f4fa8'; g.font = '700 34px "Comic Sans MS", "Segoe Print", cursive'; g.fillText('Tareas de hoy', 28, 36);
          g.strokeStyle = '#1f4fa8'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, 58); g.lineTo(250, 58); g.stroke();
          g.font = '24px "Comic Sans MS", "Segoe Print", cursive';
          [['Informe mensual', 1], ['Llamar a clientes', 1], ['Reunión 3:00 pm', 0], ['Orar por el equipo', 0]].forEach(([tx, ok], k) => {
            const yy = 92 + k * 36; g.strokeStyle = '#2a2e35'; g.lineWidth = 2; g.strokeRect(30, yy - 10, 20, 20);
            if (ok) { g.strokeStyle = '#1f8a4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(33, yy); g.lineTo(40, yy + 8); g.lineTo(54, yy - 14); g.stroke(); }
            g.fillStyle = '#2a2e35'; g.fillText(tx, 62, yy);
          });
          // gráfica de barras dibujada a mano
          g.strokeStyle = '#2a2e35'; g.lineWidth = 3; g.beginPath(); g.moveTo(320, 60); g.lineTo(320, 200); g.lineTo(490, 200); g.stroke();
          [50, 80, 70, 115].forEach((h, k) => { g.fillStyle = k === 3 ? '#1f8a4a' : '#d03a2a'; g.fillRect(334 + k * 38, 200 - h, 24, h); });
          g.strokeStyle = '#1f8a4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(340, 140); g.lineTo(380, 110); g.lineTo(420, 120); g.lineTo(468, 72); g.stroke();
          g.beginPath(); g.moveTo(468, 72); g.lineTo(454, 74); g.moveTo(468, 72); g.lineTo(464, 86); g.stroke();
          g.fillStyle = '#c0392b'; g.textAlign = 'center'; g.font = 'italic 21px "Comic Sans MS", "Segoe Print", cursive';
          g.fillText('«Y todo lo que hagáis, hacedlo de corazón,', 256, 262); g.fillText('como para el Señor y no para los hombres» Col 3:23', 256, 292);
          const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
          wbM = new THREE.MeshStandardMaterial({ map: tx, roughness: .35, metalness: .05 });
        }
        const bx = cx + 6.6, bz = cz + 5.6, bw = 1.7, bh = 1.06, by = y + 1.45, legM = mat(0x9aa2aa, { metalness: .7, roughness: .3 });
        box(bw + .08, bh + .08, .04, legM, bx, by, bz, { cast: false });                        // marco de aluminio
        const pl = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), wbM); pl.position.set(bx, by, bz - .022); pl.rotation.y = Math.PI; group.add(pl);
        box(bw * .7, .025, .07, legM, bx, by - bh / 2 - .05, bz - .04, { cast: false });          // bandeja para marcadores
        [0xd03a2a, 0x1f4fa8, 0x1a1a1e].forEach((cc, q) => { const mk = cyl(.012, .012, .13, mat(cc, { roughness: .5 }), bx - .25 + q * .17, by - bh / 2 - .025, bz - .05, 6); mk.rotation.z = Math.PI / 2; mk.castShadow = false; });
        box(.07, .022, .045, mat(0x2a2e35, { roughness: .8 }), bx + .38, by - bh / 2 - .022, bz - .05, { cast: false });   // borrador
        for (const sx of [-1, 1]) {
          const lx = bx + sx * (bw / 2 + .02);
          box(.04, by + bh / 2 - y - .1, .04, legM, lx, (by + bh / 2 + y + .1) / 2, bz);   // patas
          box(.05, .04, .6, legM, lx, y + .08, bz);                                              // base en T
          for (const dz of [-.27, .27]) cyl(.035, .035, .03, mat(0x1a1a1e, { roughness: .8 }), lx, y + .035, bz + dz, 10).rotation.z = Math.PI / 2;   // ruedas
        }
        solid(bx - bw / 2 - .1, bx + bw / 2 + .1, bz - .32, bz + .32, by + bh / 2, y);
      }
      // reloj redondo colgado del techo frente a los escritorios: marca la hora real del dispositivo
      if (i > 0) {
        const kx = cx - 1, kz = cz + 6.8, ky = y + 2.55, ck = makeClock(.3), topY = y + FH - .3;
        ck.position.set(kx, ky, kz); ck.rotation.y = Math.PI; group.add(ck);
        for (const dx of [-.16, .16]) cyl(.005, .005, topY - (ky + .28), frameM, kx + dx, (topY + ky + .28) / 2, kz, 4).castShadow = false;
        officeUpd.push(ck.userData.update);
      }
      {
        // letrero colgante con el número de piso donde llega la escalera (se lee por las dos caras)
        const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
        g.fillStyle = '#1d2733'; g.fillRect(0, 0, 256, 128);
        g.strokeStyle = '#ffd34d'; g.lineWidth = 4; g.strokeRect(8, 8, 240, 112);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#ffffff'; g.font = '900 50px system-ui, sans-serif'; g.fillText('PISO ' + (i + 1), 128, 54);
        g.fillStyle = '#ffd34d'; g.font = '700 19px system-ui, sans-serif'; g.fillText(i === 0 ? '☕ Cafetería' : i === FLOORS - 1 ? '🏢 Oficinas · último piso' : '🏢 Oficinas', 128, 98);
        const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
        const [sa, sb] = stairs[i > 0 ? (i - 1) % 2 : 0], nx = (sa + sb) / 2, nz = SZ1 + 1.4, ny = y + 2.35, topY = y + FH - .3;
        const nM = new THREE.MeshBasicMaterial({ map: tx }); nM.color.setScalar(.92);
        box(1.08, .56, .03, frameM, nx, ny, nz, { cast: false });
        for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1, .5), nM); p.position.set(nx, ny, nz + s * .017); p.rotation.y = s > 0 ? 0 : Math.PI; group.add(p); }
        for (const dx of [-.4, .4]) cyl(.004, .004, topY - (ny + .28), frameM, nx + dx, (topY + ny + .28) / 2, nz, 4).castShadow = false;
      }
      // trabajadores de pie conversando
      if (i > 0) staticHuman({ gender: 'm', skin: SKINS[(r() * SKINS.length) | 0], top: 0x2e2e38, topStyle: 'traje', pants: 0x2e2e38, tie: 0x2a4a9a, hair: 'short' }, cx + 7, y, cz + 1.5, -1.6);
      if (i > 0) staticHuman({ gender: 'f', skin: SKINS[(r() * SKINS.length) | 0], top: 0xc0392b, topStyle: 'chaqueta', pants: 0x22243a, legwear: 'pantalon', hair: 'long' }, cx + 6, y, cz + 1.5, 1.6);
    }
    // planta baja: cafetería con barista
    const y0 = fy(0);
    // arbolito de Navidad en la esquina delantera izquierda de la cafetería, junto al vidrio: se ve desde la calle (solo en temporada)
    if (window.Navidad && window.Navidad.activo) xmasTree(X0 + 1, Z0 + 1, y0 + .1, officeUpd);
    box(4, 1.05, .8, mat(0x6a4a2a), cx - 4, y0 + .52, Z1 - 2); box(4.1, .06, .9, mat(0x2a2420, { roughness: .3 }), cx - 4, y0 + 1.07, Z1 - 2); solid(cx - 6, cx - 2, Z1 - 2.45, Z1 - 1.55, y0 + 1.1, y0);
    box(.5, .5, .4, mat(0xa8b0b8, { metalness: .9, roughness: .25 }), cx - 5, y0 + 1.35, Z1 - 2); steam(cx - 5, y0 + 1.65, Z1 - 2);
    staticHuman({ gender: 'f', skin: SKINS[3], top: 0x2e7d4f, topStyle: 'camiseta', pants: 0x1a1a1e, legwear: 'pantalon', hair: 'long' }, cx - 4, y0, Z1 - 1.2, Math.PI, 'work');
    {
      // máquina de espresso: dos grupos con portafiltros de mango negro, bandeja de goteo, manómetro, lanceta de vapor y tacitas calentándose arriba
      const ex = cx - 5, fz = Z1 - 1.8, top = y0 + 1.10, chrM = mat(0xd6dbe0, { metalness: .9, roughness: .18 }), dkM = mat(0x1b1c20, { roughness: .45 }), cupM = mat(0xf6f3ec, { roughness: .35 });
      box(.46, .02, .13, dkM, ex, top + .012, fz + .065, { cast: false });                                   // bandeja de goteo
      box(.44, .006, .11, chrM, ex, top + .025, fz + .065, { cast: false });                                 // rejilla de acero
      for (const dx of [-.12, .1]) {
        cyl(.042, .042, .05, chrM, ex + dx, top + .3, fz + .04, 14).castShadow = false;                      // grupo
        cyl(.036, .03, .03, chrM, ex + dx, top + .265, fz + .045, 14).castShadow = false;                    // portafiltro
        box(.024, .024, .13, dkM, ex + dx, top + .262, fz + .14, { cast: false }).rotation.x = -.12;         // mango negro
        cyl(.024, .018, .045, cupM, ex + dx, top + .055, fz + .05, 12).castShadow = false;                   // tacita de espresso
      }
      const gauge = cyl(.04, .04, .01, mat(0xf4f1ea, { roughness: .4 }), ex, top + .43, fz + .006, 18); gauge.rotation.x = Math.PI / 2; gauge.castShadow = false;   // manómetro
      const aguja = box(.003, .028, .002, mat(0xc0283a), ex + .006, top + .435, fz + .012, { cast: false }); aguja.rotation.z = -.6;
      const wand = cyl(.007, .007, .2, chrM, ex + .21, top + .2, fz + .05, 8); wand.rotation.x = .25; wand.castShadow = false;   // lanceta de vapor
      for (let k = 0; k < 4; k++) cyl(.03, .024, .05, cupM, ex - .15 + k * .1, top + .525, Z1 - 2.1, 12).castShadow = false;       // tazas sobre la máquina
      // la máquina prepara un espresso de vez en cuando: un chorrito fino de café cae del portafiltro y la tacita se va llenando
      {
        const sx = ex - .12, sz = fz + .047, sTop = top + .25, sBot = top + .074;
        const chorro = cyl(.0035, .0045, 1, mat(0x4a2612, { roughness: .25 }), sx, (sTop + sBot) / 2, sz, 8);
        chorro.name = 'chorro-espresso'; chorro.castShadow = false; chorro.raycast = () => {}; chorro.visible = false; chorro.userData.live = true;
        const cafe = cyl(.0205, .0205, .003, mat(0x6b3a1c, { roughness: .3 }), sx, top + .04, sz, 14);   // café con crema dentro de la tacita
        cafe.castShadow = false; cafe.raycast = () => {}; cafe.visible = false; cafe.userData.live = true;
        const P = 9, D = 3.2;  // cada 9 s, durante 3,2 s cae el café
        officeUpd.push(t => {
          const u = t % P, pour = u < D, lleno = Math.min(1, u / D);
          chorro.visible = pour;
          if (pour) { const L = (sTop - sBot) * Math.min(1, u * 4); chorro.scale.set(1, L, 1); chorro.position.y = sTop - L / 2; }
          cafe.visible = u > .25 && u < P - .6;
          cafe.position.y = top + .042 + lleno * .03;
        });
      }
    }
    {
      // caja registradora sobre el mostrador (pantallita verde hacia el cliente) y frasco de propinas de vidrio con monedas
      const rx = cx - 3.9, rz = Z1 - 1.95, top = y0 + 1.10, rgM = mat(0x2b2e34, { roughness: .45 }), rgL = mat(0x4a4f58, { roughness: .4 });
      box(.38, .1, .32, rgM, rx, top + .05, rz, { cast: false });                                          // gaveta del dinero
      const kp = box(.34, .05, .2, rgL, rx, top + .13, rz + .04, { cast: false }); kp.rotation.x = -.35;      // teclado inclinado hacia la barista
      for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) {                                            // teclitas
        const kk = box(.04, .012, .03, mat(b === 3 ? 0x3aa05a : 0xe8e6e0, { roughness: .5 }), rx - .1 + b * .065, top + .16 - a * .016, rz + .09 - a * .045, { cast: false }); kk.rotation.x = -.35; }
      box(.03, .14, .03, rgM, rx, top + .22, rz - .1, { cast: false });                                     // poste de la pantalla
      box(.2, .07, .025, rgM, rx, top + .32, rz - .1, { cast: false });
      box(.17, .045, .004, new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x3ad07a, emissiveIntensity: 1.2 }), rx, top + .32, rz - .114, { cast: false });
      const jx = cx - 3.4, jz = Z1 - 2.2;
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(.065, .06, .16, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xe6f4ff, transparent: true, opacity: .3, roughness: .05, side: THREE.DoubleSide, depthWrite: false }));
      jar.position.set(jx, top + .08, jz); jar.renderOrder = 2; group.add(jar);
      cyl(.06, .06, .006, mat(0xdfe8ee, { roughness: .2 }), jx, top + .003, jz, 16).castShadow = false;       // fondo del frasco
      const coinM = mat(0xd4a93a, { metalness: .8, roughness: .3 }), coinG = new THREE.CylinderGeometry(.016, .016, .004, 12);
      for (let k = 0; k < 9; k++) { const cn = new THREE.Mesh(coinG, coinM); cn.position.set(jx + Math.cos(k * 2.4) * .03 * (k % 3) / 2, top + .01 + k * .005, jz + Math.sin(k * 2.4) * .03 * (k % 3) / 2); cn.rotation.set(k * .3, 0, k * .2); group.add(cn); }
      const bill = box(.07, .004, .035, mat(0x7fae6a, { roughness: .8 }), jx + .01, top + .07, jz, { cast: false }); bill.rotation.set(.2, .6, 1.2);   // billete doblado
    }
    {
      // vitrina de vidrio sobre el mostrador con panes dulces, croissants y bizcochitos en dos niveles
      const vx = cx - 2.75, vz = Z1 - 2, vb = y0 + 1.10, VW = .95, VH = .42, VD = .6;
      box(VW, .04, VD, mat(0x2a2420, { roughness: .4 }), vx, vb + .02, vz, { cast: false });                 // base oscura
      box(VW - .04, .012, VD - .06, mat(0xe8e2d4, { roughness: .5 }), vx, vb + .24, vz, { cast: false });      // repisa del medio
      box(VW, .02, VD, mat(0x2a2420, { roughness: .4 }), vx, vb + VH + .01, vz, { cast: false });              // tapa
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(.02, VH, .02, frameM, vx + sx * (VW / 2 - .01), vb + VH / 2, vz + sz * (VD / 2 - .01), { cast: false });
      const vid = new THREE.Mesh(new THREE.BoxGeometry(VW - .02, VH - .02, VD - .02), new THREE.MeshStandardMaterial({ color: 0xdff2ff, transparent: true, opacity: .16, roughness: .05, metalness: .1, depthWrite: false }));
      vid.position.set(vx, vb + VH / 2, vz); vid.renderOrder = 2; group.add(vid);
      const panM = mat(0xc98a3e, { roughness: .7 }), panM2 = mat(0xe0a858, { roughness: .65 }), bizM = mat(0xf3e6d0, { roughness: .6 }), fresaM = mat(0xc0283a, { roughness: .4 });
      const bolita = new THREE.SphereGeometry(1, 10, 8);
      const pieza = (m, x, y, z, sx, sy, sz, ry = 0) => { const p = new THREE.Mesh(bolita, m); p.scale.set(sx, sy, sz); p.position.set(x, y, z); p.rotation.y = ry; group.add(p); return p; };
      for (let k = 0; k < 4; k++) {                                 // nivel de abajo: panes dulces redondos y croissants
        const px = vx - .33 + k * .22;
        pieza(panM, px, vb + .075, vz - .1, .07, .035, .07);
        const cr = pieza(panM2, px + .02, vb + .07, vz + .14, .085, .03, .04, .5 + k * .3);
        pieza(panM2, cr.position.x - .05, vb + .065, cr.position.z + .02, .03, .022, .028);
        pieza(panM2, cr.position.x + .05, vb + .065, cr.position.z - .02, .03, .022, .028);
      }
      for (let k = 0; k < 4; k++) {                                 // nivel de arriba: bizcochitos con merengue y una fresa
        const px = vx - .33 + k * .22, py = vb + .25;
        cyl(.05, .045, .05, bizM, px, py + .03, vz, 12);
        pieza(bizM, px, py + .065, vz, .045, .025, .045);
        pieza(fresaM, px, py + .095, vz, .015, .015, .015);
      }
    }
    {
      // pizarra del menú colgada del techo sobre el mostrador, escrita con tiza
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#23302a'; g.fillRect(0, 0, 512, 256);
      for (let k = 0; k < 260; k++) { g.fillStyle = `rgba(255,255,255,${.015 + (k % 5) * .006})`; g.fillRect((k * 197) % 512, (k * 83) % 256, 18, 2); }
      g.textBaseline = 'middle'; g.fillStyle = '#f7f1dc'; g.textAlign = 'center'; g.font = '700 40px Georgia, serif'; g.fillText('☕ CAFETERÍA', 256, 38);
      g.strokeStyle = 'rgba(247,241,220,.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(110, 66); g.lineTo(402, 66); g.stroke();
      const items = [['Café negro', '75'], ['Café con leche', '100'], ['Chocolate caliente', '110'], ['Pan dulce', '60'], ['Jugo natural', '90']];
      g.font = '26px Georgia, serif';
      items.forEach(([n, p], k) => { const yy = 92 + k * 30; g.textAlign = 'left'; g.fillStyle = '#f7f1dc'; g.fillText(n, 60, yy); g.textAlign = 'right'; g.fillStyle = '#ffd36b'; g.fillText('RD$ ' + p, 452, yy); });
      g.textAlign = 'center'; g.fillStyle = '#9fe0b8'; g.font = 'italic 19px Georgia, serif'; g.fillText('«Probad y ved que el SEÑOR es bueno» – Salmo 34:8', 256, 240);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      const by = y0 + 2.45, bz = Z1 - 1.0;
      box(2.3, 1.2, .06, mat(0x6a4a2a, { roughness: .6 }), cx - 4, by, bz, { cast: false });
      const bd = new THREE.Mesh(new THREE.PlaneGeometry(2.16, 1.08), new THREE.MeshStandardMaterial({ map: tx, roughness: .9 }));
      bd.position.set(cx - 4, by, bz - .035); bd.rotation.y = Math.PI; group.add(bd);
      const topY = fy(1) - .3;
      for (const dx of [-.9, .9]) cyl(.006, .006, topY - (by + .6), frameM, cx - 4 + dx, (topY + by + .6) / 2, bz, 4);
    }
    {
      // reloj redondo colgado del techo junto a la pizarra del menú: marca la hora real del dispositivo
      const ky = y0 + 2.5, kz = Z1 - 1.0, kx = cx - 1.7, ck = makeClock(.36);
      ck.position.set(kx, ky, kz); ck.rotation.y = Math.PI; group.add(ck);
      const topY = fy(1) - .3;
      for (const dx of [-.2, .2]) cyl(.006, .006, topY - (ky + .33), frameM, kx + dx, (topY + ky + .33) / 2, kz, 4);
      officeUpd.push(ck.userData.update);
      W.office = { cx, cz };
    }
    {
      // letrero luminoso «ABIERTO» colgado detrás del vidrio de la entrada: se lee desde la calle y por dentro dice «¡Bienvenidos!»
      const neon = (txt, sub, col) => {
        const c = document.createElement('canvas'); c.width = 256; c.height = 112; const g = c.getContext('2d');
        const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }; // (sin roundRect: funciona en navegadores viejos)
        g.fillStyle = '#101216'; rr(4, 4, 248, 104, 18); g.fill();
        g.strokeStyle = col; g.lineWidth = 5; g.shadowColor = col; g.shadowBlur = 12; rr(12, 12, 232, 88, 14); g.stroke();
        g.fillStyle = '#ffffff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 40px system-ui, sans-serif'; g.fillText(txt, 128, sub ? 48 : 57);
        if (sub) { g.shadowBlur = 6; g.fillStyle = col; g.font = '700 15px system-ui, sans-serif'; g.fillText(sub, 128, 82); }
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
      };
      const sx = cx + 3.4, sy = y0 + 2.15, sz = Z0 + .4;
      const outM = new THREE.MeshBasicMaterial({ map: neon('ABIERTO', '☕ Cafetería', '#ff3b6b') });
      const inM = new THREE.MeshBasicMaterial({ map: neon('¡Bienvenidos!', '', '#3bd6ff') });
      const geo = new THREE.PlaneGeometry(1.2, .53);
      const pOut = new THREE.Mesh(geo, outM); pOut.position.set(sx, sy, sz - .006); pOut.rotation.y = Math.PI; group.add(pOut);
      const pIn = new THREE.Mesh(geo, inM); pIn.position.set(sx, sy, sz + .006); group.add(pIn);
      box(1.25, .58, .008, mat(0x101216, { roughness: .5 }), sx, sy, sz, { cast: false });
      const topY = fy(1) - .3;
      for (const dx of [-.4, .4]) cyl(.004, .004, topY - (sy + .27), frameM, sx + dx, (topY + sy + .27) / 2, sz, 4);
      // brilla con un pulso suave, como un letrero de neón de verdad (sin parpadeos bruscos)
      officeUpd.push(t => { const k = .82 + Math.sin(t * 2.2) * .12; outM.color.setScalar(k); inM.color.setScalar(.9 + Math.sin(t * 1.7 + 1) * .08); });
    }
    act(cx - 4, Z1 - 3.1, y0, '☕ Comprar un café', () => life.fx('coffee'));
    act(cx - 3, Z1 - 3.1, y0, '🥐 Comprar un pan dulce', () => life.fx('eat'), 1.1);
    for (const [tx, tz] of [[cx - 4, cz], [cx, cz + 1]]) { box(.9, .05, .9, mat(0xf2efe8), tx, y0 + .75, tz); cyl(.05, .05, .72, frameM, tx, y0 + .38, tz, 8); solid(tx - .45, tx + .45, tz - .45, tz + .45, y0 + .78, y0); }
    staticHuman({ gender: 'm', skin: SKINS[1], top: 0x2a4a9a, topStyle: 'camisa', pants: 0x22243a, hair: 'short' }, cx - 4, y0, cz - .75, 0, 'sit');
    {
      // tazas de café humeantes con su platito sobre las mesitas de la cafetería
      const cupM = mat(0xf7f4ee, { roughness: .35 }), cafM = mat(0x3a2414, { roughness: .2 }), ty = y0 + .775;
      for (const [ux, uz] of [[cx - 4, cz - .22], [cx + .18, cz + 1.05]]) {
        cyl(.075, .07, .012, cupM, ux, ty + .006, uz, 14);
        cyl(.042, .034, .075, cupM, ux, ty + .05, uz, 12);
        cyl(.038, .038, .004, cafM, ux, ty + .084, uz, 12);
        box(.012, .04, .03, cupM, ux + .05, ty + .05, uz, { cast: false });
        steam(ux, ty + .14, uz);
      }
      // servilletero de acero con servilletas blancas y vasito con sobrecitos de azúcar en el centro de cada mesita
      const steelM = mat(0xc9ccd0, { metalness: .85, roughness: .25 }), napM = mat(0xffffff, { roughness: .9 });
      const sugM = [mat(0xf4f1ea, { roughness: .8 }), mat(0xc79a5a, { roughness: .8 }), mat(0xe8a0b4, { roughness: .8 })];
      for (const [nx, nz] of [[cx - 3.82, cz + .14], [cx - .2, cz + .85]]) {
        box(.13, .012, .07, steelM, nx, ty + .006, nz, { cast: false });                 // base del servilletero
        for (const sz of [-.03, .03]) box(.12, .09, .006, steelM, nx, ty + .055, nz + sz, { cast: false });   // laterales
        box(.11, .075, .05, napM, nx, ty + .05, nz, { cast: false });                    // servilletas
        const gx = nx - .14;
        cyl(.03, .026, .06, mat(0xdfe8ee, { roughness: .1, metalness: .1 }), gx, ty + .03, nz, 10).castShadow = false;   // vasito
        for (let k = 0; k < 5; k++) { const p = box(.022, .055, .004, sugM[k % 3], gx + (k - 2) * .009, ty + .075, nz + (k % 2 ? .006 : -.006), { cast: false }); p.rotation.z = (k - 2) * .12; }   // sobrecitos
      }
    }
    // sillas libres de madera con cojín alrededor de las mesitas de la cafetería
    const cafeSeats = [[cx - 4, cz + .75, 0], [cx, cz + .25, Math.PI], [cx, cz + 1.75, 0]];
    buildChairs(group, 0, y0, 0, cafeSeats);
    for (const [sx, sz] of cafeSeats) solid(sx - .23, sx + .23, sz - .22, sz + .22, y0 + .98, y0);
    // fachada de vidrio con marcos y puerta de entrada al frente
    const Htot = FLOORS * FH;
    const gwall = (ax, az, bx, bz, y = base, h = Htot) => { const w = Math.abs(bx - ax) || T, d = Math.abs(bz - az) || T; const g = box(w, h, d, glass, (ax + bx) / 2, y + h / 2, (az + bz) / 2, { cast: false, recv: false }); g.renderOrder = 1; solid(Math.min(ax, bx) - T / 2, Math.max(ax, bx) + T / 2, Math.min(az, bz) - T / 2, Math.max(az, bz) + T / 2, 999); };
    const DW = 2.4;
    gwall(X0, Z1, X1, Z1); gwall(X0, Z0, X0, Z1); gwall(X1, Z0, X1, Z1); gwall(X0, Z0, cx - DW / 2, Z0); gwall(cx + DW / 2, Z0, X1, Z0);
    const g2 = box(DW, Htot - 3, T, glass, cx, base + 3 + (Htot - 3) / 2, Z0, { cast: false, recv: false });
    // marcos de cada piso solo en el borde de la fachada (no tapan el piso: sin parpadeo)
    for (let i = 1; i <= FLOORS; i++) { const yy = base + i * FH - .12; box(HW * 2 + .3, .18, .3, frameM, cx, yy, Z0, { cast: false }); box(HW * 2 + .3, .18, .3, frameM, cx, yy, Z1, { cast: false }); box(.3, .18, HD * 2, frameM, X0, yy, cz, { cast: false }); box(.3, .18, HD * 2, frameM, X1, yy, cz, { cast: false }); }
    for (const [px, pz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1], [cx - DW / 2, Z0], [cx + DW / 2, Z0]]) box(.25, Htot, .25, frameM, px, base + Htot / 2, pz);
    const roof = box(HW * 2 + .4, .3, HD * 2 + .4, mat(0x4a4f57), cx, base + Htot + .15, cz, { cast: true }); blockers.push(roof); solid(X0, X1, Z0, Z1, base + Htot + .3, base + Htot);
    sign('OFICINAS LUZ', '🏢 3 pisos · Cafetería', cx, base + 3.2, Z0 - .2, Math.PI);
    {
      // alfombra de entrada de fibra de coco con borde de goma y la palabra «BIENVENIDOS», frente a la puerta (se lee al llegar desde la calle)
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#9a7442'; g.fillRect(0, 0, 512, 256);
      for (let k = 0; k < 2600; k++) { g.fillStyle = k % 3 ? 'rgba(60,38,16,.18)' : 'rgba(214,176,112,.22)'; g.fillRect((k * 173) % 512, (k * 89) % 256, 2, 3); }   // fibras
      g.strokeStyle = '#3b2814'; g.lineWidth = 8; g.strokeRect(22, 22, 468, 212);
      g.fillStyle = '#3b2814'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '900 64px Georgia, serif'; g.fillText('BIENVENIDOS', 256, 128);
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
      const mz = Z0 - .75;
      box(1.9, .02, 1.0, mat(0x1c1c1e, { roughness: .9 }), cx, base + .01, mz, { cast: false });   // borde de goma
      const mt = new THREE.Mesh(new THREE.PlaneGeometry(1.76, .88), new THREE.MeshStandardMaterial({ map: tx, roughness: 1 }));
      mt.rotation.set(-Math.PI / 2, 0, Math.PI); mt.position.set(cx, base + .021, mz); mt.receiveShadow = true; group.add(mt);
    }
    if (W.indoor) W.indoor.push({ name: 'las oficinas', msg: '⏸ En las oficinas el tiempo se detiene', rects: [[X0, X1, Z0, Z1], [cx - 4, cx + 4, Z0 - 5, Z0]], maxY: base + Htot });
    W.zones.push({ id: 'oficinas', name: 'Edificio de oficinas', minX: X0, maxX: X1, minZ: Z0, maxZ: Z1, pri: 5, text: 'Sube por las escaleras para visitar las oficinas y la cafetería de la planta baja.', ref: 'Colosenses 3:23' });
  }

  await pace();
  /* ---------- Comerciantes en las plazas ---------- */
  const stalls = [
    { name: 'Frutas', emoji: '🍎', col: 0xc0392b, item: 'eat', goods: [0xd23a2a, 0xf0c040, 0x6ab04a, 0xf08a20] },
    { name: 'Panadería', emoji: '🥖', col: 0xe0a31a, item: 'eat', goods: [0xc98a3e, 0xd9a35b, 0xb8742e] },
    { name: 'Café', emoji: '☕', col: 0x5a3a1e, item: 'coffee', goods: [0x3a2414, 0xf2efe6] },
    { name: 'Agua y jugos', emoji: '🥤', col: 0x1a9ab0, item: 'water', goods: [0x7fc4ff, 0xf08a20, 0xd23a2a] },
  ];
  let si = 0;
  for (const [x0, z0, type] of blocks) {
    if (type !== 'plaza') continue;
    const cx = x0 + BLOCK / 2;
    for (const [sz, ry] of [[z0 + 2.4, 0], [z0 + BLOCK - 2.4, Math.PI]]) { await pace();
      const S = stalls[si++ % stalls.length], g = new THREE.Group(); g.position.set(cx, CURB, sz); g.rotation.y = ry; group.add(g);
      const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
      const wood = mat(0x7a5232);
      add(new THREE.BoxGeometry(2.6, .08, 1.1), wood, 0, .9, 0); add(new THREE.BoxGeometry(2.5, .85, .05), wood, 0, .45, .5);
      for (const [a, b] of [[-1.25, -.5], [1.25, -.5], [-1.25, .5], [1.25, .5]]) add(new THREE.CylinderGeometry(.04, .04, 2.3, 8), wood, a, 1.15, b);
      // toldo a rayas
      const c = document.createElement('canvas'); c.width = 128; c.height = 16; const gg = c.getContext('2d'); for (let k = 0; k < 8; k++) { gg.fillStyle = k % 2 ? '#f4efe6' : '#' + new THREE.Color(S.col).getHexString(); gg.fillRect(k * 16, 0, 16, 16); }
      const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
      const aw = add(new THREE.BoxGeometry(2.9, .05, 1.5), new THREE.MeshStandardMaterial({ map: tx, roughness: .8 }), 0, 2.3, 0); aw.rotation.x = -.18;
      // mercancía
      for (let k = 0; k < 14; k++) add(new THREE.SphereGeometry(S.item === 'coffee' ? .06 : .09, 10, 8), mat(S.goods[k % S.goods.length]), -1.05 + (k % 7) * .35, .99 + (k > 6 ? .06 : 0), -.25 + (k > 6 ? .25 : 0));
      // letrero
      const lc = document.createElement('canvas'); lc.width = 256; lc.height = 64; const lg = lc.getContext('2d'); lg.fillStyle = '#1a1206'; lg.fillRect(0, 0, 256, 64); lg.fillStyle = '#ffd34d'; lg.font = '800 30px system-ui, sans-serif'; lg.textAlign = 'center'; lg.fillText(S.emoji + ' ' + S.name, 128, 43);
      const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace;
      add(new THREE.PlaneGeometry(1.6, .4), new THREE.MeshStandardMaterial({ map: lt, emissive: 0xffffff, emissiveMap: lt, emissiveIntensity: .3 }), 0, 2.0, -.62).rotation.y = Math.PI;
      // comerciante detrás del puesto
      const v = createHuman({ detail: .5, gender: si % 2 ? 'm' : 'f', skin: SKINS[(r() * SKINS.length) | 0], top: S.col, topStyle: 'camiseta', pants: 0x3a3d45, legwear: 'pantalon', hair: si % 2 ? 'short' : 'long' });
      for (const a of v.arms) { a.shoulder.rotation.x = -.5; a.elbow.rotation.x = -.8; }
      const vb = bakeStatic(v.root); vb.position.set(0, 0, .95); vb.rotation.y = Math.PI; g.add(vb);
      const wx = cx, wz = sz + (ry ? 1.6 : -1.6);
      addBox(cx - 1.4, cx + 1.4, sz - .6, sz + .6, CURB + 1.0);
      act(wx, wz, CURB, `${S.emoji} Comprar en el puesto de ${S.name.toLowerCase()}`, () => life.fx(S.item, S.name), 1.8);
      // los personajes bíblicos no se paran delante del puesto
      for (let k = npcSpots.length - 1; k >= 0; k--) if (Math.hypot(npcSpots[k][0] - cx, npcSpots[k][1] - sz) < 4.5) npcSpots.splice(k, 1);
    }
  }

  /* ---------- Peatones en las aceras y niños jugando en las plazas ---------- */
  const nCity = Math.min(26, 6 + blocks.length * 2);
  for (let k = 0; k < nCity; k++) { await pace();
    const b = blocks[k % blocks.length], [x0, z0, type] = b;
    if (type === 'casa') continue;
    const ins = 1.5 + r() * .6, L = BLOCK - ins * 2, per = L * 4;
    const h = person(r, { kid: r() < .18 }); group.add(h.root);
    walkers.push({ h, x0: x0 + ins, z0: z0 + ins, L, per, s: r() * per, sp: (r() < .5 ? -1 : 1) * (1.1 + r() * .6), y: CURB, kind: 'loop' });
  }
  for (const [x0, z0, type] of blocks) {
    if (type !== 'plaza') continue;
    const cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
    for (let k = 0; k < 3; k++) { await pace(); const h = person(r, { kid: true }); group.add(h.root); walkers.push({ h, cx, cz, rad: 5.3, a: k * 2.1, sp: (k % 2 ? -1 : 1) * (.55 + k * .08), y: CURB, kind: 'ring', jump: k === 1 }); }
  }

  const tmp = new THREE.Vector3();
  const life = {
    acts, walkers,
    fx: () => {},                 // lo conecta el juego (efectos al comer, dormir, etc.)
    update(dt, t, cam, player) {
      if (W.house && Math.abs(W.house.cx - player.x) < 16 && Math.abs(W.house.cz - player.z) < 16) for (const f of houseUpd) f(t);
      if (W.office && Math.abs(W.office.cx - player.x) < 18 && Math.abs(W.office.cz - player.z) < 18) for (const f of officeUpd) f(t);
      for (const st of steams) {
        const near = Math.abs(st.x - player.x) < 14 && Math.abs(st.z - player.z) < 14 && Math.abs(st.y - player.y) < 4;
        for (const p of st.puffs) {
          p.sp.visible = near; if (!near) continue;
          const u = (t * .35 + p.ph) % 1;
          p.sp.position.set(st.x + Math.sin(t * 1.3 + p.ph * 6) * .05 * u, st.y + u * .55, st.z + Math.cos(t * 1.1 + p.ph * 5) * .04 * u);
          p.sp.scale.setScalar(.08 + u * .22); p.sp.material.opacity = Math.sin(u * Math.PI) * .45;
        }
      }
      for (const w of walkers) {
        const px = w.kind === 'loop' ? w.x0 + w.L / 2 : w.cx, pz = w.kind === 'loop' ? w.z0 + w.L / 2 : w.cz;
        const near = Math.hypot(px - cam.x, pz - cam.z) < 95; w.h.root.visible = near; if (!near) continue;
        let x, z, hd;
        if (w.kind === 'loop') {
          // si el jugador está muy cerca, el peatón se detiene un momento
          const stop = Math.hypot(w.h.root.position.x - player.x, w.h.root.position.z - player.z) < 1.1;
          if (!stop) w.s = (w.s + w.sp * dt + w.per) % w.per;
          const s = w.s, L = w.L, side = Math.floor(s / L), u = s - side * L;
          if (side === 0) { x = w.x0 + u; z = w.z0; } else if (side === 1) { x = w.x0 + L; z = w.z0 + u; } else if (side === 2) { x = w.x0 + L - u; z = w.z0 + L; } else { x = w.x0; z = w.z0 + L - u; }
          const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]][side]; hd = Math.atan2(dirs[0] * Math.sign(w.sp), dirs[1] * Math.sign(w.sp));
          w.h.root.position.set(x, w.y, z); w.h.root.rotation.y = hd;
          animateHuman(w.h, dt, { speed: stop ? 0 : Math.abs(w.sp) * 1.15, onGround: true, vy: 0, land: 0, t });
        } else {
          w.a += dt * w.sp; x = w.cx + Math.cos(w.a) * w.rad; z = w.cz + Math.sin(w.a) * w.rad;
          w.h.root.position.set(x, w.y + (w.jump ? Math.max(0, Math.sin(t * 3 + w.a * 4)) * .25 : 0), z); w.h.root.rotation.y = Math.atan2(-Math.sin(w.a) * w.sp, Math.cos(w.a) * w.sp);
          animateHuman(w.h, dt, { speed: 4, onGround: true, vy: 0, land: 0, t });
        }
      }
    },
  };
  return life;
}
