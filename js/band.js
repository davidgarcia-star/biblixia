import * as THREE from 'three';
import { createHuman, bakeStatic, randomStout } from './human.js';
import { pace } from './pace.js';

/* =========================================================
   BANDA DE ALABANZA DE MORIAH CHURCH
   Instrumentos de verdad (antes eran cajitas que se veían infantiles):
   batería completa, guitarra eléctrica, guitarra acústica, bajo, piano de cola,
   teclado de dos pisos, congas, saxofón, trompeta, trombón, amplificadores,
   cantantes con micrófono, coro y danzarinas con banderas.
   Cada músico se arma en su propio sistema (mirando hacia +z) y sus manos se colocan
   sobre el instrumento con un pequeño cálculo (reach). Persona e instrumento se unen
   en pocas piezas para que no pese.
   ========================================================= */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

export async function buildBand({ group, solid, dance, r, cx, Z1, SZ, yS, SKINS, TOPS }) {
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .5, ...o });
  // materiales compartidos por todos los instrumentos (al unirlos quedan muy pocas piezas)
  const M = {
    chrome: std(0xd8dde2, { metalness: 1, roughness: .18 }),
    black: std(0x0c0c0e, { roughness: .45 }),
    gloss: std(0x08080a, { roughness: .12, metalness: .25 }),           // negro piano
    head: std(0xf1eee6, { roughness: .65 }),                              // parche de batería
    shell: std(0x6e0d1c, { roughness: .22, metalness: .35 }),            // cascos de la batería (vino brillante)
    bronze: std(0xc9a13a, { metalness: 1, roughness: .28 }),             // platillos
    brass: std(0xd8ad4a, { metalness: 1, roughness: .22 }),              // saxofón, trompeta, trombón
    maple: std(0xe2c48e, { roughness: .45 }),
    rosewood: std(0x2e1a10, { roughness: .6 }),
    spruce: std(0xdcae68, { roughness: .35 }),
    mahogany: std(0x5a2a14, { roughness: .35 }),
    ivory: std(0xf4efe2, { roughness: .4 }),
    redGtr: std(0xa3101c, { roughness: .15, metalness: .2 }),
    blueGtr: std(0x1f4f8f, { roughness: .15, metalness: .2 }),
    string: std(0xe6e6e6, { metalness: 1, roughness: .3 }),
    wood: std(0x7a3a1a, { roughness: .4 }),
    stick: std(0xe8cf9a, { roughness: .6 }),
    grill: std(0x2a2b2e, { roughness: .95 }),
    tolex: std(0x141416, { roughness: .8 }),
    gold: std(0xd9b24a, { metalness: .8, roughness: .3 }),
  };
  // textura de teclas (blancas y negras) compartida por el piano y los teclados
  const keysTex = (() => {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 96; const g = c.getContext('2d');
    const n = 36, w = 1024 / n;
    g.fillStyle = '#f7f5ef'; g.fillRect(0, 0, 1024, 96);
    g.fillStyle = '#9a968c'; for (let k = 0; k <= n; k++) g.fillRect(Math.round(k * w), 0, 2, 96);
    g.fillStyle = '#111'; for (let k = 0; k < n - 1; k++) { const m = k % 7; if (m !== 2 && m !== 6) g.fillRect(Math.round((k + 1) * w - w * .3), 0, Math.round(w * .6), 58); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  })();
  const keysM = new THREE.MeshStandardMaterial({ map: keysTex, roughness: .35 });
  const panelM = (() => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#16171a'; g.fillRect(0, 0, 512, 128);
    g.fillStyle = '#3ad0ff'; g.fillRect(200, 34, 112, 54); g.fillStyle = '#0b2a3a'; g.font = '700 22px system-ui'; g.fillText('WORSHIP', 210, 70);
    for (let k = 0; k < 8; k++) { g.fillStyle = '#c9ccd2'; g.beginPath(); g.arc(30 + k * 20, 60, 7, 0, 7); g.fill(); }
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? '#e8473c' : '#ececec'; g.fillRect(340 + k * 26, 50, 18, 18); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: .5 });
  })();
  // parche frontal del bombo con el logo de la iglesia
  const kickM = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, 256, 256);
    g.translate(256, 0); g.scale(-1, 1);                                   // el parche se mira desde adelante del bombo
    g.fillStyle = '#6e0d1c'; g.beginPath(); g.arc(128, 128, 92, 0, 7); g.fill();
    g.fillStyle = '#f5c542'; g.textAlign = 'center'; g.font = '900 104px "Arial Black", system-ui'; g.fillText('M', 128, 150);
    g.font = '800 22px system-ui'; g.fillStyle = '#fff'; g.fillText('MORIAH CHURCH', 128, 196);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: .6 });
  })();

  /* ---------- piezas básicas ---------- */
  const add = (parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); parent.add(o); return o; };
  const bx = (parent, w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0) => add(parent, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  const cyl = (parent, rt, rb, h, m, x, y, z, rx = 0, ry = 0, rz = 0, seg = 20, open = false) => add(parent, new THREE.CylinderGeometry(rt, rb, h, seg, 1, open), m, x, y, z, rx, ry, rz);
  // barra entre dos puntos (radio r en a, r2 en b)
  const rod = (parent, a, b, rad, m, seg = 8, r2 = rad) => {
    const d = b.clone().sub(a), L = d.length();
    const o = new THREE.Mesh(new THREE.CylinderGeometry(r2, rad, L, seg), m);
    o.position.copy(a).addScaledVector(d, .5); o.quaternion.setFromUnitVectors(UP, d.normalize()); parent.add(o); return o;
  };
  // tambor: casco + parches + aros, con el eje a lo largo de `dir`
  const drum = (parent, rad, h, pos, dir, shellM = M.shell, frontM = M.head) => {
    const g = new THREE.Group(); g.position.copy(pos); g.quaternion.setFromUnitVectors(UP, dir.clone().normalize()); parent.add(g);
    cyl(g, rad, rad, h, shellM, 0, 0, 0, 0, 0, 0, 24);
    add(g, new THREE.CircleGeometry(rad * .97, 24), frontM, 0, h / 2 + .002, 0, -Math.PI / 2);
    add(g, new THREE.CircleGeometry(rad * .97, 24), M.head, 0, -h / 2 - .002, 0, Math.PI / 2);
    for (const s of [-1, 1]) add(g, new THREE.TorusGeometry(rad, .009, 6, 24), M.chrome, 0, s * h / 2, 0, Math.PI / 2);
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; bx(g, .012, h * .5, .02, M.chrome, Math.cos(a) * (rad + .008), 0, Math.sin(a) * (rad + .008), 0, -a, 0); }   // tensores
    return g;
  };
  const cymbal = (parent, rad, pos, tilt = .2, rz = 0) => {
    const g = new THREE.Group(); g.position.copy(pos); g.rotation.set(tilt, 0, rz); parent.add(g);
    cyl(g, .02, rad, .018, M.bronze, 0, 0, 0, 0, 0, 0, 28);
    cyl(g, .035, .035, .02, M.bronze, 0, .012, 0, 0, 0, 0, 12);
    return g;
  };
  const tripod = (parent, x, z, h, spread = .22) => {
    rod(parent, V(x, .02, z), V(x, h, z), .012, M.chrome, 6);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + .5; rod(parent, V(x, h * .16, z), V(x + Math.cos(a) * spread, .01, z + Math.sin(a) * spread), .008, M.chrome, 5); }
  };

  /* ---------- colocar la mano sobre un punto (cálculo por pasos, sin dependencias) ---------- */
  const _hp = new THREE.Vector3();
  const reach = (h, i, target) => {
    const A = h.arms[i], s = A.shoulder, e = A.elbow;
    h.root.updateMatrixWorld(true);
    const P = [[s.rotation, 'x', -3.1, 1], [s.rotation, 'y', -.8, .8], [s.rotation, 'z', -1.5, 1.5], [e.rotation, 'x', -2.5, 0]];
    const err = () => { s.updateMatrixWorld(true); A.hand.getWorldPosition(_hp); return _hp.distanceToSquared(target); };
    let best = err();
    for (let st = .5; st > .004; st *= .6) {
      for (let it = 0, imp = true; imp && it < 25; it++) {
        imp = false;
        for (const [o, k, lo, hi] of P) for (const d of [st, -st]) {
          const v = o[k]; o[k] = Math.min(hi, Math.max(lo, v + d)); const e2 = err();
          if (e2 < best - 1e-8) { best = e2; imp = true; } else o[k] = v;
        }
      }
    }
    return A.hand.getWorldPosition(new THREE.Vector3());
  };
  const sit = h => { for (const l of h.legs) { l.thigh.rotation.x = -1.5; l.knee.rotation.x = 1.5; } h.hips.position.y = .52; };

  /* ---------- músico: persona + instrumento unidos, con su animación ---------- */
  const solids = [];
  const musician = (opts, wx, wz, ry, build, { y = yS, anim = 'sway', box = .3 } = {}) => {
    const f = opts.gender ? opts.gender === 'f' : r() < .5;
    const h = createHuman({ detail: .6, gender: f ? 'f' : 'm', skin: SKINS[(r() * SKINS.length) | 0], top: TOPS[(r() * TOPS.length) | 0], pants: [0x22243a, 0x1a1a1e, 0x2b3a57][(r() * 3) | 0],
      legwear: 'pantalon', topStyle: 'camisa', hair: f ? 'long' : 'short', hairColor: [0x1d130c, 0x3a2314, 0x5a3a1e][(r() * 3) | 0], name: '', ...opts });
    const inst = new THREE.Group(), loose = [];
    build(h, inst, loose);
    const wrap = new THREE.Group();
    const body = bakeStatic(h.root, [], false); body.userData.noCast = true; body.userData.lodFar = 13; wrap.add(body);   // bajo techo: sin sombra del sol
    if (inst.children.length) wrap.add(bakeStatic(inst, [], false));
    for (const o of loose) wrap.add(o);
    wrap.position.set(wx, y, wz); wrap.rotation.y = ry; group.add(wrap);
    wrap.userData.loose = loose;
    if (anim) dance.push({ o: wrap, kind: anim, y, ry, ph: r() * 6 });
    if (box) solids.push([wx - box, wx + box, wz - box, wz + box, 999, y]);   // no se trepa sobre los músicos
    return wrap;
  };

  /* ---------- guitarras: eléctrica, bajo y acústica (cuerpo con su silueta real) ---------- */
  const electricShape = (k = 1) => {
    const s = new THREE.Shape(), m = (x, y) => [x * k, y * k];
    s.moveTo(...m(-.24, 0));
    s.bezierCurveTo(...m(-.24, .12), ...m(-.16, .17), ...m(-.06, .15));
    s.bezierCurveTo(...m(0, .14), ...m(.02, .11), ...m(.06, .11));
    s.bezierCurveTo(...m(.12, .12), ...m(.17, .15), ...m(.17, .11));
    s.bezierCurveTo(...m(.17, .08), ...m(.11, .07), ...m(.09, .035));
    s.lineTo(...m(.09, -.035));
    s.bezierCurveTo(...m(.11, -.07), ...m(.14, -.08), ...m(.13, -.11));
    s.bezierCurveTo(...m(.12, -.14), ...m(.05, -.12), ...m(.02, -.12));
    s.bezierCurveTo(...m(-.03, -.13), ...m(-.07, -.165), ...m(-.14, -.155));
    s.bezierCurveTo(...m(-.22, -.145), ...m(-.24, -.08), ...m(-.24, 0));
    return s;
  };
  const acousticShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-.38, 0);
    s.bezierCurveTo(-.38, .13, -.31, .2, -.22, .2); s.bezierCurveTo(-.13, .2, -.11, .13, -.07, .13);
    s.bezierCurveTo(-.03, .13, 0, .155, .04, .155); s.bezierCurveTo(.09, .155, .12, .1, .12, .03);
    s.lineTo(.12, -.03);
    s.bezierCurveTo(.12, -.1, .09, -.155, .04, -.155); s.bezierCurveTo(0, -.155, -.03, -.13, -.07, -.13);
    s.bezierCurveTo(-.11, -.13, -.13, -.2, -.22, -.2); s.bezierCurveTo(-.31, -.2, -.38, -.13, -.38, 0);
    return s;
  };
  // devuelve el grupo de la guitarra y los puntos donde van las manos (en coordenadas de la persona)
  const guitar = (inst, kind, bodyM) => {
    const G = new THREE.Group(); inst.add(G);
    const ac = kind === 'acoustic', bass = kind === 'bass';
    const d = ac ? .1 : .045, fz = d / 2;                                 // grosor del cuerpo y su cara de adelante
    const shape = ac ? acousticShape() : electricShape(bass ? 1.15 : 1);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: .005, bevelSize: .006, bevelSegments: 2, curveSegments: 12 });
    geo.translate(0, 0, -d / 2);
    add(G, geo, ac ? [M.spruce, M.mahogany] : [bodyM, bodyM]);
    const bridgeX = ac ? -.21 : bass ? -.15 : -.13, scale = ac ? .65 : bass ? .86 : .65, nut = bridgeX + scale;
    const heel = ac ? .1 : bass ? .1 : .085, nw = bass ? .045 : .046, n = bass ? 4 : 6;
    // mástil, diapasón, trastes, cejilla y clavijero
    bx(G, nut - heel, nw, .024, ac ? M.mahogany : M.maple, (nut + heel) / 2, 0, fz - .006);
    bx(G, nut - heel + .01, nw + .004, .006, M.rosewood, (nut + heel) / 2, 0, fz + .009);
    for (let k = 1; k <= 20; k++) { const x = nut - scale * (1 - Math.pow(2, -k / 12)); if (x < heel + .01) break; bx(G, .0025, nw + .004, .004, M.chrome, x, 0, fz + .013); }
    for (const k of [3, 5, 7, 9, 12]) { const x = nut - scale * (1 - Math.pow(2, -(k - .5) / 12)); if (x > heel) cyl(G, .0035, .0035, .002, M.ivory, x, 0, fz + .0125, Math.PI / 2, 0, 0, 8); }
    bx(G, .006, nw + .004, .008, M.ivory, nut, 0, fz + .012);
    const hl = bass ? .2 : .17;
    const hs = bx(G, hl, ac ? .08 : .07, .016, ac ? M.rosewood : bodyM === M.redGtr ? M.maple : M.black, nut + hl / 2, ac ? 0 : .012, fz - .006, 0, 0, ac ? 0 : .04);
    if (ac) for (let k = 0; k < 3; k++) for (const sy of [-1, 1]) cyl(G, .006, .006, .03, M.chrome, nut + .04 + k * .045, sy * .052, fz - .006, 0, 0, 0, 6);
    else for (let k = 0; k < n; k++) cyl(G, bass ? .009 : .006, bass ? .009 : .006, .025, M.chrome, nut + .03 + k * (hl - .04) / (n - 1), .055, fz - .006, 0, 0, 0, 6);
    hs.castShadow = true;
    // cuerdas
    for (let k = 0; k < n; k++) { const yy = (k - (n - 1) / 2) * (bass ? .011 : .0075); bx(G, nut - bridgeX, .0016, .0016, M.string, (nut + bridgeX) / 2, yy, fz + .016); }
    if (ac) {
      add(G, new THREE.CircleGeometry(.045, 24), M.black, -.03, 0, fz + .0062);                                  // boca
      add(G, new THREE.RingGeometry(.048, .058, 24), M.rosewood, -.03, 0, fz + .0063);                            // roseta
      bx(G, .03, .15, .01, M.rosewood, bridgeX, 0, fz + .008);                                                    // puente
      const pg = new THREE.Shape(); pg.absellipse(0, 0, .06, .035, 0, Math.PI * 2);
      add(G, new THREE.ShapeGeometry(pg, 10), M.black, .025, -.07, fz + .0062, 0, 0, .5);                       // golpeador
    } else {
      const pg = new THREE.Shape(); pg.absellipse(0, 0, bass ? .13 : .11, bass ? .11 : .095, 0, Math.PI * 2);
      add(G, new THREE.ShapeGeometry(pg, 16), bass ? M.tolex : M.ivory, -.03, -.015, fz + .0062);              // golpeador
      bx(G, .035, nw + .015, .01, M.chrome, bridgeX, 0, fz + .011);                                               // puente
      for (const px of bass ? [-.06, .01] : [-.09, -.04, .01]) bx(G, .018, bass ? .06 : .07, .008, bass ? M.black : M.ivory, px, 0, fz + .01);   // pastillas
      for (let k = 0; k < 3; k++) cyl(G, .012, .013, .014, M.chrome, -.15 + k * .045, -.085 - k * .012, fz + .01, Math.PI / 2, 0, 0, 10);     // perillas
    }
    // posición sobre el cuerpo del músico: el mástil sube hacia su izquierda y sale un poco hacia adelante
    G.position.set(.03, ac ? 1.04 : 1.05, ac ? .225 : .2); G.rotation.set(0, -.18, ac ? .36 : bass ? .5 : .45);
    inst.updateMatrixWorld(true);
    const L = p => G.localToWorld(p.clone());
    const fret = ac ? 3 : 5, fx = nut - scale * (1 - Math.pow(2, -(fret - .5) / 12));
    // correa: del cuerno de arriba hasta el hombro izquierdo
    const horn = L(ac ? V(.12, .03, 0) : V(.17 * (bass ? 1.15 : 1), .1 * (bass ? 1.15 : 1), 0));
    const sh = V(.16, 1.45, .03), dd = sh.clone().sub(horn);
    const strap = bx(inst, .05, dd.length(), .006, M.black, 0, 0, 0); strap.position.copy(horn).addScaledVector(dd, .5); strap.quaternion.setFromUnitVectors(UP, dd.normalize());
    return { strum: L(V(ac ? -.07 : -.05, -.03, fz + .06)), fret: L(V(fx, -.04, fz + .02)) };
  };
  const playGuitar = (kind, bodyM) => (h, inst) => {
    const p = guitar(inst, kind, bodyM);
    h.head.rotation.x = .25; h.head.rotation.y = .2; h.spine.rotation.x = .04;
    reach(h, 0, p.strum); reach(h, 1, p.fret);
  };

  /* ---------- micrófonos ---------- */
  const MOUTH = V(0, 1.565, .13);
  const handMic = (inst, hand) => {
    const d = MOUTH.clone().sub(hand).normalize();
    rod(inst, hand.clone().addScaledVector(d, -.04), hand.clone().addScaledVector(d, .12), .014, M.black, 10, .018);
    add(inst, new THREE.SphereGeometry(.026, 14, 10), M.chrome).position.copy(hand).addScaledVector(d, .145);
  };
  const micStand = (inst, z = .5, mouth = MOUTH) => {
    tripod(inst, 0, z, 1.25);
    const top = V(0, 1.25, z), tip = V(0, mouth.y - .02, mouth.z + .2);
    rod(inst, top, tip, .007, M.chrome, 6);
    const d = mouth.clone().sub(tip).normalize();
    rod(inst, tip, tip.clone().addScaledVector(d, .1), .013, M.black, 10, .017);
    add(inst, new THREE.SphereGeometry(.024, 12, 10), M.grill).position.copy(tip).addScaledVector(d, .12);
  };

  /* ---------- batería completa ---------- */
  const drummer = (h, inst, loose) => {
    sit(h);
    // banqueta
    cyl(inst, .17, .17, .08, M.black, 0, .47, -.04, 0, 0, 0, 18); tripod(inst, 0, -.04, .43, .24);
    // bombo con el logo, toms montados, redoblante, tom de piso
    drum(inst, .28, .42, V(0, .3, .74), V(0, 0, 1), M.shell, kickM);
    for (const sx of [-1, 1]) rod(inst, V(sx * .2, .08, .62), V(sx * .32, 0, .55), .008, M.chrome, 5);       // patas del bombo
    rod(inst, V(0, .55, .62), V(0, .72, .6), .012, M.chrome, 6);
    drum(inst, .13, .15, V(-.15, .82, .6), V(.15, 1, -.5));
    drum(inst, .145, .16, V(.17, .82, .6), V(-.15, 1, -.5));
    drum(inst, .175, .13, V(.13, .66, .36), V(0, 1, -.15), M.chrome); tripod(inst, .13, .36, .6, .18);
    drum(inst, .2, .34, V(-.46, .46, .38), V(0, 1, 0));
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; rod(inst, V(-.46 + Math.cos(a) * .2, .42, .38 + Math.sin(a) * .2), V(-.46 + Math.cos(a) * .25, 0, .38 + Math.sin(a) * .25), .008, M.chrome, 5); }
    // pedal del bombo
    bx(inst, .08, .02, .22, M.chrome, 0, .02, .43, .2, 0, 0);
    // hi-hat y su pedal; platillos crash y ride en sus soportes con brazo
    tripod(inst, .46, .4, .95); bx(inst, .08, .02, .22, M.chrome, .46, .02, .28, .2, 0, 0);
    loose.push(cymbal(inst, .18, V(.46, .96, .4), .05), cymbal(inst, .18, V(.46, .93, .4), .05));
    tripod(inst, .4, .95, 1.05); rod(inst, V(.4, 1.05, .95), V(.32, 1.28, .82), .008, M.chrome, 5);
    tripod(inst, -.62, .85, .95); rod(inst, V(-.62, .95, .85), V(-.52, 1.15, .72), .008, M.chrome, 5);
    tripod(inst, -.2, 1.05, 1.15); rod(inst, V(-.2, 1.15, 1.05), V(-.12, 1.35, .95), .008, M.chrome, 5);
    loose.push(cymbal(inst, .22, V(.32, 1.3, .82), .35, -.15), cymbal(inst, .26, V(-.52, 1.17, .72), .25, .12), cymbal(inst, .2, V(-.12, 1.37, .95), .4, 0));
    for (const c of loose) inst.remove(c);                                  // los platillos quedan sueltos para que vibren
    // manos con baquetas: izquierda al redoblante, derecha al tom
    h.head.rotation.x = .2;
    const hl = reach(h, 1, V(.09, .86, .22)), hr = reach(h, 0, V(-.12, .95, .34));
    rod(inst, hl.clone().add(V(-.01, .02, -.06)), V(.14, .73, .42), .007, M.stick, 6, .005);
    rod(inst, hr.clone().add(V(.01, .02, -.06)), V(-.14, .9, .62), .007, M.stick, 6, .005);
  };

  /* ---------- piano de cola ---------- */
  const pianist = (h, inst) => {
    sit(h);
    bx(inst, .9, .06, .36, M.gloss, 0, .48, -.02); for (const sx of [-1, 1]) for (const sz of [-1, 1]) bx(inst, .05, .45, .05, M.gloss, sx * .4, .23, -.02 + sz * .14);   // banco
    const s = new THREE.Shape();
    // el lado recto queda atrás y la curva hacia el público, para que se vea la tapa abierta
    s.moveTo(.75, 0); s.lineTo(-.75, 0); s.lineTo(-.75, -1.75);
    s.bezierCurveTo(-.75, -1.98, -.25, -2.0, -.08, -1.7); s.bezierCurveTo(.12, -1.3, .75, -1.15, .75, -.6); s.lineTo(.75, 0);
    const body = new THREE.ExtrudeGeometry(s, { depth: .3, bevelEnabled: false, curveSegments: 16 }); body.rotateX(-Math.PI / 2);
    add(inst, body, [M.gold, M.gloss], 0, .66, .48);                                                     // caja (por dentro dorada)
    const lid = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: false, curveSegments: 16 }); lid.rotateX(-Math.PI / 2); lid.translate(.75, 0, 0);
    add(inst, lid, M.gloss, -.75, .965, .48, 0, 0, .55);                                                  // tapa abierta
    rod(inst, V(.62, .965, 1.05), V(.4, 1.64, 1.05), .01, M.gloss, 6);                                   // vara que sostiene la tapa
    for (const [lx, lz] of [[.66, .62], [-.66, .62], [-.45, 2.15]]) cyl(inst, .05, .035, .66, M.gloss, lx, .33, lz, 0, 0, 0, 10);   // patas
    bx(inst, 1.5, .12, .22, M.gloss, 0, .68, .38);                                                        // bloque del teclado
    const k = add(inst, new THREE.PlaneGeometry(1.32, .15), keysM, 0, .745, .35, -Math.PI / 2); k.rotation.z = Math.PI;
    bx(inst, 1.32, .2, .02, M.gloss, 0, .85, .45);                                                        // atril
    bx(inst, .5, .3, .006, M.ivory, 0, .9, .44, -.15, 0, 0);                                              // partitura
    h.head.rotation.x = .3;
    reach(h, 0, V(-.22, .8, .3)); reach(h, 1, V(.2, .8, .3));
  };

  /* ---------- teclado de dos pisos con su soporte en X ---------- */
  const keyboardist = (h, inst) => {
    for (const sx of [-1, 1]) { rod(inst, V(sx * .38, 0, .25), V(sx * .38, .9, .62), .015, M.black, 6); rod(inst, V(sx * .38, 0, .62), V(sx * .38, .9, .25), .015, M.black, 6); }
    rod(inst, V(-.38, .45, .43), V(.38, .45, .43), .012, M.black, 6);
    const kb = (y, z, w, tilt) => {
      const g = new THREE.Group(); g.position.set(0, y, z); g.rotation.x = tilt; inst.add(g);
      bx(g, w, .07, .34, M.black, 0, 0, 0);
      const k = add(g, new THREE.PlaneGeometry(w - .06, .15), keysM, 0, .036, -.08, -Math.PI / 2); k.rotation.z = Math.PI;
      add(g, new THREE.PlaneGeometry(w - .06, .14), panelM, 0, .036, .08, -Math.PI / 2).rotation.z = Math.PI;
    };
    kb(.94, .42, 1.02, 0);
    rod(inst, V(-.36, .9, .6), V(-.36, 1.22, .66), .012, M.chrome, 6); rod(inst, V(.36, .9, .6), V(.36, 1.22, .66), .012, M.chrome, 6);
    kb(1.24, .64, .9, -.35);
    h.head.rotation.x = .3;
    reach(h, 0, V(-.17, 1.03, .3)); reach(h, 1, V(.15, 1.03, .3));
  };

  /* ---------- congas ---------- */
  const lathe = pts => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 20);
  const conguero = (h, inst) => {
    for (const [sx, s] of [[-.17, 1], [.17, .92]]) {
      const g = new THREE.Group(); g.position.set(sx, .12, .36); g.scale.setScalar(s); inst.add(g);
      add(g, lathe([[.1, 0], [.13, .14], [.145, .36], [.135, .6], [.12, .74]]), M.wood);
      add(g, new THREE.CircleGeometry(.12, 20), M.head, 0, .742, 0, -Math.PI / 2);
      for (const yy of [.74, .04]) add(g, new THREE.TorusGeometry(yy > .5 ? .122 : .102, .008, 6, 20), M.chrome, 0, yy, 0, Math.PI / 2);
      tripod(inst, sx, .36, .14, .14);
    }
    h.head.rotation.x = .25;
    reach(h, 0, V(-.15, .98, .3)); reach(h, 1, V(.15, .95, .32));
  };

  /* ---------- vientos: saxofón, trompeta y trombón ---------- */
  const saxophonist = (h, inst) => {
    const mp = V(0, 1.55, .17);
    rod(inst, mp, V(.0, 1.5, .25), .008, M.black, 8, .01);                                       // boquilla
    const neck = new THREE.CatmullRomCurve3([V(0, 1.5, .25), V(-.01, 1.47, .3), V(-.03, 1.4, .3)]);
    add(inst, new THREE.TubeGeometry(neck, 10, .011, 8), M.brass);
    rod(inst, V(-.03, 1.4, .3), V(-.05, .98, .3), .018, M.brass, 14, .036);                      // cuerpo cónico
    const bow = new THREE.CatmullRomCurve3([V(-.05, .98, .3), V(-.05, .9, .33), V(-.05, .92, .4), V(-.05, 1.0, .43)]);
    add(inst, new THREE.TubeGeometry(bow, 12, .04, 12), M.brass);
    cyl(inst, .085, .045, .14, M.brass, -.05, 1.07, .43, 0, 0, 0, 20, true);                    // campana
    for (let k = 0; k < 7; k++) cyl(inst, .012, .012, .008, M.ivory, -.035, 1.36 - k * .055, .33, Math.PI / 2 - .05, 0, 0, 8);   // llaves
    h.head.rotation.x = .1;
    reach(h, 1, V(-.01, 1.3, .3)); reach(h, 0, V(-.04, 1.1, .32));
  };
  const trumpeter = (h, inst) => {
    rod(inst, V(0, 1.555, .16), V(0, 1.545, .2), .006, M.chrome, 8, .009);                       // boquilla
    rod(inst, V(0, 1.545, .2), V(0, 1.53, .5), .007, M.brass, 8);                               // tubo
    cyl(inst, .065, .012, .2, M.brass, 0, 1.5, .6, Math.PI / 2, 0, 0, 20, true);                 // campana
    rod(inst, V(0, 1.5, .5), V(0, 1.47, .25), .007, M.brass, 8);
    for (let k = 0; k < 3; k++) { cyl(inst, .011, .011, .09, M.brass, 0, 1.49, .32 + k * .028, 0, 0, 0, 10); cyl(inst, .008, .008, .02, M.ivory, 0, 1.545, .32 + k * .028, 0, 0, 0, 8); }   // pistones
    add(inst, new THREE.TorusGeometry(.04, .006, 6, 16, Math.PI), M.brass, 0, 1.47, .25, 0, Math.PI / 2, Math.PI / 2);
    h.head.rotation.x = -.1;
    reach(h, 0, V(-.01, 1.5, .33)); reach(h, 1, V(.035, 1.46, .37));
  };
  const trombonist = (h, inst) => {
    rod(inst, V(0, 1.555, .16), V(0, 1.55, .21), .007, M.chrome, 8, .01);
    for (const sx of [0, -.07]) rod(inst, V(sx, 1.55, .21), V(sx, 1.36, .95), .007, M.brass, 8);   // vara
    add(inst, new THREE.TorusGeometry(.035, .008, 6, 14, Math.PI), M.brass, -.035, 1.36, .95, Math.PI / 2 - .25, 0, Math.PI);
    rod(inst, V(.05, 1.5, .2), V(.06, 1.42, .55), .009, M.brass, 8);                             // tubo hacia la campana
    cyl(inst, .1, .015, .26, M.brass, .06, 1.38, .7, Math.PI / 2 + .25, 0, 0, 22, true);          // campana
    rod(inst, V(.05, 1.53, .2), V(.05, 1.6, -.05), .009, M.brass, 8);                            // vuelta por encima del hombro
    h.head.rotation.x = 0;
    reach(h, 1, V(.07, 1.48, .26)); reach(h, 0, V(-.03, 1.42, .62));
  };

  /* ---------- cantantes, coro y danzarinas ---------- */
  const singer = (h, inst) => {
    const hand = reach(h, 0, V(-.03, 1.42, .23));
    handMic(inst, hand);
    if (r() < .6) { h.arms[1].shoulder.rotation.set(-2.7, 0, .35); h.arms[1].elbow.rotation.x = -.25; } else { h.arms[1].shoulder.rotation.set(-.4, 0, .25); h.arms[1].elbow.rotation.x = -.6; }
    h.head.rotation.x = -.15;
  };
  const leader = (h, inst) => { micStand(inst, .52); playGuitar('acoustic')(h, inst); h.head.rotation.x = .05; h.head.rotation.y = 0; };
  const flagDancer = col => (h, inst) => {
    const hand = reach(h, 0, V(-.32, 2.0, .15));
    h.arms[1].shoulder.rotation.set(-1.2, 0, .9); h.arms[1].elbow.rotation.x = -.4; h.head.rotation.x = -.3;
    const top = hand.clone().add(V(-.35, .85, .05));
    rod(inst, hand.clone().add(V(.05, -.12, 0)), top, .012, M.gold, 6);
    const fm = new THREE.MeshStandardMaterial({ color: col, roughness: .6, side: THREE.DoubleSide });
    const fl = add(inst, new THREE.PlaneGeometry(.95, .62, 1, 1), fm, 0, 0, 0);
    fl.position.copy(top).add(V(-.45, -.3, 0)); fl.rotation.set(0, 0, .35);
  };

  /* ---------- amplificadores ---------- */
  const amp = (x, z, w, hgt, d, yOff = 0) => {
    const g = new THREE.Group(); g.position.set(x, yS + yOff, z); g.rotation.y = Math.PI;
    bx(g, w, hgt, d, M.tolex, 0, hgt / 2, 0); bx(g, w - .06, hgt - .16, .01, M.grill, 0, hgt / 2 - .04, d / 2 + .005);
    bx(g, w - .06, .07, .012, M.gold, 0, hgt - .06, d / 2 + .006); bx(g, .12, .03, .01, M.ivory, -w / 2 + .12, hgt / 2 - .04, d / 2 + .012);
    for (let k = 0; k < 6; k++) cyl(g, .012, .012, .02, M.ivory, -w / 2 + .1 + k * (w - .2) / 5, hgt - .06, d / 2 + .015, Math.PI / 2, 0, 0, 8);
    const b = bakeStatic(g, [], false); b.position.copy(g.position); b.rotation.copy(g.rotation); group.add(b);
    solids.push([x - w / 2 - .05, x + w / 2 + .05, z - d / 2 - .05, z + d / 2 + .05, yS + yOff + hgt, yS]);
  };

  // ======= distribución en la tarima (todos miran al público: hacia -z) =======
  const PI = Math.PI, zz = dz => Z1 + dz;
  // tarimita de la batería
  const rise = std(0x2a2430, { roughness: .6 });
  { const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, .25, 2.2), rise); b.position.set(cx, yS + .125, zz(-2.1)); b.receiveShadow = true; group.add(b); solids.push([cx - 1.3, cx + 1.3, zz(-3.2), zz(-1), yS + .25, yS]); }
  // la batería ocupa todo su tarimita: no se camina a través de ella
  solids.push([cx - .75, cx + .75, zz(-3.0), zz(-1.6), yS + 1.4, yS + .25]);
  const drumWrap = musician({ gender: 'm', topStyle: 'camiseta', top: 0x1a1a1e }, cx, zz(-1.85), PI, drummer, { y: yS + .25, anim: 'drum', box: 0 });
  const cymbals = drumWrap.userData.loose;
  await pace();
  musician({ gender: 'm', topStyle: 'camisa', top: 0x2e2e38 }, cx + 4.3, zz(-3.1), PI, playGuitar('electric', M.redGtr));
  amp(cx + 4.3, zz(-1.5), .62, .5, .28);
  musician({ gender: 'm', topStyle: 'mangalarga', top: 0x1f5c70 }, cx - 4.1, zz(-3.0), PI, playGuitar('bass', M.blueGtr));
  amp(cx - 4.1, zz(-1.45), .6, 1.05, .45); amp(cx - 4.1, zz(-1.45), .6, .22, .4, 1.05);   // caja del bajo y cabezal encima
  await pace();
  musician({ gender: 'f', topStyle: 'chaqueta', top: 0xf2f0e8, legwear: 'pantalon' }, cx - 1.8, zz(-4.55), PI, leader);
  musician({ gender: 'm', topStyle: 'mangalarga', top: 0x7a3b6e }, cx + 7, zz(-3.0), PI, keyboardist);
  solids.push([cx + 6.45, cx + 7.55, zz(-3.75), zz(-3.25), yS + 1.3, yS]);
  musician({ gender: 'm', topStyle: 'camisa', top: 0xe0a31a }, cx + 2.4, zz(-2.0), PI, conguero);
  await pace();
  // piano de cola de lado, a la izquierda del público: la tapa abierta se ve desde las sillas
  musician({ gender: 'f', topStyle: 'chaqueta', top: 0x15151a, legwear: 'pantalon' }, cx - 10.6, zz(-3.2), PI / 2, pianist);
  solids.push([cx - 10.2, cx - 8.2, zz(-4.0), zz(-2.4), yS + 1, yS]);
  // vientos al fondo, a la derecha
  musician({ gender: 'm', topStyle: 'traje', top: 0x15151a, pants: 0x15151a }, cx + 8.6, zz(-1.7), PI, saxophonist);
  musician({ gender: 'm', topStyle: 'camisa', top: 0x2a4a9a }, cx + 9.8, zz(-1.7), PI, trumpeter);
  musician({ gender: 'm', topStyle: 'mangalarga', top: 0x2e7d4f }, cx + 10.9, zz(-1.9), PI, trombonist);
  await pace();
  // cantantes al frente con micrófono en la mano
  const singX = [[-5.8, 'f'], [-3.8, 'm'], [1.8, 'f'], [3.8, 'f'], [5.8, 'm']];
  for (const [dx, g] of singX) musician({ stout: randomStout(r), gender: g, topStyle: g === 'f' ? 'chaqueta' : 'camisa', legwear: g === 'f' ? (r() < .5 ? 'vestido' : 'pantalon') : 'pantalon' }, cx + dx, zz(-4.55), PI, singer, { anim: r() < .5 ? 'jump' : 'sway' });
  await pace();
  // coro en gradas al fondo a la izquierda (todos con la misma camisa vino)
  { const riser = new THREE.Mesh(new THREE.BoxGeometry(5, .35, .9), rise); riser.position.set(cx - 7.4, yS + .175, zz(-1.1)); riser.receiveShadow = true; group.add(riser);
    solids.push([cx - 9.9, cx - 4.9, zz(-1.55), zz(-.65), yS + .35, yS]); }
  for (let k = 0; k < 9; k++) {
    const back = k >= 5, dx = back ? -9.2 + (k - 5) * 1.2 + .6 : -9.4 + k * 1.05, f = k % 2 === 0;
    const pose = (h) => { if (r() < .5) { for (const a of h.arms) { a.shoulder.rotation.x = -2.7; a.elbow.rotation.x = -.25; } h.arms[0].shoulder.rotation.z = -.35; h.arms[1].shoulder.rotation.z = .35; h.head.rotation.x = -.3; }
      else { for (const a of h.arms) { a.shoulder.rotation.x = -1.2; a.elbow.rotation.x = -1.3; } h.arms[0].shoulder.rotation.z = .35; h.arms[1].shoulder.rotation.z = -.35; } };
    musician({ stout: randomStout(r), gender: f ? 'f' : 'm', top: 0x6e1a2c, topStyle: 'mangalarga', legwear: 'pantalon', pants: 0x15151a, detail: .45 }, cx + dx, zz(back ? -1.1 : -2.05), PI, pose, { y: back ? yS + .35 : yS, anim: r() < .5 ? 'clap' : 'sway', box: back ? 0 : .3 });
  }
  await pace();
  // danzarinas con banderas a los lados del frente de la tarima
  [[-8.8, 0x7a3bc8], [8.8, 0xf5c542], [-7.4, 0xf2f0e8], [7.4, 0xc0392b]].forEach(([dx, col], k) =>
    musician({ gender: 'f', top: 0xf2f0e8, legwear: 'vestido', topStyle: 'mangalarga', detail: .45 }, cx + dx, zz(k < 2 ? -5.7 : -6.0), PI, flagDancer(col), { anim: 'flag' }));
  // monitores de piso para los cantantes
  { const wedM = std(0x111114, { roughness: .7 }), grillM = std(0x2c2e33, { roughness: .95, metalness: .3 }), ledM = new THREE.MeshBasicMaterial({ color: 0x3aa0ff });
    for (const [dx] of [...singX, [-1.8]]) {
      const x = cx + dx, w = new THREE.Group(); w.position.set(x, yS + .225, SZ + .75); w.rotation.x = -.45; group.add(w);
      const body = new THREE.Mesh(new THREE.BoxGeometry(.56, .32, .45), wedM); body.castShadow = true; body.receiveShadow = true; w.add(body);
      const gr = new THREE.Mesh(new THREE.BoxGeometry(.5, .25, .012), grillM); gr.position.set(0, .01, .227); w.add(gr);
      const led = new THREE.Mesh(new THREE.BoxGeometry(.025, .012, .006), ledM); led.position.set(.22, -.135, .234); w.add(led);
      solids.push([x - .3, x + .3, SZ + .5, SZ + 1, yS + .4, yS]);
    } }
  for (const s of solids) solid(...s);
  return { cymbals };
}
