import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/* =========================================================
   Personaje humano procedural (≈1,75 m), mira hacia +Z, pies en y = 0.
   Opciones: gender 'm'|'f', outfit 'modern'|'robe', hair 'short'|'long'|'ponytail'|'cloth',
   beard {color, len}, colores de piel, ropa, pelo, ojos y nombre en la espalda.
   ========================================================= */

const lerp = THREE.MathUtils.lerp;
// En celulares se usa el material estándar (sin brillo de terciopelo ni barniz): compila más rápido y no congela la carga
export const LITE = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0);
const PHYS_ONLY = ['sheen', 'sheenColor', 'sheenRoughness', 'clearcoat', 'clearcoatRoughness', 'transmission', 'thickness', 'ior', 'iridescence', 'specularIntensity', 'specularColor', 'reflectivity', 'attenuationColor', 'attenuationDistance'];
export function physM(o = {}) {
  if (!LITE) return new THREE.MeshPhysicalMaterial(o);
  const p = { ...o }; for (const k of PHYS_ONLY) delete p[k];
  return new THREE.MeshStandardMaterial(p);
}
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
  const g = latheUp(prof, 32);
  if (f) { // vientre plano en la mujer
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (z > 0) { const k = Math.exp(-(((y - .1) / .1) ** 2)); p.setZ(i, z * (1 - .16 * k)); } }
    g.computeVertexNormals();
  }
  return g;
}
// Cráneo ovalado con mentón: radio .1, escala (.9, 1.14, 1.02)
function headGeo(f) {
  const g = SG(.1, 96, 72), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ny = y / .1;
    if (ny < 0) { const k = 1 - (f ? .27 : .22) * Math.pow(-ny, 1.6); x *= k; z *= (1 - .1 * -ny); y *= f ? 1.02 : 1.05; }
    if (z < 0) z *= 1.05;
    let X = x * .94, Y = y * 1.12, Z = z * 1.02;
    // Esculpido del rostro (proporciones de adulto): frente, cejas, cuencas, pómulos, nariz, labios, mentón y mandíbula
    if (Z > 0) {
      const fr = Math.min(1, Z / .055) ** 2, G = (dx, dy, sx, sy) => Math.exp(-((dx / sx) ** 2 + (dy / sy) ** 2));
      const sm = (a, b, v) => { const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
      let d = 0;
      d += (f ? .003 : .0055) * G(X, Y - .043, f ? .05 : .058, .012);              // arco de las cejas
      d -= .0025 * G(X, Y - .03, .012, .008);                                       // entrecejo
      for (const sx of [-1, 1]) {
        d -= (f ? .0055 : .007) * G(X - sx * .034, Y - .022, .02, .0135);            // cuencas (ojos hundidos, mirada adulta)
        d += (f ? .007 : .006) * G(X - sx * .05, Y + .012, .019, .014);              // pómulos
        d -= .004 * G(X - sx * .064, Y - .03, .014, .03);                            // sienes
        d += .0022 * G(X - sx * .011, Y + .023, .0065, .0055);                      // aletas de la nariz
        d -= .002 * G(X - sx * .028, Y + .054, .005, .006);                          // comisuras de la boca
      }
      // nariz: puente que crece hasta la punta y baja suavemente (sin cortes)
      const nt = sm(.034, -.016, Y), below = Y < -.016 ? Math.exp(-(((Y + .016) / .0065) ** 2)) : 1;
      d += (.002 + (f ? .011 : .0135) * nt ** 1.4) * below * G(X, 0, (f ? .0058 : .0066) + .0055 * nt, 1);
      d += (f ? .0028 : .0032) * G(X, Y + .017, .0095, .0075);                          // punta redondeada
      d -= .0022 * G(X, Y + .036, .006, .006);                                      // surco del labio (filtrum)
      d += (f ? .0048 : .003) * G(X, Y + .045, .024, .0048);                                     // labio superior
      d += (f ? .0062 : .004) * G(X, Y + .056, .021, .006);                                      // labio inferior
      d -= .003 * G(X, Y + .067, .02, .0045);                                       // hendidura bajo el labio
      d += (f ? .0045 : .0068) * G(X, Y + .088, f ? .018 : .026, .012);             // mentón
      Z += d * fr;
    }
    // mandíbula marcada en hombres, rostro más fino en mujeres
    if (ny < -.3 && ny > -.98) { const t = Math.sin((-ny - .3) / .68 * Math.PI); X *= f ? 1 - .025 * t : 1 + .022 * t; }
    // cara un poco más larga (adulta, no infantil)
    if (ny < 0) Y *= 1.06;
    p.setXYZ(i, X, Y, Z);
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
  // personajes secundarios: cara a media resolución (4 veces menos memoria; carga más rápido en celulares)
  const small = Q < 1;
  const key = ['face', o.skin, o.gender, o.lip, o.brow, o.age, small ? 's' : ''].join();
  return canvasTex(key, small ? 512 : 1024, small ? 256 : 512, (g0) => { if (small) g0.scale(.5, .5); faceDraw(g0, 1024, 512, o); });
}
function faceDraw(g, W, H, o) {
  {
    g.fillStyle = hex(o.skin); g.fillRect(0, 0, W, H);
    const [fx, fy] = faceUV(0, 0, W, H);
    let gr = g.createRadialGradient(fx, fy, 10, fx, fy, W * .3);
    gr.addColorStop(0, 'rgba(255,240,225,.14)'); gr.addColorStop(1, 'rgba(60,30,20,.16)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '255,230,210' : '90,50,35'},.02)`; g.fillRect(Math.random() * W, Math.random() * H, 1.5, 1.5); }
    // mejillas
    for (const s of [-1, 1]) {
      const [cx, cy] = faceUV(s * .045, -.042, W, H);
      gr = g.createRadialGradient(cx, cy, 2, cx, cy, 38); gr.addColorStop(0, o.gender === 'f' ? 'rgba(220,110,110,.2)' : 'rgba(200,110,95,.12)'); gr.addColorStop(1, 'rgba(200,90,80,0)');
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
    gr = g.createRadialGradient(nx, ny, 2, nx, ny, 16); gr.addColorStop(0, 'rgba(70,35,25,.1)'); gr.addColorStop(1, 'rgba(70,35,25,0)');
    g.fillStyle = gr; g.fillRect(nx - 24, ny - 24, 48, 48);
    // fosas nasales suaves
    for (const s of [-1, 1]) { const [qx, qy] = faceUV(s * .0065, -.0285, W, H); g.fillStyle = 'rgba(60,25,20,.16)'; g.beginPath(); g.ellipse(qx, qy, 4, 2, s * .4, 0, 7); g.fill(); }
    // luz en el puente de la nariz y la frente; sombra suave en la mandíbula
    { const [bx2, by2] = faceUV(0, .0, W, H); const hl = g.createLinearGradient(bx2 - 8, 0, bx2 + 8, 0); hl.addColorStop(0, 'rgba(255,240,225,0)'); hl.addColorStop(.5, 'rgba(255,240,225,.16)'); hl.addColorStop(1, 'rgba(255,240,225,0)'); g.fillStyle = hl; g.fillRect(bx2 - 8, by2 - 40, 16, 60); }
    // labios
    const [mx, my] = faceUV(0, -.055, W, H), mw = o.gender === 'f' ? 33 : 29, lo = o.gender === 'f' ? 14 : 7, up = o.gender === 'f' ? 5 : 3;
    const lg = g.createLinearGradient(0, my - 10, 0, my + lo);
    lg.addColorStop(0, o.lip); lg.addColorStop(1, shade(o.lip.length ? o.lip : '#b4505a', 1.15));
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(mx - mw, my - up);
    const bow = o.gender === 'f' ? 1 : .45;
    g.bezierCurveTo(mx - mw * .6, my - 9 * bow, mx - mw * .25, my - 12 * bow, mx, my - 7 * bow);
    g.bezierCurveTo(mx + mw * .25, my - 12 * bow, mx + mw * .6, my - 9 * bow, mx + mw, my - up);
    g.bezierCurveTo(mx + mw * .5, my + lo, mx - mw * .5, my + lo, mx - mw, my - up);
    g.fill();
    g.strokeStyle = 'rgba(70,20,25,.65)'; g.lineWidth = 2.2;
    g.beginPath(); g.moveTo(mx - mw - 2, my - up - 1); g.quadraticCurveTo(mx, my + 5, mx + mw + 2, my - up - 1); g.stroke();
    if (o.gender === 'f') { g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(mx + 4, my + 5, mw * .3, 2.5, 0, 0, 7); g.fill(); }
    // hoyuelos de la sonrisa
    g.strokeStyle = 'rgba(120,60,45,.25)'; g.lineWidth = 2;
    for (const s of [-1, 1]) { g.beginPath(); g.arc(mx + s * (mw + 6), my - up - 2, 5, s > 0 ? -.6 : Math.PI - .9, s > 0 ? .9 : Math.PI + .6); g.stroke(); }
    // sombreado natural (oclusión): cuencas, costados de la nariz, bajo el labio y la mandíbula
    for (const sx of [-1, 1]) { const [ax, ay] = faceUV(sx * .034, .02, W, H); const oc = g.createRadialGradient(ax, ay, 4, ax, ay, 34); oc.addColorStop(0, 'rgba(60,30,25,.16)'); oc.addColorStop(1, 'rgba(60,30,25,0)'); g.fillStyle = oc; g.fillRect(ax - 36, ay - 36, 72, 72);
      const [cx2, cy2] = faceUV(sx * .016, -.008, W, H); const sn = g.createRadialGradient(cx2, cy2, 2, cx2, cy2, 16); sn.addColorStop(0, 'rgba(70,35,28,.12)'); sn.addColorStop(1, 'rgba(70,35,28,0)'); g.fillStyle = sn; g.fillRect(cx2 - 18, cy2 - 18, 36, 36); }
    { const [jx, jy] = faceUV(0, -.1, W, H); const jw = g.createLinearGradient(0, jy - 30, 0, jy + 30); jw.addColorStop(0, 'rgba(50,25,20,0)'); jw.addColorStop(1, 'rgba(50,25,20,.22)'); g.fillStyle = jw; g.fillRect(0, jy - 30, W, 60); }
    // barba de pocos días en hombres adultos
    if (o.gender !== 'f' && !o.beard) {
      const [bx3, by3] = faceUV(0, -.075, W, H);
      for (let i = 0; i < 2600; i++) { const a = Math.random() * Math.PI, rr = 40 + Math.random() * 90; const x = bx3 + Math.cos(a) * rr * 1.6 * (Math.random() < .5 ? -1 : 1) * .6, y = by3 + Math.sin(a) * rr * .45 - 10; g.fillStyle = 'rgba(40,25,18,.045)'; g.fillRect(x, y, 1.4, 1.4); }
      const [ux, uy] = faceUV(0, -.04, W, H); for (let i = 0; i < 500; i++) { g.fillStyle = 'rgba(40,25,18,.045)'; g.fillRect(ux + (Math.random() - .5) * 64, uy + Math.random() * 8, 1.3, 1.3); }
    }
    if (o.age > 0) {
      g.strokeStyle = 'rgba(60,30,20,.25)'; g.lineWidth = 2;
      for (let k = 0; k < 3; k++) { const [x1, y1] = faceUV(-.03, .055 + k * .007, W, H), [x2] = faceUV(.03, .055, W, H); g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, y1 - 4, x2, y1); g.stroke(); }
    }
  }
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
    if (kind === 'fur') { for (let i = 0; i < 2600; i++) { const x = Math.random() * W, y = Math.random() * H, l = 4 + Math.random() * 9, a = Math.PI / 2 + (Math.random() - .5) * .8; g.strokeStyle = Math.random() < .5 ? 'rgba(255,235,200,.13)' : 'rgba(30,15,5,.2)'; g.lineWidth = 1 + Math.random(); g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } for (let i = 0; i < 6; i++) { const x = Math.random() * W, y = Math.random() * H, r = 18 + Math.random() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(40,20,5,.25)'); gr.addColorStop(1, 'rgba(40,20,5,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); } }
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
  o.lip = F ? shade(new THREE.Color(o.skin).lerp(new THREE.Color(0xb04a5a), .55).getHex(), .9) : shade(new THREE.Color(o.skin).lerp(new THREE.Color(0x8a4a40), .2).getHex(), .86); o.brow = shade(o.hairColor, .9);
  if (o.beard && !o.beard.color) o.beard.color = o.hairColor;

  const skin = physM({ color: o.skin, roughness: .5, sheen: .4, sheenColor: 0xffc0a0, sheenRoughness: .5 });
  const faceM = physM({ map: faceTexture(o), roughness: .48, sheen: .4, sheenColor: 0xffc0a0, sheenRoughness: .5 });
  const ht = hairTexture(o.hairColor);
  const hairM = new THREE.MeshStandardMaterial({ map: ht, bumpMap: ht, bumpScale: 1.5, roughness: .55, metalness: .05, side: THREE.DoubleSide });
  const eyeM = physM({ map: eyeTexture(o.eye), roughness: .05, clearcoat: 1, clearcoatRoughness: .02 });
  const topM = new THREE.MeshStandardMaterial({ map: clothTexture(o.top), roughness: .85 });
  const top2 = new THREE.MeshStandardMaterial({ map: clothTexture(new THREE.Color(o.top).multiplyScalar(.75).getHex()), roughness: .9 });
  const pantsM = new THREE.MeshStandardMaterial({ map: clothTexture(o.pants, 'denim'), roughness: .9 });
  const shoeM = new THREE.MeshStandardMaterial({ color: robe ? 0x6a4528 : o.shoes, roughness: .55 });
  const soleM = new THREE.MeshStandardMaterial({ color: robe ? 0x3b2616 : 0x2b2b2b, roughness: .8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: 1, roughness: .25 });
  const SK = robe && o.skins; // Adán y Eva: túnicas cortas de pieles (Génesis 3:21)
  const robeM = new THREE.MeshStandardMaterial({ map: clothTexture(o.robe, SK ? 'fur' : 'linen'), roughness: .95, side: THREE.DoubleSide });
  const mantleM = new THREE.MeshStandardMaterial({ map: clothTexture(o.mantle, 'linen'), roughness: .95, side: THREE.DoubleSide });
  const sashM = new THREE.MeshStandardMaterial({ color: o.sash, roughness: .8 });
  const clothM = new THREE.MeshStandardMaterial({ map: clothTexture(o.cloth, 'linen'), roughness: .95, side: THREE.DoubleSide });
  const sleeveM = SK ? skin : robe ? robeM : topM;
  // estilo de la parte de arriba (ropa moderna): abrigo, camiseta, camisa corta, manga larga, chaqueta
  const TS = robe ? 'robe' : (o.topStyle || 'abrigo');
  const shortS = TS === 'camiseta' || TS === 'camisa';
  const whiteM = new THREE.MeshStandardMaterial({ map: clothTexture(0xf4f2ec), roughness: .85 });
  const btnM = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: .4 });

  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

  const root = new THREE.Group();
  const hips = grp(root, 0, .93, 0);
  const skirtOn = F && !robe && o.legwear !== 'pantalon';
  if (F && !robe && o.legwear === 'vestido') o.skirt = o.top; // vestido: falda del mismo color que la blusa
  const skirtM = new THREE.MeshStandardMaterial({ map: clothTexture(o.skirt ?? 0x2d3a6a, 'pleat'), roughness: .8, side: THREE.DoubleSide });
  const legM = SK ? skin : robe ? robeM : skirtOn ? skin : pantsM;
  const pel = mesh(SG(.17, 28, 18), robe ? robeM : skirtOn ? skirtM : pantsM, hips, 0, -.02, 0); pel.scale.set(F ? 1.12 : 1.02, .58, F ? .8 : .72);
  if (!robe && !F) mesh(new THREE.CylinderGeometry(.166, .166, .035, 32), soleM, hips, 0, .07, 0).scale.set(1, 1, .74);
  if (!robe && !skirtOn) {
    // Pantalón: cadera lisa y natural (sin bulto adelante) que une la cintura con los muslos
    if (F) { pel.scale.set(1.0, .5, .6); pel.position.z = -.02; } else { pel.scale.set(.94, .42, .56); pel.position.set(0, .0, -.008); }
    // mujer: cintura fina y caderas más anchas; hombre: cadera recta y normal
    const sg = latheUp(F ? [[.15, -.36], [.165, -.3], [.186, -.2], [.198, -.11], [.192, -.04], [.165, .03], [.138, .08], [.13, .09]]
                         : [[.15, -.12], [.164, -.09], [.17, -.05], [.171, -.02], [.167, .03], [.16, .08], [.156, .09]], 48);
    const sp = sg.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const x = sp.getX(i), y = sp.getY(i), z = sp.getZ(i), r0 = Math.hypot(x, z) || 1;
      if (z < 0) { const back = -z / r0, bump = Math.exp(-(((y + .13) / .12) ** 2)); sp.setZ(i, z * (1 + (F ? .3 : 0) * bump * back ** 1.5)); }
      else sp.setZ(i, z * (F ? .9 : .86));
    }
    sg.computeVertexNormals();
    const seat = mesh(sg, pantsM, hips, 0, 0, -.004); seat.scale.set(1, 1, F ? .66 : .6);
  }
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
    const wide = F && !robe && !skirtOn; // pantalón ancho y holgado para la jugadora
    mesh(wide ? limbGeo(.1, .092, .42, .006) : limbGeo(F ? .082 : robe ? .085 : .1, F ? .052 : .06, .42, .012), legM, thigh);
    const knee = grp(thigh, 0, -.42, 0);
    mesh(SG(wide ? .09 : F ? .05 : .056, 14, 10), legM, knee);
    mesh(wide ? limbGeo(.09, .105, .41, 0) : limbGeo(F ? .052 : .058, F ? .036 : .042, .42, F ? .014 : .012), robe || skirtOn ? skin : pantsM, knee);
    const ankle = grp(knee, 0, -.43, 0);
    const up = mesh(new THREE.CapsuleGeometry(.05, .15, 6, 14), shoeM, ankle, 0, -.035, .05); up.rotation.x = Math.PI / 2; up.scale.set(F ? 1 : 1.1, 1, .9);
    mesh(new THREE.BoxGeometry(.105, .025, .26), soleM, ankle, 0, -.075, .05);
    if (!robe) mesh(new THREE.BoxGeometry(.1, .012, .04), gold, ankle, 0, -.02, -.068);
    legs.push({ thigh, knee, ankle });
  }

  // Torso
  const spine = grp(hips, 0, .06, 0);
  const torso = mesh(torsoGeo(F), SK ? skin : robe ? robeM : topM, spine); torso.scale.set(1, 1, .66);
  if (F && !robe) { for (const s of [-1, 1]) { const b = mesh(SG(.078, 20, 16), topM, spine, s * .046, .325, .056); b.scale.set(1.08, .9, .7); } }
  if (TS === 'abrigo' && !F) mesh(new THREE.BoxGeometry(.2, .1, .035), top2, spine, 0, .14, .112).rotation.x = -.15;
  if (TS === 'abrigo') {
    mesh(new THREE.CylinderGeometry(.003, .003, .12, 6), gold, spine, -.025, .4, .12).rotation.x = .2;
    mesh(new THREE.CylinderGeometry(.003, .003, .12, 6), gold, spine, .025, .4, .12).rotation.x = .2;
  }
  // Nombre en la espalda
  if (o.name && !robe && !F) { // la jugadora (Marga) va sin nombre en la espalda
    const nm = new THREE.MeshStandardMaterial({ map: nameTexture(o.name.toUpperCase(), '#ffd34d'), transparent: true, roughness: .7, polygonOffset: true, polygonOffsetFactor: -2 });
    const back = mesh(new THREE.CylinderGeometry(F ? .17 : .19, F ? .17 : .19, .1, 24, 1, true, Math.PI - .85, 1.7), nm, spine, 0, .33, -.004);
    back.scale.set(1, 1, .7); back.castShadow = false;
  }
  const chest = grp(spine, 0, F ? .45 : .46, 0);
  if (TS === 'abrigo') { const hood = mesh(new THREE.TorusGeometry(.085, .03, 10, 28), top2, chest, 0, .04, -.03); hood.rotation.x = Math.PI / 2 - .35; hood.scale.set(1.15, 1, 1); }
  if (TS === 'camiseta') { const crew = mesh(new THREE.TorusGeometry(.052, .011, 8, 28), top2, chest, 0, .055, .004); crew.rotation.x = Math.PI / 2 - .12; crew.scale.set(1, 1.15, 1); }
  if (TS === 'camisa' || TS === 'mangalarga' || TS === 'chaqueta' || TS === 'traje') {
    // cuello de camisa y botones
    const colM = TS === 'chaqueta' || TS === 'traje' ? whiteM : top2;
    for (const sx of [-1, 1]) { const c = mesh(new THREE.BoxGeometry(.06, .045, .01), colM, chest, sx * .032, .045, .066); c.rotation.set(-.35, sx * .45, sx * .55); }
    const back = mesh(new THREE.CylinderGeometry(.058, .062, .04, 18, 1, true, Math.PI * .6, Math.PI * .8), colM, chest, 0, .06, -.004); back.scale.set(1, 1, .9);
    if (TS !== 'chaqueta' && TS !== 'traje') for (let k = 0; k < 5; k++) mesh(new THREE.SphereGeometry(.007, 8, 6), btnM, spine, 0, .42 - k * .075, F ? .118 : .121 - k * .002);
  }
  if (TS === 'traje') {
    // traje moderno: saco fino entallado, camisa blanca, solapas, corbata (hombre) y pañuelo de bolsillo
    const zf = F ? .113 : .119;
    const shirt = mesh(new THREE.BoxGeometry(F ? .07 : .085, .2, .01), whiteM, spine, 0, .35, zf); shirt.rotation.x = -.05;
    for (const sx of [-1, 1]) {
      const lp = mesh(new THREE.BoxGeometry(.045, .23, .014), top2, spine, sx * .052, .33, zf + .003); lp.rotation.z = sx * -.32;
      const notch = mesh(new THREE.BoxGeometry(.04, .03, .014), top2, spine, sx * .07, .44, zf - .004); notch.rotation.z = sx * .6;
    }
    if (!F) {
      const tieM = new THREE.MeshStandardMaterial({ color: o.tie ?? 0x8a1c24, roughness: .45, metalness: .1 });
      mesh(new THREE.BoxGeometry(.024, .022, .016), tieM, spine, 0, .445, zf + .006);
      const tie = mesh(new THREE.CylinderGeometry(.018, .01, .2, 4), tieM, spine, 0, .33, zf + .006); tie.rotation.y = Math.PI / 4; tie.scale.set(1, 1, .35);
    }
    mesh(new THREE.BoxGeometry(.04, .012, .006), whiteM, spine, F ? .075 : .09, .36, zf - .006).rotation.z = .15;
    for (let k = 0; k < 2; k++) mesh(new THREE.SphereGeometry(.0075, 8, 6), new THREE.MeshStandardMaterial({ color: 0x1a1a1e, roughness: .3 }), spine, 0, .2 - k * .07, zf + .004);
  }
  if (TS === 'chaqueta') {
    // chaqueta abierta: camisa blanca al centro y solapas
    const shirt = mesh(new THREE.BoxGeometry(.075, .36, .01), whiteM, spine, 0, .27, F ? .112 : .118); shirt.rotation.x = -.04;
    for (const sx of [-1, 1]) { const lp = mesh(new THREE.BoxGeometry(.035, .2, .012), top2, spine, sx * .05, .36, F ? .113 : .12); lp.rotation.z = sx * -.25; }
    for (let k = 0; k < 3; k++) mesh(new THREE.SphereGeometry(.007, 8, 6), btnM, spine, 0, .38 - k * .09, F ? .119 : .125);
  }
  // Cuello y cabeza
  const neck = grp(chest, 0, .05, 0);
  mesh(new THREE.CylinderGeometry(F ? .039 : .044, F ? .045 : .05, .14, 16), skin, neck, 0, .04, 0);
  const head = grp(neck, 0, .16, .012);
  if (F) head.scale.setScalar(.95);
  const hm = mesh(headGeo(F), faceM, head, 0, .02, 0);

  // Ojos (esfera con iris pintado) y párpados
  const eyes = [];
  for (const s of [-1, 1]) {
    const ER = F ? .0145 : .0137, ez = .0848;
    const e = mesh(SG(ER, 28, 18), eyeM, head, s * .034, .026, ez); eyes.push(e);
    if (!lowQ) {
    const lidU = mesh(SG(ER + .0008, 22, 10, 0, Math.PI * 2, 0, Math.PI * .33), faceM, head, s * .034, .026, ez); lidU.rotation.x = 0;
    const lidD = mesh(SG(ER + .0006, 22, 10, 0, Math.PI * 2, Math.PI * .8, Math.PI * .2), faceM, head, s * .034, .026, ez); lidD.rotation.x = -.08;
    const lashM = new THREE.MeshBasicMaterial({ color: 0x120a08 });
    const lash = mesh(new THREE.TorusGeometry(ER * .9, F ? .0017 : .001, 4, 20, Math.PI), lashM, head, s * .034, .026 + ER * .46, ez); lash.rotation.set(Math.PI / 2 + .12, 0, 0);
    }
  }
  // Nariz
  // punta y aletas de la nariz (el puente ya está esculpido en la cabeza)
  const nose = null;
  // Orejas
  // orejas con forma real: pabellón, borde (hélix), lóbulo y concha interior
  const earIn = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.skin).multiplyScalar(.72), roughness: .6 });
  for (const s of [-1, 1]) {
    const ear = grp(head, s * .089, .002, -.006); ear.rotation.set(0, s * .32, s * .08); ear.scale.setScalar(1.12);
    const pin = mesh(SG(.026, 18, 14), skin, ear); pin.scale.set(.32, 1.18, .74);
    const rim = mesh(new THREE.TorusGeometry(.021, .0045, 8, 22, Math.PI * 1.45), skin, ear, s * .006, .004, 0); rim.rotation.set(0, s * Math.PI / 2, Math.PI * .55); rim.scale.set(1, 1.3, 1);
    const lobe = mesh(SG(.0085, 12, 10), skin, ear, s * .002, -.026, .004); lobe.scale.set(.6, 1, .9);
    const con = mesh(SG(.012, 12, 10), earIn, ear, s * .0055, -.002, .003); con.scale.set(.25, 1.2, .9);
  }

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
  if (robe && SK) {
    // túnica corta de piel con borde irregular: Adán de la cintura al muslo con tira al hombro; Eva del pecho a la rodilla
    const prof = F ? [[.215, .5], [.22, .56], [.215, .75], [.19, .95], [.175, 1.1], [.19, 1.22], [.18, 1.32], [.165, 1.36]]
                   : [[.225, .56], [.23, .62], [.215, .8], [.2, .95], [.198, 1.02]];
    const g = latheUp(prof, 44), p = g.attributes.position;
    const yb = prof[0][1];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < yb + .03) { const a = Math.atan2(z, x); p.setY(i, y + Math.abs(Math.sin(a * 7)) * .05 + Math.sin(a * 13) * .015); } }
    g.computeVertexNormals();
    const rb = mesh(g, robeM, root); rb.scale.set(1, 1, F ? .74 : .76);
    // tira de piel: Adán en diagonal desde el hombro; Eva con dos tirantes sobre los hombros
    if (!F) { const strap = mesh(new THREE.TorusGeometry(.215, .035, 8, 40), robeM, root, 0, 1.2, 0); strap.rotation.set(Math.PI / 2, .62, 0); strap.scale.set(1, .7, 1); }
    else for (const sx of [-1, 1]) { const st = mesh(new THREE.TorusGeometry(.085, .018, 6, 20, Math.PI), robeM, root, sx * .085, 1.33, 0); st.rotation.y = Math.PI / 2; st.scale.set(1.05, .9, 1); }
    // cordón atado a la cintura
    const cord = mesh(new THREE.TorusGeometry(.2, .012, 6, 34), sashM, root, 0, .98, 0); cord.rotation.x = Math.PI / 2; cord.scale.set(1, .78, 1);
  }
  if (robe && !SK) {
    const rb = mesh(latheUp([[.29, .02], [.3, .05], [.27, .35], [.22, .7], [.2, .95], [.2, 1.15], [.21, 1.3], [.2, 1.4], [.15, 1.46], [.08, 1.5]], 40), robeM, root);
    rb.scale.set(1, 1, .78);
    if (o.mantle !== null) {
      const mt = mesh(latheUp([[.3, .35], [.27, .7], [.235, 1.0], [.23, 1.25], [.225, 1.38], [.17, 1.46], [.1, 1.5]], 40, Math.PI - 1.55, 3.1), mantleM, root);
      mt.scale.set(1.04, 1, .86);
    }
    const sh = mesh(new THREE.TorusGeometry(.2, .022, 10, 40), sashM, root, 0, .98, 0); sh.rotation.x = Math.PI / 2; sh.scale.set(1, .8, 1);
    // nombre en la espalda también con túnica
    if (o.name && !F) {
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
    for (const s2 of [-1, 1]) { const ony = mesh(SG(.028, 12, 10), physM({ color: 0x1a1a1a, roughness: .1, clearcoat: 1 }), root, s2 * .13, 1.44, .02); const st = mesh(new THREE.BoxGeometry(.05, .16, .03), new THREE.MeshStandardMaterial({ map: efTex }), root, s2 * .12, 1.36, .14); st.rotation.x = -.3; }
    const plate = mesh(new THREE.BoxGeometry(.17, .2, .02), gold, root, 0, 1.26, .175); plate.rotation.x = -.08;
    const gems = [0xc0392b, 0xf1c40f, 0x27ae60, 0x16a085, 0x2c3e8f, 0xecf0f1, 0xe67e22, 0x8e44ad, 0x9b59b6, 0x3498db, 0x34495e, 0x1abc9c];
    gems.forEach((c, i) => { const col = i % 3, row = Math.floor(i / 3); mesh(new THREE.BoxGeometry(.034, .034, .02), physM({ color: c, roughness: .05, clearcoat: 1, metalness: .1 }), root, (col - 1) * .048, 1.335 - row * .045, .19).rotation.x = -.08; });
  }

  // Brazos
  const arms = [];
  for (const s of [-1, 1]) {
    const shoulder = grp(chest, s * (F ? .158 : .175), -.035, 0);
    mesh(SG(F ? .05 : .056, 16, 12), sleeveM, shoulder).scale.set(1, .9, 1);
    mesh(limbGeo(F ? .046 : .052, F ? .038 : .043, .28, .006), shortS ? skin : sleeveM, shoulder);
    if (shortS) { mesh(limbGeo(F ? .056 : .062, F ? .052 : .058, .13, 0), sleeveM, shoulder, 0, .01, 0); mesh(new THREE.CylinderGeometry(F ? .052 : .058, F ? .053 : .059, .02, 16), top2, shoulder, 0, -.115, 0); }
    const elbow = grp(shoulder, 0, -.28, 0);
    mesh(robe && !SK ? limbGeo(.05, .062, .2, 0) : limbGeo(F ? .04 : .046, F ? .034 : .04, .2, .004), shortS ? skin : sleeveM, elbow);
    if (!robe && !shortS) mesh(new THREE.CylinderGeometry(.041, .043, .035, 14), TS === 'chaqueta' || TS === 'traje' ? whiteM : top2, elbow, 0, -.2, 0);
    mesh(limbGeo(.031, .027, .05), skin, elbow, 0, -.21, 0);
    const hand = grp(elbow, 0, -.27, 0);
    const palm = mesh(SG(F ? .038 : .042, 16, 12), skin, hand, 0, -.02, 0); palm.scale.set(.55, 1, .9);
    if (!lowQ) {
      for (let k = 0; k < 4; k++) mesh(new THREE.CapsuleGeometry(.0085, .03, 3, 6), skin, hand, 0, -.06, .022 - k * .015);
      const th = mesh(new THREE.CapsuleGeometry(.01, .028, 3, 6), skin, hand, -s * .012, -.03, .036); th.rotation.x = .7;
    }
    arms.push({ shoulder, elbow, hand });
  }

  // vara de pastor en la mano derecha (Moisés: Éxodo 4:2-4, 17)
  if (o.staff) {
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: .8 });
    const st = mesh(new THREE.CylinderGeometry(.018, .024, 1.9, 8), wood, arms[1].hand, 0, -.12, .04); st.rotation.x = .08;
    mesh(new THREE.TorusGeometry(.055, .017, 6, 12, Math.PI), wood, arms[1].hand, 0, .86, .04);
  }
  // Unir las piezas que se mueven juntas (mismo hueso y mismo material): ~55 piezas → ~20 (mucho más rápido de dibujar)
  compactParts(root, new Set([...eyes, skirt].filter(Boolean)));
  const H = { root, hips, spine, chest, neck, head, legs, arms, eyes, skirt, phase: 0, swimPh: 0, opts: o, staff: !!o.staff };
  root.userData.isHuman = true; root.userData.hum = H;
  return H;
}

