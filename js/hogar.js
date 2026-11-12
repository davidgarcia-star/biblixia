import * as THREE from 'three';
import { bakeInPlace } from './human.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =========================================================
   HOGAR: detalles de la casa del jugador
   - Comida de verdad en la mesa (arroz, habichuelas, pollo, ensalada, jugo, pan y frutas)
   - Televisor en el dormitorio (se enciende y se apaga)
   - Baño preparado: bañera llena con espuma, ducha, inodoro, lavamanos, espejo y toallas
   ========================================================= */

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .6, ...o });
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
// perfil de revolución (lista de [radio, altura])
const lathe = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

let shared = null;
function mats() {
  if (shared) return shared;
  // arroz: blanco con granitos alargados
  const rice = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 520; i++) {
      const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 3.14;
      g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = Math.random() < .5 ? '#ffffff' : '#ddd6c4';
      g.beginPath(); g.ellipse(0, 0, 3.6, 1.3, 0, 0, 7); g.fill(); g.restore();
    }
  });
  rice.wrapS = rice.wrapT = THREE.RepeatWrapping;
  // pollo guisado/horneado: dorado con partes tostadas
  const chicken = canvasTex(128, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b8692a'); gr.addColorStop(.5, '#d08a3c'); gr.addColorStop(1, '#9a5220');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${90 + Math.random() * 40},${40 + Math.random() * 20},10,${.25 + Math.random() * .35})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 5, 0, 7); g.fill(); }
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,215,140,.35)'; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 0, 7); g.fill(); }
  });
  // guiso de habichuelas: caldo rojizo con frijoles
  const beans = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#6a2a1a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = Math.random() * w, y = Math.random() * h; g.fillStyle = Math.random() < .6 ? '#8a3424' : '#4a1a10'; g.beginPath(); g.ellipse(x, y, 7, 4.5, Math.random() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,200,170,.35)'; g.beginPath(); g.ellipse(x - 2, y - 1.5, 2.5, 1.2, 0, 0, 7); g.fill(); }
  });
  // pan: corteza dorada con harina
  const bread = canvasTex(64, 64, (g, w, h) => {
    const gr = g.createRadialGradient(32, 26, 4, 32, 32, 40); gr.addColorStop(0, '#e8b46a'); gr.addColorStop(1, '#a8642a');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,245,225,.35)'; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); }
  });
  // mantel de cuadros
  const cloth = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#fbf7ee'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(176,40,44,.45)';
    for (let i = 0; i < 8; i++) { g.fillRect(i * 16, 0, 8, h); g.fillRect(0, i * 16, w, 8); }
  });
  cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping; cloth.repeat.set(3, 2);
  // azulejos del baño
  const tile = (c1, c2) => {
    const t = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = c2; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const v = Math.random() * 10 - 5; g.fillStyle = c1; g.globalAlpha = 1; g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29); g.fillStyle = `rgba(255,255,255,${.06 + Math.abs(v) / 100})`; g.fillRect(x * 32 + 3, y * 32 + 3, 14, 6); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  };
  const floorTile = tile('#c9ced2', '#8e959b'), wallTile = tile('#e8f2f6', '#b9c7cf');
  // toallas: tela con rayas suaves
  const towel = (base, stripe) => canvasTex(64, 64, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.fillStyle = stripe; g.fillRect(0, 44, w, 6); g.fillRect(0, 54, w, 3); for (let i = 0; i < 300; i++) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); } });
  shared = {
    rice: M(0xffffff, { map: rice, roughness: .85 }), chicken: M(0xffffff, { map: chicken, roughness: .45 }),
    beans: M(0xffffff, { map: beans, roughness: .35 }), bread: M(0xffffff, { map: bread, roughness: .8 }),
    cloth: M(0xffffff, { map: cloth, roughness: .95 }),
    porcelain: M(0xfbfbf8, { roughness: .18 }), porcelainIn: M(0xf4f4f0, { roughness: .2, side: THREE.DoubleSide }),
    metal: M(0xd6dbe0, { metalness: .9, roughness: .18 }), bone: M(0xf2e6cc, { roughness: .5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0xe8f4fa, roughness: .05, metalness: .1, transparent: true, opacity: .28, depthWrite: false, side: THREE.DoubleSide }),
    juice: M(0xf59a1c, { roughness: .15, transparent: true, opacity: .9 }),
    lettuce: M(0x5aa83a, { roughness: .55, side: THREE.DoubleSide }), lettuce2: M(0x8ccc4a, { roughness: .55, side: THREE.DoubleSide }),
    tomato: M(0xd8331f, { roughness: .35 }), tomatoIn: M(0xf06a4a, { roughness: .5 }), avocado: M(0x9cc24a, { roughness: .5 }), avocadoSkin: M(0x2e4a1a, { roughness: .6 }),
    apple: M(0xc8231c, { roughness: .3 }), apple2: M(0x9ac43a, { roughness: .32 }), orange: M(0xf28a14, { roughness: .6 }),
    banana: M(0xf3d23a, { roughness: .5 }), bananaTip: M(0x4a3a1a, { roughness: .7 }), grape: M(0x5a2a6a, { roughness: .25 }), stem: M(0x5a3a1a, { roughness: .8 }),
    wood: M(0x8a5a32, { roughness: .55 }), wicker: M(0xc49a5a, { roughness: .9 }),
    floorTile: M(0xffffff, { map: floorTile, roughness: .25 }), wallTile: M(0xffffff, { map: wallTile, roughness: .2 }),
    water: new THREE.MeshStandardMaterial({ color: 0x8fd0e8, roughness: .04, metalness: .1, transparent: true, opacity: .62, depthWrite: false }),
    foam: M(0xffffff, { roughness: .95 }), duck: M(0xffd21f, { roughness: .4 }), beak: M(0xf07a14, { roughness: .4 }),
    towelBlue: M(0xffffff, { map: towel('#6aa8d8', '#ffffff'), roughness: 1 }), towelWhite: M(0xffffff, { map: towel('#f6f4ee', '#c9a24a'), roughness: 1 }),
    towelPink: M(0xffffff, { map: towel('#e89ab4', '#ffffff'), roughness: 1 }), mat: M(0x4a7aa8, { roughness: 1 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xdfeef4, metalness: .35, roughness: .06, emissive: 0x8aa4b0, emissiveIntensity: .35 }), black: M(0x0c0d10, { roughness: .25 }),
  };
  return shared;
}

