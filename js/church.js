import * as THREE from 'three';
import { createHuman, bakeStatic } from './human.js';
import { pace } from './pace.js';
import { nameSprite } from './characters.js';

/* =========================================================
   IGLESIA MORIAH CHURCH – SAN CRISTÓBAL (en todos los niveles)
   Lobby con recepción y baños, santuario con tarima, pantalla grande,
   grupo de alabanza (batería, guitarra, bajo, teclado y cantantes),
   predicador y congregación adorando: manos arriba, saltando, llorando de rodillas.
   ========================================================= */
const SKINS = [0xf1cbb0, 0xe8b896, 0xc68e6a, 0xa8714f, 0x8a5636, 0x5e3a24];
const TOPS = [0x1f5c70, 0x7a3b6e, 0xc0392b, 0x2e2e38, 0xe0a31a, 0x2e7d4f, 0x2a4a9a, 0xe87aa0, 0xf2f0e8, 0x8a5a2a];
const STYLES = ['camisa', 'camiseta', 'mangalarga', 'traje', 'chaqueta'];

export async function buildChurch({ group, addBox, addRamp, blockers, block, CURB, BLOCK, r, acts, fx }) {
  const [bx0, bz0] = block, cx = bx0 + BLOCK / 2, cz = bz0 + BLOCK / 2, y0 = CURB;
  const HW = 13, HD = 15.5, H = 9, T = .3;
  const X0 = cx - HW, X1 = cx + HW, Z0 = cz - HD, Z1 = cz + HD;
  const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .7, ...o });
  const box = (w, h, d, m, x, y, z, { cast = true, recv = true } = {}) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); b.castShadow = cast; b.receiveShadow = recv; group.add(b); return b; };
  const solid = (a, b, c, d, top, bottom = 0) => addBox(Math.min(a, b), Math.max(a, b), Math.min(c, d), Math.max(c, d), top, bottom);
  const dance = [], seats = [];
  const person = (opts, x, z, ry, pose, { y = y0 + .1, anim = null } = {}) => {   // y0 + .1: sobre la alfombra (antes los pies quedaban enterrados)
    const f = opts.gender ? opts.gender === 'f' : r() < .5;
    const h = createHuman({ detail: .45, gender: f ? 'f' : 'm', skin: SKINS[(r() * 6) | 0], top: TOPS[(r() * TOPS.length) | 0], pants: [0x22243a, 0x1a1a1e, 0x2b3a57][(r() * 3) | 0],
      skirt: [0x22243a, 0x7a3b6e, 0x2d3a6a][(r() * 3) | 0], legwear: f ? ['falda', 'vestido', 'pantalon'][(r() * 3) | 0] : 'pantalon', topStyle: STYLES[(r() * STYLES.length) | 0],
      hair: f ? 'long' : 'short', hairColor: [0x1d130c, 0x3a2314, 0x5a3a1e][(r() * 3) | 0], tie: 0x8a1c24, name: '', ...opts });
    const A = h.arms;
    if (pose === 'up') { A[0].shoulder.rotation.set(-2.75, 0, -.35); A[1].shoulder.rotation.set(-2.75, 0, .35); A[0].elbow.rotation.x = A[1].elbow.rotation.x = -.25; h.head.rotation.x = -.35; }
    if (pose === 'one') { A[1].shoulder.rotation.set(-2.8, 0, .3); A[1].elbow.rotation.x = -.2; h.head.rotation.x = -.3; }
    if (pose === 'cry') { for (const l of h.legs) { l.thigh.rotation.x = -1.5; l.knee.rotation.x = 2.4; } h.hips.position.y = .45; for (const a of A) { a.shoulder.rotation.x = -1.9; a.elbow.rotation.x = -2.2; } h.spine.rotation.x = .45; h.head.rotation.x = .4; }
    if (pose === 'kneelUp') { for (const l of h.legs) { l.thigh.rotation.x = -.1; l.knee.rotation.x = 1.55; } h.hips.position.y = .5; A[0].shoulder.rotation.set(-2.6, 0, -.4); A[1].shoulder.rotation.set(-2.6, 0, .4); h.head.rotation.x = -.4; }
    if (pose === 'clap') { for (const a of A) { a.shoulder.rotation.x = -1.2; a.elbow.rotation.x = -1.3; } A[0].shoulder.rotation.z = .35; A[1].shoulder.rotation.z = -.35; }
    if (pose === 'guitar') { A[0].shoulder.rotation.set(-.8, 0, .5); A[0].elbow.rotation.x = -1.4; A[1].shoulder.rotation.set(-.5, 0, -.2); A[1].elbow.rotation.x = -1.2; }
    if (pose === 'keys' || pose === 'drum') { for (const l of (pose === 'drum' ? h.legs : [])) { l.thigh.rotation.x = -1.5; l.knee.rotation.x = 1.5; } if (pose === 'drum') h.hips.position.y = .52; for (const a of A) { a.shoulder.rotation.x = -.9; a.elbow.rotation.x = -.8; } }
    if (pose === 'mic') { A[1].shoulder.rotation.set(-1.4, 0, -.1); A[1].elbow.rotation.x = -1.9; A[0].shoulder.rotation.set(-2.5, 0, -.4); h.head.rotation.x = -.15; }
    if (pose === 'preach') { A[1].shoulder.rotation.set(-2.2, 0, .5); A[1].elbow.rotation.x = -.4; A[0].shoulder.rotation.set(-.9, 0, -.2); A[0].elbow.rotation.x = -1.1; }
    const b = bakeStatic(h.root); b.position.set(x, y, z); b.rotation.y = ry; group.add(b);
    if (anim) dance.push({ o: b, kind: anim, y, ry, ph: r() * 6 });
    return b;
  };

  // --- piso, paredes (negras por dentro) y techo ---
  box(HW * 2, .1, HD * 2, mat(0x3a3236, { roughness: .8 }), cx, y0 + .05, cz, { cast: false });                 // alfombra
  solid(X0, X1, Z0, Z1, y0 + .1);
  const wallM = mat(0x0d0d10, { roughness: .85 }), darkM = mat(0x1c1a22, { roughness: .8 });
  const wall = (ax, az, bx, bz, h = H, m = wallM) => { const w = Math.abs(bx - ax) || T, d = Math.abs(bz - az) || T; const o = box(w, h, d, m, (ax + bx) / 2, y0 + h / 2, (az + bz) / 2); blockers.push(o); solid(ax - T / 2, bx + T / 2, az - T / 2, bz + T / 2, 999); return o; };
  const DW = 3.2;
  wall(X0, Z1, X1, Z1, H, darkM); wall(X0, Z0, X0, Z1); wall(X1, Z0, X1, Z1); wall(X0, Z0, cx - DW / 2, Z0); wall(cx + DW / 2, Z0, X1, Z0);
  box(DW, H - 3.4, T, wallM, cx, y0 + 3.4 + (H - 3.4) / 2, Z0);
  // fachada trasera por fuera: la pared del escenario es oscura por dentro, pero por fuera se veía como un bloque negro;
  // se reviste del mismo color claro que el resto del templo, con zócalo y una cruz dorada
  // por fuera, las paredes son gris oscuro con líneas verticales estrechas (una textura diminuta repetida: casi no pesa)
  const ribTex = (() => { const c = document.createElement('canvas'); c.width = 32; c.height = 4; const g = c.getContext('2d');
    g.fillStyle = '#4a4d53'; g.fillRect(0, 0, 32, 4); g.fillStyle = '#2c2e33'; g.fillRect(14, 0, 3, 4); g.fillStyle = '#62666d'; g.fillRect(17, 0, 1, 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t; })();
  const ribM = w => { const t = ribTex.clone(); t.repeat.set(w / .45, 1); t.needsUpdate = true; return new THREE.MeshStandardMaterial({ map: t, roughness: .85 }); };
  const skin = (w, h, x, y, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ribM(w)); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; group.add(m); };
  box(HW * 2 + T, H, .06, ribM(HW * 2 + T), cx, y0 + H / 2, Z1 + T / 2 + .04, { cast: false });
  for (const sx of [-1, 1]) skin(HD * 2 + T, H, cx + sx * (HW + T / 2 + .006), y0 + H / 2, cz, sx * Math.PI / 2);                  // laterales
  { const fz = Z0 - T / 2 - .006, sw = HW - DW / 2 + T / 2;
    for (const sx of [-1, 1]) skin(sw, H, cx + sx * (DW / 2 + sw / 2), y0 + H / 2, fz, Math.PI);                                       // frente, a los lados de la puerta
    skin(DW, H - 3.4, cx, y0 + 3.4 + (H - 3.4) / 2, fz, Math.PI); }                                                                    // sobre la puerta
  box(HW * 2 + T + .04, .5, .1, mat(0x9a948a, { roughness: .95 }), cx, y0 + .25, Z1 + T / 2 + .1, { cast: false });
  { const gold = mat(0xd9b24a, { metalness: .6, roughness: .35, emissive: 0x3a2a08 });
    box(.4, 3.4, .12, gold, cx, y0 + H - 3.6, Z1 + T / 2 + .13, { cast: false }); box(2, .4, .12, gold, cx, y0 + H - 2.9, Z1 + T / 2 + .13, { cast: false }); }
  const roof = box(HW * 2 + .8, .4, HD * 2 + .8, mat(0x3a3f47), cx, y0 + H + .2, cz, { cast: false }); blockers.push(roof);
  // puertas de vidrio y fachada con letrero, emblemas «M» y horario
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fc4e0, metalness: .3, roughness: .05, transparent: true, opacity: .35, depthWrite: false });
  for (const sx of [-1, 1]) { const g = box(DW / 2 - .1, 3.2, .06, glass, cx + sx * (DW / 4 + .02), y0 + 1.6, Z0 - .18, { cast: false }); g.rotation.y = sx * -1.1; g.position.x += sx * .55; g.position.z -= .5; }
  // MORIAH CHURCH – San Cristóbal: letrero, emblemas «M», horario y una «M» gigante moderna en la pared lateral
  const AB = '"Arial Black", system-ui, sans-serif', SU = 'system-ui, sans-serif';
  const fit = (g, txt, wt, s, fam, maxW) => { do g.font = `${wt} ${s}px ${fam}`; while (g.measureText(txt).width > maxW && --s > 10); };
  const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.textAlign = 'center'; draw(g); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  const bgDark = (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#0b1730'); gr.addColorStop(1, '#1a0b30'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = '#f5c542'; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20); };
  // contorno de la «M» (u, v de 0 a 1, v hacia abajo): la misma forma para el emblema y la letra 3D
  const MPTS = [[0, 1], [0, 0], [.2, 0], [.5, .46], [.8, 0], [1, 0], [1, 1], [.79, 1], [.79, .38], [.5, .8], [.21, .38], [.21, 1]];
  // la misma «M» con un poco de curva: cada esquina se redondea (sirve para el canvas y para THREE.Shape)
  const mPath = (p, X, Y, rad = .14) => {
    const n = MPTS.length, pt = (i, k, d) => { const a = MPTS[(i + n) % n], b = MPTS[(i + k + n) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), q = Math.min(d, l / 2.2) / l; return [a[0] + dx * q, a[1] + dy * q]; };
    for (let i = 0; i < n; i++) { const [ax, ay] = pt(i, -1, rad), [bx, by] = pt(i, 1, rad), [vx, vy] = MPTS[i];
      if (i) p.lineTo(X(ax), Y(ay)); else p.moveTo(X(ax), Y(ay)); p.quadraticCurveTo(X(vx), Y(vy), X(bx), Y(by)); }
    p.closePath();
  };
  const stx = canvasTex(1024, 256, g => {
    bgDark(g, 1024, 256);
    g.fillStyle = '#ffd34d'; fit(g, 'MORIAH CHURCH', 900, 104, AB, 940); g.fillText('MORIAH CHURCH', 512, 112);
    g.fillStyle = '#7fd8ff'; fit(g, 'SAN CRISTÓBAL', 800, 40, SU, 900); g.fillText('SAN CRISTÓBAL', 512, 166);
    g.fillStyle = '#e9e0ff'; fit(g, 'EPICENTRO DE AVIVAMIENTO PARA LAS NACIONES', 700, 36, SU, 940); g.fillText('EPICENTRO DE AVIVAMIENTO PARA LAS NACIONES', 512, 218);
  });
  const sign = box(12, 3, .2, new THREE.MeshStandardMaterial({ map: stx, emissive: 0xffffff, emissiveMap: stx, emissiveIntensity: .6 }), cx, y0 + H - 2.1, Z0 - .3, { cast: false }); sign.rotation.y = Math.PI;
  // emblemas redondos con la «M» a los lados del letrero (una sola textura para los dos)
  const embTex = canvasTex(256, 256, g => {
    const gr = g.createRadialGradient(128, 110, 10, 128, 128, 128); gr.addColorStop(0, '#24345e'); gr.addColorStop(1, '#0b1124'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 124, 0, 7); g.fill();
    g.strokeStyle = '#f5c542'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 116, 0, 7); g.stroke();
    const mg = g.createLinearGradient(0, 60, 0, 196); mg.addColorStop(0, '#ffe27a'); mg.addColorStop(1, '#ff9a2e'); g.fillStyle = mg;
    g.beginPath(); mPath(g, u => 58 + u * 140, v => 66 + v * 124); g.fill();
  });
  const emb = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshStandardMaterial({ map: embTex, emissive: 0xffffff, emissiveMap: embTex, emissiveIntensity: .45 }));
  emb.position.set(cx - 8.2, y0 + H - 2.1, Z0 - .42); emb.rotation.y = Math.PI; group.add(emb);
  const emb2 = emb.clone(); emb2.position.x = cx + 8.2; group.add(emb2);
  // horario de servicios junto a la puerta
  const schTex = canvasTex(512, 400, g => {
    bgDark(g, 512, 400);
    g.fillStyle = '#ffd34d'; fit(g, 'HORARIO DE SERVICIOS', 900, 40, AB, 450); g.fillText('HORARIO DE SERVICIOS', 256, 72);
    g.fillStyle = '#f5c542'; g.fillRect(60, 92, 392, 4);
    [['MIÉRCOLES', '8:00 PM'], ['VIERNES', '8:00 PM'], ['DOMINGO', '10:00 AM']].forEach(([d, h], k) => {
      const y = 158 + k * 72; g.font = `800 40px ${SU}`;
      g.textAlign = 'left'; g.fillStyle = '#ffffff'; g.fillText(d, 52, y);
      g.textAlign = 'right'; g.fillStyle = '#7fd8ff'; g.fillText(h, 460, y);
    });
    g.textAlign = 'center'; g.fillStyle = '#e9e0ff'; g.font = `italic 600 28px ${SU}`; g.fillText('¡Te esperamos!', 256, 370);
  });
  box(3.1, 2.5, .08, mat(0xd9b24a, { metalness: .6, roughness: .35 }), cx - 5, y0 + 2.3, Z0 - .2, { cast: false });
  const sch = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.34), new THREE.MeshStandardMaterial({ map: schTex, emissive: 0xffffff, emissiveMap: schTex, emissiveIntensity: .5 }));
  sch.position.set(cx - 5, y0 + 2.3, Z0 - .25); sch.rotation.y = Math.PI; group.add(sch);
  // «M» gigante y moderna en la pared lateral: panel de vidrio oscuro, letra dorada en 3D con contorno de neón y franjas de luz
  const neonM = new THREE.MeshStandardMaterial({ color: 0x0a2a40, emissive: 0x34c8ff, emissiveIntensity: 1.8 });
  {
    const px = X1 + T / 2, mz = cz + 1.5, MW = 7.2, MH = 6;
    const mShape = s => { const sh = new THREE.Shape(); mPath(sh, u => (u - .5) * MW * s, v => (1 - v) * MH * s - (s - 1) * MH / 2); return sh; };
    box(.12, 8.2, 11, mat(0x10141c, { metalness: .5, roughness: .15 }), px + .06, y0 + 4.5, mz, { cast: false });
    for (const dz of [-5.35, 5.35]) box(.06, 8.2, .14, neonM, px + .14, y0 + 4.5, mz + dz, { cast: false });   // franjas de luz
    const glow = new THREE.Mesh(new THREE.ExtrudeGeometry(mShape(1.1), { depth: .12, bevelEnabled: false, curveSegments: 8 }), neonM);
    glow.position.set(px + .12, y0 + 1.9, mz); glow.rotation.y = Math.PI / 2; group.add(glow);
    const gold = new THREE.MeshStandardMaterial({ color: 0xffc94a, metalness: .25, roughness: .3, emissive: 0xd08a1a, emissiveIntensity: .55 });
    const m3 = new THREE.Mesh(new THREE.ExtrudeGeometry(mShape(1), { depth: .45, bevelEnabled: true, bevelSize: .06, bevelThickness: .06, bevelSegments: 1, curveSegments: 8 }), gold);
    m3.position.set(px + .24, y0 + 1.9, mz); m3.rotation.y = Math.PI / 2; m3.castShadow = true; group.add(m3);
    const nameTex = canvasTex(1024, 128, g => { g.fillStyle = '#ffffff'; fit(g, 'MORIAH CHURCH', 900, 92, AB, 980); g.fillText('MORIAH CHURCH', 512, 98); });
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), new THREE.MeshBasicMaterial({ map: nameTex, transparent: true, toneMapped: false }));
    nm.position.set(px + .14, y0 + 1.05, mz); nm.rotation.y = Math.PI / 2; group.add(nm);
    solid(X1, px + .85, mz - 5.5, mz + 5.5, y0 + 9);
  }
  // letrero luminoso verde de «SALIDA» por dentro, sobre la puerta principal (como en los templos reales)
  {
    const ec = document.createElement('canvas'); ec.width = 256; ec.height = 96; const eg = ec.getContext('2d');
    eg.fillStyle = '#0f8a3c'; eg.fillRect(0, 0, 256, 96); eg.strokeStyle = '#e8fff0'; eg.lineWidth = 5; eg.strokeRect(6, 6, 244, 84);
    eg.fillStyle = '#ffffff'; eg.font = '900 44px "Arial Black", system-ui, sans-serif'; eg.textAlign = 'center'; eg.textBaseline = 'middle'; eg.fillText('SALIDA', 150, 50);
    eg.beginPath(); eg.moveTo(22, 50); eg.lineTo(44, 30); eg.lineTo(44, 42); eg.lineTo(60, 42); eg.lineTo(60, 58); eg.lineTo(44, 58); eg.lineTo(44, 70); eg.closePath(); eg.fill();   // flecha
    const et = new THREE.CanvasTexture(ec); et.colorSpace = THREE.SRGBColorSpace;
    box(.98, .4, .07, mat(0xf4f4f0, { roughness: .4 }), cx, y0 + 3.8, Z0 + T / 2 + .035, { cast: false });                       // caja del letrero
    const ep = new THREE.Mesh(new THREE.PlaneGeometry(.9, .34), new THREE.MeshBasicMaterial({ map: et, toneMapped: false }));
    ep.position.set(cx, y0 + 3.8, Z0 + T / 2 + .075); group.add(ep);
  }

  // --- LOBBY (al frente): recepción, sofás, baños de damas y caballeros ---
  const LZ = Z0 + 7;                                              // pared que separa el lobby del santuario
  wall(X0, LZ, cx - 3, LZ, 4); wall(cx + 3, LZ, X1, LZ, 4);
  box(6, H - 4, T, wallM, cx, y0 + 4 + (H - 4) / 2, LZ);
  box(4, 1.1, 1, mat(0x6a4a2a), cx, y0 + .55, Z0 + 3.2); box(4.1, .06, 1.1, mat(0x2a2420, { roughness: .3 }), cx, y0 + 1.12, Z0 + 3.2); solid(cx - 2, cx + 2, Z0 + 2.7, Z0 + 3.7, y0 + 1.15);
  // servidora de la recepción: se mueve, saluda con gestos y dice «¡Bendiciones!» cuando llegas
  // (antes llevaba saco negro con camisa y solapas y parecía un hombre de esmoquin: ahora es claramente una dama)
  const recep = createHuman({ detail: .6, gender: 'f', topStyle: 'mangalarga', top: 0x9a2a4e, legwear: 'vestido', skin: SKINS[2], hair: 'long', hairColor: 0x1d130c, shoes: 0x1a1214, earrings: true, necklace: true, name: '' });
  recep.root.position.set(cx, y0 + .1, Z0 + 4.1); recep.root.rotation.y = Math.PI; group.add(recep.root);
  // cartel con su cargo para que se sepa quién es (se oculta mientras saluda)
  const recepTag = nameSprite('Servidora', 'Recepción'); recepTag.scale.set(1.2, .3, 1); recepTag.position.set(cx, y0 + 2.15, Z0 + 4.1); group.add(recepTag);
  const bubble = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 160; const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,255,255,.96)'; g.strokeStyle = '#d4a72c'; g.lineWidth = 8;
    g.beginPath(); g.roundRect(8, 8, 496, 112, 40); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(230, 118); g.lineTo(256, 152); g.lineTo(282, 118); g.fill();
    g.fillStyle = '#5a3a00'; g.font = '800 64px system-ui, sans-serif'; g.textAlign = 'center'; g.fillText('¡Bendiciones!', 256, 86);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); sp.scale.set(1.9, .6, 1); sp.position.set(cx, y0 + 2.45, Z0 + 4.1); sp.renderOrder = 20; sp.visible = false; group.add(sp); return sp;
  })();
  const greeter = { x: cx, z: Z0 + 4.1, y: y0 + .1, g: 0, cool: 0, h: recep, bubble };
  for (const sx of [-1, 1]) { box(2.2, .45, .9, mat(0x2a4a7a, { roughness: .9 }), cx + sx * 6, y0 + .25, Z0 + 1.3); box(2.2, .7, .2, mat(0x2a4a7a, { roughness: .9 }), cx + sx * 6, y0 + .6, Z0 + .9); solid(cx + sx * 6 - 1.1, cx + sx * 6 + 1.1, Z0 + .8, Z0 + 1.8, y0 + .45); }
  // baños
  const bath = (bx, label, tag) => {
    const w0 = bx - 2.2, w1 = bx + 2.2;
    wall(w0, LZ - 4.2, w0, LZ, 3); wall(w1, LZ - 4.2, w1, LZ, 3); wall(w0, LZ - 4.2, bx - .5, LZ - 4.2, 3); wall(bx + .5, LZ - 4.2, w1, LZ - 4.2, 3);
    // puerta invisible: el de damas solo deja entrar mujeres y el de caballeros solo hombres
    addBox(bx - .5, bx + .5, LZ - 4.2 - .35, LZ - 4.2 + .35, 999, 0, tag);
    box(.5, .45, .6, mat(0xffffff, { roughness: .2 }), bx - 1.2, y0 + .23, LZ - .5); box(.5, .45, .6, mat(0xffffff, { roughness: .2 }), bx + 1.2, y0 + .23, LZ - .5);
    box(1.4, .2, .5, mat(0xffffff, { roughness: .2 }), bx, y0 + .85, LZ - .35); box(1.2, .8, .04, mat(0xbfd8e8, { metalness: .9, roughness: .05 }), bx, y0 + 1.6, LZ - .17);
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#123'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#fff'; g.font = '700 32px system-ui'; g.textAlign = 'center'; g.fillText(label, 128, 44);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .3), new THREE.MeshBasicMaterial({ map: t })); s.position.set(bx, y0 + 2.4, LZ - 4.37); s.rotation.y = Math.PI; group.add(s);
    acts.push({ x: bx, z: LZ - 1.4, y: y0, label: '🚻 Usar el baño y lavarse las manos', fn: () => fx('water'), r: 1.6 });
  };
  bath(X0 + 3, '🚺 Damas', 'bano-f'); bath(X1 - 3, '🚹 Caballeros', 'bano-m');

  // Alfolí de diezmos y ofrendas junto a la entrada del santuario: mueble de madera con ranura y placa dorada,
  // y un cuadro en la pared con 2 Corintios 9:7 (LBLA)
  {
    const ox = cx + 4.6, oz = LZ - T / 2 - .24, fl = y0 + .1;
    const wood = mat(0x5a3a22, { roughness: .55 }), brass = mat(0xd4a72c, { metalness: .7, roughness: .3 });
    box(.62, .9, .44, wood, ox, fl + .45, oz);                                                   // mueble
    box(.68, .05, .5, mat(0x3e2816, { roughness: .45 }), ox, fl + .925, oz);                   // tapa
    box(.3, .012, .04, mat(0x0c0806), ox, fl + .953, oz, { cast: false });                     // ranura
    box(.66, .06, .48, mat(0x3e2816), ox, fl + .03, oz, { cast: false });                       // zócalo
    const sign = (w, h, cw, ch, draw, mm = {}) => {
      const c = document.createElement('canvas'); c.width = cw; c.height = ch; draw(c.getContext('2d'));
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: .5, ...mm })); s.rotation.y = Math.PI; group.add(s); return s;
    };
    const plate = sign(.44, .13, 256, 76, g => {
      const gr = g.createLinearGradient(0, 0, 0, 76); gr.addColorStop(0, '#f4d77a'); gr.addColorStop(1, '#b8871e'); g.fillStyle = gr; g.fillRect(0, 0, 256, 76);
      g.strokeStyle = '#7a5410'; g.lineWidth = 4; g.strokeRect(4, 4, 248, 68);
      g.fillStyle = '#3a2606'; g.textAlign = 'center'; g.font = '800 30px system-ui, sans-serif'; g.fillText('DIEZMOS Y', 128, 34); g.fillText('OFRENDAS', 128, 64);
    }, { metalness: .5, roughness: .35 });
    plate.position.set(ox, fl + .7, oz - .222);
    box(.9, .62, .03, brass, ox, fl + 1.75, LZ - T / 2 - .015, { cast: false });               // marco del cuadro
    const verse = sign(.84, .56, 420, 280, g => {
      g.fillStyle = '#fbf6ea'; g.fillRect(0, 0, 420, 280); g.fillStyle = '#4a3410'; g.textAlign = 'center';
      g.font = 'italic 600 25px Georgia, serif';
      ['«Que cada uno dé como', 'propuso en su corazón,', 'no de mala gana ni por', 'obligación, porque Dios', 'ama al dador alegre.»'].forEach((l, k) => g.fillText(l, 210, 48 + k * 38));
      g.font = '700 20px system-ui, sans-serif'; g.fillStyle = '#8a6414'; g.fillText('2 Corintios 9:7 (LBLA)', 210, 258);
    });
    verse.position.set(ox, fl + 1.75, LZ - T / 2 - .032);
    solid(ox - .34, ox + .34, oz - .25, oz + .25, fl + .95);
  }

  // dispensador de agua (garrafón) al otro lado de la entrada al santuario, con vasitos de papel:
  // cuerpo blanco, llaves roja (caliente) y azul (fría), bandeja de goteo y garrafón azul translúcido
  {
    const wx = cx - 3.65, wz = LZ - T / 2 - .2, fl = y0 + .1;
    const white = mat(0xeef0f2, { roughness: .35 }), grey = mat(0x6a6e74, { roughness: .4, metalness: .3 });
    box(.34, .98, .34, white, wx, fl + .49, wz);                                                  // cuerpo
    box(.3, .02, .02, grey, wx, fl + .62, wz - .171, { cast: false });                           // rejilla de ventilación
    box(.22, .2, .06, mat(0x2a2c30, { roughness: .5 }), wx, fl + .74, wz - .19, { cast: false }); // nicho de las llaves
    box(.24, .025, .12, grey, wx, fl + .64, wz - .22, { cast: false });                          // bandeja de goteo
    [[-.05, 0xc0392b], [.05, 0x2a6ad0]].forEach(([dx, c]) => box(.035, .05, .05, mat(c, { roughness: .35 }), wx + dx, fl + .8, wz - .23, { cast: false }));
    box(.2, .06, .2, white, wx, fl + 1.01, wz);                                                   // cuello donde se asienta el garrafón
    const jugM = new THREE.MeshStandardMaterial({ color: 0x6fb8f0, roughness: .08, metalness: .1, transparent: true, opacity: .55, depthWrite: false });
    const jug = new THREE.Mesh(new THREE.CylinderGeometry(.14, .14, .36, 18), jugM); jug.position.set(wx, fl + 1.24, wz); jug.renderOrder = 2; group.add(jug);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(.05, .14, .07, 18), jugM); sh.position.set(wx, fl + 1.075, wz); sh.renderOrder = 2; group.add(sh);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.09, .14, .05, 18), jugM); cap.position.set(wx, fl + 1.445, wz); cap.renderOrder = 2; group.add(cap);
    // pila de vasitos de papel en un dispensador lateral
    const cupH = new THREE.Mesh(new THREE.CylinderGeometry(.035, .028, .2, 10), mat(0xf6f3ea, { roughness: .8 })); cupH.position.set(wx + .2, fl + .78, wz - .05); group.add(cupH);
    box(.012, .24, .03, grey, wx + .172, fl + .78, wz - .05, { cast: false });
    solid(wx - .19, wx + .19, wz - .19, wz + .19, fl + 1.45);
    acts.push({ x: wx, z: wz - .9, y: y0, label: '💧 Tomar agua del dispensador', fn: () => fx('water'), r: 1.3 });
  }

  // --- árbol de Navidad en el lobby (solo en temporada: 1 nov – 31 ene, o con ?navidad=1) ---
  // entre el baño de damas y la entrada al santuario, sin estorbar el paso; luces que titilan y estrella arriba
  const xmasLights = [];
  {
    const m = new Date().getMonth(); let on = m === 10 || m === 11 || m === 0;
    try { const q = new URLSearchParams(location.search).get('navidad'); if (q === '1') on = true; else if (q === '0') on = false; } catch (e) {}
    if (on) {
      const tx = cx - 5.3, tz = Z0 + 5.2, ty = y0 + .1;
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(.42, .34, .45, 16), mat(0x8a1c24, { roughness: .5 })); pot.position.set(tx, ty + .225, tz); pot.castShadow = true; group.add(pot);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, .4, 8), mat(0x5a3a1e)); trunk.position.set(tx, ty + .6, tz); group.add(trunk);
      const leafM = mat(0x1f5a32, { roughness: .85 });
      [[1.05, 1.1, .85], [.85, 1, 1.45], [.62, .9, 2.0], [.38, .75, 2.5]].forEach(([rad, h, y]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 14), leafM); c.position.set(tx, ty + y, tz); c.castShadow = true; group.add(c); });
      // estrella dorada (Mateo 2:9-10)
      const st = new THREE.Shape(); for (let k = 0; k < 10; k++) { const a = Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? .1 : .24; st[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
      const star = new THREE.Mesh(new THREE.ExtrudeGeometry(st, { depth: .05, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffc030, emissiveIntensity: 1.2, metalness: .4, roughness: .3 }));
      star.position.set(tx, ty + 3.05, tz - .025); group.add(star); xmasLights.push({ star });
      // luces en espiral (3 colores que se turnan) y bolas
      const cols = [0xff4040, 0xffd040, 0x40a0ff], lm = cols.map(c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.5 }));
      const bulb = new THREE.SphereGeometry(.045, 6, 4);
      for (let k = 0; k < 42; k++) {
        const f = k / 42, y = .45 + f * 2.05, rad = 1.0 * (1 - f) + .1, a = f * Math.PI * 9;
        const b = new THREE.Mesh(bulb, lm[k % 3]); b.position.set(tx + Math.cos(a) * rad, ty + y, tz + Math.sin(a) * rad); group.add(b);
      }
      const ballG = new THREE.SphereGeometry(.08, 10, 8), ballM = [0xc0392b, 0xd4a72c, 0xe8e8f0].map(c => mat(c, { metalness: .6, roughness: .25 }));
      for (let k = 0; k < 14; k++) {
        const f = (k + .5) / 14, y = .5 + f * 1.7, rad = 1.0 * (1 - f) + .02, a = k * 2.4;
        const b = new THREE.Mesh(ballG, ballM[k % 3]); b.position.set(tx + Math.cos(a) * rad, ty + y - .05, tz + Math.sin(a) * rad); group.add(b);
      }
      // regalos debajo
      [[.4, .3, .35, 0x2e7d4f, .75, .35], [.32, .26, .32, 0x2a4a9a, -.7, .45], [.3, .22, .3, 0xd4a72c, .2, .85]].forEach(([w, h, d, c, ox, oz]) => {
        box(w, h, d, mat(c, { roughness: .5 }), tx + ox, ty + h / 2, tz + oz);
        box(w + .02, h + .02, .06, mat(0xf2f0e8), tx + ox, ty + h / 2, tz + oz, { cast: false });
      });
      solid(tx - 1.05, tx + 1.05, tz - 1.05, tz + 1.05, y0 + 3.2);
      xmasLights[0].mats = lm;
    }
  }

  // --- SANTUARIO: tarima, pantalla gigante, luces, banda, predicador ---
  const SZ = Z1 - 6.5, SH = .9;                                   // inicio de la tarima y su altura
  box(HW * 2 - .6, SH, Z1 - SZ, mat(0x15131a, { roughness: .5 }), cx, y0 + SH / 2, (SZ + Z1) / 2); solid(X0, X1, SZ, Z1, y0 + SH);
  addRamp(cx - 1.5, cx + 1.5, SZ - 2.4, SZ, y0 + .1, y0 + SH);   // escalones al centro
  // escalones macizos (bloque desde el piso hasta la huella) con borde claro: ya no quedan láminas flotando
  { const stepM = mat(0x2a2630, { roughness: .6 }), noseM = mat(0xd8d0c0);
    for (let k = 0; k < 4; k++) {
      const top = y0 + .1 + (k + 1) * (SH - .1) / 4, z = SZ - 2.4 + (k + .5) * .6;
      box(3, top - y0 - .01, .6, stepM, cx, y0 + (top - y0 - .01) / 2, z, { cast: false });
      box(3.02, .05, .62, noseM, cx, top - .015, z, { cast: false });
    } }
  // pantalla LED con letras de alabanza
  // a media resolución (se dibuja igual, en coordenadas de 1024×512): 4 veces menos para subir a la tarjeta gráfica
  const scr = document.createElement('canvas'); scr.width = 512; scr.height = 256; const sc = scr.getContext('2d'); sc.scale(.5, .5);
  const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
  const lyrics = ['SANTO, SANTO, SANTO', 'DIGNO ERES, SEÑOR', 'GLORIA A DIOS EN LAS ALTURAS', '¡ALELUYA!', 'CRISTO VIVE', 'MORIAH CHURCH · EPICENTRO DE AVIVAMIENTO'];
  const drawScreen = (i, t) => {
    const g2 = sc.createLinearGradient(0, 0, 1024, 512); g2.addColorStop(0, `hsl(${(t * 20) % 360},70%,22%)`); g2.addColorStop(1, `hsl(${(t * 20 + 120) % 360},70%,12%)`); sc.fillStyle = g2; sc.fillRect(0, 0, 1024, 512);
    for (let k = 0; k < 40; k++) { sc.fillStyle = `rgba(255,230,160,${.1 + .1 * Math.sin(t * 2 + k)})`; sc.beginPath(); sc.arc((k * 97 + t * 30) % 1024, (k * 53) % 512, 3 + (k % 5), 0, 7); sc.fill(); }
    sc.fillStyle = '#fff'; sc.font = '900 76px "Arial Black", system-ui, sans-serif'; sc.textAlign = 'center'; sc.fillText(lyrics[i], 512, 270);
    sc.fillStyle = '#ffd34d'; sc.font = '700 30px system-ui'; sc.fillText('MORIAH CHURCH', 512, 470); scrTex.needsUpdate = true;
  };
  drawScreen(0, 0);
  box(15.5, 6.3, .3, mat(0x050508), cx, y0 + SH + 4.2, Z1 - .5);
  const screen = box(15, 6, .05, new THREE.MeshBasicMaterial({ map: scrTex }), cx, y0 + SH + 4.2, Z1 - .67, { cast: false, recv: false }); screen.rotation.y = Math.PI;
  // luces que se mueven: haces de colores sobre la tarima y por todo el techo del templo (paredes negras para que resalten);
  // geometría y 6 materiales compartidos, sin luces reales, para que no pese
  const beams = [], beamMats = [];
  const beamGeo = new THREE.ConeGeometry(1.4, 7, 16, 1, true); beamGeo.translate(0, -3.5, 0);
  for (let k = 0; k < 6; k++) beamMats.push(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .17, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const housingM = mat(0x111111, { metalness: .8 });
  const spots = [];
  for (let i = 0; i < 5; i++) spots.push([cx - 8 + i * 4, SZ - 1]);                                   // tarima
  for (const z of [cz - 5, cz, cz + 5]) for (const dx of [-10, -4, 4, 10]) spots.push([cx + dx, z]);    // techo del santuario
  spots.forEach(([x, z], i) => {
    const b = new THREE.Mesh(beamGeo, beamMats[i % 6]); b.position.set(x, y0 + H - .3, z); group.add(b);
    beams.push({ b, ph: i * 1.3, sp: .5 + (i % 4) * .22 });
    box(.5, .4, .5, housingM, x, y0 + H - .3, z, { cast: false });
  });
  // polvo dorado que flota lentamente dentro de los haces de luz del escenario
  const MOTES = 90, moteBase = new Float32Array(MOTES * 4), motePos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i++) { moteBase[i * 4] = cx - 8 + (i % 5) * 4 + (r() - .5) * 1.6; moteBase[i * 4 + 1] = r(); moteBase[i * 4 + 2] = SZ - 1 + (r() - .5) * 1.6; moteBase[i * 4 + 3] = r() * 6.28; }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
  const motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({ size: .09, map: moteTex, color: 0xffe6a8, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
  motes.frustumCulled = false; group.add(motes);
  const updMotes = t => {
    for (let i = 0; i < MOTES; i++) {
      const b = i * 4, u = (moteBase[b + 1] + t * .025) % 1, ph = moteBase[b + 3];
      motePos[i * 3] = moteBase[b] + Math.sin(t * .4 + ph) * .3; motePos[i * 3 + 1] = y0 + SH + .4 + u * (H - SH - 1); motePos[i * 3 + 2] = moteBase[b + 2] + Math.cos(t * .33 + ph) * .3;
    }
    moteGeo.attributes.position.needsUpdate = true;
  };
  updMotes(0);
  // banda: batería, guitarra, bajo, teclado, cantantes con micrófonos
  const yS = y0 + SH, metal = mat(0xc0c8d0, { metalness: .9, roughness: .2 });
  const drumX = cx, drumZ = Z1 - 2.2;
  box(2.4, .25, 2, mat(0x2a2430), drumX, yS + .12, drumZ, { cast: false });
  for (const [dx, dz, rr, hh] of [[0, .6, .32, .5], [-.55, .2, .18, .2], [.55, .2, .18, .2], [.9, .5, .22, .35]]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, hh, 20), mat(0xc0392b, { metalness: .3, roughness: .3 })); d.position.set(drumX + dx, yS + .25 + (dz === .6 ? .3 : .75), drumZ - dz); d.rotation.x = dz === .6 ? Math.PI / 2 : .2; group.add(d); }
  const cymbals = [];   // platillos: vibran al ritmo del baterista (ver update)
  for (const cxx of [-1, 1]) { const cy = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .02, 24), mat(0xd4a72c, { metalness: 1, roughness: .2 })); cy.position.set(drumX + cxx * 1, yS + 1.3, drumZ - .1); cy.rotation.x = .2; group.add(cy); cymbals.push(cy);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 1.05, 6), metal); st.position.set(drumX + cxx * 1, yS + .25 + .525, drumZ - .1); group.add(st); }   // soporte hasta la tarima
  await pace();
  person({ gender: 'm', topStyle: 'camiseta' }, drumX, drumZ + .4, Math.PI, 'drum', { y: yS + .25, anim: 'drum' });
  const gtr = (x, col, gender) => { person({ gender, topStyle: 'camisa' }, x, Z1 - 3.2, Math.PI, 'guitar', { y: yS, anim: 'sway' }); const g = box(.85, .3, .06, mat(col, { roughness: .3 }), x - .1, yS + 1.05, Z1 - 3.5); g.rotation.z = .5; };
  gtr(cx - 3.5, 0xb8742e, 'm'); gtr(cx + 3.5, 0x1a1a1e, 'f');
  box(1.4, .1, .45, mat(0x111111), cx + 6.2, yS + 1, Z1 - 3.3); box(1.3, .03, .3, mat(0xf2f2f0), cx + 6.2, yS + 1.06, Z1 - 3.25);
  person({ gender: 'm', topStyle: 'mangalarga' }, cx + 6.2, Z1 - 2.8, Math.PI, 'keys', { y: yS, anim: 'sway' });
  for (const [x, g] of [[cx - 6, 'f'], [cx - 1.6, 'f'], [cx + 1.6, 'm']]) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, 1.5, 6), metal); st.position.set(x, yS + .75, SZ + 1.4); group.add(st);
    person({ gender: g, topStyle: g === 'f' ? 'chaqueta' : 'camisa' }, x, SZ + 1.9, Math.PI, 'mic', { y: yS, anim: 'sway' });
  }
  await pace();
  // predicador con su púlpito de cristal
  const pulp = box(.9, 1.15, .6, glass, cx, yS + .58, SZ + .7, { cast: false });
  // Biblia abierta sobre el púlpito (tapas negras, hojas en abanico y cinta roja de marcador), mirando al predicador
  { const bib = new THREE.Group(), topY = yS + .58 + .575;
    const cover = mat(0x141016, { roughness: .6 }), paper = mat(0xf3ecd8, { roughness: .9 }), ribbon = mat(0xa3121e, { roughness: .6 });
    for (const s of [-1, 1]) {
      const half = new THREE.Group(); half.position.x = s * .005; half.rotation.z = s * .06;   // las hojas se abren en V desde el lomo
      const c = new THREE.Mesh(new THREE.BoxGeometry(.17, .008, .24), cover); c.position.set(s * .085, .004, 0); half.add(c);
      const p = new THREE.Mesh(new THREE.BoxGeometry(.16, .022, .225), paper); p.position.set(s * .083, .019, 0); half.add(p);
      bib.add(half);
    }
    const rib = new THREE.Mesh(new THREE.BoxGeometry(.012, .002, .16), ribbon); rib.position.set(.01, .032, .03); bib.add(rib);
    bib.name = 'biblia-pulpito'; bib.position.set(cx, topY + .002, SZ + .75); group.add(bib);
  }
  person({ gender: 'm', topStyle: 'traje', top: 0x15151a, pants: 0x15151a, tie: 0xb3122e, beard: { color: 0x1d130c, len: .04 } }, cx, SZ + 1.2, Math.PI, 'preach', { y: yS, anim: 'preach' });
  // altavoces
  for (const sx of [-1, 1]) box(.9, 2.6, .8, mat(0x0c0c0e), cx + sx * (HW - 1), yS + 1.3, Z1 - 3);
  // monitores de piso (retorno) inclinados hacia cada cantante, con rejilla y luz de encendido azul
  { const wedM = mat(0x111114, { roughness: .7 }), grillM = mat(0x2c2e33, { roughness: .95, metalness: .3 }), ledM = new THREE.MeshBasicMaterial({ color: 0x3aa0ff });
    for (const x of [cx - 6, cx - 1.6, cx + 1.6]) {
      const w = new THREE.Group(); w.position.set(x, yS + .225, SZ + .75); w.rotation.x = -.45; group.add(w);
      const body = new THREE.Mesh(new THREE.BoxGeometry(.56, .32, .45), wedM); body.castShadow = true; body.receiveShadow = true; w.add(body);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(.5, .25, .012), grillM); gr.position.set(0, .01, .227); w.add(gr);
      const led = new THREE.Mesh(new THREE.BoxGeometry(.025, .012, .006), ledM); led.position.set(.22, -.135, .234); w.add(led);
      solid(x - .3, x + .3, SZ + .5, SZ + 1, yS + .4, yS);
    } }

  await pace();
  // --- CONGREGACIÓN: sillas y personas adorando ---
  const chairM = mat(0x2a3a6a, { roughness: .8 });
  for (let row = 0; row < 6; row++) {
    const z = LZ + 2.5 + row * 1.6;
    if (z > SZ - 3) break;
    for (const side of [-1, 1]) {
      const xa = side < 0 ? X0 + 1.2 : cx + 1.6, xb = side < 0 ? cx - 1.6 : X1 - 1.2;
      for (let x = xa; x < xb - .3; x += .75) { await pace();
        box(.55, .08, .5, chairM, x + .27, y0 + .46, z, { cast: false }); box(.55, .5, .06, chairM, x + .27, y0 + .72, z - .25, { cast: false });
        if (r() >= .62) seats.push({ x: x + .27, z, y: y0 });
        else {
          const p = r(); const pose = p < .45 ? 'up' : p < .6 ? 'one' : p < .72 ? 'clap' : p < .8 ? 'cry' : p < .86 ? 'kneelUp' : 'up';
          const anim = pose === 'up' && r() < .35 ? 'jump' : pose === 'up' || pose === 'one' ? 'sway' : pose === 'clap' ? 'clap' : pose === 'cry' ? 'sob' : null;
          person({}, x + .27, z + .35, 0, pose, { anim });
        }
      }
      solid(xa, xb, z - .3, z + .25, y0 + .5);
    }
  }
  // personas de rodillas en el altar frente a la tarima
  [-6.5, -4.5, 4.5, 6.5].forEach((dx, k) => { const z = SZ - 3.2 + (k % 2) * .4; person({}, cx + dx, z, 0, k % 2 ? 'cry' : 'kneelUp', { anim: k % 2 ? 'sob' : 'sway' }); solid(cx + dx - .35, cx + dx + .35, z - .35, z + .35, y0 + 1.2); });

  // --- acción: adorar ---
  acts.push({ x: cx, z: SZ - 4.5, y: y0, label: '🙌 Adorar a Dios', fn: () => fx('worship'), r: 2.5 });

  const zones = [
    { id: 'iglesia', name: 'MORIAH CHURCH – San Cristóbal · Epicentro de Avivamiento para las Naciones', minX: X0, maxX: X1, minZ: LZ, maxZ: Z1, pri: 6, text: '¡Bienvenido a la casa de Dios! Servicios: miércoles y viernes 8:00 PM · domingo 10:00 AM.', ref: 'Salmo 95:6' },
    { id: 'iglesia-lobby', name: 'Lobby de Moriah Church', minX: X0, maxX: X1, minZ: Z0, maxZ: LZ, pri: 6, text: 'Recepción, sala de espera y baños de damas y caballeros.', ref: 'Salmo 122:1' },
  ];
  let li = 0, lt = 0, scrT = 0;
  return {
    zones, cx, cz, seats, greeter,
    indoor: [{ name: 'la casa de Dios', msg: '⏸ En la casa de Dios el tiempo se detiene', rects: [[X0, X1, Z0, Z1], [cx - 5, cx + 5, Z0 - 5, Z0]], maxY: y0 + 9.5 }],
    inside: p => p.x > X0 && p.x < X1 && p.z > LZ && p.z < Z1,
    update(dt, t, camPos) {
      const near = Math.hypot(cx - camPos.x, cz - camPos.z) < 70;
      if (!near) return;
      // gestos de la servidora: al saludar levanta la mano y la mueve, abre el otro brazo y asiente; si no, conversa con las manos
      {
        const G = greeter, A = recep.arms, k = Math.min(1, dt * 8), L = THREE.MathUtils.lerp;
        G.g = Math.max(0, G.g - dt); G.cool = Math.max(0, G.cool - dt); G.bubble.visible = G.g > .2; recepTag.visible = !G.bubble.visible;
        const S = (o, p, v) => { o[p] = L(o[p], v, k); };
        if (G.g > 0) {
          S(A[1].shoulder.rotation, 'x', -2.55); S(A[1].shoulder.rotation, 'z', .3 + Math.sin(t * 10) * .28); S(A[1].elbow.rotation, 'x', -.55 + Math.sin(t * 10) * .25);
          S(A[0].shoulder.rotation, 'x', -1.05); S(A[0].shoulder.rotation, 'z', -.55); S(A[0].elbow.rotation, 'x', -.35);
          S(recep.head.rotation, 'x', .08 + Math.sin(t * 5) * .14); S(recep.spine.rotation, 'x', .1);
        } else {
          const talk = Math.sin(t * .7) > -.2;   // a ratos habla con las manos, a ratos las junta
          S(A[1].shoulder.rotation, 'x', talk ? -.85 + Math.sin(t * 2.3) * .22 : -.55); S(A[1].shoulder.rotation, 'z', talk ? -.1 : -.25); S(A[1].elbow.rotation, 'x', talk ? -1.25 + Math.sin(t * 3.1) * .35 : -1.2);
          S(A[0].shoulder.rotation, 'x', talk ? -.7 + Math.sin(t * 1.9 + 1) * .18 : -.55); S(A[0].shoulder.rotation, 'z', talk ? .1 : .25); S(A[0].elbow.rotation, 'x', talk ? -1.1 + Math.sin(t * 2.7 + 2) * .3 : -1.2);
          S(recep.head.rotation, 'x', Math.sin(t * 1.3) * .06); S(recep.spine.rotation, 'x', 0);
        }
        recep.head.rotation.y = Math.sin(t * .45) * .35; recep.spine.rotation.y = Math.sin(t * .45) * .08;
        recep.hips.position.y = .93 + Math.sin(t * 1.8) * .004;
        for (const e of recep.eyes) e.scale.y = (t % 3.7) < .12 ? .15 : 1;
      }
      // luces del árbol de Navidad: los tres colores se turnan y la estrella brilla suave
      if (xmasLights.length) { const X = xmasLights[0], ph = Math.floor(t * 1.6) % 3; X.mats.forEach((m, i) => { m.emissiveIntensity = i === ph ? 2.4 : .5; }); X.star.material.emissiveIntensity = 1 + Math.sin(t * 2) * .35; X.star.rotation.y = Math.sin(t * .6) * .5; }
      if ((lt += dt) > 4) { lt = 0; li = (li + 1) % lyrics.length; }
      // antes se redibujaba y se subía la pantalla 30 veces por segundo (tirones cerca del templo); ahora 4 veces por segundo
      if ((scrT += dt) > .25 && Math.hypot(cx - camPos.x, cz - camPos.z) < 45) { scrT = 0; drawScreen(li, t); }
      if (Math.hypot(cx - camPos.x, cz - camPos.z) < 45) updMotes(t);
      neonM.emissiveIntensity = 1.6 + Math.sin(t * 2) * .5;   // el neón de la «M» late suave
      for (const b of beams) { b.b.rotation.z = Math.sin(t * b.sp * 1.4 + b.ph) * .55; b.b.rotation.x = Math.cos(t * b.sp + b.ph) * .4; }
      beamMats.forEach((m, k) => m.color.setHSL((t * .06 + k / 6) % 1, 1, .55));   // los colores van cambiando
      // cada golpe (|sin(8t)| llega a 0) hace temblar los platillos, que se calman poco a poco
      cymbals.forEach((cy, i) => { const ph = (t * 8 / Math.PI + i * .5) % 1, amp = .09 * Math.exp(-ph * 4); cy.rotation.x = .2 + Math.sin(t * 38 + i) * amp; cy.rotation.z = Math.cos(t * 31 + i) * amp * .6; });
      for (const d of dance) {
        if (d.kind === 'jump') d.o.position.y = d.y + Math.max(0, Math.sin(t * 6 + d.ph)) * .35;
        else if (d.kind === 'sway') d.o.rotation.z = Math.sin(t * 1.6 + d.ph) * .06;
        else if (d.kind === 'clap') d.o.position.y = d.y + Math.abs(Math.sin(t * 4 + d.ph)) * .03;
        else if (d.kind === 'sob') d.o.rotation.x = Math.sin(t * 7 + d.ph) * .02;
        else if (d.kind === 'drum') d.o.position.y = d.y + Math.abs(Math.sin(t * 8)) * .03;
        else if (d.kind === 'preach') d.o.rotation.y = d.ry + Math.sin(t * .6) * .35;
      }
    },
  };
}
