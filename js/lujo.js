import * as THREE from 'three';

/* =========================================================
   AUTOS DE LUJO (diseños propios, sin marcas) y la cochera moderna.
   El frente del auto mira hacia +z.
   ========================================================= */
const phys = o => new THREE.MeshPhysicalMaterial(o);
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .5, ...o });

// Silueta lateral extruida (x = largo, y = alto) y girada para que el largo quede en z
function sideShape(pts, width, bevel = .06) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 4 });
  g.translate(0, 0, -(width - bevel * 2) / 2); g.rotateY(-Math.PI / 2); return g;
}
function wheel(g, x, z, r, w, rimM, tireM, discM) {
  const wg = new THREE.Group(); wg.position.set(x, r, z); g.add(wg);
  const t = new THREE.Mesh(new THREE.TorusGeometry(r * .78, r * .24, 12, 28), tireM); t.rotation.y = Math.PI / 2; t.scale.z = w / (r * .5); t.castShadow = true; wg.add(t);
  const side = Math.sign(x);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(r * .62, r * .62, w * .7, 24), discM); disc.rotation.z = Math.PI / 2; wg.add(disc);
  for (let k = 0; k < 5; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.03, r * 1.1, r * .16), rimM); sp.position.x = side * w * .36; sp.rotation.x = k / 5 * Math.PI; wg.add(sp); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .14, r * .14, w * .8, 12), rimM); hub.rotation.z = Math.PI / 2; wg.add(hub);
  const cal = new THREE.Mesh(new THREE.BoxGeometry(.05, r * .45, r * .5), std(0xd02020, { roughness: .4 })); cal.position.set(side * w * .2, r * .25, -r * .25); wg.add(cal);
  return wg;
}
const common = () => ({
  glass: phys({ color: 0x0b1118, metalness: .2, roughness: .03, clearcoat: 1, transparent: true, opacity: .82 }),
  tire: std(0x141414, { roughness: .9 }), rim: std(0xd8dde2, { metalness: .95, roughness: .15 }), disc: std(0x2a2c30, { metalness: .6, roughness: .4 }),
  black: std(0x0c0c0e, { roughness: .4 }), chrome: std(0xe6e9ec, { metalness: 1, roughness: .1 }),
  head: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf4ff, emissiveIntensity: 3 }),
  tail: new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 2.4 }),
  seat: std(0xc89a6a, { roughness: .7 }),
});

// Deportivo bajo de dos puertas
export function makeSportsCar(color = 0xf4f5f7) {
  const g = new THREE.Group(), C = common();
  const paint = phys({ color, metalness: .7, roughness: .22, clearcoat: 1, clearcoatRoughness: .05 });
  const body = new THREE.Mesh(sideShape([[-2.3, .28], [2.35, .28], [2.4, .42], [2.2, .58], [1.2, .78], [.7, .84], [-1.6, .9], [-2.25, .86], [-2.35, .6]], 2.0), paint);
  body.castShadow = body.receiveShadow = true; g.add(body);
  // cabina adelantada (motor central) con techo en forma de gota
  const cab = new THREE.Mesh(sideShape([[-1.0, .86], [1.05, .8], [.25, 1.14], [-.55, 1.18], [-1.4, .95]], 1.5, .05), C.glass); cab.castShadow = true; g.add(cab);
  const roof = new THREE.Mesh(sideShape([[-.8, 1.13], [.15, 1.12], [.05, 1.19], [-.55, 1.2], [-.95, 1.13]], 1.3, .03), paint); g.add(roof);
  // cubierta del motor con lamas negras detrás de la cabina
  for (let k = 0; k < 5; k++) { const lam = new THREE.Mesh(new THREE.BoxGeometry(1.1, .03, .1), C.black); lam.position.set(0, .93 - k * .012, -1.5 - k * .16); g.add(lam); }
  // grandes tomas de aire laterales (en la puerta) y difusor trasero
  for (const s of [-1, 1]) { const sc = new THREE.Mesh(new THREE.BoxGeometry(.06, .3, .9), C.black); sc.position.set(s * 1.0, .58, -.55); sc.rotation.y = s * .12; g.add(sc); }
  for (let k = 0; k < 5; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(.03, .16, .4), C.black); fin.position.set(-.6 + k * .3, .32, -2.2); g.add(fin); }
  // tomas de aire, alerón, luces y escapes
    const sp = new THREE.Mesh(new THREE.BoxGeometry(1.9, .04, .3), C.black); sp.position.set(0, .98, -2.15); g.add(sp);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.05, .14, .1), C.black); st.position.set(s * .6, .9, -2.12); g.add(st); }
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.42, .05, .1), C.head); h.position.set(s * .66, .55, 2.25); h.rotation.y = s * .35; h.rotation.z = s * .15; g.add(h); }
  const tl = new THREE.Mesh(new THREE.BoxGeometry(1.7, .06, .05), C.tail); tl.position.set(0, .78, -2.3); g.add(tl);
  for (const s of [-.25, .25]) { const ex = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .12, 12), C.chrome); ex.rotation.x = Math.PI / 2; ex.position.set(s, .38, -2.32); g.add(ex); }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.2, .14, .05), C.black); grille.position.set(0, .42, 2.33); g.add(grille);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.18, .08, .1), paint); m.position.set(s * 1.02, 1.0, .35); g.add(m); }
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.45, .45, .45), C.seat); st.position.set(s * .36, .78, -.25); g.add(st); }
  const wheels = [[-.92, 1.38], [.92, 1.38], [-.94, -1.35], [.94, -1.35]].map(([x, z]) => wheel(g, x, z, .36, .3, C.rim, C.tire, C.disc));
  g.userData = { kind: 'deportivo', wheels, len: 4.7, wid: 2.0, seatY: .5, top: 36 };
  return g;
}

