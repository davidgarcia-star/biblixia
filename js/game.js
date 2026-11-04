import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VERSES } from './verses.js';
import { createHuman, animateHuman, bakeStatic } from './human.js';
import { buildTabernacle, buildCamp } from './tabernacle.js';
import { buildArk, buildValley } from './scenes.js';
import { CHARACTERS, forLevel, createCharacter, nameSprite, giftBox } from './characters.js';
import { Sound } from './audio.js';

/* =========================================================
   CONFIGURACIÓN DE NIVELES
   ========================================================= */
const LEVELS = [
  { name: 'Básico',     grid: 2, coins: 14, goal: 9,  time: 120, cars: 0,  carSpeed: 0,  plat: .25, seed: 101 },
  { name: 'Intermedio', grid: 3, coins: 20, goal: 14, time: 150, cars: 5,  carSpeed: 9,  plat: .30, seed: 202 },
  { name: 'Avanzado',   grid: 3, coins: 24, goal: 19, time: 160, cars: 8,  carSpeed: 11, plat: .40, seed: 303 },
  { name: 'Experto',    grid: 4, coins: 30, goal: 25, time: 185, cars: 12, carSpeed: 12, plat: .45, seed: 404 },
  { name: 'Master',     grid: 4, coins: 36, goal: 32, time: 195, cars: 16, carSpeed: 14, plat: .55, seed: 505 },
];
LEVELS.forEach((l, i) => l.idx = i);
const BLOCK = 36, STREET = 14, PITCH = BLOCK + STREET, CURB = 0.15, DES = 100, SZ = 130;

/* =========================================================
   GUARDADO
   ========================================================= */
const SAVE_KEY = 'monedasDeFe3D_v1';
let save = { unlocked: 1, stars: [0, 0, 0, 0, 0], verses: [], gifts: [], player: null };
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s) save = Object.assign(save, s); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };

const $ = id => document.getElementById(id);
const rng = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

/* =========================================================
   RENDER
   ========================================================= */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const MAX_PR = Math.min(devicePixelRatio, isTouch ? 1.35 : 1.75);
renderer.setPixelRatio(MAX_PR);
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 2500);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// Cielo de atardecer
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 11), THREE.MathUtils.degToRad(205));
function makeSky(scale) {
  const sky = new Sky(); sky.scale.setScalar(scale);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.8; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.86;
  if (u.cloudCoverage) { u.cloudCoverage.value = 0.35; u.cloudDensity.value = 0.35; u.cloudElevation.value = 0.6; }
  u.sunPosition.value.copy(sunDir);
  return sky;
}
const sky = makeSky(2000); scene.add(sky);
{
  const pm = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(makeSky(50));
  scene.environment = pm.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.75;
}
scene.fog = new THREE.Fog(0xd8b9a0, 110, 760);

