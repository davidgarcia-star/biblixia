import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =========================================================
   Personaje humano procedural (≈1,75 m), mira hacia +Z, pies en y = 0.
   Opciones: gender 'm'|'f', outfit 'modern'|'robe', hair 'short'|'long'|'ponytail'|'cloth',
   beard {color, len}, colores de piel, ropa, pelo, ojos y nombre en la espalda.
   ========================================================= */

const lerp = THREE.MathUtils.lerp;
let Q = 1; // nivel de detalle (1 = jugador, menos para personajes lejanos)
const SG = (r, w = 32, h = 16, ...rest) => new THREE.SphereGeometry(r, Math.max(6, Math.round(w * Q)), Math.max(4, Math.round(h * Q)), ...rest);
const segs = n => Math.max(6, Math.round(n * Q));
const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (key && texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (key) texCache.set(key, t);
  return t;
}
const hex = n => '#' + new THREE.Color(n).getHexString();
const shade = (n, k) => { const c = new THREE.Color(n); c.multiplyScalar(k); c.r = Math.min(1, c.r); c.g = Math.min(1, c.g); c.b = Math.min(1, c.b); return '#' + c.getHexString(); };

// ---------- Geometrías base ----------
function limbGeo(r1, r2, len, bulge = 0, seg = 20) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r2 * Math.sin(a), -len - r2 * .7 * Math.cos(a))); }
  for (let i = 1; i < 10; i++) { const t = 1 - i / 10; pts.push(new THREE.Vector2(lerp(r1, r2, t) + bulge * Math.sin(Math.PI * t) * (1 - t * .4), -len * t)); }
  for (let i = 6; i >= 0; i--) { const a = (i / 6) * Math.PI / 2; pts.push(new THREE.Vector2(r1 * Math.sin(a), r1 * .7 * Math.cos(a))); }
  return new THREE.LatheGeometry(pts, segs(seg));
}
function latheUp(prof, seg = 28, phiStart = 0, phiLen = Math.PI * 2) {
  return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), segs(seg), phiStart, phiLen);
}
function torsoGeo(f) {
  const prof = f
    ? [[0, -.04], [.14, -.02], [.135, .08], [.125, .17], [.15, .27], [.165, .35], [.165, .41], [.15, .46], [.1, .5], [.055, .52], [0, .525]]
    : [[0, -.04], [.15, -.02], [.155, .06], [.15, .16], [.165, .26], [.185, .36], [.19, .42], [.17, .47], [.11, .51], [.06, .53], [0, .535]];
  return latheUp(prof, 32);
}
// Cráneo ovalado con mentón: radio .1, escala (.9, 1.14, 1.02)
function headGeo(f) {
  const g = SG(.1, 48, 36), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y / .1;
    if (ny < 0) { const k = 1 - (f ? .27 : .22) * Math.pow(-ny, 1.6); x *= k; z *= (1 - .1 * -ny); y *= f ? 1.02 : 1.05; }
    if (z < 0) z *= 1.05;
    p.setXYZ(i, x * .94, y * 1.12, z * 1.02);
  }
  g.computeVertexNormals();
  return g;
}
// Posición en la textura del rostro a partir de una posición relativa al centro de la cabeza
function faceUV(x, y, W, H) {
  let X = x / .94, Y = y / 1.12; if (Y < 0) Y /= 1.035;
  const th = Math.acos(THREE.MathUtils.clamp(Y / .1, -1, 1)), s = Math.max(.2, Math.sin(th));
  const ph = Math.acos(THREE.MathUtils.clamp(-X / (.1 * s), -1, 1));
  return [ph / (Math.PI * 2) * W, th / Math.PI * H];
}