// Camioneta (SUV) de lujo, alta y elegante
export function makeLuxSUV(color = 0x14161a) {
  const g = new THREE.Group(), C = common();
  const paint = phys({ color, metalness: .65, roughness: .25, clearcoat: 1, clearcoatRoughness: .06 });
  const body = new THREE.Mesh(sideShape([[-2.45, .42], [2.45, .42], [2.5, .8], [2.35, 1.15], [1.35, 1.25], [-2.35, 1.28], [-2.5, 1.0]], 2.05), paint);
  body.castShadow = body.receiveShadow = true; g.add(body);
  const cab = new THREE.Mesh(sideShape([[-2.3, 1.25], [1.3, 1.24], [.65, 1.85], [-2.15, 1.9]], 1.86, .05), C.glass); cab.castShadow = true; g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.82, .07, 2.7), paint); roof.position.set(0, 1.92, -.75); g.add(roof);
  for (const s of [-1, 1]) { const rr = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, 2.4), C.chrome); rr.position.set(s * .8, 1.98, -.75); g.add(rr); }
  // pilares de las ventanas
  for (const z of [-2.1, -.7, .6]) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.04, .62, .12), paint); p.position.set(s * .94, 1.56, z); g.add(p); }
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, .4, .06), C.black); grille.position.set(0, .88, 2.5); g.add(grille);
  for (let k = 0; k < 6; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.02, .38, .03), C.chrome); bar.position.set(-.45 + k * .18, .88, 2.53); g.add(bar); }
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.42, .08, .08), C.head); h.position.set(s * .78, 1.04, 2.45); g.add(h); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(.08, .3, .45), C.tail); t.position.set(s * .97, 1.05, -2.3); g.add(t); }
  const step = new THREE.Mesh(new THREE.BoxGeometry(2.14, .06, 2.4), C.chrome); step.position.set(0, .42, 0); g.add(step);
  const bump = new THREE.Mesh(new THREE.BoxGeometry(1.9, .14, .1), C.chrome); bump.position.set(0, .55, 2.52); g.add(bump);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.2, .12, .12), paint); m.position.set(s * 1.1, 1.38, .9); g.add(m); }
  const wheels = [[-.93, 1.55], [.93, 1.55], [-.93, -1.55], [.93, -1.55]].map(([x, z]) => wheel(g, x, z, .42, .32, C.rim, C.tire, C.disc));
  g.userData = { kind: 'camioneta', wheels, len: 5.0, wid: 2.1, seatY: .95, top: 28 };
  return g;
}