function add(parent, geo, mat, x, y, z, { cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m;
}

/* ---------- Comida en la mesa ---------- */
// (tx, ty, tz): centro de la tabla de la mesa; ty = altura de la superficie
export function buildFood(group, tx, ty, tz, w = 1.4, d = .9) {
  const S = mats(), g = new THREE.Group(); g.position.set(tx, ty, tz); group.add(g);
  add(g, new THREE.BoxGeometry(w + .14, .008, d + .14), S.cloth, 0, .004, 0, { cast: false });
  const y0 = .009;
  const plateGeo = lathe([[0, 0], [.1, 0], [.11, .006], [.14, .022], [.145, .026], [.14, .028], [.108, .012], [0, .01]], 32);
  const plato = (px, pz, rot) => {
    const p = new THREE.Group(); p.position.set(px, y0, pz); p.rotation.y = rot; g.add(p);
    add(p, plateGeo, S.porcelain, 0, 0, 0, { cast: false });
    // arroz blanco (montoncito)
    const ar = add(p, new THREE.SphereGeometry(.058, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), S.rice, -.035, .012, .02); ar.scale.set(1.15, .7, 1);
    // pollo guisado: dos piezas (muslo con hueso y pechuga)
    const mus = add(p, new THREE.CapsuleGeometry(.024, .05, 6, 12), S.chicken, .045, .032, .03); mus.rotation.set(Math.PI / 2, 0, .5); mus.scale.set(1.15, 1, .85);
    const hue = add(p, new THREE.CylinderGeometry(.007, .008, .04, 8), S.bone, .07, .03, .065); hue.rotation.set(Math.PI / 2, 0, .5);
    add(p, new THREE.SphereGeometry(.011, 8, 6), S.bone, .08, .03, .083);
    const pe = add(p, new THREE.SphereGeometry(.04, 16, 10), S.chicken, .06, .026, -.035); pe.scale.set(1.1, .45, .8);
    // ensalada: lechuga, tomate y aguacate
    for (let k = 0; k < 4; k++) { const l = add(p, new THREE.SphereGeometry(.03, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), k % 2 ? S.lettuce : S.lettuce2, -.06 + k * .012, .014 + k * .002, -.055 + (k % 2) * .012); l.scale.set(1, .3, .7); l.rotation.y = k; }
    for (let k = 0; k < 2; k++) { add(p, new THREE.CylinderGeometry(.018, .018, .006, 16), S.tomato, -.048 + k * .03, .024, -.05 + k * .006); add(p, new THREE.CylinderGeometry(.014, .014, .0065, 12), S.tomatoIn, -.048 + k * .03, .0245, -.05 + k * .006); }
    for (let k = 0; k < 2; k++) { const a = add(p, new THREE.SphereGeometry(.018, 10, 6), S.avocado, -.01 + k * .016, .022, -.07); a.scale.set(1.6, .45, .6); a.rotation.y = .4; }
    // tenedor y cuchillo
    add(p, new THREE.BoxGeometry(.012, .003, .17), S.metal, -.17, .002, 0, { cast: false });
    add(p, new THREE.BoxGeometry(.016, .003, .18), S.metal, .17, .002, 0, { cast: false });
    // vaso de jugo
    add(p, new THREE.CylinderGeometry(.03, .026, .11, 18, 1, true), S.glass, .14, .055, -.13, { cast: false });
    add(p, new THREE.CylinderGeometry(.027, .024, .08, 16), S.juice, .14, .042, -.13, { cast: false });
    // plato hondo con habichuelas guisadas
    add(p, lathe([[0, 0], [.03, 0], [.05, .035], [.052, .04], [.048, .04], [.028, .006], [0, .006]], 24), S.porcelainIn, -.12, 0, -.15, { cast: false });
    add(p, new THREE.CylinderGeometry(.045, .03, .022, 20), S.beans, -.12, .02, -.15, { cast: false });
    return p;
  };
  // dos puestos frente a frente
  plato(-.33, -.2, Math.PI); plato(.33, .22, 0);
  // frutero de madera en el centro
  const fr = new THREE.Group(); fr.position.set(-.05, y0, .02); g.add(fr);
  add(fr, lathe([[0, 0], [.06, 0], [.06, .015], [.13, .06], [.135, .065], [.125, .065], [.05, .022], [0, .022]], 28), S.wood, 0, 0, 0);
  const fruta = (mat, r, x, y, z, stem = true) => { const f = add(fr, new THREE.SphereGeometry(r, 18, 14), mat, x, y, z); f.scale.y = .9; if (stem) add(fr, new THREE.CylinderGeometry(.003, .003, .02, 5), S.stem, x, y + r * .95, z); return f; };
  fruta(S.apple, .036, -.05, .055, -.03); fruta(S.apple2, .035, .04, .056, -.045); fruta(S.orange, .04, .01, .06, .045, false); fruta(S.apple, .034, -.04, .095, .02);
  for (let k = 0; k < 3; k++) { // racimo de guineos
    const b = add(fr, new THREE.TorusGeometry(.085, .016, 8, 18, 1.7), S.banana, .02, .1 + k * .012, .0 + k * .018); b.rotation.set(Math.PI / 2 - .3, 0, 2.2 + k * .12); b.scale.set(1, 1, 1.15);
  }
  add(fr, new THREE.SphereGeometry(.012, 6, 5), S.bananaTip, -.055, .1, -.06);
  for (let k = 0; k < 14; k++) { const a = k * 2.4, rr = .006 + (k % 4) * .007; add(fr, new THREE.SphereGeometry(.013, 10, 8), S.grape, .07 + Math.cos(a) * rr, .07 + (14 - k) * .0035, .045 + Math.sin(a) * rr); }
  // canasta de pan
  const ca = new THREE.Group(); ca.position.set(-.5, y0, .27); g.add(ca);
  add(ca, lathe([[0, 0], [.09, 0], [.1, .05], [.105, .055], [.098, .055], [.085, .008], [0, .008]], 22), S.wicker, 0, 0, 0);
  for (const [x, z, ry] of [[-.03, -.02, .3], [.035, .015, -.4], [0, .04, 1.2]]) { const pn = add(ca, new THREE.CapsuleGeometry(.025, .045, 6, 12), S.bread, x, .045, z); pn.rotation.set(0, ry, Math.PI / 2); pn.scale.set(1, 1, .8); }
  // jarra de jugo
  add(g, lathe([[0, 0], [.05, 0], [.055, .12], [.045, .19], [.05, .21], [.048, .21], [.043, .19], [.052, .12], [.047, .005], [0, .005]], 24), S.glass, .5, y0, .3, { cast: false });
  add(g, new THREE.CylinderGeometry(.049, .046, .13, 20), S.juice, .5, y0 + .07, .3, { cast: false });
  const asa = add(g, new THREE.TorusGeometry(.04, .007, 6, 14, Math.PI), S.glass, .555, y0 + .12, .3, { cast: false }); asa.rotation.z = -Math.PI / 2;
  // servilletas
  for (const [x, z] of [[-.58, -.2], [.58, .22]]) add(g, new THREE.BoxGeometry(.09, .006, .12), S.towelWhite, x, y0 + .003, z, { cast: false });
  bakeInPlace(g, [], false); // todo en pocas piezas
  // vapor suave que sube de la comida caliente (habichuelas y arroz recién servidos)
  const steam = [];
  const stTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.5, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  for (const [sx, sz, sy] of [[-.21, -.05, .035], [.21, .07, .035], [-.3, -.18, .04], [.3, .2, .04]]) {
    for (let k = 0; k < 4; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: stTex, transparent: true, depthWrite: false, opacity: 0, color: 0xf4f1ea }));
      sp.renderOrder = 3; sp.raycast = () => {}; g.add(sp); steam.push({ sp, sx, sz, sy, ph: k / 4 + sx * .7 });
    }
  }
  g.userData.update = (t) => {
    for (const s of steam) {
      const f = (t * .32 + s.ph) % 1, f2 = f < 0 ? f + 1 : f;
      s.sp.position.set(s.sx + Math.sin(t * 1.3 + s.ph * 9) * .012 * (1 + f2 * 2), s.sy + f2 * .26, s.sz + Math.cos(t * 1.1 + s.ph * 7) * .01 * (1 + f2 * 2));
      s.sp.scale.setScalar(.04 + f2 * .11); s.sp.material.opacity = .16 * Math.sin(f2 * Math.PI);
    }
  };
  return g;
}