const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4b3a2c, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffcf9e, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048);
const SC = 45; Object.assign(sun.shadow.camera, { left: -SC, right: SC, top: SC, bottom: -SC, near: 1, far: 400 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/* =========================================================
   TEXTURAS PROCEDURALES
   ========================================================= */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
function noise(g, w, h, amount, alpha) {
  for (let i = 0; i < amount; i++) {
    const v = Math.random() * 255 | 0;
    g.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
}
// Fachadas: 4 columnas x 8 pisos por mosaico (≈12 m x 28 m)
const FACADE_STYLES = [
  { base: '#1d2b3a', glass: ['#2e4a66', '#3c5f80', '#24384f'], frame: '#cfd6de', lit: .22, metal: .55, rough: .18, band: false },
  { base: '#e8e4dc', glass: ['#384756', '#2f3d4b', '#465869'], frame: '#e8e4dc', lit: .30, metal: .2, rough: .45, band: false },
  { base: '#0e1116', glass: ['#151b24', '#1b2430', '#10151d'], frame: '#2a2f36', lit: .18, metal: .7, rough: .12, band: true },
  { base: '#7c8a96', glass: ['#5b7c95', '#6a8fab', '#4f6c82'], frame: '#9aa6b0', lit: .2, metal: .6, rough: .15, band: true },
  { base: '#6b4b3a', glass: ['#2c2a2a', '#3a3533', '#252222'], frame: '#8a6450', lit: .35, metal: .2, rough: .5, band: false },
];
const facades = FACADE_STYLES.map(st => {
  const W = 256, H = 512, cols = 4, rows = 8, cw = W / cols, rh = H / rows;
  const lit = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) lit.push(Math.random() < st.lit);
  const map = canvasTex(W, H, g => {
    g.fillStyle = st.base; g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = c * cw, y = r * rh, on = lit[r * cols + c];
      const gr = g.createLinearGradient(x, y, x + cw, y + rh);
      const gc = st.glass[(r * 7 + c * 3) % 3];
      gr.addColorStop(0, on ? '#ffd9a0' : gc); gr.addColorStop(1, on ? '#e6a95e' : '#0d141c');
      g.fillStyle = gr;
      const m = st.band ? 2 : 6;
      g.fillRect(x + m, y + (st.band ? 10 : 8), cw - m * 2, rh - (st.band ? 20 : 14));
      if (!st.band) { g.fillStyle = st.frame; g.fillRect(x + cw / 2 - 1, y + 8, 2, rh - 14); }
    }
    if (st.band) { g.fillStyle = st.frame; for (let r = 0; r <= rows; r++) g.fillRect(0, r * rh - 4, W, 8); }
    noise(g, W, H, 1500, .04);
  });
  const emis = canvasTex(W, H, g => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (lit[r * cols + c]) {
      g.fillStyle = '#ffbf73'; const m = st.band ? 2 : 6;
      g.fillRect(c * cw + m, r * rh + 10, cw - m * 2, rh - 20);
    }
  });
  return { map, emis, st };
});
const facadeMats = facades.map(f => new THREE.MeshStandardMaterial({ map: f.map, emissiveMap: f.emis, emissive: 0xffffff, emissiveIntensity: .55, metalness: f.st.metal, roughness: f.st.rough }));
const asphaltTex = canvasTex(256, 256, g => {
  g.fillStyle = '#3a3d42'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 9000, .08);
});
asphaltTex.repeat.set(420, 420);
const sidewalkTex = canvasTex(256, 256, g => {
  g.fillStyle = '#b9b4ab'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 5000, .06);
  g.strokeStyle = 'rgba(70,65,60,.35)'; g.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
});
sidewalkTex.repeat.set(BLOCK / 4, BLOCK / 4);
const plazaTex = canvasTex(256, 256, g => {
  g.fillStyle = '#d9d2c5'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) for (let x = 0; x < 256; x += 64) {
    g.fillStyle = (x / 64 + y / 32) % 2 ? '#cfc6b6' : '#e3ddd1'; g.fillRect(x + ((y / 32) % 2) * 32, y, 62, 30);
  }
  noise(g, 256, 256, 3000, .05);
});
plazaTex.repeat.set(BLOCK / 4, BLOCK / 4);
const grassTex = canvasTex(256, 256, g => {
  g.fillStyle = '#4f7d38'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `hsl(${85 + Math.random() * 25},${40 + Math.random() * 20}%,${22 + Math.random() * 18}%)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 3); }
});
const sandTex = canvasTex(256, 256, g => {
  g.fillStyle = '#d8b98a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) { const v = Math.random(); g.fillStyle = v < .5 ? 'rgba(255,240,210,.12)' : 'rgba(120,85,50,.12)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.strokeStyle = 'rgba(150,110,70,.12)'; g.lineWidth = 3; for (let y = 0; y < 256; y += 22) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 20 + y) * 4); g.stroke(); }
});
sandTex.repeat.set(30, 30);
const valleyTex = canvasTex(256, 256, g => {
  g.fillStyle = '#7a9a4a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) { g.fillStyle = `hsl(${70 + Math.random() * 30},${35 + Math.random() * 20}%,${26 + Math.random() * 20}%)`; g.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 3); }
});
valleyTex.repeat.set(60, 30);
const rockTex = canvasTex(256, 256, g => { g.fillStyle = '#8a6e58'; g.fillRect(0, 0, 256, 256); noise(g, 256, 256, 14000, .15); });
rockTex.repeat.set(6, 4);
grassTex.repeat.set(3, 3);
const dashTex = canvasTex(16, 128, g => { g.clearRect(0, 0, 16, 128); g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 16, 64); });
dashTex.repeat.set(1, (BLOCK - 8) / 6);
const zebraTex = canvasTex(128, 16, g => { g.clearRect(0, 0, 128, 16); g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, 64, 16); });
zebraTex.repeat.set((STREET - 1) / 1.2, 1);
const beamTex = canvasTex(4, 128, g => {
  const gr = g.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(255,220,120,.9)'); gr.addColorStop(1, 'rgba(255,220,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
});
const glowTex = canvasTex(64, 64, g => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,230,150,1)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});

/* =========================================================
   MATERIALES COMPARTIDOS
   ========================================================= */
const M = {
  asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: .92 }),
  sidewalk: new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: .85 }),
  plaza: new THREE.MeshStandardMaterial({ map: plazaTex, roughness: .7 }),
  grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xc8c3ba, roughness: .75 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: .8, roughness: .35 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xaab2bb, metalness: .9, roughness: .25 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: .7 }),
  led: new THREE.MeshStandardMaterial({ color: 0x66e0ff, emissive: 0x33ccff, emissiveIntensity: 2.2 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd9a0, emissiveIntensity: 3 }),
  water: new THREE.MeshStandardMaterial({ color: 0x3f8fb5, metalness: .9, roughness: .05, transparent: true, opacity: .9 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: .9 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: .9 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }),
  dash: new THREE.MeshStandardMaterial({ map: dashTex, transparent: true, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2 }),
  zebra: new THREE.MeshStandardMaterial({ map: zebraTex, transparent: true, roughness: .8, polygonOffset: true, polygonOffsetFactor: -2 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: 1, roughness: .22, emissive: 0x6b4300, emissiveIntensity: .6 }),
  beam: new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }),
  glow: new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
  valley: new THREE.MeshStandardMaterial({ map: valleyTex, roughness: 1 }),
  hill: new THREE.MeshStandardMaterial({ color: 0x6f8a46, roughness: 1 }),
  sandDune: new THREE.MeshStandardMaterial({ color: 0xd2b080, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ map: rockTex, roughness: 1 }),
};

/* =========================================================
   MUNDO
   ========================================================= */
let world = null;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), M.asphalt);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

function buildWorld(cfg) {
  if (world) { scene.remove(world.group); world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.userData.own) [].concat(o.material).forEach(m => { m.map && m.map.dispose(); m.emissiveMap && m.emissiveMap.dispose(); m.dispose(); }); }); }
  const r = rng(cfg.seed);
  const N = cfg.grid, T = N * PITCH + STREET, O = -T / 2;
  const group = new THREE.Group(); scene.add(group);
  const colliders = [], blockers = [], coinSpots = [], platSpots = [], npcSpots = [];
  const W = { group, colliders, blockers, N, T, O, coins: [], cars: [], npcs: [], zones: [] };
  const addBox = (minX, maxX, minZ, maxZ, top, bottom = 0) => colliders.push({ minX, maxX, minZ, maxZ, top, bottom });
  const addRamp = (minX, maxX, z0, z1, y0, y1) => colliders.push({ minX, maxX, minZ: z0, maxZ: z1, top: Math.max(y0, y1), ramp: { z0, z1, y0, y1 } });

  const box = (w, h, d, mat, x, y, z, opt = {}) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z); m.castShadow = opt.cast !== false; m.receiveShadow = true;
    group.add(m); return m;
  };

  // --- Edificio con fachada de vidrio ---
  function building(cx, cz, w, d, h, style) {
    const f = facades[style];
    // un solo material por estilo; la repetición de ventanas va en las coordenadas UV (permite unir todo)
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    const rx = Math.max(1, Math.round(d / 12)), rz = Math.max(1, Math.round(w / 12)), ry = h / 28;
    for (let fi = 0; fi < 6; fi++) { const su = fi < 2 ? rx : fi > 3 ? rz : 1, sv = fi < 2 || fi > 3 ? ry : 1; for (let k = 0; k < 4; k++) { const i = fi * 4 + k; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); } }
    const fm = facadeMats[style];
    const m = new THREE.Mesh(geo, [fm, fm, M.roof, M.roof, fm, fm]);
    m.position.set(cx, CURB + h / 2, cz); m.castShadow = m.receiveShadow = true;
    group.add(m); blockers.push(m);
    addBox(cx - w / 2, cx + w / 2, cz - d / 2, cz + d / 2, CURB + h);
    // Base / lobby
    box(w + .6, 4, d + .6, M.darkMetal, cx, CURB + 2, cz);
    // Corona LED o azotea
    if (r() < .5) box(w + .2, .25, d + .2, M.led, cx, CURB + h + .1, cz, { cast: false });
    else { box(w * .4, 3, d * .4, M.roof, cx, CURB + h + 1.5, cz); if (r() < .6) box(.25, 10, .25, M.steel, cx + w * .1, CURB + h + 8, cz); }
  }

  // --- Árboles instanciados ---
  const trees = [];
  // --- Faroles instanciados ---
  const lamps = [];

  const streetCenters = [];
  for (let i = 0; i <= N; i++) streetCenters.push(O + i * PITCH + STREET / 2);

  // Manzanas
  const types = [];
  for (let i = 0; i < N * N; i++) types.push(r() < .42 ? 'plaza' : 'tower');
  if (!types.includes('plaza')) types[(r() * types.length) | 0] = 'plaza';
  if (types.filter(t => t === 'tower').length < Math.ceil(N * N / 3)) types[0] = 'tower';

  for (let bi = 0; bi < N; bi++) for (let bj = 0; bj < N; bj++) {
    const x0 = O + bi * PITCH + STREET, z0 = O + bj * PITCH + STREET, cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
    const type = types[bi * N + bj];
    // Acera
    const sw = box(BLOCK, CURB, BLOCK, type === 'plaza' ? M.plaza : M.sidewalk, cx, CURB / 2, cz, { cast: false });
    addBox(x0, x0 + BLOCK, z0, z0 + BLOCK, CURB);
    // Faroles en el borde
    for (let k = 0; k < 2; k++) {
      const t = (k + .5) / 2;
      lamps.push([x0 + BLOCK * t, z0 + .8, 0], [x0 + BLOCK * t, z0 + BLOCK - .8, Math.PI], [x0 + .8, z0 + BLOCK * t, Math.PI / 2], [x0 + BLOCK - .8, z0 + BLOCK * t, -Math.PI / 2]);
    }
    // Monedas en la acera
    coinSpots.push([cx, z0 + 1.6, CURB], [cx, z0 + BLOCK - 1.6, CURB], [x0 + 1.6, cz, CURB], [x0 + BLOCK - 1.6, cz, CURB]);

    if (type === 'tower') {
      npcSpots.push([x0 + 12, z0 + 1.8], [x0 + BLOCK - 12, z0 + BLOCK - 1.8]);
      const inner = BLOCK - 7, ix = cx, iz = cz;
      const split = r();
      const st = () => (r() * facades.length) | 0;
      const hh = () => 22 + r() * 70;
      if (split < .3) building(ix, iz, inner, inner, hh() + 20, st());
      else if (split < .65) {
        const g = 2, w = (inner - g) / 2;
        if (r() < .5) { building(ix - w / 2 - g / 2, iz, w, inner, hh(), st()); building(ix + w / 2 + g / 2, iz, w, inner, hh(), st()); }
        else { building(ix, iz - w / 2 - g / 2, inner, w, hh(), st()); building(ix, iz + w / 2 + g / 2, inner, w, hh(), st()); }
      } else {
        const g = 2, w = (inner - g) / 2;
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) building(ix + sx * (w / 2 + g / 2), iz + sz * (w / 2 + g / 2), w, w, hh() * .8, st());
      }
      // Árboles en acera
      for (let k = 0; k < 4; k++) { const t = (k + .5) / 4; trees.push([x0 + BLOCK * t + 3, z0 + 2.2, .8], [x0 + BLOCK * t - 3, z0 + BLOCK - 2.2, .8]); }
    } else {
      // Plaza / parque moderno
      // Jardines
      for (const [gx, gz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const gw = 11, gpx = cx + gx * 9.5, gpz = cz + gz * 9.5;
        const gm = box(gw, .5, gw, M.concrete, gpx, CURB + .25, gpz);
        const gr = box(gw - .6, .52, gw - .6, M.grass, gpx, CURB + .26, gpz, { cast: false });
        addBox(gpx - gw / 2, gpx + gw / 2, gpz - gw / 2, gpz + gw / 2, CURB + .5);
        trees.push([gpx + (r() - .5) * 5, gpz + (r() - .5) * 5, 1 + r() * .5]);
        if (r() < .7) trees.push([gpx + (r() - .5) * 6, gpz + (r() - .5) * 6, .8 + r() * .4]);
      }
      // Fuente central
      const fr = 4.2;
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(fr, fr + .2, .7, 40), M.concrete);
      basin.position.set(cx, CURB + .35, cz); basin.castShadow = basin.receiveShadow = true; group.add(basin);
      const wat = new THREE.Mesh(new THREE.CylinderGeometry(fr - .3, fr - .3, .1, 40), M.water); wat.position.set(cx, CURB + .62, cz); group.add(wat);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(.35, .5, 2.6, 20), M.steel); col.position.set(cx, CURB + 1.6, cz); col.castShadow = true; group.add(col);
      const top = new THREE.Mesh(new THREE.TorusGeometry(.9, .12, 12, 40), M.gold); top.position.set(cx, CURB + 3.1, cz); top.userData.spin = true; group.add(top);
      addBox(cx - fr, cx + fr, cz - fr, cz + fr, CURB + .7);
      addBox(cx - .5, cx + .5, cz - .5, cz + .5, CURB + 3);
      // Bancos
      for (const [bx, bz, rot] of [[cx, cz - 6.5, 0], [cx, cz + 6.5, 0], [cx - 6.5, cz, 1], [cx + 6.5, cz, 1]]) {
        const bw = rot ? .6 : 2.4, bd = rot ? 2.4 : .6;
        box(bw, .1, bd, M.wood, bx, CURB + .48, bz);
        box(rot ? .5 : .1, .45, rot ? .1 : .5, M.darkMetal, bx - (rot ? 0 : 1), CURB + .22, bz - (rot ? 1 : 0));
        box(rot ? .5 : .1, .45, rot ? .1 : .5, M.darkMetal, bx + (rot ? 0 : 1), CURB + .22, bz + (rot ? 1 : 0));
        addBox(bx - bw / 2, bx + bw / 2, bz - bd / 2, bz + bd / 2, CURB + .53);
      }
      // Plataformas escalonadas con luz LED
      const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]].sort(() => r() - .5).slice(0, 2);
      for (const [px, pz] of corners) {
        const bx = cx + px * 9.5, bz = cz + pz * 9.5;
        const steps = [{ h: 1.0, s: 3.2 }, { h: 2.0, s: 2.4 }, { h: 3.0, s: 1.8 }];
        let ox = bx + px * 0.4, oz = bz + pz * 0.4;
        steps.forEach((s, k) => {
          const sx = ox - px * k * 2.2, sz = oz - pz * k * 2.2;
          box(s.s, s.h, s.s, M.concrete, sx, CURB + .5 + s.h / 2, sz);
          box(s.s + .05, .08, s.s + .05, M.led, sx, CURB + .5 + s.h - .04, sz, { cast: false });
          addBox(sx - s.s / 2, sx + s.s / 2, sz - s.s / 2, sz + s.s / 2, CURB + .5 + s.h);
          if (k === 2) platSpots.push([sx, sz, CURB + .5 + s.h]);
          else if (k === 0) coinSpots.push([sx, sz, CURB + .5 + s.h]);
        });
      }
      coinSpots.push([cx + 6.5, cz - 6.5, CURB], [cx - 6.5, cz + 6.5, CURB], [cx - 6.5, cz - 6.5, CURB], [cx + 6.5, cz + 6.5, CURB]);
      npcSpots.push([cx, cz - 13], [cx, cz + 13], [cx - 13, cz], [cx + 13, cz]);
    }
  }

  // Calles: líneas, pasos de cebra, monedas
  for (let i = 0; i <= N; i++) {
    const sc = streetCenters[i];
    for (let j = 0; j < N; j++) {
      const a = O + j * PITCH + STREET, b = a + BLOCK, mid = (a + b) / 2;
      for (const horiz of [true, false]) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(.22, BLOCK - 8), M.dash);
        dash.rotation.x = -Math.PI / 2; if (horiz) dash.rotation.z = Math.PI / 2;
        dash.position.set(horiz ? mid : sc, .02, horiz ? sc : mid); group.add(dash);
        for (const e of [a + 2, b - 2]) {
          const zb = new THREE.Mesh(new THREE.PlaneGeometry(STREET - 1, 3), M.zebra);
          zb.rotation.x = -Math.PI / 2; if (!horiz) zb.rotation.z = 0; else zb.rotation.z = Math.PI / 2;
          zb.position.set(horiz ? e : sc, .021, horiz ? sc : e); group.add(zb);
        }
        const off = (r() < .5 ? -1 : 1) * 3.2;
        coinSpots.push(horiz ? [mid + (r() - .5) * 14, sc + off, 0] : [sc + off, mid + (r() - .5) * 14, 0]);
      }
    }
    for (let j = 0; j <= N; j++) coinSpots.push([sc, streetCenters[j], 0]);
  }

  // Borde: edificios altos alrededor (horizonte) y muros invisibles
  const ring = [];
  for (let i = -1; i <= N; i++) for (const side of [0, 1, 2, 3]) {
    const p = O + i * PITCH + STREET + BLOCK / 2;
    const d = 26;
    const pos = side === 0 ? [p, O - d] : side === 1 ? [p, O + T + d] : side === 2 ? [O - d, p] : [O + T + d, p];
    ring.push(pos);
  }
  for (const [x, z] of ring) {
    if (x > O + T || z > O + T) continue; // al oriente: el desierto; al sur: el arca y el valle
    const h = 40 + r() * 110, w = 22 + r() * 14;
    building(x, z, w, w, h, (r() * facades.length) | 0);
  }
  addBox(O - 50, O, O - 50, O + T + SZ + 50, 999); addBox(O + T + DES, O + T + DES + 50, O - 50, O + T + SZ + 50, 999);
  addBox(O - 50, O + T + DES + 50, O - 50, O, 999); addBox(O - 50, O + T + DES + 50, O + T + SZ, O + T + SZ + 50, 999);

  // Instanciar faroles
  {
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .1, 6.5, 10), M.darkMetal, lamps.length);
    const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(.08, .08, 1.8), M.darkMetal, lamps.length);
    const head = new THREE.InstancedMesh(new THREE.BoxGeometry(.35, .1, .7), M.lamp, lamps.length);
    const o = new THREE.Object3D();
    lamps.forEach(([x, z, ry], i) => {
      o.rotation.set(0, ry, 0);
      o.position.set(x, CURB + 3.25, z); o.updateMatrix(); pole.setMatrixAt(i, o.matrix);
      const dx = Math.sin(ry) * -.9, dz = Math.cos(ry) * -.9;
      o.position.set(x + dx, CURB + 6.4, z + dz); o.updateMatrix(); arm.setMatrixAt(i, o.matrix);
      o.position.set(x + dx * 1.9, CURB + 6.32, z + dz * 1.9); o.updateMatrix(); head.setMatrixAt(i, o.matrix);
      addBox(x - .15, x + .15, z - .15, z + .15, 7);
    });
    pole.castShadow = arm.castShadow = true;
    group.add(pole, arm, head);
  }
  // Instanciar árboles
  {
    const n = trees.length;
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .18, 2.6, 8), M.trunk, n);
    const fol = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.6, 2), M.leaf, n * 2);
    const o = new THREE.Object3D(), col = new THREE.Color();
    trees.forEach(([x, z, base], i) => {
      const y0 = base > .7 ? CURB + .5 : CURB;
      const s = .85 + r() * .5;
      o.rotation.set(0, r() * 6, 0); o.scale.set(1, s, 1); o.position.set(x, y0 + 1.3 * s, z); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
      o.scale.set(s, s * 1.1, s); o.position.set(x, y0 + 3.1 * s, z); o.updateMatrix(); fol.setMatrixAt(i * 2, o.matrix);
      o.scale.set(s * .7, s * .8, s * .7); o.position.set(x + .5, y0 + 4.2 * s, z - .3); o.updateMatrix(); fol.setMatrixAt(i * 2 + 1, o.matrix);
      col.setHSL(.23 + r() * .08, .5 + r() * .2, .1 + r() * .07); fol.setColorAt(i * 2, col); fol.setColorAt(i * 2 + 1, col.offsetHSL(0, 0, .03));
      addBox(x - .2, x + .2, z - .2, z + .2, 6);
    });
    trunk.castShadow = fol.castShadow = true; fol.receiveShadow = true;
    group.add(trunk, fol);
  }

  // ===== Desierto con el tabernáculo y el campamento de Israel =====
  {
    const X0 = O + T, tcx = X0 + DES / 2, tcz = 0;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(DES + 4, T + 4), M.sand); sand.rotation.x = -Math.PI / 2; sand.position.set(tcx, .02, 0); sand.receiveShadow = true; group.add(sand);
    // dunas y montes alrededor
    for (let i = 0; i < 14; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.sandDune);
      const side = i % 3, t = r();
      const x = side === 0 ? X0 + DES + 18 + r() * 30 : X0 + t * DES, z = side === 0 ? (r() - .5) * T : -(T / 2 + 18 + r() * 25);
      d.position.set(x, 0, z); d.scale.set(14 + r() * 16, 4 + r() * 8, 12 + r() * 14); d.receiveShadow = true; group.add(d);
    }
    const sinai = new THREE.Mesh(mountainGeo(160, 190, r), M.rock); sinai.position.set(X0 + DES + 330, 90, -60); group.add(sinai);
    const sinai2 = new THREE.Mesh(mountainGeo(110, 120, r), M.rock); sinai2.position.set(X0 + DES + 250, 55, 140); group.add(sinai2);
    // palmeras
    const palmT = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: .9 }), palmL = new THREE.MeshStandardMaterial({ color: 0x3f6b2a, roughness: .8, side: THREE.DoubleSide });
    for (let i = 0; i < 10; i++) {
      const x = X0 + 6 + r() * (DES - 12), z = (r() < .5 ? -1 : 1) * (32 + r() * (T / 2 - 38));
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, 6, 8), palmT); tr.position.set(x, 3, z); tr.rotation.z = (r() - .5) * .2; tr.castShadow = true; group.add(tr);
      for (let k = 0; k < 7; k++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(.7, 3.2), palmL); lf.position.set(x, 6, z); lf.rotation.set(-1.0, k / 7 * 6.28, 0, 'YXZ'); lf.geometry.translate(0, 1.5, 0); lf.castShadow = true; group.add(lf); }
      addBox(x - .25, x + .25, z - .25, z + .25, 6);
    }
    const tab = buildTabernacle({ group, addBox, blockers, cx: tcx, cz: tcz });
    W.tab = tab; W.zones = tab.zones;
    buildCamp({ group, addBox, cx: tcx, cz: tcz, rnd: r, radiusX: 40, radiusZ: Math.min(26, T / 2 - 6) });
    W.desert = { X0, tcx, tcz };
    coinSpots.push([tcx + 30, tcz - 16, 0], [tcx + 30, tcz + 16, 0], [tcx - 32, tcz, 0], [tcx + 18, tcz - 8, 0], [tcx + 18, tcz + 8, 0], [tcx - 5, tcz - 9, 0], [tcx - 5, tcz + 9, 0], [X0 + 8, tcz - 20, 0], [X0 + 8, tcz + 20, 0]);
    npcSpots.push([tcx + 33, tcz - 7], [tcx + 33, tcz + 7], [tcx - 33, tcz - 8], [tcx, tcz - 18], [tcx, tcz + 18], [X0 + 6, tcz]);
    W.mosesSpot = [tcx + 28.5, tcz + 6.5];
  }

  // ===== Al sur: el arca de Noé y el valle de Ela =====
  {
    const Z0 = O + T, Wt = T + DES;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(Wt + 4, SZ + 4), M.valley); grass.rotation.x = -Math.PI / 2; grass.position.set(O + Wt / 2, .02, Z0 + SZ / 2); grass.receiveShadow = true; group.add(grass);
    for (let i = 0; i < 12; i++) { const hl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.hill); hl.position.set(O + r() * Wt, 0, Z0 + SZ + 20 + r() * 40); hl.scale.set(20 + r() * 25, 6 + r() * 12, 14 + r() * 14); group.add(hl); }
    const ararat = new THREE.Mesh(mountainGeo(170, 210, r), M.rock); ararat.position.set(O + Wt * .3, 100, Z0 + SZ + 320); group.add(ararat);
    const snow = new THREE.Mesh(mountainGeo(54, 66, r, .04), new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: .6 })); snow.position.set(O + Wt * .3, 174, Z0 + SZ + 320); group.add(snow);
    const ark = buildArk({ group, addBox, addRamp, blockers, x: O + Wt / 2, z: Z0 + SZ - 40, rnd: r });
    const valley = buildValley({ group, addBox, blockers, x: O + Wt - 38, z: Z0 + 24, rnd: r });
    W.ark = ark; W.valley = valley; W.zones.push(...ark.zones, ...valley.zones);
    W.south = { Z0, Wt, arkX: O + Wt / 2, arkZ: Z0 + SZ - 40 };
    W.noahSpot = ark.noahSpot; W.davidSpot = valley.davidSpot; W.davidNPC = valley.davidNPC;
    coinSpots.push([O + Wt / 2 - 40, Z0 + 30, 0], [O + Wt / 2 + 20, Z0 + 30, 0], [O + Wt / 2 - 10, Z0 + 12, 0], [O + Wt - 38 - 14, Z0 + 10, 0], [O + Wt - 38 - 14, Z0 + 38, 0], [O + 20, Z0 + 20, 0], [O + Wt / 2 + 60, Z0 + 40, 0]);
    npcSpots.push([O + 30, Z0 + 14], [O + Wt / 2 + 30, Z0 + 20]);
  }

  // Elegir monedas
  const want = cfg.coins, platN = Math.min(platSpots.length, Math.round(want * cfg.plat * .5));
  const pick = [], spaced = (p, d) => pick.every(q => Math.hypot(q[0] - p[0], q[1] - p[1]) > d);
  const startX = streetCenters[0], startZ = streetCenters[0];
  platSpots.sort(() => r() - .5).slice(0, platN).forEach(p => pick.push(p));
  const pool = coinSpots.filter(p => Math.hypot(p[0] - startX, p[1] - startZ) > 4).sort(() => r() - .5);
  for (const p of pool) { if (pick.length >= want) break; if (spaced(p, 7)) pick.push(p); }
  for (const p of pool) { if (pick.length >= want) break; if (spaced(p, 3)) pick.push(p); }
  const coinGeo = new THREE.CylinderGeometry(.42, .42, .08, 48); coinGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.TorusGeometry(.42, .04, 10, 48);
  const crossV = new THREE.BoxGeometry(.08, .42, .12), crossH = new THREE.BoxGeometry(.3, .08, .12);
  const beamGeo = new THREE.CylinderGeometry(.35, .35, 40, 16, 1, true);
  const chG = crossH.clone(); chG.translate(0, .06, 0);
  const coinMerged = mergeGeometries([coinGeo, rimGeo, crossV, chG].map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; }));
  pick.forEach((p, i) => {
    const g = new THREE.Group();
    const coin = new THREE.Group();
    const c = new THREE.Mesh(coinMerged, M.gold); c.castShadow = true;
    coin.add(c);
    const glow = new THREE.Sprite(M.glow); glow.scale.set(2.4, 2.4, 1);
    const beam = new THREE.Mesh(beamGeo, M.beam); beam.position.y = 20;
    g.add(coin, glow, beam);
    g.position.set(p[0], p[2] + 1.1, p[1]);
    group.add(g);
    W.coins.push({ g, coin, x: p[0], z: p[1], y: p[2] + 1.1, taken: false, phase: i * .9 });
  });

  // Personajes bíblicos
  {
    const defs = forLevel(cfg.idx + 1);
    const spots = npcSpots.filter(p => Math.hypot(p[0] - startX, p[1] - startZ) > 10 && pick.every(c => Math.hypot(c[0] - p[0], c[1] - p[1]) > 2.2)).sort(() => r() - .5);
    const used = [];
    for (const def of defs) {
      let sp;
      if (def.id === 'moises') sp = W.mosesSpot;
      else if (def.spot === 'noah') sp = W.noahSpot;
      else if (def.spot === 'david') sp = W.davidSpot;
      else sp = spots.find(p => used.every(u => Math.hypot(u[0] - p[0], u[1] - p[1]) > 12)) || spots.find(p => !used.includes(p));
      if (!sp) continue; used.push(sp);
      const g = new THREE.Group(); g.position.set(sp[0], 0, sp[1]);
      const body = def.spot === 'david' ? null : createCharacter(def); if (body) g.add(body);
      const label = nameSprite(def.name, def.kind); label.position.y = 2.25; g.add(label);
      const gift = giftBox(); gift.position.y = 2.75; g.add(gift);
      const glow = new THREE.Sprite(M.glow); glow.scale.set(1.4, 1.4, 1); glow.position.y = 2.75; g.add(glow);
      g.rotation.y = Math.atan2(startX - sp[0], startZ - sp[1]);
      group.add(g);
      if (def.spot !== 'david') addBox(sp[0] - .35, sp[0] + .35, sp[1] - .35, sp[1] + .35, 1.8);
      W.npcs.push({ def, g, body, gift, glow, x: sp[0], z: sp[1], given: false, fixed: def.spot === 'david' });
    }
  }

  // Autos (solo en calles horizontales para evitar choques entre ellos)
  const carColors = [0xd7261e, 0x1f4fbf, 0xf1f1f1, 0x111215, 0x9aa3ad, 0x0f6d5f, 0xe0a31a];
  for (let k = 0; k < cfg.cars; k++) {
    const lane = streetCenters[(r() * streetCenters.length) | 0];
    const dir = r() < .5 ? 1 : -1;
    const car = makeCar(carColors[(r() * carColors.length) | 0]);
    car.position.set(O + r() * T, 0, lane + dir * 3.2);
    car.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(car);
    W.cars.push({ obj: car, dir, speed: cfg.carSpeed * (.8 + r() * .4), min: O - 10, max: O + T + 3 });
  }
  // Unir todas las piezas fijas de la ciudad en pocas mallas (muchas menos llamadas de dibujo)
  {
    const S = new THREE.Group();
    for (const o of group.children.slice()) if (o.isMesh && !o.isInstancedMesh && !o.userData.live) S.add(o);
    S.updateMatrixWorld(true);
    const baked = bakeStatic(S); group.add(baked);
    W.staticMeshes = S.children.length;
  }
  // Lista de objetos que se ocultan cuando quedan lejos de la cámara
  W.lod = [];
  for (const n of W.npcs) W.lod.push({ obj: n.g, range: 130 });
  if (W.valley) W.lod.push({ obj: W.valley.group, range: 190, center: new THREE.Vector3(W.valley.goliathPos[0], 0, W.valley.goliathPos[1]) });
  if (W.ark) for (const a of W.ark.lodItems) W.lod.push({ obj: a, range: 110, animal: true });
  for (const c of W.cars) W.lod.push({ obj: c.obj, range: 170 });
  W.start = new THREE.Vector3(startX, 0, startZ);
  W.startYaw = Math.atan2(-startX, -startZ);
  return W;
}

function mountainGeo(rad, h, r, rough = .12) {
  const g = new THREE.ConeGeometry(rad, h, 28, 10), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(z, x), t = (y + h / 2) / h;
    if (t > .995) continue;
    const n = (1 + rough * 2 * (Math.sin(a * 3 + t * 9) * .5 + Math.sin(a * 7 + t * 4) * .35 + Math.sin(a * 17) * .15 + (r() - .5) * .4)) * Math.pow(1 - t, .75) / (1 - t);
    p.setXYZ(i, x * n, y - h * .06 * Math.pow(t, 3) + Math.sin(a * 5 + t * 6) * h * .03 * (1 - t), z * n);
  }
  g.computeVertexNormals(); return g;
}
function makeCar(color) {
  const g = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color, metalness: .6, roughness: .25, clearcoat: 1, clearcoatRoughness: .08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1218, metalness: .9, roughness: .05 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, .7, 4.4), paint); body.position.y = .65;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, .62, 2.3), glass); cab.position.set(0, 1.28, -.2);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.66, .06, 2.0), paint); roof.position.set(0, 1.61, -.25);
  [body, cab, roof].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); });
  const wg = new THREE.CylinderGeometry(.36, .36, .28, 20); wg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-.9, 1.4], [.9, 1.4], [-.9, -1.4], [.9, -1.4]]) { const w = new THREE.Mesh(wg, tire); w.position.set(x, .36, z); w.castShadow = true; g.add(w); }
  const hl = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: 3 });
  const tl = new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 2.5 });
  for (const x of [-.65, .65]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .05), hl); h.position.set(x, .8, 2.21); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(.4, .12, .05), tl); t.position.set(x, .8, -2.21); g.add(t);
  }
  return g;
}

/* =========================================================
   JUGADOR
   ========================================================= */
export const SKINS = [0xe8b896, 0xc68e6a, 0xa8714f, 0x7a4a30];
export const TOPS = [0x1f5c70, 0x7a3b6e, 0xc0392b, 0x2e2e38, 0xe0a31a];
if (!save.player) save.player = { gender: 'm', name: '', skin: 1, top: 0 };
function playerOpts(pl = save.player) {
  const f = pl.gender === 'f';
  return {
    gender: pl.gender, name: pl.name, skin: SKINS[pl.skin] ?? SKINS[1], top: TOPS[pl.top] ?? TOPS[0],
    hair: f ? 'long' : 'short', hairColor: f ? 0x3a2314 : 0x1d130c, eye: f ? 0x4a6b3a : 0x5a3a22,
    pants: f ? 0x22243a : 0x2b3a57, shoes: 0xf2f2f0, detail: 1,
  };
}
let human = createHuman(playerOpts());
scene.add(human.root);
function rebuildPlayer() {
  const rot = human.root.rotation.y;
  scene.remove(human.root);
  human.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  human = createHuman(playerOpts()); human.root.rotation.y = rot;
  scene.add(human.root);
}
const P = { holdFwd: 0, pos: new THREE.Vector3(), vy: 0, onGround: true, heading: 0, speed: 0, inv: 0, phase: 0, land: 0 };
const RADIUS = .32, STEP = .55, JUMP_V = 7.2, GRAV = 20, WALK = 5.2, RUN = 8.6;

const topOf = (c, z) => c.ramp ? c.ramp.y0 + (c.ramp.y1 - c.ramp.y0) * THREE.MathUtils.clamp((z - c.ramp.z0) / (c.ramp.z1 - c.ramp.z0), 0, 1) : c.top;
function floorAt(x, z, y) {
  let f = 0;
  for (const c of world.colliders) {
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) { const tp = c.ramp ? topOf(c, z) : c.top; if (tp <= y + STEP && tp > f) f = tp; }
  }
  return f;
}
function blocked(x, z, y) {
  for (const c of world.colliders) {
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) { if (c.ramp) continue; if (c.top > y + STEP) return true; }
  }
  return false;
}

/* =========================================================
   CÁMARA Y ENTRADA
   ========================================================= */
const cam = { yaw: 0, pitch: .3, dist: 5.6, cur: new THREE.Vector3(), look: new THREE.Vector3() };
const keys = {};
let jumpPressed = false, takePressed = false, runToggle = false, look = { id: null, x: 0, y: 0 };
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (state === 'verse' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyT')) { e.preventDefault(); closeVerse(); return; }
  if (state === 'talk' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyT')) { e.preventDefault(); takeGift(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' && !keys.Space) jumpPressed = true;
  if (e.code === 'KeyT' && !keys.KeyT) takePressed = true;
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Ratón: arrastrar para girar la cámara
let drag = null;
canvas.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY }; });
addEventListener('mouseup', () => drag = null);
addEventListener('mousemove', e => {
  if (!drag || state !== 'play') return;
  cam.yaw -= (e.clientX - drag.x) * .005; cam.pitch = THREE.MathUtils.clamp(cam.pitch + (e.clientY - drag.y) * .004, .05, 1.1);
  drag = { x: e.clientX, y: e.clientY };
});
canvas.addEventListener('wheel', e => { cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * .005, 3, 11); }, { passive: true });

// Táctil: botones de dirección, saltar, tomar y correr; arrastrar en la pantalla para mirar
document.querySelectorAll('#touch [data-key]').forEach(btn => {
  const k = btn.dataset.key;
  const on = e => { e.preventDefault(); sound.unlock(); keys[k] = true; btn.classList.add('on'); };
  const off = e => { e.preventDefault(); keys[k] = false; btn.classList.remove('on'); };
  btn.addEventListener('touchstart', on, { passive: false }); btn.addEventListener('touchend', off, { passive: false }); btn.addEventListener('touchcancel', off, { passive: false });
  btn.addEventListener('mousedown', on); btn.addEventListener('mouseup', off); btn.addEventListener('mouseleave', off);
});
const tap = (id, fn) => { const b = $(id); b.addEventListener('touchstart', e => { e.preventDefault(); sound.unlock(); fn(); b.classList.add('on'); }, { passive: false }); b.addEventListener('touchend', () => b.classList.remove('on')); b.addEventListener('mousedown', fn); };
tap('tJump', () => jumpPressed = true);
tap('tTake', () => { if (state === 'talk') takeGift(); else takePressed = true; });
tap('tRun', () => { runToggle = !runToggle; $('tRun').classList.toggle('active', runToggle); });
addEventListener('touchstart', e => {
  if (state !== 'play') return;
  for (const t of e.changedTouches) {
    if (t.target.closest && (t.target.closest('#touch button') || t.target.closest('.topright'))) continue;
    if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
  }
}, { passive: true });
addEventListener('touchmove', e => {
  for (const t of e.changedTouches) if (t.identifier === look.id) {
    cam.yaw -= (t.clientX - look.x) * .008; cam.pitch = THREE.MathUtils.clamp(cam.pitch + (t.clientY - look.y) * .005, .05, 1.1);
    look.x = t.clientX; look.y = t.clientY;
  }
}, { passive: true });
const endTouch = e => { for (const t of e.changedTouches) if (t.identifier === look.id) look.id = null; };
addEventListener('touchend', endTouch); addEventListener('touchcancel', endTouch);

/* =========================================================
   ESTADO DEL JUEGO
   ========================================================= */
let state = 'menu', L = null, lvlIdx = 0, timeLeft = 0, collected = 0, goal = 0, verseOrder = [], verseCursor = 0, menuT = 0;
const sound = new Sound();
try { sound.setMusic(localStorage.getItem(SAVE_KEY + '_music') !== '0'); sound.setSfx(localStorage.getItem(SAVE_KEY + '_sfx') !== '0'); } catch (e) {}
let musicStarted = false;
const ensureMusic = () => { sound.unlock(); if (!musicStarted) { musicStarted = true; sound.startMusic(); } };
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, ensureMusic, { once: false, passive: true }));

let building = false;
async function startLevel(i) {
  if (building) return; building = true;
  const ld = $('loading'); ld.querySelector('.sub').textContent = `Preparando el nivel ${LEVELS[i].name}…`; ld.classList.remove('hidden');
  await new Promise(r => setTimeout(r, 40));
  try { await startLevelNow(i); } finally { building = false; ld.classList.add('hidden'); }
}
async function startLevelNow(i) {
  lvlIdx = i; L = LEVELS[i];
  world = buildWorld(L);
  goal = L.goal; collected = 0; timeLeft = L.time;
  P.pos.copy(world.start); P.vy = 0; P.onGround = true; P.heading = world.startYaw; P.speed = 0; P.inv = 0;
  cam.yaw = world.startYaw; cam.pitch = .3;
  cam.cur.set(P.pos.x - Math.sin(cam.yaw) * 7, 4, P.pos.z - Math.cos(cam.yaw) * 7);
  const nuevos = VERSES.map((_, k) => k).filter(k => !save.verses.includes(k)).sort(() => Math.random() - .5);
  const viejos = VERSES.map((_, k) => k).filter(k => save.verses.includes(k)).sort(() => Math.random() - .5);
  verseOrder = nuevos.concat(viejos); verseCursor = 0;
  hideScreens(); $('verse').classList.add('hidden'); $('talk').classList.add('hidden'); $('info').classList.remove('show'); curZone = null; talkNPC = null;
  human.root.rotation.y = 0;
  $('topbar').classList.add('hidden');
  $('hud').classList.remove('hidden'); $('touch').classList.toggle('hidden', !isTouch);
  $('hLevel').textContent = L.name; $('hGoal').textContent = goal;
  hudCache = {}; updateHUD();
  // precompilar los sombreadores para que no se congele al empezar
  camera.position.copy(cam.cur); camera.lookAt(P.pos.x, 1.5, P.pos.z);
  try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) {}
  lastNow = performance.now();
  state = 'play'; ensureMusic();
}

const SCREENS = ['splash', 'help', 'levelsel', 'collection', 'pause', 'result', 'creator'];
function show(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); $('topbar').classList.toggle('hidden', !['splash', 'help', 'levelsel', 'collection', 'result'].includes(id)); }
function hideScreens() { SCREENS.forEach(s => $(s).classList.add('hidden')); }

function pauseGame() { if (state !== 'play') return; state = 'pause'; show('pause'); }
function resumeGame() { hideScreens(); state = 'play'; }

function openVerse() {
  const k = verseOrder[verseCursor % verseOrder.length]; verseCursor++;
  if (!save.verses.includes(k)) { save.verses.push(k); persist(); }
  $('vText').textContent = '«' + VERSES[k][0] + '»';
  $('vRef').textContent = VERSES[k][1] + ' · LBLA';
  $('vNum').textContent = `${collected} DE ${goal}`;
  state = 'verse'; for (const c in keys) keys[c] = false;
  $('verse').classList.remove('hidden');
}
function closeVerse() {
  sound.click(); $('verse').classList.add('hidden');
  if (collected >= goal) { endLevel(true); return; }
  state = 'play';
}
function endLevel(won) {
  state = 'result';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  let stars = 0;
  if (won) {
    sound.win(); const f = timeLeft / L.time; stars = f > .4 ? 3 : f > .18 ? 2 : 1;
    save.stars[lvlIdx] = Math.max(save.stars[lvlIdx], stars);
    if (lvlIdx + 1 < LEVELS.length) save.unlocked = Math.max(save.unlocked, lvlIdx + 2);
    persist();
    $('resTitle').textContent = `¡Nivel ${L.name} completado!`;
    $('resText').textContent = `Recogiste ${collected} monedas y te sobraron ${Math.ceil(timeLeft)} segundos.`;
    $('resVerse').textContent = lvlIdx + 1 < LEVELS.length ? '«Todo lo puedo en Cristo que me fortalece.» — Filipenses 4:13' : '¡Completaste todos los niveles! «He peleado la buena batalla, he terminado la carrera, he guardado la fe.» — 2 Timoteo 4:7';
    $('btnNext').textContent = lvlIdx + 1 < LEVELS.length ? 'Siguiente nivel' : 'Ver mis versículos';
    $('btnNext').classList.remove('hidden');
  } else {
    sound.lose();
    $('resTitle').textContent = '¡Se acabó el tiempo!';
    $('resText').textContent = `Recogiste ${collected} de ${goal} monedas. ¡No te rindas, inténtalo otra vez!`;
    $('resVerse').textContent = '«¡Sé fuerte y valiente!» — Josué 1:9';
    $('btnNext').classList.add('hidden');
  }
  $('resStars').textContent = won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  show('result');
}

/* ---------- Personajes: hablar y recibir regalos ---------- */
let talkNPC = null, curZone = null, infoTimer = 0;
const flying = [];
function openTalk(n) {
  talkNPC = n; state = 'talk'; for (const c in keys) keys[c] = false;
  const d = n.def, had = save.gifts.includes(d.id);
  $('tKind').textContent = d.kind.toUpperCase();
  $('tName').textContent = d.name;
  $('tMsg').textContent = d.msg;
  $('tRef').textContent = d.ref;
  $('tGift').innerHTML = n.given ? `Ya recibiste: <b>${d.emoji} ${d.gift}</b>` : `Te regala: <b>${d.emoji} ${d.gift}</b> <span>+10 s</span>`;
  $('btnTake').textContent = n.given ? 'Continuar' : (isTouch ? 'Tomar regalo' : 'Tomar regalo (T)');
  $('talk').classList.remove('hidden'); $('info').classList.remove('show'); infoTimer = 0;
  sound.talk();
  sound.say(`¡Hola! Soy ${d.name.split(' (')[0]}.`, { male: d.gender !== 'f' });
}
function takeGift() {
  const n = talkNPC; if (!n) return;
  $('talk').classList.add('hidden');
  if (!n.given) {
    n.given = true; timeLeft += 10; sound.gift(); setTimeout(() => sound.say('¡Shalom!', { male: n.def.gender !== 'f', rate: .85 }), 350);
    if (!save.gifts.includes(n.def.id)) { save.gifts.push(n.def.id); persist(); }
    n.glow.visible = false;
    const wp = new THREE.Vector3(); n.gift.getWorldPosition(wp); n.g.remove(n.gift); n.gift.position.copy(wp); world.group.add(n.gift);
    flying.push({ obj: n.gift, t: 0, from: wp.clone() });
    toast(`${n.def.emoji} +10 s`, '#7ef0a4');
  }
  talkNPC = null; state = 'play';
}
function showInfo(z) {
  $('iName').textContent = z.name; $('iText').textContent = z.text; $('iRef').textContent = z.ref;
  $('info').classList.add('show'); infoTimer = 12;
}

function toast(txt, color = '#ff6b6b') { const t = $('toast'); t.style.color = color; t.textContent = txt; t.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 1100); }
function toastOld(txt) { const t = $('toast'); t.textContent = txt; t.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 900); }

/* =========================================================
   ACTUALIZACIÓN
   ========================================================= */
const tmpV = new THREE.Vector3(), ray = new THREE.Raycaster();

function update(dt) {
  timeLeft -= dt;
  if (timeLeft <= 0) { timeLeft = 0; updateHUD(); endLevel(false); return; }

  // Entrada → dirección relativa a cámara
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  let mag = Math.min(1, Math.hypot(ix, iz));
  let run = keys.ShiftLeft || keys.ShiftRight;
  if (runToggle) run = true;
  // Mantener presionada la flecha ↑ (o W) hace correr más rápido
  if ((keys.KeyW || keys.ArrowUp) && P.onGround !== null) P.holdFwd = (P.holdFwd || 0) + dt; else P.holdFwd = 0;
  if (P.holdFwd > .9) run = true;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);           // adelante
  const rx = -fz, rz = fx;                                          // derecha
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix;
  const dl = Math.hypot(dx, dz);
  const target = mag > 0 ? (run ? RUN : WALK) * mag : 0;
  P.speed += (target - P.speed) * Math.min(1, dt * (P.onGround ? 10 : 3));
  if (dl > 0.01 && mag > 0) {
    dx /= dl; dz /= dl;
    const want = Math.atan2(dx, dz);
    let d = want - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    P.heading += d * Math.min(1, dt * 12);
  }
  const vx = Math.sin(P.heading) * P.speed, vz = Math.cos(P.heading) * P.speed;

  // Movimiento con colisiones por eje
  const nx = P.pos.x + vx * dt; if (!blocked(nx, P.pos.z, P.pos.y)) P.pos.x = nx;
  const nz = P.pos.z + vz * dt; if (!blocked(P.pos.x, nz, P.pos.y)) P.pos.z = nz;

  // Salto y gravedad
  if (jumpPressed && P.onGround) { P.vy = JUMP_V; P.onGround = false; sound.jump(); }
  jumpPressed = false;
  const fl = floorAt(P.pos.x, P.pos.z, P.pos.y);
  if (P.onGround && fl < P.pos.y - .05) P.onGround = false;
  if (P.onGround && fl > P.pos.y) P.pos.y += (fl - P.pos.y) * Math.min(1, dt * 20);
  if (!P.onGround) {
    P.vy -= GRAV * dt; P.pos.y += P.vy * dt;
    const f2 = floorAt(P.pos.x, P.pos.z, P.pos.y - P.vy * dt);
    if (P.pos.y <= f2 && P.vy <= 0) { if (P.vy < -6) P.land = .25; if (P.vy < -3) sound.step('hard', true); P.pos.y = f2; P.vy = 0; P.onGround = true; }
  }
  if (P.land > 0) P.land -= dt;
  // Pasos: un sonido por cada pisada; más rápido al correr y se detiene al parar
  if (P.onGround && P.speed > .7) {
    const st = Math.floor(human.phase / Math.PI);
    if (st !== P.lastStep) {
      P.lastStep = st;
      const d = world.desert, sth = world.south;
      const surface = (d && P.pos.x > d.X0 && P.pos.y < .3) ? 'sand' : (sth && P.pos.z > sth.Z0 && P.pos.y < .3) ? 'grass' : 'hard';
      sound.step(surface, P.speed > 6.2);
    }
  } else P.lastStep = Math.floor(human.phase / Math.PI);

  // Autos
  if (P.inv > 0) P.inv -= dt;
  for (const c of world.cars) {
    c.obj.position.x += c.dir * c.speed * dt;
    if (c.obj.position.x > c.max) c.obj.position.x = c.min; if (c.obj.position.x < c.min) c.obj.position.x = c.max;
    if (P.inv <= 0 && P.pos.y < 1.5 && Math.abs(P.pos.x - c.obj.position.x) < 2.2 + RADIUS && Math.abs(P.pos.z - c.obj.position.z) < .95 + RADIUS) {
      P.inv = 1.6; timeLeft = Math.max(0, timeLeft - 5); sound.hurt(); toast('−5 s');
      const side = Math.sign(P.pos.z - c.obj.position.z) || 1;
      P.pos.z = c.obj.position.z + side * 4.5; P.vy = 5; P.onGround = false;
    }
  }

  // Monedas
  for (const c of world.coins) {
    if (c.taken) continue;
    if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 1.0 && Math.abs(P.pos.y + .9 - c.y) < 1.5) {
      c.taken = true; collected++; sound.coin();
      spawnBurst(c.g.position);
      c.g.visible = false;
      updateHUD(); openVerse(); return;
    }
  }
  // Personajes bíblicos cercanos
  let near = null, nd = 2.8;
  for (const n of world.npcs) {
    const d = Math.hypot(P.pos.x - n.x, P.pos.z - n.z);
    if (d < 9 && !n.fixed) { const want = Math.atan2(P.pos.x - n.x, P.pos.z - n.z); let df = want - n.g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); n.g.rotation.y += df * Math.min(1, dt * 4); }
    if (d < nd) { nd = d; near = n; }
  }
  const pr = $('prompt');
  if (near) {
    pr.innerHTML = near.given ? `<kbd>T</kbd> Hablar con <b>${near.def.name}</b>` : `<kbd>T</kbd> Tomar el regalo de <b>${near.def.name}</b>`;
    pr.classList.add('show'); $('tTake').classList.add('ready');
    if (takePressed) { takePressed = false; openTalk(near); return; }
  } else { pr.classList.remove('show'); $('tTake').classList.remove('ready'); }
  takePressed = false;
  // Lugares especiales del tabernáculo
  let z = null;
  for (const zz of world.zones) if (P.pos.x > zz.minX && P.pos.x < zz.maxX && P.pos.z > zz.minZ && P.pos.z < zz.maxZ && (!z || zz.pri > z.pri)) z = zz;
  if (z !== curZone) { curZone = z; if (z) showInfo(z); }
  if (infoTimer > 0 && (infoTimer -= dt) <= 0) $('info').classList.remove('show');
  updateHUD();
}

// Partículas doradas al recoger
const bursts = [];
const sparkGeo = new THREE.OctahedronGeometry(.06);
function spawnBurst(p) {
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(sparkGeo, M.gold); m.position.copy(p);
    const v = new THREE.Vector3((Math.random() - .5) * 6, Math.random() * 6 + 2, (Math.random() - .5) * 6);
    scene.add(m); bursts.push({ m, v, life: 1 });
  }
}

function updateCamera(dt, follow = true) {
  const head = tmpV.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const want = new THREE.Vector3(head.x - Math.sin(cam.yaw) * cam.dist * cp, head.y + cam.dist * sp, head.z - Math.cos(cam.yaw) * cam.dist * cp);
  // Evitar que la cámara atraviese edificios
  const dir = want.clone().sub(head); const len = dir.length(); dir.normalize();
  ray.set(head, dir); ray.far = len;
  const hit = ray.intersectObjects(world.blockers, false)[0];
  if (hit) want.copy(head).addScaledVector(dir, Math.max(1.2, hit.distance - .4));
  cam.cur.lerp(want, follow ? Math.min(1, dt * 10) : 1);
  camera.position.copy(cam.cur);
  cam.look.lerp(head, Math.min(1, dt * 14));
  camera.lookAt(cam.look);
}

let hudCache = {};
const elC = $('hCoins'), elT = $('hTime'), elB = $('hBar'), elTimer = document.querySelector('.timer'), elCoins = document.querySelector('.coins');
function updateHUD() {
  // solo se toca la página cuando algo cambia (evita trabajo extra en cada cuadro)
  const t = Math.ceil(timeLeft), bar = Math.round(timeLeft / L.time * 200);
  if (hudCache.c !== collected) { elC.textContent = collected; elCoins.classList.toggle('done', collected >= goal); hudCache.c = collected; }
  if (hudCache.t !== t) { elT.textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; elTimer.classList.toggle('low', t <= 15); hudCache.t = t; }
  if (hudCache.b !== bar) { elB.style.width = Math.min(100, bar / 2) + '%'; hudCache.b = bar; }
}

// Minimapa + flecha
const mm = $('minimap'), mg = mm.getContext('2d');
function drawMinimap() {
  const S = mm.width, R = S / 2, scale = S / 140;
  mg.clearRect(0, 0, S, S);
  mg.save(); mg.beginPath(); mg.arc(R, R, R, 0, 7); mg.clip();
  mg.fillStyle = 'rgba(14,20,34,.82)'; mg.fillRect(0, 0, S, S);
  mg.translate(R, R); mg.rotate(cam.yaw + Math.PI); mg.scale(scale, scale); mg.translate(-P.pos.x, -P.pos.z);
  // manzanas
  for (let i = 0; i < world.N; i++) for (let j = 0; j < world.N; j++) {
    mg.fillStyle = 'rgba(160,170,190,.35)';
    mg.fillRect(world.O + i * PITCH + STREET, world.O + j * PITCH + STREET, BLOCK, BLOCK);
  }
  if (world.desert) {
    const d = world.desert; mg.fillStyle = 'rgba(216,185,138,.45)'; mg.fillRect(d.X0, world.O, DES, world.T);
    mg.strokeStyle = 'rgba(255,255,255,.8)'; mg.lineWidth = 1.2; mg.strokeRect(d.tcx - 25, d.tcz - 12.5, 50, 25);
    mg.fillStyle = 'rgba(245,197,66,.9)'; mg.fillRect(d.tcx - 15, d.tcz - 2.5, 15, 5);
  }
  if (world.south) { const S2 = world.south; mg.fillStyle = 'rgba(122,154,74,.45)'; mg.fillRect(world.O, S2.Z0, S2.Wt, SZ); mg.fillStyle = 'rgba(120,80,40,.9)'; mg.fillRect(S2.arkX - 75, S2.arkZ - 12.5, 150, 25); }
  for (const n of world.npcs) { mg.fillStyle = n.given ? 'rgba(160,200,255,.6)' : '#6fd0ff'; mg.beginPath(); mg.arc(n.x, n.z, 2.6, 0, 7); mg.fill(); if (!n.given) { mg.strokeStyle = '#fff'; mg.lineWidth = .8; mg.stroke(); } }
  mg.fillStyle = '#ff5a5a';
  for (const c of world.cars) mg.fillRect(c.obj.position.x - 2, c.obj.position.z - 1, 4, 2);
  for (const c of world.coins) if (!c.taken) { mg.fillStyle = '#ffd34d'; mg.beginPath(); mg.arc(c.x, c.z, 2.2, 0, 7); mg.fill(); }
  mg.restore();
  // jugador
  mg.save(); mg.translate(R, R); mg.rotate(-(P.heading - cam.yaw));
  mg.fillStyle = '#fff'; mg.beginPath(); mg.moveTo(0, -9); mg.lineTo(6, 7); mg.lineTo(0, 3); mg.lineTo(-6, 7); mg.closePath(); mg.fill();
  mg.restore();
  mg.strokeStyle = 'rgba(255,255,255,.2)'; mg.lineWidth = 2; mg.beginPath(); mg.arc(R, R, R - 1, 0, 7); mg.stroke();

  // moneda más cercana
  let best = null, bd = 1e9;
  for (const c of world.coins) if (!c.taken) { const d = Math.hypot(c.x - P.pos.x, c.z - P.pos.z); if (d < bd) { bd = d; best = c; } }
  if (best) {
    const ang = Math.atan2(best.x - P.pos.x, best.z - P.pos.z) - cam.yaw;
    $('hArrow').style.transform = `rotate(${-ang - Math.PI / 2}rad)`;
    $('hDist').textContent = `Moneda a ${Math.round(bd)} m`;
  }
}

/* =========================================================
   BUCLE PRINCIPAL
   ========================================================= */
let lastNow = performance.now(), elapsed = 0; const perf = { acc: 0, n: 0 };
let mmTimer = 0, lodTimer = 0;
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(), raw = (now - lastNow) / 1000, dt = Math.min(raw, .05); lastNow = now; elapsed += dt; const t = elapsed;
  // Resolución automática suave: solo baja un poco si el equipo va lento (nunca quita sombras ni detalle)
  if (!building && (state === 'play' || state === 'menu') && raw < .5) {
    perf.acc += raw; perf.n++;
    if (perf.acc > 2) {
      const avg = perf.acc / perf.n; let pr = renderer.getPixelRatio();
      const MIN_PR = Math.min(MAX_PR, .9);
      if (avg > .036 && pr > MIN_PR) renderer.setPixelRatio(Math.max(MIN_PR, pr - .1));
      else if (avg < .02 && pr < MAX_PR) renderer.setPixelRatio(Math.min(MAX_PR, pr + .1));
      perf.acc = 0; perf.n = 0;
    }
  }
  if (state === 'play') update(dt);

  if (world) {
    for (const c of world.coins) if (!c.taken) { c.coin.rotation.y = t * 2 + c.phase; c.g.position.y = c.y + Math.sin(t * 2.2 + c.phase) * .12; }
    world.group.children.forEach(o => { if (o.userData.spin) o.rotation.y = t; });
    if (world.tab) world.tab.update(t);
    if (world.ark) world.ark.update(t, dt);
    if (world.valley) world.valley.update(t, dt);
    for (const n of world.npcs) if (!n.given) { n.gift.rotation.y = t * 1.5; n.gift.position.y = 2.75 + Math.sin(t * 2 + n.x) * .08; }
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i]; f.t += dt * 1.6; const k = Math.min(1, f.t);
      f.obj.position.lerpVectors(f.from, tmpV.set(P.pos.x, P.pos.y + 1.3, P.pos.z), k).y += Math.sin(k * Math.PI) * 1.2;
      f.obj.scale.setScalar(1 - k * .9); f.obj.rotation.y += dt * 10;
      if (k >= 1) { f.obj.parent && f.obj.parent.remove(f.obj); flying.splice(i, 1); }
    }
    if (state === 'menu') for (const c of world.cars) { c.obj.position.x += c.dir * c.speed * dt; if (c.obj.position.x > c.max) c.obj.position.x = c.min; if (c.obj.position.x < c.min) c.obj.position.x = c.max; }
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.life -= dt * 1.4; b.v.y -= 12 * dt; b.m.position.addScaledVector(b.v, dt); b.m.rotation.x += dt * 8;
    b.m.scale.setScalar(Math.max(.01, b.life));
    if (b.life <= 0) { scene.remove(b.m); bursts.splice(i, 1); }
  }

  // Personaje
  human.root.position.copy(P.pos);
  human.root.rotation.y = state === 'creator' ? t * .8 : P.heading;
  human.root.visible = !(P.inv > 0 && Math.floor(t * 12) % 2);
  if (state === 'play' || state === 'menu' || state === 'creator') animateHuman(human, dt, { speed: P.speed, onGround: P.onGround, vy: P.vy, land: P.land, t });

  if (window.__freeCam) { /* cámara de pruebas */ }
  else if (state === 'creator') {
    const wide = innerWidth > 760, ox = wide ? .62 : 0, dd = wide ? 3.1 : 4.8;
    camera.position.set(P.pos.x + dd, P.pos.y + (wide ? 1.25 : 1.0), P.pos.z + ox);
    camera.lookAt(P.pos.x, P.pos.y + (wide ? 1.0 : -.5), P.pos.z + ox);
  }
  else if (state === 'menu') {
    menuT += dt * .06;
    const r = 46, mx = world.desert ? world.desert.tcx : P.pos.x, mz = world.desert ? world.desert.tcz : P.pos.z;
    camera.position.set(mx + Math.sin(menuT + 1.2) * r, 15 + Math.sin(menuT * .7) * 3, mz + Math.cos(menuT + 1.2) * r);
    camera.lookAt(mx, 3, mz);
  } else if (world && state !== 'result') updateCamera(dt);

  // Sombra que sigue al jugador
  const sc = state === 'menu' && world && world.desert ? tmpV.set(world.desert.tcx, 0, world.desert.tcz) : P.pos;
  sun.target.position.copy(sc);
  sun.position.copy(sc).addScaledVector(sunDir, 150);

  if (state === 'play' && (mmTimer += dt) > .05) { mmTimer = 0; drawMinimap(); }
  if (world && (lodTimer += dt) > .25) {
    lodTimer = 0; const cp = camera.position;
    for (const it of world.lod) {
      const p = it.center || it.obj.position, far = Math.hypot(p.x - cp.x, p.z - cp.z) > it.range;
      if (it.animal) { it.obj.userData.far = far; if (far) it.obj.visible = false; } else it.obj.visible = !far;
    }
  }
  renderer.render(scene, camera);
}

/* =========================================================
   MENÚS
   ========================================================= */
function renderLevels() {
  const g = $('levelGrid'); g.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const locked = i + 1 > save.unlocked;
    const b = document.createElement('button'); b.className = 'lvl' + (locked ? ' locked' : '');
    b.innerHTML = `<div class="n">NIVEL ${i + 1}</div><div class="t">${locked ? '🔒 ' : ''}${lv.name}</div>
      <small>⏱ ${lv.time} s · 🪙 ${lv.goal} de ${lv.coins} monedas<br>${lv.cars ? '🚗 ' + lv.cars + ' autos' : 'Sin tráfico'} · 👤 ${forLevel(i + 1).length} personajes</small>
      <div class="s">${'★'.repeat(save.stars[i])}${'☆'.repeat(3 - save.stars[i])}</div>`;
    b.onclick = () => { if (locked) { sound.hurt(); return; } sound.click(); startLevel(i); };
    g.appendChild(b);
  });
}
let colTab = 'verses';
function renderCollection() {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('sel', b.dataset.tab === colTab));
  if (colTab === 'gifts') {
    $('colCount').textContent = `Has recibido ${save.gifts.length} de ${CHARACTERS.length} regalos de los personajes de la Biblia`;
    const l = $('vlist'); l.innerHTML = '';
    CHARACTERS.forEach(c => {
      const has = save.gifts.includes(c.id), d = document.createElement('div'); d.className = 'vitem gift' + (has ? '' : ' lock');
      const lvl = c.level === 0 ? 'todos los niveles' : 'nivel ' + c.level;
      d.innerHTML = `<span class="ge">${has ? c.emoji : '🎁'}</span><div><b>${c.name}</b><small>${c.kind} · ${lvl}</small>${has ? `<p>${c.gift}</p><small>${c.ref}</small>` : '<p>Búscalo en el camino y pulsa T para recibir su regalo.</p>'}</div>`;
      l.appendChild(d);
    });
    return;
  }
  $('colCount').textContent = `Has descubierto ${save.verses.length} de ${VERSES.length} versículos`;
  const l = $('vlist'); l.innerHTML = '';
  VERSES.forEach((v, i) => {
    const d = document.createElement('div'); const has = save.verses.includes(i);
    d.className = 'vitem' + (has ? '' : ' lock');
    if (has) { d.textContent = '«' + v[0] + '»'; const b = document.createElement('b'); b.textContent = v[1]; d.appendChild(b); }
    else d.textContent = '🔒 Recoge más monedas para descubrir este versículo';
    l.appendChild(d);
  });
}
function toMenu(screen = 'levelsel') {
  state = 'menu';
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); $('verse').classList.add('hidden'); $('talk').classList.add('hidden');
  if (screen === 'levelsel') renderLevels();
  if (screen === 'collection') renderCollection();
  show(screen);
}
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { sound.click(); show(b.dataset.go); });
$('btnPlay').onclick = () => { sound.unlock(); sound.click(); openCreator(); };
/* ---------- Crear jugador / jugadora ---------- */
let draft = null;
function openCreator() {
  draft = Object.assign({}, save.player);
  state = 'creator'; show('creator');
  $('pName').value = draft.name || '';
  refreshCreator();
}
function cleanName(v) { return (v || '').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '').slice(0, 10); }
function refreshCreator() {
  document.querySelectorAll('[data-gender]').forEach(b => b.classList.toggle('sel', b.dataset.gender === draft.gender));
  const sk = $('skins'); sk.innerHTML = '';
  SKINS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'swatch' + (draft.skin === i ? ' sel' : ''); b.style.background = '#' + new THREE.Color(c).getHexString(); b.setAttribute('aria-label', 'Tono de piel ' + (i + 1)); b.onclick = () => { draft.skin = i; apply(); }; sk.appendChild(b); });
  const tp = $('tops'); tp.innerHTML = '';
  TOPS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'swatch' + (draft.top === i ? ' sel' : ''); b.style.background = '#' + new THREE.Color(c).getHexString(); b.setAttribute('aria-label', 'Color de ropa ' + (i + 1)); b.onclick = () => { draft.top = i; apply(); }; tp.appendChild(b); });
  const ok = draft.name.length >= 2;
  $('btnCreate').disabled = !ok;
  $('pHint').textContent = ok ? `Así se verá en tu espalda: ${draft.name.toUpperCase()}` : 'Una sola palabra, solo letras, de 2 a 10 letras.';
  $('pHint').classList.toggle('ok', ok);
}
function apply() { save.player = Object.assign({}, draft); rebuildPlayer(); refreshCreator(); }
document.querySelectorAll('[data-gender]').forEach(b => b.onclick = () => { sound.click(); draft.gender = b.dataset.gender; apply(); });
$('pName').addEventListener('input', e => {
  const c = cleanName(e.target.value);
  if (c !== e.target.value) { e.target.value = c; e.target.classList.add('shake'); setTimeout(() => e.target.classList.remove('shake'), 300); }
  draft.name = c; clearTimeout(apply.h); apply.h = setTimeout(apply, 250); refreshCreator();
});
$('pName').addEventListener('keydown', e => { if (e.key === ' ') e.preventDefault(); if (e.key === 'Enter' && !$('btnCreate').disabled) $('btnCreate').click(); });
$('btnCreate').onclick = () => { sound.click(); draft.name = cleanName($('pName').value); if (draft.name.length < 2) return; $('pName').blur(); apply(); persist(); state = 'menu'; renderLevels(); show('levelsel'); };
$('btnCreatorBack').onclick = () => { sound.click(); state = 'menu'; show('splash'); };
$('btnHelp').onclick = () => { sound.unlock(); sound.click(); show('help'); };
$('btnCollection').onclick = () => { sound.unlock(); sound.click(); renderCollection(); show('collection'); };
$('btnTake').onclick = () => takeGift();
$('iClose').onclick = () => { $('info').classList.remove('show'); infoTimer = 0; };
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { colTab = b.dataset.tab; renderCollection(); });
$('btnVerseOk').onclick = closeVerse;
// Inicio y Salir (igual que en Desafío Bíblico RD)
const SITE = 'https://davidgarcia-star.github.io/luisdavidgarcia/';
function goHome() { sound.click(); toMenu('splash'); }
function exitGame() { sound.click(); window.close(); setTimeout(() => { if (!window.closed) location.href = SITE; }, 250); }
$('btnHome').onclick = goHome; $('btnPauseHome').onclick = goHome;
$('btnExit').onclick = exitGame; $('btnPauseExit').onclick = exitGame;
$('btnPause').onclick = () => { sound.click(); pauseGame(); };
$('btnResume').onclick = () => { sound.click(); resumeGame(); };
$('btnRestart').onclick = () => { sound.click(); startLevel(lvlIdx); };
$('btnQuit').onclick = () => { sound.click(); toMenu(); };
$('btnRetry').onclick = () => { sound.click(); startLevel(lvlIdx); };
$('btnMenu').onclick = () => { sound.click(); toMenu(); };
$('btnNext').onclick = () => { sound.click(); if (lvlIdx + 1 < LEVELS.length) startLevel(lvlIdx + 1); else toMenu('collection'); };
// Botones de música instrumental y de efectos (en el juego y en la barra superior)
function updSound() {
  $('btnMusic').textContent = sound.musicOn ? '🎵' : '🔇'; $('btnMusic').classList.toggle('off', !sound.musicOn);
  $('btnSfx').textContent = sound.sfxOn ? '🔊' : '🔈'; $('btnSfx').classList.toggle('off', !sound.sfxOn);
  $('tbMusic').innerHTML = `🎵 <span class="chip-txt">Música: ${sound.musicOn ? 'Sí' : 'No'}</span>`; $('tbMusic').classList.toggle('off', !sound.musicOn);
  $('tbSfx').innerHTML = `🔊 <span class="chip-txt">Efectos: ${sound.sfxOn ? 'Sí' : 'No'}</span>`; $('tbSfx').classList.toggle('off', !sound.sfxOn);
}
const toggleMusic = () => { sound.setMusic(!sound.musicOn); try { localStorage.setItem(SAVE_KEY + '_music', sound.musicOn ? '1' : '0'); } catch (e) {} updSound(); };
const toggleSfx = () => { sound.setSfx(!sound.sfxOn); try { localStorage.setItem(SAVE_KEY + '_sfx', sound.sfxOn ? '1' : '0'); } catch (e) {} updSound(); sound.click(); };
$('btnMusic').onclick = toggleMusic; $('tbMusic').onclick = toggleMusic;
$('btnSfx').onclick = toggleSfx; $('tbSfx').onclick = toggleSfx;
updSound();

// Escena de fondo del menú
world = buildWorld(LEVELS[0]);
P.pos.set(world.desert.tcx + 34, 0, world.desert.tcz - 2);
P.pos.y = 0; P.heading = -1.2;
$('loading').classList.add('hidden');
loop();

// Acceso para pruebas
window.__game = { renderer, scene, get human() { return human; }, openCreator, camera, THREE, P, cam, LEVELS, startLevel, get world() { return world; }, get state() { return state; }, keys, setJump: () => jumpPressed = true, setTake: () => takePressed = true };

/* =========================================================
   Contador de personas que han entrado al juego (una vez por navegador)
   ========================================================= */
(function () {
  const BASE = 'https://abacus.jasoncameron.dev/', RUTA = 'miproaa-luisdavidgarcia/monedas-de-fe';
  const MARCA = 'miproaa-monedas-contado', CACHE = 'miproaa-monedas-visitas';
  const els = document.querySelectorAll('.js-visitas');
  const mostrar = n => { const t = Number(n).toLocaleString('es-DO'); els.forEach(e => e.textContent = t); };
  const leer = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const previo = leer(CACHE); if (previo !== null) mostrar(previo);
  const pedir = tipo => {
    const ctl = window.AbortController ? new AbortController() : null;
    const t = setTimeout(() => ctl && ctl.abort(), 8000);
    return fetch(BASE + tipo + '/' + RUTA + '?t=' + Date.now(), ctl ? { signal: ctl.signal, cache: 'no-store' } : { cache: 'no-store' })
      .then(r => { clearTimeout(t); if (r.status === 404) { const e = new Error('404'); e.noExiste = true; throw e; } if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { const v = Number(d && (d.value !== undefined ? d.value : d.count)); if (!isFinite(v) || v < 0) throw new Error('formato'); return Math.floor(v); });
  };
  if (!window.fetch) { mostrar(previo || 0); return; }
  let contado = !!leer(MARCA);
  const p = contado ? pedir('get').catch(e => { if (e.noExiste) { contado = false; return pedir('hit'); } throw e; }) : pedir('hit');
  const ok = n => { if (!contado) guardar(MARCA, '1'); guardar(CACHE, String(n)); mostrar(n); };
  p.then(ok).catch(() => setTimeout(() => pedir(contado ? 'get' : 'hit').then(ok).catch(() => { if (previo === null) mostrar(0); }), 3000));
})();