// Cochera moderna: losa de concreto, pérgola con listones de madera y columnas negras
export function buildCarport(group, x0, x1, z0, z1, fy) {
  const g = new THREE.Group(); group.add(g);
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const conc = std(0xb9bcbf, { roughness: .8 }), steel = std(0x1c1e22, { metalness: .5, roughness: .4 }), wood = std(0x9a6a3e, { roughness: .6 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(w, .06, d), conc); slab.position.set(cx, fy + .03, cz); slab.receiveShadow = true; g.add(slab);
  for (let k = 1; k < 4; k++) { const j = new THREE.Mesh(new THREE.BoxGeometry(w, .065, .03), std(0x8a8d90)); j.position.set(cx, fy + .03, z0 + d * k / 4); g.add(j); }
  const H = 2.9;
  const cols = [];
  for (const x of [x0 + .2, x1 - .2]) for (const z of [cz - d * .2, cz + d * .3]) { const c = new THREE.Mesh(new THREE.BoxGeometry(.18, H, .18), steel); c.position.set(x, fy + H / 2, z); c.castShadow = true; g.add(c); cols.push([x, z]); }
  for (const x of [x0 + .2, x1 - .2]) { const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .25, d * .62), steel); b.position.set(x, fy + H, cz + d * .05); g.add(b); }
  for (let k = 0; k < 14; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(w, .14, .08), wood); sl.position.set(cx, fy + H + .18, cz - d * .26 + k * d * .045); sl.castShadow = true; g.add(sl); }
  // luces empotradas
  for (const x of [cx - w / 4, cx + w / 4]) { const l = new THREE.Mesh(new THREE.BoxGeometry(.4, .03, .4), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d0, emissiveIntensity: 1.6 })); l.position.set(x, fy + H - .14, cz); g.add(l); }
  return { group: g, cols };
}

// Camioneta pickup doble cabina, moderna y alta
export function makePickup(color = 0xf4f5f7) {
  const g = new THREE.Group(), C = common();
  const paint = phys({ color, metalness: .55, roughness: .28, clearcoat: 1, clearcoatRoughness: .08 });
  const trim = std(0x2a2c30, { roughness: .6 });
  // cofre y cabina
  const body = new THREE.Mesh(sideShape([[-.3, .55], [2.75, .55], [2.8, 1.05], [2.6, 1.32], [1.35, 1.42], [-.3, 1.42]], 2.0), paint); body.castShadow = body.receiveShadow = true; g.add(body);
  const cab = new THREE.Mesh(sideShape([[-.35, 1.4], [1.3, 1.4], [.75, 2.02], [-.25, 2.05]], 1.86, .05), C.glass); cab.castShadow = true; g.add(cab);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.82, .08, 1.2), paint); roof.position.set(0, 2.06, .2); g.add(roof);
  for (const z of [-.33, .55]) for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.04, .62, .1), paint); p.position.set(s * .93, 1.72, z); g.add(p); }
  // cajón (batea) con barra deportiva
  const bedM = paint, bed0 = -2.7, bed1 = -.35;
  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.9, .1, bed1 - bed0), trim); floor.position.set(0, .75, (bed0 + bed1) / 2); g.add(floor);
  for (const s of [-1, 1]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(.1, .7, bed1 - bed0), bedM); sd.position.set(s * .97, 1.05, (bed0 + bed1) / 2); sd.castShadow = true; g.add(sd); }
  const gate = new THREE.Mesh(new THREE.BoxGeometry(2.0, .7, .1), bedM); gate.position.set(0, 1.05, bed0); g.add(gate);
  const under = new THREE.Mesh(new THREE.BoxGeometry(1.94, .3, bed1 - bed0), trim); under.position.set(0, .62, (bed0 + bed1) / 2); g.add(under);
  for (const s of [-1, 1]) { const rb = new THREE.Mesh(new THREE.BoxGeometry(.07, .55, .07), C.black); rb.position.set(s * .85, 1.65, -.6); g.add(rb); }
  const rbt = new THREE.Mesh(new THREE.BoxGeometry(1.77, .07, .07), C.black); rbt.position.set(0, 1.92, -.6); g.add(rbt);
  // parrilla grande negra, faros LED delgados, defensa y estribos
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.5, .45, .06), C.black); grille.position.set(0, .95, 2.8); g.add(grille);
  for (let k = 0; k < 4; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, .025, .03), trim); bar.position.set(0, .8 + k * .1, 2.83); g.add(bar); }
  for (const s of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(.32, .07, .08), C.head); h.position.set(s * .78, 1.2, 2.72); h.rotation.y = s * .2; g.add(h); }
  for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.BoxGeometry(.06, .45, .14), C.tail); t.position.set(s * .99, 1.1, bed0 + .05); g.add(t); }
  const bump = new THREE.Mesh(new THREE.BoxGeometry(2.0, .22, .2), trim); bump.position.set(0, .62, 2.85); g.add(bump);
  const bump2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, .18, .2), trim); bump2.position.set(0, .62, bed0 - .08); g.add(bump2);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.18, .06, 2.4), C.black); st.position.set(s * 1.08, .5, .6); g.add(st); }
  // salpicaderas negras y espejos
  for (const [z] of [[1.75], [-1.55]]) for (const s of [-1, 1]) { const fl = new THREE.Mesh(new THREE.TorusGeometry(.5, .07, 6, 16, Math.PI), trim); fl.position.set(s * 1.0, .45, z); fl.rotation.y = Math.PI / 2; g.add(fl); }
  for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(.22, .15, .12), C.black); m.position.set(s * 1.1, 1.55, 1.15); g.add(m); }
  const wheels = [[-.95, 1.75], [.95, 1.75], [-.95, -1.55], [.95, -1.55]].map(([x, z]) => wheel(g, x, z, .45, .34, C.rim, C.tire, C.disc));
  g.userData = { kind: 'pickup', wheels, len: 5.6, wid: 2.15, seatY: 1.0, top: 27 };
  return g;
}