const _ATTRS = ['position', 'normal', 'uv'];
function plainGeo(src, matrix) {
  let g = new THREE.BufferGeometry();
  for (const k of _ATTRS) g.setAttribute(k, src.attributes[k]);
  if (src.index) { g.setIndex(src.index); g = g.toNonIndexed(); }
  else for (const k of _ATTRS) g.setAttribute(k, g.attributes[k].clone());
  g.applyMatrix4(matrix); return g;
}
export function compactParts(root, keep = new Set()) {
  const nodes = []; root.traverse(n => { if (!n.isMesh) nodes.push(n); });
  for (const n of nodes) {
    const byMat = new Map();
    for (const c of n.children) {
      if (!c.isMesh || c.isInstancedMesh || keep.has(c) || c.children.length || !c.visible || Array.isArray(c.material)) continue;
      const a = c.geometry.attributes; if (!a.position || !a.normal || !a.uv || c.geometry.morphAttributes.position) continue;
      if (!byMat.has(c.material)) byMat.set(c.material, []); byMat.get(c.material).push(c);
    }
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const geos = list.map(c => { c.updateMatrix(); return plainGeo(c.geometry, c.matrix); });
      const merged = mergeGeometries(geos, false); if (!merged) continue;
      const m = new THREE.Mesh(merged, mat); m.castShadow = list.some(c => c.castShadow); m.receiveShadow = list.some(c => c.receiveShadow); m.renderOrder = list[0].renderOrder;
      for (const c of list) n.remove(c);
      n.add(m);
    }
  }
}