// Sillas alrededor de la mesa (decorativas)
export function buildChairs(group, tx, fy, tz, positions) {
  const S = mats();
  for (const [x, z, ry] of positions) {
    const c = new THREE.Group(); c.position.set(tx + x, fy, tz + z); c.rotation.y = ry; group.add(c);
    add(c, new THREE.BoxGeometry(.44, .05, .42), S.wood, 0, .47, 0);
    for (const [a, b] of [[-.19, -.18], [.19, -.18], [-.19, .18], [.19, .18]]) add(c, new THREE.BoxGeometry(.04, .47, .04), S.wood, a, .235, b);
    add(c, new THREE.BoxGeometry(.44, .5, .04), S.wood, 0, .74, .2);
    add(c, new THREE.BoxGeometry(.36, .03, .34), S.towelBlue, 0, .51, -.01, { cast: false });
    bakeInPlace(c);
  }
}

/* ---------- Televisor del dormitorio ---------- */
// La pantalla queda en el plano z = wz mirando hacia +z (hacia la cama)
export function buildBedroomTV(group, x, fy, wz) {
  const S = mats(), g = new THREE.Group(); g.position.set(x, fy, wz); group.add(g);
  // mueble (cómoda) bajo la tele
  add(g, new THREE.BoxGeometry(1.7, .6, .45), S.wood, 0, .3, .24);
  for (const sx of [-.42, .42]) { add(g, new THREE.BoxGeometry(.78, .24, .02), M(0x9a6a3e, { roughness: .5 }), sx, .3, .47, { cast: false }); add(g, new THREE.BoxGeometry(.12, .025, .03), S.metal, sx, .3, .49, { cast: false }); }
  // planta y portarretrato
  add(g, new THREE.CylinderGeometry(.06, .05, .12, 14), M(0xd8cfc0, { roughness: .4 }), .7, .66, .25);
  for (let k = 0; k < 6; k++) { const h = add(g, new THREE.SphereGeometry(.05, 8, 6), S.lettuce, .7 + Math.cos(k) * .04, .76 + (k % 3) * .03, .25 + Math.sin(k) * .04); h.scale.set(.5, 1.4, .5); h.rotation.z = Math.cos(k) * .5; }
  add(g, new THREE.BoxGeometry(.16, .2, .02), M(0xc9a24a, { metalness: .6, roughness: .3 }), -.7, .7, .3).rotation.x = -.15;
  // la tele: marco delgado sobre la pared
  add(g, new THREE.BoxGeometry(1.42, .82, .05), S.black, 0, 1.58, .04);
  // pantalla con un programa (paisaje con la creación y un versículo)
  const prog = canvasTex(512, 288, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h * .65); sky.addColorStop(0, '#2a6fc4'); sky.addColorStop(1, '#ffd89a'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff2b0'; c.beginPath(); c.arc(w * .72, h * .42, 34, 0, 7); c.fill();
    c.fillStyle = '#4a6a8a'; c.beginPath(); c.moveTo(0, h * .62); c.lineTo(w * .2, h * .36); c.lineTo(w * .38, h * .58); c.lineTo(w * .55, h * .3); c.lineTo(w * .8, h * .6); c.lineTo(w, h * .45); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#3f8a3a'; c.fillRect(0, h * .6, w, h * .4);
    c.fillStyle = '#2f6fa8'; c.beginPath(); c.ellipse(w * .5, h * .82, w * .32, h * .07, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(0,0,0,.55)'; c.fillRect(0, h - 62, w, 62);
    c.fillStyle = '#ffd34d'; c.font = '800 20px system-ui, sans-serif'; c.fillText('MIPROAA TV', 16, h - 36);
    c.fillStyle = '#ffffff'; c.font = '600 16px system-ui, sans-serif'; c.fillText('«En el principio creó Dios los cielos y la tierra.» Génesis 1:1', 16, h - 13);
    c.fillStyle = '#e33'; c.beginPath(); c.arc(w - 26, 22, 7, 0, 7); c.fill(); c.fillStyle = '#fff'; c.font = '700 14px system-ui'; c.fillText('EN VIVO', w - 92, 27);
  });
  const onM = new THREE.MeshStandardMaterial({ color: 0x000000, map: prog, emissive: 0xffffff, emissiveMap: prog, emissiveIntensity: 1, roughness: .3 });
  const offM = new THREE.MeshStandardMaterial({ color: 0x050608, roughness: .12, metalness: .3 });
  const screen = add(g, new THREE.PlaneGeometry(1.34, .75), onM, 0, 1.58, .068, { cast: false, recv: false });
  const led = add(g, new THREE.BoxGeometry(.02, .01, .01), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x30ff60, emissiveIntensity: 2 }), .6, 1.18, .07, { cast: false });
  bakeInPlace(g, [screen, led]);
  let on = true;
  return { group: g, toggle() { on = !on; screen.material = on ? onM : offM; led.material.emissive.setHex(on ? 0x30ff60 : 0xff3030); return on; }, get on() { return on; } };
}