/* ---------- Yate moderno (el barco que maneja el jugador) ----------
   Mismas medidas que el barco anterior: 30 m de largo (proa hacia +x), 7,6 m de ancho, cubierta a 1,05 m. */
export function buildYacht() {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const L = 30, W = 7.6, D = 3.6, DECK = 1.05;
  const hg = new THREE.BoxGeometry(L, D, W, 40, 6, 8), p = hg.attributes.position;
  const half = (x, yy) => { // medio ancho del casco en x (proa afilada, popa recta) y altura relativa yy
    const t = x / (L / 2);
    const bow = t > 0 ? Math.pow(1 - Math.pow(t, 1.8), .55) : 1 - Math.pow(Math.max(0, -t - .85) / .15, 2) * .08;
    return W / 2 * Math.max(.02, bow) * (.62 + .38 * Math.pow(yy, .6));
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), yy = (y + D / 2) / D, t = x / (L / 2);
    const nz = Math.sign(z) * half(x, yy) * Math.abs(z) / (W / 2);
    let ny = y + (t > 0 ? Math.pow(t, 2) * .9 * yy : 0) + (t > .55 ? -Math.pow((t - .55) / .45, 2) * 1.6 * (1 - yy) : 0); // arrufo y proa lanzada
    p.setXYZ(i, x, ny, nz);
  }
  hg.computeVertexNormals();
  const cols = [], cc = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + DECK - D / 2, top = hg.attributes.normal.getY(i) > .75 && (p.getY(i) + D / 2) / D > .9;
    cc.set(top ? 0xc29467 : y > .35 ? 0xf7f8fa : y > -.05 ? 0x13284a : 0x8a1f24); cols.push(cc.r, cc.g, cc.b);
  }
  hg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const hull = new THREE.Mesh(hg, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .25, clearcoat: .8, clearcoatRoughness: .1 }));
  hull.position.y = DECK - D / 2; hull.castShadow = hull.receiveShadow = true; hull.userData.block = true; g.add(hull);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f7f9, roughness: .3, clearcoat: .7 });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdfe4e8, metalness: .95, roughness: .15 });
  const glassM = new THREE.MeshPhysicalMaterial({ color: 0x0d1a26, metalness: .3, roughness: .05, transparent: true, opacity: .7, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: .4 });
  const cushion = new THREE.MeshStandardMaterial({ color: 0xece4d4, roughness: .9 });
  const navy = new THREE.MeshStandardMaterial({ color: 0x13284a, roughness: .4 });
  const add = (geo, m, x, y, z, cast = true) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; g.add(o); return o; };
  // ventanas alargadas en el casco
  for (const s of [-1, 1]) for (const [x, w] of [[-5, 5], [2, 4.5], [7.5, 2.6]]) {
    const hw = half(x, .72); const win = add(new THREE.BoxGeometry(w, .32, .04), glassM, x, .62, s * (hw + .02), false); win.rotation.y = s * (x > 5 ? -.08 : 0);
  }
  // barandas de acero inoxidable siguiendo la borda
  const rp = [];
  for (let i = 0; i <= 36; i++) { const x = -L / 2 + .6 + i * (L - 1.4) / 36, t = x / (L / 2); rp.push(new THREE.Vector3(x, DECK + .85 + (t > 0 ? t * t * .9 : 0), half(x, 1) - .15)); }
  const rc = new THREE.CatmullRomCurve3(rp);
  for (const s of [-1, 1]) {
    const rl = new THREE.Mesh(new THREE.TubeGeometry(rc, 80, .035, 6), steel); rl.scale.z = s; g.add(rl);
    for (let i = 0; i <= 36; i += 3) { const q = rp[i]; add(new THREE.CylinderGeometry(.025, .025, .85, 6), steel, q.x, q.y - .42, s * q.z, false); }
  }
  // plataforma de baño en la popa con escalerita
  add(new THREE.BoxGeometry(1.4, .12, W * .8), new THREE.MeshStandardMaterial({ color: 0xc29467, roughness: .7 }), -L / 2 - .6, .35, 0);
  for (let k = 0; k < 4; k++) add(new THREE.BoxGeometry(.04, .04, .5), steel, -L / 2 - 1.25, .2 - k * .25, 0, false);
  add(new THREE.BoxGeometry(.06, 1.4, .06), steel, -L / 2 - 1.25, -.2, -.25, false); add(new THREE.BoxGeometry(.06, 1.4, .06), steel, -L / 2 - 1.25, -.2, .25, false);
  // nombre en la popa
  const nameTex = (() => { const c = document.createElement('canvas'); c.width = 512; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#f7f8fa'; x.fillRect(0, 0, 512, 96); x.fillStyle = '#13284a'; x.font = '800 54px Georgia, serif'; x.textAlign = 'center'; x.fillText('FE Y ESPERANZA', 256, 66); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const nm = add(new THREE.PlaneGeometry(4, .75), new THREE.MeshStandardMaterial({ map: nameTex, roughness: .4 }), -L / 2 - .01, .55, 0, false); nm.rotation.y = -Math.PI / 2;
  // cabina principal (techo duro sobre columnas, abierta a los lados para caminar dentro)
  const cx0 = -7.2, cx1 = 4.4, cw = 5.6, ch = 2.45, cmx = (cx0 + cx1) / 2;
  add(new THREE.BoxGeometry(cx1 - cx0 + .8, .18, cw + .3), white, cmx - .2, DECK + ch, 0);
  for (const x of [cx0, cx1 - .6]) for (const s of [-1, 1]) add(new THREE.BoxGeometry(.14, ch, .14), white, x, DECK + ch / 2, s * (cw / 2 - .05));
  const ws = add(new THREE.BoxGeometry(.06, 1.25, cw - .2), glassM, cx1 + .05, DECK + ch - .75, 0, false); ws.rotation.z = .45;   // parabrisas inclinado
  add(new THREE.BoxGeometry(1.1, .95, cw - .2), white, cx1 + .45, DECK + .48, 0);                                                     // tablero delantero
  for (const s of [-1, 1]) { const sg = add(new THREE.BoxGeometry(cx1 - cx0 - 1.2, .75, .04), glassM, cmx - .1, DECK + ch - .55, s * (cw / 2 - .02), false); sg.userData.noCam = true; }
  // timón (puesto de mando a popa, donde va el jugador)
  add(new THREE.BoxGeometry(.9, 1.05, 1.6), white, -8.1, DECK + .52, 0);
  add(new THREE.BoxGeometry(.05, .45, 1.2), new THREE.MeshStandardMaterial({ color: 0x0a0e14, emissive: 0x2a6ab0, emissiveIntensity: .5, roughness: .2 }), -7.66, DECK + 1.1, 0, false).rotation.z = .4;
  const wheel = add(new THREE.TorusGeometry(.32, .035, 8, 24), dark, -8.65, DECK + 1.2, 0); wheel.rotation.y = Math.PI / 2; wheel.rotation.x = .5;
  for (let k = 0; k < 3; k++) { const sp = add(new THREE.BoxGeometry(.03, .6, .03), steel, -8.65, DECK + 1.2, 0, false); sp.rotation.set(k * Math.PI / 3, Math.PI / 2, 0); }
  add(new THREE.CylinderGeometry(.04, .04, .1, 8), steel, -8.62, DECK + 1.2, 0, false).rotation.z = Math.PI / 2;
  // sofá en U dentro de la cabina y mesa
  add(new THREE.BoxGeometry(4.2, .45, .7), cushion, cmx, DECK + .23, cw / 2 - .55); add(new THREE.BoxGeometry(4.2, .55, .18), cushion, cmx, DECK + .6, cw / 2 - .25);
  add(new THREE.BoxGeometry(1.6, .06, 1), new THREE.MeshStandardMaterial({ color: 0x6b4a32, roughness: .3 }), cmx, DECK + .72, cw / 2 - 1.5);
  add(new THREE.CylinderGeometry(.06, .06, .68, 8), steel, cmx, DECK + .36, cw / 2 - 1.5, false);
  // solárium en la proa
  add(new THREE.BoxGeometry(3.6, .3, 3.4), cushion, 9.2, DECK + .35, 0); add(new THREE.BoxGeometry(.4, .5, 3.4), cushion, 7.3, DECK + .5, 0);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(.6, .32, .5), navy, 7.7, DECK + .72, s * 1.1);
  // ancla y luces de navegación
  add(new THREE.BoxGeometry(.5, .25, .12), steel, L / 2 - .2, .9, 0);
  add(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0x00ff40, emissive: 0x00ff40, emissiveIntensity: 2 }), 4.9, DECK + .95, 3.05, false);
  add(new THREE.SphereGeometry(.09, 8, 6), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff2020, emissiveIntensity: 2 }), 4.9, DECK + .95, -3.05, false);
  // cubierta superior (flybridge): baranda, asientos y arco del radar con antenas
  const fy = DECK + ch + .09;
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(cx1 - cx0 - .4, .5, .06), white, cmx - .2, fy + .25, s * (cw / 2 + .05));
  add(new THREE.BoxGeometry(2.6, .4, 1.2), cushion, cmx + 1, fy + .2, 0); add(new THREE.BoxGeometry(.3, .5, 1.2), cushion, cmx - .4, fy + .45, 0);
  const archM = white;
  for (const s of [-1, 1]) { const a = add(new THREE.BoxGeometry(.5, 2.2, .25), archM, cx0 + 1.2, fy + 1.05, s * (cw / 2 - .4)); a.rotation.z = .25; }
  add(new THREE.BoxGeometry(.6, .25, cw - .3), archM, cx0 + .95, fy + 2.12, 0);
  add(new THREE.CylinderGeometry(.42, .42, .32, 20), white, cx0 + .9, fy + 2.45, -.8);                        // domo del radar
  const rad = add(new THREE.BoxGeometry(.12, .08, 1.6), dark, cx0 + .9, fy + 2.5, .9); g.userData.radar = rad;
  for (const [z, h] of [[1.9, 1.6], [-1.9, 1.2], [0, .9]]) add(new THREE.CylinderGeometry(.025, .04, h, 6), white, cx0 + .95, fy + 2.25 + h / 2, z, false);
  add(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5 }), cx0 + .95, fy + 3.15, 1.9, false); // luz de tope
  // bandera en la popa
  add(new THREE.CylinderGeometry(.025, .025, 1.6, 6), steel, -L / 2 + .5, DECK + 1.6, 0, false);
  const flag = add(new THREE.PlaneGeometry(.9, .55, 6, 2), new THREE.MeshStandardMaterial({ color: 0x1a4aa0, side: THREE.DoubleSide, roughness: .8 }), -L / 2 + .02, DECK + 2.1, 0, false);
  flag.rotation.y = Math.PI / 2; g.userData.flag = flag;
  return g;
}