/* ---------- Animación (caminar, correr, saltar, reposo) ---------- */
export function animateHuman(h, dt, { speed, onGround, vy, land, t, gesture = 0, climb = -1, swim = 0, kneel = -1, praise = -1 }) {
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
  // trepar: brazos arriba agarrando el borde, luego empuja y sube la pierna
  if (climb >= 0) {
    const k2 = Math.min(1, Math.max(0, (climb - .28) / .67));
    P.s0x = P.s1x = -2.9 + k2 * 2.3; P.s0z = -.18; P.s1z = .18; P.e0 = P.e1 = -.2 - k2 * 1.2;
    P.t0 = -.2 - k2 * 1.3; P.k0 = .4 + k2 * 1.4; P.t1 = .15; P.k1 = .3 + k2 * .4; P.a0 = P.a1 = 0;
    P.spineX = .15 + k2 * .35; P.spineY = 0; P.headX = -.25 + k2 * .3; P.hipY = .93;
  }
  // nadar: crol con brazadas alternas y patada de las piernas; quieto, flota moviendo brazos y piernas
  let pitch = 0;
  if (swim) {
    const moving = speed > .5;
    h.swimPh = (h.swimPh || 0) + dt * (moving ? 2.4 + speed * .75 : 2.2);
    const sp = h.swimPh, s1 = Math.sin(sp), kick = Math.sin(sp * 2.6);
    if (moving) {
      pitch = 1.3;
      P.s0x = -1.65 + 1.5 * s1; P.s1x = -1.65 - 1.5 * s1; P.s0z = -.22; P.s1z = .22;
      P.e0 = -.2 - .5 * Math.max(0, Math.cos(sp)); P.e1 = -.2 - .5 * Math.max(0, -Math.cos(sp));
      P.t0 = .3 * kick; P.t1 = -.3 * kick; P.k0 = .2 + .25 * Math.max(0, kick); P.k1 = .2 + .25 * Math.max(0, -kick); P.a0 = P.a1 = .5;
      P.spineX = 0; P.spineY = s1 * .22; P.headX = -1.0 + Math.max(0, s1) * .15;
    } else {
      pitch = .3;
      P.s0x = -.5 + .35 * s1; P.s1x = -.5 + .35 * s1; P.s0z = -.85 + .3 * Math.sin(sp * 1.3); P.s1z = .85 - .3 * Math.sin(sp * 1.3); P.e0 = P.e1 = -.6;
      P.t0 = -.45 + .35 * s1; P.t1 = -.45 - .35 * s1; P.k0 = .9 + .3 * s1; P.k1 = .9 - .3 * s1; P.a0 = P.a1 = .2;
      P.spineX = .05; P.spineY = 0; P.headX = -.2;
    }
    P.hipY = .93;
  }
  // reverencia: primero inclina la cabeza con las manos juntas, luego se arrodilla y al final se levanta
  if (kneel >= 0) {
    const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
    const up = 1 - sm(.82, .97, kneel), bow = sm(0, .14, kneel) * up, kn = sm(.12, .3, kneel) * up;
    P.t0 = P.t1 = -.1 * kn; P.k0 = P.k1 = .04 + 1.5 * kn; P.a0 = P.a1 = .55 * kn; P.hipY = .93 - .44 * kn;
    P.spineX = .28 * bow + .12 * kn; P.spineY = 0; P.headX = .5 * bow;
    P.s0x = P.s1x = -.55 * bow - .2 * kn; P.s0z = .32 * bow; P.s1z = -.32 * bow; P.e0 = P.e1 = -1.55 * bow;
  }
  // alabanza al entrar al templo: salta con los brazos arriba, se arrodilla y mueve la cabeza adorando
  let headSide = 0;
  if (praise >= 0) {
    const sm = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); }, T = praise;
    const up = sm(0, .25, T) * (1 - sm(5.7, 6.3, T)), kn = sm(2.4, 2.9, T) * (1 - sm(5.5, 6.1, T));
    P.s0x = lerp(P.s0x, -2.75 + Math.sin(t * 6) * .18, up); P.s1x = lerp(P.s1x, -2.75 - Math.sin(t * 6) * .18, up);
    P.s0z = lerp(P.s0z, -.38, up); P.s1z = lerp(P.s1z, .38, up); P.e0 = lerp(P.e0, -.25, up); P.e1 = lerp(P.e1, -.25, up);
    P.t0 = lerp(P.t0, -.1, kn); P.t1 = lerp(P.t1, -.1, kn); P.k0 = lerp(P.k0, 1.54, kn); P.k1 = lerp(P.k1, 1.54, kn);
    P.a0 = lerp(P.a0, .55, kn); P.a1 = lerp(P.a1, .55, kn); P.hipY = lerp(P.hipY, .49, kn);
    P.spineX = lerp(P.spineX, -.1, kn); P.headX = lerp(P.headX, -.32 + Math.sin(t * 3.4) * .2, kn);
    headSide = Math.sin(t * 2.6) * .45 * kn;
  }
  // gesto de mal olor: se tapa la nariz y mueve la cabeza
  if (gesture > 0) { P.s1x = -2.45; P.s1z = .55; P.e1 = -2.1; P.headX = .15; }
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
  if (swim || h.hips.rotation.x) h.hips.rotation.x = lerp(h.hips.rotation.x, pitch, Math.min(1, dt * 6));
  if (Math.abs(h.hips.rotation.x) < .002) h.hips.rotation.x = 0;
  S(h.hips.position, 'y', P.hipY);
  S(h.head.rotation, 'x', P.headX);
  h.head.rotation.y = -h.spine.rotation.y * .8 + (gesture > 0 ? Math.sin(t * 9) * .35 : 0) + headSide;
  if (h.skirt) { const sw = Math.max(Math.abs(h.legs[0].thigh.rotation.x), Math.abs(h.legs[1].thigh.rotation.x)); h.skirt.scale.z = .86 + sw * .75; h.skirt.scale.x = 1 + sw * .1; }
  const blink = (t % 3.7) < .12;
  for (const e of h.eyes) e.scale.y = blink ? .15 : 1;
}