/* ---------- Baño preparado ---------- */
// Cuarto rectangular [bx0, bx1] × [bz0, bz1]; las paredes las pone quien llama.
export function buildBathroom(group, { bx0, bx1, bz0, bz1, fy, H, T, solid }) {
  const S = mats(), g = new THREE.Group(); group.add(g);
  const W = bx1 - bx0 - T, D = bz1 - bz0 - T, mx = (bx0 + bx1) / 2, mz = (bz0 + bz1) / 2;
  // piso de cerámica y azulejos en las paredes (hasta 1,4 m)
  const ft = S.floorTile.map.clone(); ft.needsUpdate = true; ft.repeat.set(W / .6, D / .6);
  add(g, new THREE.BoxGeometry(W, .02, D), new THREE.MeshStandardMaterial({ map: ft, roughness: .25 }), mx, fy + .15, mz, { cast: false });
  const wt = (len) => { const t = S.wallTile.map.clone(); t.needsUpdate = true; t.repeat.set(len / .6, 1.4 / .6); return new THREE.MeshStandardMaterial({ map: t, roughness: .2 }); };
  const TH = 1.4, ty = fy + .15 + TH / 2, e = T / 2 + .012;
  add(g, new THREE.BoxGeometry(W, TH, .01), wt(W), mx, ty, bz1 - e, { cast: false });      // fondo
  add(g, new THREE.BoxGeometry(W, TH, .01), wt(W), mx, ty, bz0 + e, { cast: false });      // frente
  add(g, new THREE.BoxGeometry(.01, TH, D), wt(D), bx1 - e, ty, mz, { cast: false });      // derecha
  // lámpara del techo
  add(g, new THREE.CylinderGeometry(.22, .22, .04, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 1.8 }), mx, fy + H - .03, mz, { cast: false });
  const fl = fy + .16;

  // --- Ducha en la esquina del frente ---
  const shX = bx1 - .68, shZ = bz0 + .68;
  add(g, new THREE.BoxGeometry(1.1, .06, 1.1), S.porcelain, shX, fl + .03, shZ, { cast: false });
  add(g, new THREE.CylinderGeometry(.04, .04, .005, 16), S.metal, shX, fl + .065, shZ, { cast: false });
  add(g, new THREE.BoxGeometry(.012, 2, 1.1), S.glass, shX - .55, fl + 1.03, shZ, { cast: false });
  add(g, new THREE.BoxGeometry(.03, 2, .03), S.metal, shX - .55, fl + 1.03, shZ + .55, { cast: false });
  add(g, new THREE.CylinderGeometry(.012, .012, .5, 8), S.metal, bx1 - e - .03, fl + 1.9, shZ, { cast: false }).rotation.z = Math.PI / 2;
  const reg = add(g, new THREE.CylinderGeometry(.1, .07, .04, 20), S.metal, bx1 - e - .28, fl + 1.86, shZ, { cast: false }); reg.rotation.z = -.35;
  add(g, new THREE.CylinderGeometry(.035, .035, .03, 14), S.metal, bx1 - e - .02, fl + 1.1, shZ - .2, { cast: false }).rotation.z = Math.PI / 2;
  add(g, new THREE.BoxGeometry(.06, .1, .06), M(0x2a8ad0, { roughness: .3 }), bx1 - e - .06, fl + 1.25, shZ + .3, { cast: false }); // champú
  add(g, new THREE.BoxGeometry(.05, .13, .05), M(0xe86a8a, { roughness: .3 }), bx1 - e - .06, fl + 1.26, shZ + .38, { cast: false });

  // --- Bañera llena con espuma (contra la pared del fondo) ---
  const tL = 1.7, tW = .78, tX = bx1 - e - tL / 2 - .02, tZ = bz1 - e - tW / 2 - .02, tH = .56;
  add(g, new THREE.BoxGeometry(tL, tH, tW), S.porcelain, tX, fl + tH / 2, tZ);
  // borde redondeado interior (la tina se ve hueca por arriba)
  add(g, new THREE.BoxGeometry(tL - .14, .02, tW - .14), M(0xeaf2f4, { roughness: .2 }), tX, fl + tH + .001, tZ, { cast: false });
  const water = add(g, new THREE.BoxGeometry(tL - .16, .01, tW - .16), S.water, tX, fl + tH + .014, tZ, { cast: false, recv: false });
  water.renderOrder = 2;
  // espuma: muchas burbujas unidas en una sola pieza
  const foamGeos = [];
  for (let k = 0; k < 34; k++) {
    const fx = (Math.random() - .5) * (tL - .3), fz = (Math.random() - .5) * (tW - .26), r = .05 + Math.random() * .06;
    const sg = new THREE.SphereGeometry(r, 12, 8); sg.scale(1, .55, 1); sg.translate(fx, 0, fz); foamGeos.push(sg);
  }
  const foamMesh = add(g, mergeGeometries(foamGeos, false), S.foam, tX, fl + tH + .02, tZ, { cast: false });
  const foam = [foamMesh];
  // patito de goma
  const dk = new THREE.Group(); dk.position.set(tX - .35, fl + tH + .045, tZ + .1); dk.rotation.y = .8; g.add(dk);
  add(dk, new THREE.SphereGeometry(.05, 14, 10), S.duck, 0, 0, 0).scale.set(1.25, .8, 1);
  add(dk, new THREE.SphereGeometry(.033, 12, 10), S.duck, .04, .05, 0);
  add(dk, new THREE.ConeGeometry(.012, .03, 8), S.beak, .075, .048, 0).rotation.z = -Math.PI / 2;
  for (const s of [-1, 1]) add(dk, new THREE.SphereGeometry(.005, 6, 4), S.black, .062, .062, s * .015);
  // grifo de la bañera
  add(g, new THREE.CylinderGeometry(.018, .018, .16, 10), S.metal, bx1 - e - .07, fl + tH + .12, tZ, { cast: false }).rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) add(g, new THREE.CylinderGeometry(.025, .025, .03, 12), S.metal, bx1 - e - .03, fl + tH + .12, tZ + s * .12, { cast: false }).rotation.z = Math.PI / 2;
  // toalla doblada sobre el borde, velas y sales
  add(g, new THREE.BoxGeometry(.32, .06, .22), S.towelWhite, tX - tL / 2 + .25, fl + tH + .03, tZ + tW / 2 - .1);
  // velas con llamita en forma de gota que titila (cada una a su ritmo)
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffd060, emissive: 0xffa020, emissiveIntensity: 3 });
  const flames = [];
  for (let k = 0; k < 3; k++) {
    add(g, new THREE.CylinderGeometry(.025, .025, .06 + k * .02, 12), M(0xf6efe0, { roughness: .6 }), tX + .1 + k * .1, fl + tH + .03 + k * .01, tZ + tW / 2 - .04, { cast: false });
    add(g, new THREE.CylinderGeometry(.0015, .0015, .012, 4), S.black, tX + .1 + k * .1, fl + tH + .066 + k * .02, tZ + tW / 2 - .04, { cast: false }); // mecha
    const fm = add(g, new THREE.SphereGeometry(.01, 8, 6), flameMat, tX + .1 + k * .1, fl + tH + .078 + k * .02, tZ + tW / 2 - .04, { cast: false, recv: false });
    fm.scale.set(.8, 1.6, .8); fm.userData.ph = k * 2.1; flames.push(fm);
  }
  solid(tX - tL / 2, tX + tL / 2, tZ - tW / 2, tZ + tW / 2, fl + tH);

  // --- Inodoro (contra la pared derecha) ---
  const iZ = bz0 + 1.9, iX = bx1 - e;
  add(g, new THREE.BoxGeometry(.2, .42, .44), S.porcelain, iX - .1, fl + .62, iZ);                      // tanque
  add(g, new THREE.BoxGeometry(.04, .02, .08), S.metal, iX - .2, fl + .8, iZ + .14, { cast: false });
  add(g, lathe([[.1, 0], [.12, .2], [.17, .4], [.18, .42], [0, .42]], 24), S.porcelain, iX - .4, fl, iZ).scale.set(1.15, 1, .9);
  const seat = add(g, new THREE.TorusGeometry(.14, .025, 8, 24), S.porcelain, iX - .42, fl + .44, iZ); seat.rotation.x = Math.PI / 2; seat.scale.set(1.18, .9, 1);
  const lid = add(g, new THREE.CylinderGeometry(.165, .165, .02, 24), S.porcelain, iX - .24, fl + .64, iZ); lid.rotation.z = Math.PI / 2 - .25; lid.scale.set(1, 1, .82);
  add(g, new THREE.CylinderGeometry(.055, .055, .1, 16), S.towelWhite, iX - .1, fl + .89, iZ + .1, { cast: false }); // papel
  solid(iX - .62, iX, iZ - .22, iZ + .22, fl + .45);
  // papelera de acero con pedal y escobilla en su base, en el piso junto al inodoro
  const pbX = iX - .15, pbZ = iZ - .4;
  add(g, new THREE.CylinderGeometry(.095, .085, .3, 20), S.metal, pbX, fl + .15, pbZ, { cast: false });
  add(g, new THREE.CylinderGeometry(.1, .1, .02, 20), M(0x2b2f35, { metalness: .4, roughness: .4 }), pbX, fl + .31, pbZ, { cast: false });
  add(g, new THREE.BoxGeometry(.1, .015, .05), M(0x2b2f35, { roughness: .5 }), pbX - .1, fl + .02, pbZ, { cast: false }); // pedal
  add(g, new THREE.CylinderGeometry(.05, .045, .14, 14), S.porcelain, iX - .14, fl + .07, iZ + .38, { cast: false }); // base de la escobilla
  add(g, new THREE.CylinderGeometry(.008, .008, .3, 6), S.metal, iX - .14, fl + .25, iZ + .38, { cast: false });
  add(g, new THREE.SphereGeometry(.016, 8, 6), S.metal, iX - .14, fl + .41, iZ + .38, { cast: false });

  // --- Lavamanos con mueble y espejo (pared del fondo, junto a la puerta) ---
  const lX = bx0 + e + .55, lZ = bz1 - e - .26;
  add(g, new THREE.BoxGeometry(.9, .78, .48), M(0x5a6a7a, { roughness: .5 }), lX, fl + .39, lZ);
  add(g, new THREE.BoxGeometry(.94, .04, .52), M(0xf0ece4, { roughness: .15 }), lX, fl + .8, lZ);
  add(g, lathe([[0, -.1], [.12, -.1], [.17, 0], [.18, .02], [.17, .02], [.11, -.08], [0, -.08]], 24), S.porcelainIn, lX, fl + .84, lZ, { cast: false }).scale.set(1.2, 1, .9);
  add(g, new THREE.CylinderGeometry(.012, .012, .18, 10), S.metal, lX, fl + .93, lZ + .2, { cast: false });
  add(g, new THREE.CylinderGeometry(.01, .01, .12, 10), S.metal, lX, fl + 1.02, lZ + .14, { cast: false }).rotation.x = Math.PI / 2;
  add(g, new THREE.BoxGeometry(.86, .96, .015), M(0xc9a24a, { metalness: .6, roughness: .3 }), lX, fl + 1.55, bz1 - e - .008, { cast: false });
  add(g, new THREE.BoxGeometry(.8, .9, .01), S.mirror, lX, fl + 1.55, bz1 - e - .02, { cast: false });
  add(g, new THREE.CylinderGeometry(.03, .025, .09, 12), M(0xffffff, { roughness: .3 }), lX + .3, fl + .87, lZ - .1, { cast: false }); // jabón líquido
  for (const [c, dx] of [[0x2a8ad0, -.02], [0xe03a5a, .02]]) { const cep = add(g, new THREE.CylinderGeometry(.005, .005, .17, 6), M(c), lX - .32 + dx, fl + .92, lZ - .1, { cast: false }); cep.rotation.z = dx * 6; }
  add(g, new THREE.CylinderGeometry(.03, .026, .09, 12), S.glass, lX - .32, fl + .87, lZ - .1, { cast: false });
  // tubo de pasta dental acostado junto al vaso de los cepillos
  const pasta = add(g, new THREE.CapsuleGeometry(.016, .1, 4, 10), M(0xffffff, { roughness: .35 }), lX - .2, fl + .838, lZ - .15, { cast: false }); pasta.rotation.z = Math.PI / 2; pasta.rotation.y = .4; pasta.scale.set(1, 1, .7);
  const tapa = add(g, new THREE.CylinderGeometry(.011, .011, .022, 10), M(0x2a8ad0, { roughness: .4 }), lX - .2 - Math.cos(.4) * .075, fl + .838, lZ - .15 + Math.sin(.4) * .075, { cast: false }); tapa.rotation.z = Math.PI / 2; tapa.rotation.y = .4;
  // maceta pequeña con una suculenta en la esquina del mueble
  add(g, new THREE.CylinderGeometry(.045, .035, .07, 14), M(0xd8cfc0, { roughness: .7 }), lX + .33, fl + .855, lZ + .13, { cast: false });
  add(g, new THREE.CylinderGeometry(.04, .04, .005, 14), M(0x4a3626, { roughness: 1 }), lX + .33, fl + .888, lZ + .13, { cast: false });
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * Math.PI * 2, hoja = add(g, new THREE.SphereGeometry(.022, 8, 6), M(0x6aa36a, { roughness: .55 }), lX + .33 + Math.cos(a) * .018, fl + .9, lZ + .13 + Math.sin(a) * .018, { cast: false });
    hoja.scale.set(.55, 1.3, .35); hoja.rotation.y = -a; hoja.rotation.z = -.45;
  }
  add(g, new THREE.SphereGeometry(.016, 8, 6), M(0x7fb87a, { roughness: .55 }), lX + .33, fl + .91, lZ + .13, { cast: false }).scale.set(1, 1.2, 1);
  solid(lX - .47, lX + .47, lZ - .26, lZ + .26, fl + .82);

  // --- Toallero con toallas (pared de la puerta) y alfombra ---
  const tz0 = bz0 + .9;
  add(g, new THREE.CylinderGeometry(.012, .012, 1, 8), S.metal, bx0 + e + .06, fl + 1.35, tz0, { cast: false }).rotation.x = Math.PI / 2;
  add(g, new THREE.BoxGeometry(.05, .75, .45), S.towelBlue, bx0 + e + .07, fl + 1.02, tz0 - .22, { cast: false });
  add(g, new THREE.BoxGeometry(.05, .65, .4), S.towelPink, bx0 + e + .07, fl + 1.07, tz0 + .24, { cast: false });
  add(g, new THREE.BoxGeometry(.8, .015, .5), S.mat, tX - .2, fl + .008, tZ - tW / 2 - .35, { cast: false });
  // batas colgadas detrás de la puerta (lo que el jugador se pone al entrar)
  add(g, new THREE.CapsuleGeometry(.12, .7, 6, 12), S.towelWhite, bx0 + e + .1, fl + 1.2, bz0 + .25).scale.set(.6, 1, 1.2);

  bakeInPlace(g, [dk, ...foam, ...flames], false);
  // espuma que se mueve suavemente y llamitas de las velas
  const update = (t) => { foamMesh.scale.set(1 + Math.sin(t * 1.3) * .02, 1 + Math.sin(t * 1.7) * .08, 1 + Math.sin(t * 1.1) * .02); dk.position.y = fl + tH + .045 + Math.sin(t * 1.6) * .006; dk.rotation.y = .8 + Math.sin(t * .5) * .3;
    for (const f of flames) { const p = f.userData.ph, fl2 = Math.sin(t * 9 + p) * .5 + Math.sin(t * 23 + p * 3) * .3; f.scale.set(.8 - fl2 * .08, 1.6 + fl2 * .25, .8 - fl2 * .08); f.rotation.z = Math.sin(t * 5 + p) * .12; }
    flameMat.emissiveIntensity = 2.7 + Math.sin(t * 11) * .3 + Math.sin(t * 27) * .2;
  };
  return { group: g, update, shower: { x: shX, z: shZ }, tub: { x: tX, z: tZ - tW / 2 - .55 }, sink: { x: lX, z: lZ - .55 }, toilet: { x: iX - .9, z: iZ } };
}
