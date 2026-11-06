import * as THREE from 'three';
import { createHuman, bakeStatic } from './human.js';
import { pace } from './pace.js';
import { nameSprite } from './characters.js';

/* =========================================================
   IGLESIA MIPROAA (en todos los niveles)
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

  // --- piso, paredes y techo ---
  box(HW * 2, .1, HD * 2, mat(0x3a3236, { roughness: .8 }), cx, y0 + .05, cz, { cast: false });                 // alfombra
  solid(X0, X1, Z0, Z1, y0 + .1);
  const wallM = mat(0xf2efe8, { roughness: .9 }), darkM = mat(0x1c1a22, { roughness: .8 });
  const wall = (ax, az, bx, bz, h = H, m = wallM) => { const w = Math.abs(bx - ax) || T, d = Math.abs(bz - az) || T; const o = box(w, h, d, m, (ax + bx) / 2, y0 + h / 2, (az + bz) / 2); blockers.push(o); solid(ax - T / 2, bx + T / 2, az - T / 2, bz + T / 2, 999); return o; };
  const DW = 3.2;
  wall(X0, Z1, X1, Z1, H, darkM); wall(X0, Z0, X0, Z1); wall(X1, Z0, X1, Z1); wall(X0, Z0, cx - DW / 2, Z0); wall(cx + DW / 2, Z0, X1, Z0);
  box(DW, H - 3.4, T, wallM, cx, y0 + 3.4 + (H - 3.4) / 2, Z0);
  const roof = box(HW * 2 + .8, .4, HD * 2 + .8, mat(0x3a3f47), cx, y0 + H + .2, cz, { cast: false }); blockers.push(roof);
  // puertas de vidrio y fachada con letrero y logo
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fc4e0, metalness: .3, roughness: .05, transparent: true, opacity: .35, depthWrite: false });
  for (const sx of [-1, 1]) { const g = box(DW / 2 - .1, 3.2, .06, glass, cx + sx * (DW / 4 + .02), y0 + 1.6, Z0 - .18, { cast: false }); g.rotation.y = sx * -1.1; g.position.x += sx * .55; g.position.z -= .5; }
  const signC = document.createElement('canvas'); signC.width = 1024; signC.height = 256; const sg = signC.getContext('2d');
  const grd = sg.createLinearGradient(0, 0, 1024, 0); grd.addColorStop(0, '#0b1730'); grd.addColorStop(1, '#1a0b30'); sg.fillStyle = grd; sg.fillRect(0, 0, 1024, 256);
  sg.strokeStyle = '#f5c542'; sg.lineWidth = 10; sg.strokeRect(10, 10, 1004, 236);
  sg.fillStyle = '#ffd34d'; sg.font = '900 120px "Arial Black", system-ui, sans-serif'; sg.textAlign = 'center'; sg.fillText('MIPROAA', 512, 140);
  sg.fillStyle = '#e9e0ff'; sg.font = '600 40px system-ui, sans-serif'; sg.fillText('Ministerio Profético Ardiendo Por El Avivamiento', 512, 210);
  const stx = new THREE.CanvasTexture(signC); stx.colorSpace = THREE.SRGBColorSpace;
  const sign = box(12, 3, .2, new THREE.MeshStandardMaterial({ map: stx, emissive: 0xffffff, emissiveMap: stx, emissiveIntensity: .6 }), cx, y0 + H - 2.1, Z0 - .3, { cast: false }); sign.rotation.y = Math.PI;
  const logoTex = new THREE.TextureLoader().load('img/logo.png'); logoTex.colorSpace = THREE.SRGBColorSpace;
  const logoBg = new THREE.Mesh(new THREE.CircleGeometry(1.3, 40), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .35 })); logoBg.position.set(cx - 8.2, y0 + H - 2.1, Z0 - .42); logoBg.rotation.y = Math.PI; group.add(logoBg); const lb2 = logoBg.clone(); lb2.position.x = cx + 8.2; group.add(lb2);
  const logo = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, emissive: 0xffffff, emissiveMap: logoTex, emissiveIntensity: .25 }));
  logo.position.set(cx - 8.2, y0 + H - 2.1, Z0 - .45); logo.rotation.y = Math.PI; group.add(logo);
  const logo2 = logo.clone(); logo2.position.x = cx + 8.2; group.add(logo2);

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

  // --- SANTUARIO: tarima, pantalla gigante, luces, banda, predicador ---
  const SZ = Z1 - 6.5, SH = .9;                                   // inicio de la tarima y su altura
  box(HW * 2 - .6, SH, Z1 - SZ, mat(0x15131a, { roughness: .5 }), cx, y0 + SH / 2, (SZ + Z1) / 2); solid(X0, X1, SZ, Z1, y0 + SH);
  addRamp(cx - 1.5, cx + 1.5, SZ - 2.4, SZ, y0 + .1, y0 + SH);   // escalones al centro
  for (let k = 0; k < 4; k++) box(3, .05, .6, mat(0xd8d0c0), cx, y0 + .1 + (k + 1) * (SH - .1) / 4, SZ - 2.4 + (k + .5) * .6, { cast: false });
  // pantalla LED con letras de alabanza
  // a media resolución (se dibuja igual, en coordenadas de 1024×512): 4 veces menos para subir a la tarjeta gráfica
  const scr = document.createElement('canvas'); scr.width = 512; scr.height = 256; const sc = scr.getContext('2d'); sc.scale(.5, .5);
  const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
  const lyrics = ['SANTO, SANTO, SANTO', 'DIGNO ERES, SEÑOR', 'GLORIA A DIOS EN LAS ALTURAS', '¡ALELUYA!', 'CRISTO VIVE', 'MIPROAA · ARDIENDO POR EL AVIVAMIENTO'];
  const drawScreen = (i, t) => {
    const g2 = sc.createLinearGradient(0, 0, 1024, 512); g2.addColorStop(0, `hsl(${(t * 20) % 360},70%,22%)`); g2.addColorStop(1, `hsl(${(t * 20 + 120) % 360},70%,12%)`); sc.fillStyle = g2; sc.fillRect(0, 0, 1024, 512);
    for (let k = 0; k < 40; k++) { sc.fillStyle = `rgba(255,230,160,${.1 + .1 * Math.sin(t * 2 + k)})`; sc.beginPath(); sc.arc((k * 97 + t * 30) % 1024, (k * 53) % 512, 3 + (k % 5), 0, 7); sc.fill(); }
    sc.fillStyle = '#fff'; sc.font = '900 76px "Arial Black", system-ui, sans-serif'; sc.textAlign = 'center'; sc.fillText(lyrics[i], 512, 270);
    sc.fillStyle = '#ffd34d'; sc.font = '700 30px system-ui'; sc.fillText('MIPROAA', 512, 470); scrTex.needsUpdate = true;
  };
  drawScreen(0, 0);
  box(15.5, 6.3, .3, mat(0x050508), cx, y0 + SH + 4.2, Z1 - .5);
  const screen = box(15, 6, .05, new THREE.MeshBasicMaterial({ map: scrTex }), cx, y0 + SH + 4.2, Z1 - .67, { cast: false, recv: false }); screen.rotation.y = Math.PI;
  // luces de escenario (haces de colores)
  const beams = [];
  const beamGeo = new THREE.ConeGeometry(1.4, 7, 20, 1, true); beamGeo.translate(0, -3.5, 0);
  [0xff3a8a, 0x3ab8ff, 0xffd34d, 0x8a5aff, 0x3affb0].forEach((c, i) => {
    const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const b = new THREE.Mesh(beamGeo, m); b.position.set(cx - 8 + i * 4, y0 + H - .3, SZ - 1); group.add(b); beams.push({ b, ph: i * 1.3 });
    box(.5, .4, .5, mat(0x111111, { metalness: .8 }), cx - 8 + i * 4, y0 + H - .3, SZ - 1, { cast: false });
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
  for (const cxx of [-1, 1]) { const cy = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .02, 24), mat(0xd4a72c, { metalness: 1, roughness: .2 })); cy.position.set(drumX + cxx * 1, yS + 1.3, drumZ - .1); cy.rotation.x = .2; group.add(cy); }
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
  person({ gender: 'm', topStyle: 'traje', top: 0x15151a, pants: 0x15151a, tie: 0xb3122e, beard: { color: 0x1d130c, len: .04 } }, cx, SZ + 1.2, Math.PI, 'preach', { y: yS, anim: 'preach' });
  // altavoces
  for (const sx of [-1, 1]) box(.9, 2.6, .8, mat(0x0c0c0e), cx + sx * (HW - 1), yS + 1.3, Z1 - 3);

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
    { id: 'iglesia', name: 'MIPROAA – Ministerio Profético Ardiendo Por El Avivamiento', minX: X0, maxX: X1, minZ: LZ, maxZ: Z1, pri: 6, text: '¡Bienvenido a la casa de Dios, donde la congregación adora al SEÑOR con todo el corazón!', ref: 'Salmo 95:6' },
    { id: 'iglesia-lobby', name: 'Lobby de MIPROAA', minX: X0, maxX: X1, minZ: Z0, maxZ: LZ, pri: 6, text: 'Recepción, sala de espera y baños de damas y caballeros.', ref: 'Salmo 122:1' },
  ];
  let li = 0, lt = 0, scrT = 0;
  return {
    zones, cx, cz, seats, greeter, inside: p => p.x > X0 && p.x < X1 && p.z > LZ && p.z < Z1,
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
      if ((lt += dt) > 4) { lt = 0; li = (li + 1) % lyrics.length; }
      // antes se redibujaba y se subía la pantalla 30 veces por segundo (tirones cerca del templo); ahora 4 veces por segundo
      if ((scrT += dt) > .25 && Math.hypot(cx - camPos.x, cz - camPos.z) < 45) { scrT = 0; drawScreen(li, t); }
      if (Math.hypot(cx - camPos.x, cz - camPos.z) < 45) updMotes(t);
      for (const b of beams) { b.b.rotation.z = Math.sin(t * .7 + b.ph) * .45; b.b.rotation.x = Math.cos(t * .5 + b.ph) * .3; }
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