/* ---------- Unir mallas estáticas (personajes quietos) ---------- */
export function bakeStatic(obj, skip = [], cast = true) {
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert();
  const byMat = new Map();
  const skipped = new Set(); skip.forEach(s => s.traverse(o => skipped.add(o)));
  obj.traverse(m => {
    if (!m.isMesh || skipped.has(m) || !m.visible) return;
    // (más rápido: no se copia la figura completa, solo posición, normales y uv)
    const src = m.geometry;
    if (!src.attributes.uv || !src.attributes.position) return;
    let g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal', 'uv']) if (src.attributes[k]) g.setAttribute(k, src.attributes[k]);
    if (src.index) { g.setIndex(src.index); g = g.toNonIndexed(); }
    else for (const k of Object.keys(g.attributes)) g.setAttribute(k, g.attributes[k].clone());
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const groups = Array.isArray(m.material) ? src.groups.slice() : null;
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
  if (obj.userData.isHuman) out.userData.bakedHum = obj.userData.hum; // para crear su versión lejana
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const mm = new THREE.Mesh(merged, mat); mm.castShadow = cast; mm.receiveShadow = true; out.add(mm);
  }
  return out;
}

// Unir en el mismo lugar las piezas fijas de un objeto (menos las que se mueven, en `skip`)
export function bakeInPlace(obj, skip = [], cast = true) {
  const skipped = new Set(); skip.forEach(s => s && s.traverse(o => skipped.add(o)));
  const baked = bakeStatic(obj, skip.filter(Boolean), cast);
  const rm = []; obj.traverse(m => { if (m.isMesh && !skipped.has(m) && m.visible && m.geometry.attributes.uv && m.geometry.attributes.position) rm.push(m); });
  for (const m of rm) m.parent.remove(m);
  obj.add(baked); return baked;
}

// Versión lejana de una persona: TODO en una sola pieza con colores por vértice (1 sola llamada de dibujo)
const _avg = new WeakMap();
function avgColor(mat) {
  const c = mat.color ? mat.color.clone() : new THREE.Color(1, 1, 1);
  const img = mat.map && mat.map.image;
  if (img && img.width) {
    let a = _avg.get(img);
    if (!a) {
      a = new THREE.Color(1, 1, 1);
      try { const cv = document.createElement('canvas'); cv.width = cv.height = 4; const g = cv.getContext('2d'); g.drawImage(img, 0, 0, 4, 4); const d = g.getImageData(0, 0, 4, 4).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < 64; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; } a.setRGB(r / 16 / 255, gg / 16 / 255, b / 16 / 255, THREE.SRGBColorSpace); } catch (e) {}
      _avg.set(img, a);
    }
    c.multiply(a);
  }
  return c;
}
export const FAR_MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .78 });
export function bakeColored(obj) {
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), geos = [];
  obj.traverse(m => {
    if (!m.isMesh || !m.visible) return;
    const src = m.geometry; if (!src.attributes.position || !src.attributes.normal) return;
    let g = new THREE.BufferGeometry(); g.setAttribute('position', src.attributes.position); g.setAttribute('normal', src.attributes.normal);
    if (src.index) { g.setIndex(src.index); g = g.toNonIndexed(); } else { g.setAttribute('position', g.attributes.position.clone()); g.setAttribute('normal', g.attributes.normal.clone()); }
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    const col = avgColor(Array.isArray(m.material) ? m.material[0] : m.material), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3)); geos.push(g);
  });
  const merged = geos.length ? mergeGeometries(geos, false) : null;
  const out = new THREE.Group();
  if (merged) { const mm = new THREE.Mesh(merged, FAR_MAT); mm.castShadow = false; mm.receiveShadow = true; out.add(mm); }
  return out;
}