// ---------- Texturas ----------
function faceTexture(o) {
  const key = ['face', o.skin, o.gender, o.lip, o.brow, o.age].join();
  return canvasTex(key, 1024, 512, (g, W, H) => {
    g.fillStyle = hex(o.skin); g.fillRect(0, 0, W, H);
    const [fx, fy] = faceUV(0, 0, W, H);
    let gr = g.createRadialGradient(fx, fy, 10, fx, fy, W * .3);
    gr.addColorStop(0, 'rgba(255,240,225,.14)'); gr.addColorStop(1, 'rgba(60,30,20,.16)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,230,210' : '90,50,35'},.02)`; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    // mejillas
    for (const s of [-1, 1]) {
      const [cx, cy] = faceUV(s * .045, -.042, W, H);
      gr = g.createRadialGradient(cx, cy, 2, cx, cy, 38); gr.addColorStop(0, o.gender === 'f' ? 'rgba(240,110,120,.42)' : 'rgba(215,110,95,.22)'); gr.addColorStop(1, 'rgba(200,90,80,0)');
      g.fillStyle = gr; g.fillRect(cx - 40, cy - 40, 80, 80);
    }
    // cuencas, delineado y cejas  (ojos en y=.006 relativo al centro)
    for (const s of [-1, 1]) {
      const [ex, ey] = faceUV(s * .034, .006, W, H);
      gr = g.createRadialGradient(ex, ey - 4, 6, ex, ey, 36); gr.addColorStop(0, o.gender === 'f' ? 'rgba(150,80,90,.22)' : 'rgba(90,50,40,.16)'); gr.addColorStop(1, 'rgba(60,30,25,0)');
      g.fillStyle = gr; g.fillRect(ex - 40, ey - 40, 80, 80);
      // pliegue del párpado
      g.strokeStyle = 'rgba(90,45,35,.35)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(ex, ey - 3, 26, 17, 0, Math.PI * 1.12, Math.PI * 1.88); g.stroke();
      // delineado y pestañas
      g.strokeStyle = o.gender === 'f' ? 'rgba(15,8,6,1)' : 'rgba(30,15,10,.7)'; g.lineWidth = o.gender === 'f' ? 5 : 3;
      g.beginPath(); g.ellipse(ex, ey, 24, 14, 0, Math.PI * 1.0, Math.PI * 2.0); g.stroke();
      if (o.gender === 'f') {
        g.lineWidth = 2.5;
        g.lineWidth = 4; g.beginPath(); g.moveTo(ex + s * 23, ey - 2); g.quadraticCurveTo(ex + s * 30, ey - 6, ex + s * 34, ey - 13); g.stroke();
      }
      // cejas suaves y arqueadas
      const [bx, by] = faceUV(s * .034, .029, W, H);
      g.strokeStyle = o.brow; g.lineCap = 'round'; g.globalAlpha = .9;
      for (let k = 0; k < 18; k++) {
        const t = k / 17, px = bx + s * (t - .4) * 48, py = by - Math.sin(t * Math.PI * .9) * (o.gender === 'f' ? 9 : 6);
        g.lineWidth = (o.gender === 'f' ? 3.2 : 5) * (1 - Math.pow(Math.abs(t - .3), 1.2) * .9);
        g.beginPath(); g.moveTo(px, py + 2); g.lineTo(px + s * 4, py - 2); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // sombra bajo la nariz
    const [nx, ny] = faceUV(0, -.033, W, H);
    gr = g.createRadialGradient(nx, ny, 2, nx, ny, 20); gr.addColorStop(0, 'rgba(70,35,25,.3)'); gr.addColorStop(1, 'rgba(70,35,25,0)');
    g.fillStyle = gr; g.fillRect(nx - 24, ny - 24, 48, 48);
    // labios
    const [mx, my] = faceUV(0, -.056, W, H), mw = o.gender === 'f' ? 27 : 25, lo = o.gender === 'f' ? 14 : 10, up = 5;
    const lg = g.createLinearGradient(0, my - 10, 0, my + lo);
    lg.addColorStop(0, o.lip); lg.addColorStop(1, shade(o.lip.length ? o.lip : '#b4505a', 1.15));
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(mx - mw, my - up);
    g.bezierCurveTo(mx - mw * .6, my - 9, mx - mw * .25, my - 12, mx, my - 7);
    g.bezierCurveTo(mx + mw * .25, my - 12, mx + mw * .6, my - 9, mx + mw, my - up);
    g.bezierCurveTo(mx + mw * .5, my + lo, mx - mw * .5, my + lo, mx - mw, my - up);
    g.fill();
    g.strokeStyle = 'rgba(70,20,25,.65)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(mx - mw - 2, my - up - 1); g.quadraticCurveTo(mx, my + 5, mx + mw + 2, my - up - 1); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(mx + 4, my + 5, mw * .3, 2.5, 0, 0, 7); g.fill();
    // hoyuelos de la sonrisa
    g.strokeStyle = 'rgba(120,60,45,.25)'; g.lineWidth = 2;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(mx + s * (mw + 6), my - up - 2, 5, s > 0 ? -.6 : Math.PI - .9, s > 0 ? .9 : Math.PI + .6); g.stroke(); }
    if (o.age > 0) {
      g.strokeStyle = 'rgba(60,30,20,.25)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const [x1, y1] = faceUV(-.03, .055 + k * .007, W, H), [x2] = faceUV(.03, .055, W, H); g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, y1 - 4, x2, y1); g.stroke(); }
    }
  });
}
function eyeTexture(color) {
  return canvasTex('eye' + color, 256, 128, (g, W, H) => {
    g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, W, H);
    const cx = W * .25, cy = H * .5;
    let gr = g.createRadialGradient(cx, cy, 20, cx, cy, 70); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(200,120,120,.35)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const c = new THREE.Color(color);
    const IR = 27;
    gr = g.createRadialGradient(cx, cy, 4, cx, cy, IR);
    gr.addColorStop(0, shade(c, 1.9)); gr.addColorStop(.55, shade(c, 1.15)); gr.addColorStop(.9, hex(c)); gr.addColorStop(1, shade(c, .3));
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, IR, IR, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1;
    for (let i = 0; i < 48; i++) { const a = i / 48 * 6.283; g.beginPath(); g.moveTo(cx + Math.cos(a) * 11, cy + Math.sin(a) * 11); g.lineTo(cx + Math.cos(a) * (IR - 2), cy + Math.sin(a) * (IR - 2)); g.stroke(); }
    g.strokeStyle = shade(c, .25); g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, IR - 1, 0, 7); g.stroke();
    g.fillStyle = '#050505'; g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.98)'; g.beginPath(); g.arc(cx + 7, cy - 8, 5, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(cx - 7, cy + 7, 2.5, 0, 7); g.fill();
  });
}
function hairTexture(color) {
  const t = canvasTex('hair' + color, 512, 512, (g, W, H) => {
    const c = new THREE.Color(color);
    g.fillStyle = hex(c); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * W, y = Math.random() * H, l = 30 + Math.random() * 90;
      g.strokeStyle = Math.random() < .5 ? shade(c, 1.6 + Math.random() * .6) : shade(c, .5);
      g.globalAlpha = .25 + Math.random() * .3; g.lineWidth = .8 + Math.random() * 1.2;
      g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + (Math.random() - .5) * 10, y + l / 2, x + (Math.random() - .5) * 6, y + l); g.stroke();
    }
    g.globalAlpha = 1;
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function clothTexture(color, kind = 'knit') {
  const t = canvasTex('cloth' + color + kind, 256, 256, (g, W, H) => {
    g.fillStyle = hex(color); g.fillRect(0, 0, W, H);
    if (kind === 'denim') { for (let i = 0; i < H; i += 2) { g.fillStyle = `rgba(255,255,255,${.03 + Math.random() * .05})`; g.fillRect(0, i, W, 1); } }
    for (let i = 0; i < 5000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.07)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
    if (kind === 'pleat') { for (let i = 0; i < W; i += 16) { const gg = g.createLinearGradient(i, 0, i + 16, 0); gg.addColorStop(0, 'rgba(0,0,0,.22)'); gg.addColorStop(.5, 'rgba(255,255,255,.08)'); gg.addColorStop(1, 'rgba(0,0,0,.22)'); g.fillStyle = gg; g.fillRect(i, 0, 16, H); } }
    if (kind === 'linen') { g.strokeStyle = 'rgba(0,0,0,.07)'; for (let i = 0; i < W; i += 6) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 3, H); g.stroke(); } }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}
function nameTexture(name, color) {
  return canvasTex(null, 512, 160, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.font = '900 86px system-ui, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(name).width, k = Math.min(1, (W - 40) / w);
    g.save(); g.translate(W / 2, H / 2); g.scale(k, 1);
    g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeText(name, 0, 4);
    g.fillStyle = color; g.fillText(name, 0, 0);
    g.restore();
  });
}

// ---------- Constructor ----------
export function createHuman(opt = {}) {
  const o = Object.assign({
    gender: 'm', outfit: 'modern', skin: 0xb57c57, hairColor: 0x1d130c, hair: 'short', eye: 0x5a3a22,
    top: 0x1f5c70, pants: 0x2b3a57, shoes: 0xf2f2f0, robe: 0xcbb994, mantle: 0x6b3f2a, sash: 0x8a2b2b, cloth: 0xe8dcc0,
    beard: null, name: '', age: 0,
  }, opt);
  Q = o.detail ?? 1;
  const lowQ = Q < .5; // figuras lejanas: sin dedos, párpados ni pestañas
  const F = o.gender === 'f', robe = o.outfit === 'robe';
  o.lip = F ? '#c4566a' : shade(new THREE.Color(o.skin).lerp(new THREE.Color(0xb05050), .35).getHex(), .82); o.brow = shade(o.hairColor, .9);
  if (o.beard && !o.beard.color) o.beard.color = o.hairColor;

  const skin = new THREE.MeshPhysicalMaterial({ color: o.skin, roughness: .5, sheen: .4, sheenColor: 0xffc0a0, sheenRoughness: .5 });
  const faceM = new THREE.MeshPhysicalMaterial({ map: faceTexture(o), roughness: .48, sheen: .4, sheenColor: 0xffc0a0, sheenRoughness: .5 });
  const ht = hairTexture(o.hairColor);
  const hairM = new THREE.MeshStandardMaterial({ map: ht, bumpMap: ht, bumpScale: 1.5, roughness: .55, metalness: .05, side: THREE.DoubleSide });
  const eyeM = new THREE.MeshPhysicalMaterial({ map: eyeTexture(o.eye), roughness: .05, clearcoat: 1, clearcoatRoughness: .02 });
  const topM = new THREE.MeshStandardMaterial({ map: clothTexture(o.top), roughness: .85 });
  const top2 = new THREE.MeshStandardMaterial({ map: clothTexture(new THREE.Color(o.top).multiplyScalar(.75).getHex()), roughness: .9 });
  const pantsM = new THREE.MeshStandardMaterial({ map: clothTexture(o.pants, 'denim'), roughness: .9 });
  const shoeM = new THREE.MeshStandardMaterial({ color: robe ? 0x6a4528 : o.shoes, roughness: .55 });
  const soleM = new THREE.MeshStandardMaterial({ color: robe ? 0x3b2616 : 0x2b2b2b, roughness: .8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: 1, roughness: .25 });
  const robeM = new THREE.MeshStandardMaterial({ map: clothTexture(o.robe, 'linen'), roughness: .95, side: THREE.DoubleSide });
  const mantleM = new THREE.MeshStandardMaterial({ map: clothTexture(o.mantle, 'linen'), roughness: .95, side: THREE.DoubleSide });
  const sashM = new THREE.MeshStandardMaterial({ color: o.sash, roughness: .8 });
  const clothM = new THREE.MeshStandardMaterial({ map: clothTexture(o.cloth, 'linen'), roughness: .95, side: THREE.DoubleSide });
  const sleeveM = robe ? robeM : topM;

  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const root = new THREE.Group();
  const hips = grp(root, 0, .93, 0);
  const skirtOn = F && !robe;
  const skirtM = new THREE.MeshStandardMaterial({ map: clothTexture(o.skirt ?? 0x2d3a6a, 'pleat'), roughness: .8, side: THREE.DoubleSide });
  const legM = robe ? robeM : skirtOn ? skin : pantsM;
  const pel = mesh(SG(.17, 28, 18), robe ? robeM : skirtOn ? skirtM : pantsM, hips, 0, -.02, 0); pel.scale.set(F ? 1.1 : 1.02, .55, F ? .76 : .72);
  if (!robe && !F) mesh(new THREE.CylinderGeometry(.162, .162, .035, 32), soleM, hips, 0, .06, 0).scale.set(1, 1, .8);
  let skirt = null;
  if (skirtOn) {
    skirt = mesh(latheUp([[.31, -.76], [.308, -.73], [.28, -.55], [.245, -.38], [.21, -.22], [.18, -.09], [.165, .02], [.158, .075], [.15, .08]], 56), skirtM, hips, 0, 0, 0);
    skirt.scale.set(1, 1, .86);
    mesh(new THREE.CylinderGeometry(.16, .16, .035, 32), skirtM, hips, 0, .065, 0).scale.set(1, 1, .82);
  }

  // Piernas
  const legs = [];
  for (const s of [-1, 1]) {
    const thigh = grp(hips, s * (F ? .088 : .09), -.02, 0);
    mesh(limbGeo(F ? .082 : .085, F ? .052 : .058, .42, .012), legM, thigh);
    const knee = grp(thigh, 0, -.42, 0);
    mesh(SG(F ? .05 : .056, 14, 10), legM, knee);
    mesh(limbGeo(F ? .052 : .058, F ? .036 : .042, .42, F ? .014 : .012), robe || skirtOn ? skin : pantsM, knee);
    const ankle = grp(knee, 0, -.43, 0);
    const up = mesh(new THREE.CapsuleGeometry(.05, .15, 6, 14), shoeM, ankle, 0, -.035, .05); up.rotation.x = Math.PI / 2; up.scale.set(F ? 1 : 1.1, 1, .9);
    mesh(new THREE.BoxGeometry(.105, .025, .26), soleM, ankle, 0, -.075, .05);
    if (!robe) mesh(new THREE.BoxGeometry(.1, .012, .04), gold, ankle, 0, -.02, -.068);
    legs.push({ thigh, knee, ankle });
  }

  // Torso
  const spine = grp(hips, 0, .06, 0);
  const torso = mesh(torsoGeo(F), robe ? robeM : topM, spine); torso.scale.set(1, 1, .66);
  if (F && !robe) { for (const s of [-1, 1]) { const b = mesh(SG(.07, 18, 14), topM, spine, s * .045, .32, .05); b.scale.set(1.1, .85, .6); } }
  if (!robe && !F) mesh(new THREE.BoxGeometry(.2, .1, .035), top2, spine, 0, .14, .112).rotation.x = -.15;
  if (!robe) {
    mesh(new THREE.CylinderGeometry(.003, .003, .12, 6), gold, spine, -.025, .4, .12).rotation.x = .2;
    mesh(new THREE.CylinderGeometry(.003, .003, .12, 6), gold, spine, .025, .4, .12).rotation.x = .2;
  }
  // Nombre en la espalda
  if (o.name && !robe) {
    const nm = new THREE.MeshStandardMaterial({ map: nameTexture(o.name.toUpperCase(), '#ffd34d'), transparent: true, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 });
    const back = mesh(new THREE.CylinderGeometry(F ? .17 : .19, F ? .17 : .19, .1, 24, 1, true, Math.PI - .85, 1.7), nm, spine, 0, .33, -.004);
    back.scale.set(1, 1, .7); back.castShadow = false;
  }
  const chest = grp(spine, 0, F ? .45 : .46, 0);
  if (!robe) { const hood = mesh(new THREE.TorusGeometry(.085, .03, 10, 28), top2, chest, 0, .04, -.03); hood.rotation.x = Math.PI / 2 - .35; hood.scale.set(1.15, 1, 1); }
  // Cuello y cabeza
  const neck = grp(chest, 0, .05, 0);
  mesh(new THREE.CylinderGeometry(F ? .039 : .044, F ? .045 : .05, .14, 16), skin, neck, 0, .04, 0);
  const head = grp(neck, 0, .16, .012);
  if (F) head.scale.setScalar(.95);
  const hm = mesh(headGeo(F), faceM, head, 0, .02, 0);

  // Ojos (esfera con iris pintado) y párpados
  const eyes = [];
  for (const s of [-1, 1]) {
    const ER = F ? .0142 : .0134, ez = .0862;
    const e = mesh(SG(ER, 28, 18), eyeM, head, s * .034, .026, ez); eyes.push(e);
    if (!lowQ) {
    const lidU = mesh(SG(ER + .0008, 22, 10, 0, Math.PI * 2, 0, Math.PI * .34), faceM, head, s * .034, .026, ez); lidU.rotation.x = .1;
    const lidD = mesh(SG(ER + .0006, 22, 10, 0, Math.PI * 2, Math.PI * .8, Math.PI * .2), faceM, head, s * .034, .026, ez); lidD.rotation.x = -.08;
    const lashM = new THREE.MeshBasicMaterial({ color: 0x120a08 });
    const lash = mesh(new THREE.TorusGeometry(ER * .9, F ? .0017 : .001, 4, 20, Math.PI), lashM, head, s * .034, .026 + ER * .46, ez); lash.rotation.set(Math.PI / 2 + .12, 0, 0);
    }
  }
  // Nariz
  const nose = mesh(SG(.0095, 16, 12), faceM, head, 0, .003, .0985); nose.scale.set(.7, 1.6, .7);
  mesh(SG(F ? .0062 : .007, 14, 10), faceM, head, 0, -.009, .1012).scale.set(1.15, .9, 1);
  // Orejas
  for (const s of [-1, 1]) { const e = mesh(SG(.02, 14, 10), skin, head, s * .088, .005, -.008); e.scale.set(.4, 1.05, .7); }

  // Pelo
  const hairTop = (r, theta, rotX, lift) => {
    const g = SG(r, 48, 20, 0, Math.PI * 2, 0, Math.PI * theta), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = Math.sin(x * 160) * Math.cos(z * 140) * .0025 + Math.sin((x + z) * 90) * .002;
      const front = Math.max(0, z / r) * Math.max(0, y / r);
      const k = 1 + (n + front * lift) / r;
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    const m = mesh(g, hairM, head, 0, .036, -.006); m.scale.set(.93, 1.12, 1.05); m.rotation.x = rotX; return m;
  };
  if (o.hair === 'short') {
    hairTop(.107, .4, -.24, .03);
    const side = mesh(SG(.1025, 40, 14, Math.PI / 2 + 1.45, Math.PI * 2 - 2.9, Math.PI * .28, Math.PI * .34), hairM, head, 0, .022, -.006); side.scale.set(.92, 1.12, 1.04);
  } else if (o.hair === 'long' || o.hair === 'ponytail') {
    hairTop(.107, .45, -.12, .008);
    const fr = mesh(SG(.108, 24, 10, Math.PI * .3, Math.PI * .55, Math.PI * .1, Math.PI * .3), hairM, head, 0, .03, 0); fr.scale.set(.94, 1.12, 1.07); fr.rotation.z = .1;
    if (o.hair === 'long') {
      mesh(latheUp([[.085, -.31], [.095, -.2], [.102, -.1], [.108, -.02], [.11, .04], [.1, .09], [.07, .125], [.03, .14], [0, .142]], 40, Math.PI - 2.15, 4.3), hairM, head, 0, 0, -.008);
    } else {
      const side = mesh(SG(.104, 40, 14, Math.PI / 2 + .55, Math.PI * 2 - 1.1, Math.PI * .3, Math.PI * .3), hairM, head, 0, .022, -.006); side.scale.set(.93, 1.12, 1.05);
      mesh(new THREE.TorusGeometry(.018, .006, 8, 16), gold, head, 0, .06, -.115).rotation.x = .9;
      const tail = mesh(latheUp([[0, -.3], [.022, -.27], [.035, -.18], [.038, -.08], [.028, 0], [.018, .02]], 16), hairM, head, 0, .06, -.13); tail.rotation.x = .35;
    }
  } else if (o.hair === 'turban') {
    // mitra / turbante de lino fino (Éxodo 28:39-40), con lámina de oro para el sumo sacerdote
    const linen = new THREE.MeshStandardMaterial({ map: clothTexture(0xf4f0e6, 'linen'), roughness: .9 });
    const cap = mesh(SG(.118, 32, 16, 0, Math.PI * 2, 0, Math.PI * .55), linen, head, 0, .045, -.006); cap.scale.set(.96, 1.3, 1.06);
    for (let k = 0; k < 3; k++) { const tr = mesh(new THREE.TorusGeometry(.104 - k * .006, .016, 8, 36), linen, head, 0, .055 + k * .03, -.004); tr.rotation.x = Math.PI / 2 - .08; tr.scale.set(.97, 1.08, 1); }
    if (o.priest) { const lam = mesh(new THREE.BoxGeometry(.075, .028, .006), gold, head, 0, .085, .108); lam.rotation.x = -.25; const cord = mesh(new THREE.TorusGeometry(.106, .004, 4, 32), new THREE.MeshStandardMaterial({ color: 0x1f3a8a }), head, 0, .1, -.004); cord.rotation.x = Math.PI / 2 - .2; }
  } else if (o.hair === 'cloth') {
    const cap = mesh(SG(.116, 36, 16, 0, Math.PI * 2, 0, Math.PI * .5), clothM, head, 0, .03, -.006); cap.scale.set(.95, 1.1, 1.06); cap.rotation.x = -.1;
    const band = mesh(new THREE.TorusGeometry(.105, .012, 8, 40), sashM, head, 0, .052, -.004); band.rotation.x = Math.PI / 2 - .1; band.scale.set(.96, 1.08, 1);
    mesh(latheUp([[.14, -.33], [.13, -.2], [.12, -.06], [.115, .02]], 32, Math.PI - 1.9, 3.8), clothM, head, 0, .03, -.01);
  }
  // Barba y bigote
  if (o.beard) {
    const bt = hairTexture(o.beard.color);
    const bm = new THREE.MeshStandardMaterial({ map: bt, bumpMap: bt, bumpScale: 2, roughness: .7, side: THREE.DoubleSide });
    const L = o.beard.len ?? .06;
    const g = SG(.104, 40, 18, Math.PI / 2 - 1.5, 3.0, Math.PI * .6, Math.PI * .36), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < -.05) { const t = (-.05 - y) / .05; y -= t * L; x *= 1 - t * .35; z = z * (1 - t * .1) + t * L * .25; }
      x += Math.sin(y * 300) * .0015;
      p.setXYZ(i, x * .9, y * 1.18, z * 1.04);
    }
    g.computeVertexNormals();
    mesh(g, bm, head, 0, .02, .002);
    const mu = mesh(new THREE.TorusGeometry(.02, .006, 8, 18, Math.PI), bm, head, 0, -.037, .093); mu.scale.set(1.3, .6, .8);
  }

  // Túnica, manto y cinto (personajes bíblicos)
  if (robe) {
    const rb = mesh(latheUp([[.29, .02], [.3, .05], [.27, .35], [.22, .7], [.2, .95], [.2, 1.15], [.21, 1.3], [.2, 1.4], [.15, 1.46], [.08, 1.5]], 40), robeM, root);
    rb.scale.set(1, 1, .78);
    if (o.mantle !== null) {
      const mt = mesh(latheUp([[.3, .35], [.27, .7], [.235, 1.0], [.23, 1.25], [.225, 1.38], [.17, 1.46], [.1, 1.5]], 40, Math.PI - 1.55, 3.1), mantleM, root);
      mt.scale.set(1.04, 1, .86);
    }
    const sh = mesh(new THREE.TorusGeometry(.2, .022, 10, 40), sashM, root, 0, .98, 0); sh.rotation.x = Math.PI / 2; sh.scale.set(1, .8, 1);
    // nombre en la espalda también con túnica
    if (o.name) {
      const nm = new THREE.MeshStandardMaterial({ map: nameTexture(o.name.toUpperCase(), '#ffd34d'), transparent: true, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 });
      const r0 = o.mantle !== null ? .238 : .212;
      const back = mesh(new THREE.CylinderGeometry(r0, r0, .11, 24, 1, true, Math.PI - .85, 1.7), nm, root, 0, 1.22, 0); back.scale.set(1.04, 1, o.mantle !== null ? .87 : .8); back.castShadow = false;
    }
  }
  // Vestiduras del sumo sacerdote (Éxodo 28): manto azul con granadas y campanillas, efod, pectoral con 12 piedras y mitra con lámina de oro
  if (o.priest) {
    const blue = new THREE.MeshStandardMaterial({ map: clothTexture(0x1f3a8a, 'linen'), roughness: .85, side: THREE.DoubleSide });
    const bm = mesh(latheUp([[.27, .46], [.255, .6], [.225, .9], [.212, 1.15], [.216, 1.3], [.2, 1.4], [.15, 1.46], [.08, 1.5]], 40), blue, root); bm.scale.set(1.02, 1, .8);
    const pomC = [0x1f3a8a, 0x5b2a7a, 0xb3122e];
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, x = Math.sin(a) * .272, z = Math.cos(a) * .272 * .8; if (i % 2) mesh(new THREE.ConeGeometry(.018, .035, 8), gold, root, x, .44, z); else { const pm = mesh(SG(.02, 10, 8), new THREE.MeshStandardMaterial({ color: pomC[(i / 2) % 3], roughness: .6 }), root, x, .445, z); pm.scale.y = 1.2; } }
    const efTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); const cs = ['#d4a72c', '#20408f', '#5b2a7a', '#b3122e', '#efe8d8']; for (let i = 0; i < 16; i++) { g.fillStyle = cs[i % 5]; g.fillRect(i * 8, 0, 8, 64); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const efod = mesh(new THREE.CylinderGeometry(.228, .222, .42, 28, 1, true), new THREE.MeshStandardMaterial({ map: efTex, roughness: .6, metalness: .3, side: THREE.DoubleSide }), root, 0, 1.12, 0); efod.scale.z = .8;
    const band = mesh(new THREE.TorusGeometry(.225, .02, 8, 36), new THREE.MeshStandardMaterial({ map: efTex, metalness: .3, roughness: .5 }), root, 0, .93, 0); band.rotation.x = Math.PI / 2; band.scale.set(1, .8, 1);
    for (const s2 of [-1, 1]) { const ony = mesh(SG(.028, 12, 10), new THREE.MeshPhysicalMaterial({ color: 0x1a1a1a, roughness: .1, clearcoat: 1 }), root, s2 * .13, 1.44, .02); const st = mesh(new THREE.BoxGeometry(.05, .16, .03), new THREE.MeshStandardMaterial({ map: efTex }), root, s2 * .12, 1.36, .14); st.rotation.x = -.3; }
    const plate = mesh(new THREE.BoxGeometry(.17, .2, .02), gold, root, 0, 1.26, .175); plate.rotation.x = -.08;
    const gems = [0xc0392b, 0xf1c40f, 0x27ae60, 0x16a085, 0x2c3e8f, 0xecf0f1, 0xe67e22, 0x8e44ad, 0x9b59b6, 0x3498db, 0x34495e, 0x1abc9c];
    gems.forEach((c, i) => { const col = i % 3, row = Math.floor(i / 3); mesh(new THREE.BoxGeometry(.034, .034, .02), new THREE.MeshPhysicalMaterial({ color: c, roughness: .05, clearcoat: 1, metalness: .1 }), root, (col - 1) * .048, 1.335 - row * .045, .19).rotation.x = -.08; });
  }

  // Brazos
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = grp(chest, s * (F ? .158 : .175), -.035, 0);
    mesh(SG(F ? .05 : .056, 16, 12), sleeveM, shoulder).scale.set(1, .9, 1);
    mesh(limbGeo(F ? .046 : .052, F ? .038 : .043, .28, .006), sleeveM, shoulder);
    const elbow = grp(shoulder, 0, -.28, 0);
    mesh(robe ? limbGeo(.05, .062, .2, 0) : limbGeo(F ? .04 : .046, F ? .034 : .04, .2, .004), sleeveM, elbow);
    if (!robe) mesh(new THREE.CylinderGeometry(.041, .043, .035, 14), top2, elbow, 0, -.2, 0);
    mesh(limbGeo(.031, .027, .05), skin, elbow, 0, -.21, 0);
    const hand = grp(elbow, 0, -.27, 0);
    const palm = mesh(SG(F ? .038 : .042, 16, 12), skin, hand, 0, -.02, 0); palm.scale.set(.55, 1, .9);
    if (!lowQ) {
      for (let k = 0; k < 4; k++) mesh(new THREE.CapsuleGeometry(.0085, .03, 3, 6), skin, hand, 0, -.06, .022 - k * .015);
      const th = mesh(new THREE.CapsuleGeometry(.01, .028, 3, 6), skin, hand, -s * .012, -.03, .036); th.rotation.x = .7;
    }
    arms.push({ shoulder, elbow, hand });
  }

  return { root, hips, spine, chest, neck, head, legs, arms, eyes, skirt, phase: 0, opts: o };
}

/* ---------- Animación (caminar, correr, saltar, reposo) ---------- */
export function animateHuman(h, dt, { speed, onGround, vy, land, t }) {
  const run = THREE.MathUtils.clamp((speed - 5.5) / 3, 0, 1);
  const amp = THREE.MathUtils.clamp(speed / 5.2, 0, 1);
  const stride = lerp(1.45, 2.3, run);
  h.phase += (speed / stride) * Math.PI * 2 * dt * .5;
  const ph = h.phase;
  const P = {};
  if (!onGround) {
    const up = vy > 0 ? 1 : 0;
    P.t0 = -.7; P.t1 = .25; P.k0 = 1.1; P.k1 = .45; P.a0 = .2; P.a1 = .1;
    P.s0x = .55; P.s1x = -.7; P.s0z = -.35; P.s1z = .35; P.e0 = -.9; P.e1 = -.6;
    P.spineX = .1; P.spineY = 0; P.hipY = .93; P.headX = -.05 - up * .05;
  } else if (amp < .05) {
    const b = Math.sin(t * 1.8);
    P.t0 = 0; P.t1 = 0; P.k0 = .04; P.k1 = .04; P.a0 = -.02; P.a1 = -.02;
    P.s0x = .03 + b * .02; P.s1x = .03 + b * .02; P.s0z = -.07; P.s1z = .07; P.e0 = -.15; P.e1 = -.15;
    P.spineX = .02 + b * .01; P.spineY = Math.sin(t * .5) * .05; P.hipY = .93 + b * .004; P.headX = Math.sin(t * .7) * .04;
  } else {
    const A = lerp(.4, .85, run) * amp, KB = lerp(1.0, 1.75, run) * amp;
    const s = Math.sin(ph), c = Math.cos(ph);
    P.t0 = -s * A; P.t1 = s * A;
    P.k0 = .08 + KB * Math.max(0, c) + .15 * amp * Math.max(0, -s);
    P.k1 = .08 + KB * Math.max(0, -c) + .15 * amp * Math.max(0, s);
    P.a0 = -P.k0 * .3 + Math.max(0, -P.t0) * .2; P.a1 = -P.k1 * .3 + Math.max(0, -P.t1) * .2;
    const AA = lerp(.4, .7, run) * amp;
    P.s0x = s * AA; P.s1x = -s * AA; P.s0z = -.1; P.s1z = .1;
    P.e0 = -(.3 + run * 1.15) - Math.max(0, -s) * .3 * amp; P.e1 = -(.3 + run * 1.15) - Math.max(0, s) * .3 * amp;
    P.spineX = .05 * amp + run * .14; P.spineY = s * .14 * amp; P.hipY = .93 - .025 * amp - run * .03 + Math.abs(Math.cos(ph)) * lerp(.035, .07, run) * amp;
    P.headX = -P.spineX * .6;
  }
  if (land > 0) P.hipY -= land * .5;
  const k = Math.min(1, dt * 16);
  const S = (obj, prop, v) => { obj[prop] = lerp(obj[prop], v, k); };
  S(h.legs[0].thigh.rotation, 'x', P.t0); S(h.legs[1].thigh.rotation, 'x', P.t1);
  S(h.legs[0].knee.rotation, 'x', P.k0); S(h.legs[1].knee.rotation, 'x', P.k1);
  S(h.legs[0].ankle.rotation, 'x', P.a0); S(h.legs[1].ankle.rotation, 'x', P.a1);
  S(h.arms[0].shoulder.rotation, 'x', P.s0x); S(h.arms[1].shoulder.rotation, 'x', P.s1x);
  S(h.arms[0].shoulder.rotation, 'z', P.s0z); S(h.arms[1].shoulder.rotation, 'z', P.s1z);
  S(h.arms[0].elbow.rotation, 'x', P.e0); S(h.arms[1].elbow.rotation, 'x', P.e1);
  S(h.spine.rotation, 'x', P.spineX); S(h.spine.rotation, 'y', P.spineY);
  S(h.hips.rotation, 'y', -P.spineY * .6);
  S(h.hips.position, 'y', P.hipY);
  S(h.head.rotation, 'x', P.headX);
  h.head.rotation.y = -h.spine.rotation.y * .8;
  if (h.skirt) { const sw = Math.max(Math.abs(h.legs[0].thigh.rotation.x), Math.abs(h.legs[1].thigh.rotation.x)); h.skirt.scale.z = .86 + sw * .75; h.skirt.scale.x = 1 + sw * .1; }
  const blink = (t % 3.7) < .12;
  for (const e of h.eyes) e.scale.y = blink ? .15 : 1;
}

/* ---------- Unir mallas estáticas (personajes quietos) ---------- */
export function bakeStatic(obj, skip = []) {
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
  const byMat = new Map();
  const skipped = new Set(); skip.forEach(s => s.traverse(o => skipped.add(o)));
  obj.traverse(m => {
    if (!m.isMesh || skipped.has(m) || !m.visible) return;
    let g = m.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const groups = Array.isArray(m.material) ? g.groups.slice() : null;
    if (g.index) g = g.toNonIndexed();
    if (!g.attributes.uv) return;
    const push = (mat, geo) => { if (!byMat.has(mat)) byMat.set(mat, []); byMat.get(mat).push(geo); };
    if (groups && groups.length) {
      for (const gr of groups) {
        const sub = new THREE.BufferGeometry();
        for (const k of ['position', 'normal', 'uv']) { const a = g.attributes[k]; sub.setAttribute(k, new THREE.BufferAttribute(a.array.slice(gr.start * a.itemSize, (gr.start + gr.count) * a.itemSize), a.itemSize)); }
        push(m.material[gr.materialIndex], sub);
      }
    } else push(m.material, g);
  });
  const out = new THREE.Group();
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, mat); mm.castShadow = true; mm.receiveShadow = true; out.add(mm);
  }
  return out;
}
