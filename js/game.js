import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { VERSES } from './verses.js';
import { createHuman, animateHuman, bakeStatic, bakeInPlace, bakeColored, FAR_MAT, physM } from './human.js';
import { buildTabernacle, buildCamp } from './tabernacle.js';
import { buildArk, buildJordan, buildValley } from './scenes.js';
import { buildPlaces } from './places.js';
import { CHARACTERS, TREASURES, forLevel, createCharacter, nameSprite, giftBox } from './characters.js';
import { Sound } from './audio.js';
import { buildLife } from './life.js';
import { buildPriests } from './priests.js';
import { buildChurch } from './church.js';
import { makeSportsCar, makePickup, buildCarport, buildYacht } from './lujo.js';
import { idle, pace } from './pace.js';

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
const BLOCK = 36, STREET = 14, PITCH = BLOCK + STREET, CURB = 0.15, DES = 140, SZ = 130, BEACH = 40, NZ = 90;

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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false });
const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
const MAX_PR = Math.min(devicePixelRatio, isTouch ? 1.25 : 1.75);
renderer.setPixelRatio(MAX_PR);
renderer.setSize(innerWidth, innerHeight);
// Si el celular se queda sin memoria gráfica y la pantalla 3D se pierde: guardar y recargar UNA sola vez
// (antes había dos avisos y uno recargaba siempre, lo que podía dejar el juego recargándose sin parar)
canvas.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  try { persist(); } catch (_) {}
  let again = false; try { again = sessionStorage.getItem('bx_reload') === '1'; sessionStorage.setItem('bx_reload', '1'); } catch (_) { again = true; }
  const gl = document.getElementById('glLost'); if (gl) gl.classList.remove('hidden');
  if (!again) setTimeout(() => location.reload(), 1500);
  else if (gl) gl.querySelector('.sub').textContent = 'Tu teléfono se quedó sin memoria gráfica. Cierra otras apps y vuelve a abrir el juego.';
}, false);
canvas.addEventListener('webglcontextrestored', () => { const gl = document.getElementById('glLost'); if (gl) gl.classList.add('hidden'); }, false);
setTimeout(() => { try { sessionStorage.removeItem('bx_reload'); } catch (_) {} }, 60000);
// No revisar errores de sombreadores en el sitio publicado: esa revisión obliga a esperar a cada uno
renderer.debug.checkShaderErrors = /^(localhost|127\.)/.test(location.hostname);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = isTouch ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 2600);
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
});

// Cielo, luces y hora del día (día, atardecer o noche)
const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 11), THREE.MathUtils.degToRad(205));
const skyDir = sunDir.clone();
function makeSky(scale) {
  const sky = new Sky(); sky.scale.setScalar(scale);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.8; u.mieCoefficient.value = 0.005; u.mieDirectionalG.value = 0.86;
  if (u.cloudCoverage) { u.cloudCoverage.value = 0.35; u.cloudDensity.value = 0.35; u.cloudElevation.value = 0.6; }
  u.sunPosition.value.copy(sunDir);
  return sky;
}
const sky = makeSky(2000); scene.add(sky);
const envSky = makeSky(50), envScene = new THREE.Scene(); envScene.add(envSky);
const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
scene.fog = new THREE.Fog(0xd8b9a0, 110, 760);
const hemi = new THREE.HemisphereLight(0xcfe0ff, 0x4b3a2c, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffcf9e, 3.2);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 2048, isTouch ? 1024 : 2048); sun.shadow.radius = 1.4;
const SC = isTouch ? 34 : 42; Object.assign(sun.shadow.camera, { left: -SC, right: SC, top: SC, bottom: -SC, near: 1, far: 400 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);
let nightT = 0;
function updateNightAndBlobs(dt) {
  const night = save.time === 'noche', live = world && (state === 'play' || state === 'pause' || state === 'talk' || state === 'verse' || state === 'map' || state === 'creator' || state === 'menu');
  // sombra bajo los pies del jugador y de su compañero (Adán / Eva)
  const put = (b, pos, show) => {
    if (!show) { b.visible = false; return; }
    const f = P.driving && pos === P.pos ? pos.y : floorAt(pos.x, pos.z, pos.y + .05), h = Math.max(0, pos.y - f);
    const k = THREE.MathUtils.clamp(1 - h / 3.5, .35, 1);
    b.visible = true; b.position.set(pos.x, f + .035, pos.z); b.scale.set(.62 * k, 1, .5 * k);
  };
  put(blobs.p, P.pos, live && state !== 'menu' && human.root.visible !== false);
  put(blobs.m, mate ? mate.root.position : P.pos, live && !!mate && mate.root.visible);
  blobMat.opacity = night ? .4 : save.time === 'atardecer' ? .3 : .28; // solo sombra de contacto: la sombra real del sol tiene la forma del jugador
  // luces de noche
  if (world && world.lightPools) world.lightPools.visible = night;
  playerLamp.intensity = night && live ? 14 : 0;
  playerLamp.position.set(P.pos.x, P.pos.y + 2.7, P.pos.z);
  if ((nightT -= dt) > 0) return; nightT = .3;
  const pts = night && world ? world.lampPts : null;
  if (!pts || !pts.length) { for (const l of nightLights) l.intensity = 0; return; }
  const px = P.pos.x, pz = P.pos.z;
  const best = pts.map(q => [(q[0] - px) ** 2 + (q[2] - pz) ** 2, q]).sort((a, b) => a[0] - b[0]);
  nightLights.forEach((l, i) => { const q = best[i]; if (!q) { l.intensity = 0; return; } l.position.set(q[1][0], q[1][1] - .3, q[1][2]); l.intensity = 60; });
}
const _sq = new THREE.Quaternion(), _sv = new THREE.Vector3(), _sm = new THREE.Matrix4();
function snapShadow(c) {
  const texel = (SC * 2) / sun.shadow.mapSize.x;
  _sm.lookAt(sunDir, new THREE.Vector3(0, 0, 0), Math.abs(sunDir.y) > .99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0));
  _sq.setFromRotationMatrix(_sm);
  _sv.copy(c).applyQuaternion(_sq.clone().invert());
  _sv.x = Math.round(_sv.x / texel) * texel; _sv.y = Math.round(_sv.y / texel) * texel;
  _sv.applyQuaternion(_sq);
  sun.target.position.copy(_sv); sun.position.copy(_sv).addScaledVector(sunDir, 150);
  sun.target.updateMatrixWorld();
}

// Estrellas, luna y nubes propias (funcionan en cualquier versión)
const stars = (() => {
  const n = 2600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const u = Math.random(), v = Math.random() * .48 + .02, th = u * Math.PI * 2, ph = Math.acos(1 - v); const R = 1600; pos.set([Math.sin(ph) * Math.cos(th) * R, Math.cos(ph) * R, Math.sin(ph) * Math.sin(th) * R], i * 3); const w = .7 + Math.random() * .3; col.set([w, w, .85 + Math.random() * .15], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, fog: false, depthWrite: false }));
  p.visible = false; p.renderOrder = -1; scene.add(p); return p;
})();
const moon = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let gr = g.createRadialGradient(128, 128, 40, 128, 128, 128); gr.addColorStop(0, 'rgba(220,230,255,.6)'); gr.addColorStop(1, 'rgba(180,200,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  gr = g.createRadialGradient(118, 118, 10, 128, 128, 52); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#dfe4ee'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 52, 0, 7); g.fill();
  g.fillStyle = 'rgba(150,160,180,.35)'; for (const [x, y, r2] of [[110, 112, 12], [146, 140, 9], [130, 100, 6], [104, 146, 7], [150, 112, 5]]) { g.beginPath(); g.arc(x, y, r2, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: false, depthWrite: false })); sp.scale.set(170, 170, 1); sp.visible = false; scene.add(sp); return sp;
})();
const skyClouds = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  for (let i = 0; i < 18; i++) { const x = 60 + Math.random() * 136, y = 90 + Math.random() * 70, r2 = 30 + Math.random() * 45; const gr = g.createRadialGradient(x, y, 0, x, y, r2); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const grp = new THREE.Group(), mats = [];
  for (let i = 0; i < 90; i++) { const m = new THREE.SpriteMaterial({ map: t, transparent: true, fog: false, depthWrite: false, opacity: .9 }); mats.push(m); const s2 = new THREE.Sprite(m); const a = Math.random() * Math.PI * 2, d = 300 + Math.random() * 900; s2.position.set(Math.cos(a) * d, 110 + Math.random() * 120 + d * .05, Math.sin(a) * d); const k = 220 + Math.random() * 260; s2.scale.set(k * 1.9, k * .75, 1); s2.userData.v = 2 + Math.random() * 4; grp.add(s2); }
  scene.add(grp); return { grp, mats };
})();
const sunGlow = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  let gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); gr.addColorStop(0, 'rgba(255,255,245,1)'); gr.addColorStop(.08, 'rgba(255,250,220,.95)'); gr.addColorStop(.25, 'rgba(255,230,170,.35)'); gr.addColorStop(1, 'rgba(255,210,140,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })); sp.scale.set(260, 260, 1); scene.add(sp); return sp;
})();
// Bandada de aves que planea en círculos alto en el cielo y aletea de vez en cuando (de día y al atardecer)
const birds = (() => {
  const grp = new THREE.Group(), list = [];
  const mat = new THREE.MeshBasicMaterial({ color: 0x1c1e24, side: THREE.DoubleSide, fog: false });
  const wing = s => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .35, 0, 0, -.3, s * 1.6, .05, -.15], 3)); return g; };
  const gL = wing(-1), gR = wing(1), gB = new THREE.BufferGeometry(); gB.setAttribute('position', new THREE.Float32BufferAttribute([-.12, 0, -.5, .12, 0, -.5, 0, 0, .7], 3));
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Group(); b.add(new THREE.Mesh(gB, mat)); const L = new THREE.Mesh(gL, mat), R = new THREE.Mesh(gR, mat); b.add(L, R);
    b.scale.setScalar(1.3 + Math.random() * .5); b.children.forEach(m => { m.frustumCulled = false; });
    list.push({ b, L, R, off: new THREE.Vector3((Math.random() - .5) * 26, (Math.random() - .5) * 6, (Math.random() - .5) * 26), ph: Math.random() * 6.28, fs: 7 + Math.random() * 3 }); grp.add(b);
  }
  scene.add(grp);
  let a = 0;
  return {
    grp, update(dt, t, cp) {
      if (!grp.visible) return;
      a += dt * .09; const R0 = 70, cx = cp.x + Math.cos(a) * R0, cz = cp.z + Math.sin(a) * R0, dir = -a; // miran hacia donde vuelan (tangente al círculo)
      for (const k of list) {
        const flap = Math.sin(t * .7 + k.ph) > .2 ? Math.sin(t * k.fs + k.ph) * .7 : .12 + Math.sin(t * 1.5 + k.ph) * .05; // aletean y luego planean
        k.L.rotation.z = -flap; k.R.rotation.z = flap;
        k.b.position.set(cx + k.off.x, 48 + k.off.y + Math.sin(t * .5 + k.ph) * 1.5, cz + k.off.z); k.b.rotation.set(0, dir, Math.sin(t * .3 + k.ph) * .15);
      }
    }
  };
})();
const TIMES = {
  dia: { name: '☀️ Día', elev: 24, az: 215, turb: 2.5, ray: 1, mie: .004, sunC: 0xfff1dc, sunI: 3.5, hemiI: .3, hemiS: 0xd0e4ff, hemiG: 0x5a4a3a, exp: .5, fog: 0xc4d6ea, fogN: 160, fogF: 950, env: .55, win: .04, cloudC: 0xffffff, cloudO: .95, stars: false, bloom: .22, clouds: 90 },
  atardecer: { name: '🌅 Atardecer', elev: 3.2, az: 250, turb: 9, ray: 2.6, mie: .008, sunC: 0xff8a40, sunI: 2.2, hemiI: .42, hemiS: 0xffc8a0, hemiG: 0x3a2a24, exp: .62, fog: 0xd89a70, fogN: 110, fogF: 760, env: .7, win: .9, clouds: 45, cloudC: 0xffb08a, cloudO: .8, stars: false, bloom: .35 },
  noche: { name: '🌙 Noche', elev: -12, az: 200, turb: 1, ray: .4, mie: .002, sunC: 0xa8c4ff, sunI: 1.15, hemiI: .34, hemiS: 0x4a5a9a, hemiG: 0x1a1e28, exp: 1.15, fog: 0x0c1428, fogN: 70, fogF: 520, env: .35, win: 1.8, clouds: 25, cloudC: 0x6a7a9a, cloudO: .35, stars: true, bloom: .6 },
};
const moonDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 42), THREE.MathUtils.degToRad(130));
function applyTime(mode) {
  const T2 = TIMES[mode] || TIMES.atardecer; save.time = mode;
  skyDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - T2.elev), THREE.MathUtils.degToRad(T2.az));
  for (const sk of [sky, envSky]) { const u = sk.material.uniforms; u.sunPosition.value.copy(skyDir); u.turbidity.value = T2.turb; u.rayleigh.value = T2.ray; u.mieCoefficient.value = T2.mie; }
  sunDir.copy(T2.stars ? moonDir : skyDir); if (sunDir.y < .34) sunDir.y = .34; sunDir.normalize(); // el sol de la tarde da sombras visibles (no tan largas)
  sun.color.set(T2.sunC); sun.intensity = T2.sunI; hemi.intensity = T2.hemiI; hemi.color.set(T2.hemiS); hemi.groundColor.set(T2.hemiG);
  renderer.toneMappingExposure = T2.exp; scene.fog.color.set(T2.fog); scene.fog.near = T2.fogN; scene.fog.far = T2.fogF;
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(envScene, 0.02, .1, 100, { size: isTouch ? 128 : 256 }); // en el celular, más liviano
  scene.environment = envRT.texture; scene.environmentIntensity = T2.env;
  if (T2.stars) { scene.background = new THREE.Color(0x05070f); sky.visible = false; } else { scene.background = null; sky.visible = true; }
  if (world && world.ark && world.ark.rainbow) world.ark.rainbow.visible = !T2.stars;
  stars.visible = T2.stars; birds.grp.visible = !T2.stars; moon.visible = T2.stars; sunGlow.visible = !T2.stars; sunGlow.material.color.set(mode === 'atardecer' ? 0xff9a50 : 0xffffff); sunGlow.material.opacity = mode === 'atardecer' ? .9 : .75; moon.position.copy(moonDir).multiplyScalar(1400);
  skyClouds.grp.children.forEach((c, i) => { c.visible = i < T2.clouds; });
  skyClouds.mats.forEach(m => { m.color.set(T2.cloudC); m.opacity = T2.cloudO; });
  if (typeof facadeMats !== 'undefined') facadeMats.forEach(m => m.emissiveIntensity = T2.win);
  if (typeof M !== 'undefined') { M.lamp.emissiveIntensity = T2.stars ? 7 : 3; M.led.emissiveIntensity = T2.stars ? 4 : 2.2; }
  if (bloomPass) bloomPass.strength = T2.bloom * .55;
  try { persist(); } catch (e) {}
}

// Efectos modernos: resplandor (bloom) en computadoras
let composer = null, bloomPass = null;
// Acabado cinematográfico (computadoras): brillo suave en luces, corrección de color, viñeta y grano fino
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: .32 }, sat: { value: 1.1 }, contrast: { value: 1.07 }, warm: { value: .035 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, sat, contrast, warm; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(.2126, .7152, .0722));
      c = mix(vec3(l), c, sat);                                   // color más vivo
      c = (c - .5) * contrast + .5;                               // contraste de cine
      c += vec3(warm, warm * .4, -warm) * smoothstep(.45, 1., l); // luces cálidas
      c += vec3(-warm * .2, 0., warm * .25) * (1. - smoothstep(0., .35, l)); // sombras apenas frías (el asfalto se ve gris, no azul)
      vec2 q = vUv - .5; c *= 1. - vig * dot(q, q) * 1.6;          // viñeta
      c += (h(vUv * 1000. + time) - .5) * .018;                    // grano de película
      gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
    }`
};
let gradePass = null;
if (!isTouch) {
  try {
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 });
    composer = new EffectComposer(renderer, rt);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), .14, .5, .92);
    bloomPass.enabled = false; composer.addPass(bloomPass); composer.addPass(new OutputPass());
    gradePass = new ShaderPass(GradeShader); composer.addPass(gradePass);
    addEventListener('resize', () => { composer.setSize(innerWidth, innerHeight); });
  } catch (e) { composer = null; }
}

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
      // vidrio que refleja el cielo (más claro arriba), algunas ventanas con persianas o cortinas
      const gc = st.glass[(r * 7 + c * 3) % 3];
      const gr = g.createLinearGradient(x, y, x + cw * .35, y + rh);
      gr.addColorStop(0, '#9fb6c8'); gr.addColorStop(.18, gc); gr.addColorStop(.75, gc); gr.addColorStop(1, '#0b1118');
      g.fillStyle = gr;
      const m = st.band ? 2 : 6, wy = y + (st.band ? 10 : 8), wh = rh - (st.band ? 20 : 14);
      g.fillRect(x + m, wy, cw - m * 2, wh);
      if (on) { g.fillStyle = 'rgba(255,236,200,.18)'; g.fillRect(x + m, wy, cw - m * 2, wh); }
      const bl = (r * 13 + c * 7) % 5;
      if (bl === 0) { g.fillStyle = 'rgba(225,220,205,.55)'; g.fillRect(x + m, wy, cw - m * 2, wh * (.25 + ((r + c) % 3) * .2)); for (let k = wy; k < wy + wh * .6; k += 3) { g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(x + m, k, cw - m * 2, 1); } }
      if (bl === 2) { g.fillStyle = 'rgba(240,235,225,.25)'; g.fillRect(x + m, wy, (cw - m * 2) * .3, wh); }
      g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(x + m, wy + wh * .7); g.lineTo(x + m + cw * .5, wy); g.lineTo(x + m + cw * .62, wy); g.lineTo(x + m, wy + wh * .9); g.fill(); // reflejo diagonal
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
const asphaltTex = canvasTex(512, 512, g => {
  // asfalto real: grava fina de varios tonos, manchas suaves y pequeñas grietas
  g.fillStyle = '#4a4d52'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14; i++) { const x = Math.random() * 512, y = Math.random() * 512, r = 40 + Math.random() * 110, gr = g.createRadialGradient(x, y, 0, x, y, r); const d = Math.random() < .5; gr.addColorStop(0, d ? 'rgba(20,22,26,.18)' : 'rgba(90,92,96,.10)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  for (let i = 0; i < 26000; i++) { const v = Math.random(); g.fillStyle = v < .45 ? `rgba(20,20,22,${.25 + Math.random() * .3})` : v < .9 ? `rgba(110,112,116,${.15 + Math.random() * .25})` : `rgba(170,165,155,${.25 + Math.random() * .3})`; const sz = Math.random() < .85 ? 1 + Math.random() * 1.2 : 2 + Math.random() * 1.5; g.fillRect(Math.random() * 512, Math.random() * 512, sz, sz); }
  g.strokeStyle = 'rgba(18,18,20,.45)'; g.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) { let x = Math.random() * 512, y = Math.random() * 512; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 9; j++) { x += (Math.random() - .5) * 34; y += (Math.random() - .5) * 34; g.lineTo(x, y); } g.stroke(); }
});
asphaltTex.repeat.set(260, 260);
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
  g.fillStyle = '#e2b77a'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 12000; i++) { const v = Math.random(); g.fillStyle = v < .5 ? 'rgba(255,240,210,.12)' : 'rgba(120,85,50,.12)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.strokeStyle = 'rgba(150,110,70,.12)'; g.lineWidth = 3; for (let y = 0; y < 256; y += 22) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 20 + y) * 4); g.stroke(); }
});
sandTex.repeat.set(30, 30);
const beachTex = canvasTex(256, 256, g => { g.fillStyle = '#e8d2a2'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 12000; i++) { g.fillStyle = Math.random() < .5 ? 'rgba(255,250,230,.15)' : 'rgba(150,120,80,.12)'; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } });
beachTex.repeat.set(8, 40);
// mapa de normales para el oleaje del mar
const seaNormal = (() => {
  const N = 256, h = new Float32Array(N * N);
  for (let k = 0; k < 40; k++) { const fx = (1 + (Math.random() * 6 | 0)) * 2 * Math.PI / N, fy = (1 + (Math.random() * 6 | 0)) * 2 * Math.PI / N, ph = Math.random() * 6, a = Math.random(); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) h[y * N + x] += Math.sin(x * fx * (k % 7 + 1) + y * fy * (k % 5 + 1) + ph) * a / (k % 7 + 1); }
  const c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'), im = g.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = h[y * N + (x + 1) % N] - h[y * N + (x - 1 + N) % N], dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x];
    const nx = -dx * 2, ny = -dy * 2, nz = 1, l = Math.hypot(nx, ny, nz), i = (y * N + x) * 4;
    im.data[i] = (nx / l * .5 + .5) * 255; im.data[i + 1] = (ny / l * .5 + .5) * 255; im.data[i + 2] = (nz / l * .5 + .5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(45, 55); return t;
})();
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
  asphalt: new THREE.MeshStandardMaterial({ map: asphaltTex, bumpMap: asphaltTex, bumpScale: 1.2, roughness: .92 }),
  sidewalk: new THREE.MeshStandardMaterial({ map: sidewalkTex, bumpMap: sidewalkTex, bumpScale: 1.6, roughness: .85 }),
  plaza: new THREE.MeshStandardMaterial({ map: plazaTex, bumpMap: plazaTex, bumpScale: 1.4, roughness: .7 }),
  grass: new THREE.MeshStandardMaterial({ map: grassTex, bumpMap: grassTex, bumpScale: 2, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xc8c3ba, roughness: .75 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: .8, roughness: .35 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xaab2bb, metalness: .9, roughness: .25 }),
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
  sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
  beach: new THREE.MeshStandardMaterial({ map: beachTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
  sea: new THREE.MeshStandardMaterial({ color: 0x1c5f86, roughness: .12, metalness: .35, normalMap: seaNormal, normalScale: new THREE.Vector2(.28, .28) }),
  foam: new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, depthWrite: false }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8a5e36, roughness: .8 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: .8 }),
  island: new THREE.MeshStandardMaterial({ color: 0x5f7a44, roughness: 1, side: THREE.DoubleSide }),
  valley: new THREE.MeshStandardMaterial({ map: valleyTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
  hill: new THREE.MeshStandardMaterial({ color: 0x6f8a46, roughness: 1 }),
  sandDune: new THREE.MeshStandardMaterial({ color: 0xd2b080, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ map: rockTex, bumpMap: rockTex, bumpScale: 3, roughness: 1 }),
};

// Luz de los faroles en el suelo (de noche)
const lightPoolMat = new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.75)'); gr.addColorStop(.45, 'rgba(255,190,110,.32)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
// Sombra suave bajo los pies (siempre visible, aunque el sol esté bajo)
const blobMat = new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, g => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }),
  transparent: true, depthWrite: false, opacity: .55, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 });
const blobGeo = new THREE.PlaneGeometry(1, 1); blobGeo.rotateX(-Math.PI / 2);
const makeBlob = () => { const b = new THREE.Mesh(blobGeo, blobMat); b.renderOrder = 3; b.visible = false; scene.add(b); return b; };
const blobs = { p: makeBlob(), m: makeBlob() };
// Luces de noche: unas pocas luces reales que se colocan en los faroles más cercanos + un farol que acompaña al jugador
const nightLights = [];
for (let i = 0; i < (isTouch ? 3 : 5); i++) { const l = new THREE.PointLight(0xffc47a, 0, 22, 1.6); scene.add(l); nightLights.push(l); }
const playerLamp = new THREE.PointLight(0xffd9a0, 0, 16, 1.4); scene.add(playerLamp);

// Olas suaves en el mar (se mueven en la tarjeta gráfica, sin costo para el procesador)
M.sea.onBeforeCompile = sh => {
  sh.uniforms.uTime = { value: 0 };
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float wv = sin(position.x * .06 + uTime * 1.1) * .45 + sin(position.y * .09 + uTime * .8) * .3 + sin((position.x + position.y) * .15 + uTime * 1.7) * .12;
    float shore = clamp((700.0 - position.x) / 60.0, 0.0, 1.0);
    transformed.z += wv * shore - (1.0 - shore) * .1;`);
  M.sea.userData.shader = sh;
};

/* =========================================================
   MUNDO
   ========================================================= */
let world = null;
// Preparar los sombreadores y las texturas por partes para no congelar la pantalla.
// Antes se mandaban a compilar todos de golpe y el celular se quedaba esperando a que terminaran
// en el primer cuadro (varios segundos congelado). Ahora se espera a cada grupo SIN bloquear
// (el teléfono los compila en segundo plano) y se terminan de preparar de a pocos.
const TEX_KEYS = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'alphaMap', 'bumpMap', 'aoMap', 'lightMap'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let warmRT = null; const warmCam = new THREE.PerspectiveCamera();
async function warmShaders(root, cam) {
  // en computadora el mundo se dibuja primero en una imagen intermedia (efectos): preparar esa misma versión
  if (composer && !warmRT) warmRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const prevRT = renderer.getRenderTarget(); renderer.setRenderTarget(warmRT);
  try { await warmShadersNow(root, cam); } finally { renderer.setRenderTarget(prevRT); }
}
async function warmShadersNow(root, cam) {
  const seen = new Set(), batch = [], texs = new Set();
  root.traverse(o => {
    if (!o.material) return; let nuevo = false;
    for (const m of [].concat(o.material)) {
      if (!m) continue;
      for (const k of TEX_KEYS) if (m[k] && m[k].isTexture && !renderer.properties.get(m[k]).__webglTexture) texs.add(m[k]);
      if (!seen.has(m)) { seen.add(m); nuevo = true; }
    }
    if (nuevo) batch.push(o);
  });
  const t0 = performance.now(); let tick = t0;
  const respirar = async () => { if (performance.now() - tick > 25) { await idle(); tick = performance.now(); } };
  // 1) subir las texturas a la tarjeta gráfica de a pocas (antes se subían todas en el primer cuadro)
  for (const t of texs) { try { renderer.initTexture(t); } catch (e) {} await respirar(); if (performance.now() - t0 > 15000) break; }
  // 2) sombreadores: mandar a compilar un grupo pequeño, esperar sin bloquear y terminar de prepararlo
  const progs = new Set();
  let i = 0;
  while (i < batch.length && performance.now() - t0 < 40000) {
    const grupo = new Set(), tg = performance.now();
    while (i < batch.length && performance.now() - tg < 12) {
      const o = batch[i++], vis = o.visible; o.visible = true; // también los objetos que aparecen después
      try { for (const m of renderer.compile(o, cam, scene)) { const pr = renderer.properties.get(m).currentProgram; if (pr && !progs.has(pr)) { progs.add(pr); grupo.add(pr); } } } catch (e) {}
      o.visible = vis;
    }
    const tw = performance.now();
    while ([...grupo].some(pr => !pr.isReady()) && performance.now() - tw < 4000) await sleep(10);
    for (const pr of grupo) { try { pr.getUniforms(); pr.getAttributes(); } catch (e) {} await respirar(); }
    await respirar();
  }
  // 3) dibujar todo el mundo de a pocos en un cuadrito de 1 píxel: así se suben las figuras (geometría),
  //    se preparan las sombras y no queda nada pendiente para cuando el jugador camine (antes daba tirones)
  const luces = []; scene.traverse(o => { if (o.isLight) { luces.push(o); o.layers.enable(2); } });
  const mallas = []; root.traverse(o => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.material) mallas.push(o); });
  warmCam.copy(cam); warmCam.layers.set(2);
  const vp = new THREE.Vector4(); renderer.getViewport(vp);
  let k = 0, porVez = 120;
  try {
    while (k < mallas.length && performance.now() - t0 < 45000) {
      const parte = mallas.slice(k, k + porVez); k += parte.length;
      const fc = parte.map(m => m.frustumCulled);
      for (const m of parte) { m.layers.enable(2); m.frustumCulled = false; }
      const tr = performance.now();
      try {
        if (warmRT) renderer.render(scene, warmCam);
        else { renderer.setViewport(0, 0, 1, 1); renderer.render(scene, warmCam); renderer.setViewport(vp); }
      } catch (e) {}
      parte.forEach((m, j) => { m.layers.disable(2); m.frustumCulled = fc[j]; });
      const d = performance.now() - tr; porVez = d > 30 ? Math.max(20, porVez >> 1) : d < 10 ? Math.min(400, porVez * 2) : porVez;
      await idle(); tick = performance.now();
    }
  } finally { for (const l of luces) l.layers.disable(2); if (!warmRT) renderer.setViewport(vp); }
}
// Mundo en construcción: no se dibuja en pantalla hasta que sus sombreadores estén listos
// (así la portada y el creador de personaje se ven y responden al instante)
const pendingGroups = new Set();
// Pausa breve para que el navegador respire (dibuja la pantalla y atiende los toques) mientras se construye el mundo
// (idle y pace vienen de pace.js: ceden el turno sin la espera mínima de setTimeout)
const ground = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), M.asphalt);
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

async function buildWorld(cfg) {
  if (world) {
    scene.remove(world.group);
    // texturas que se siguen usando fuera de este mundo (jugador, cielo, suelo…): no se liberan
    const keep = new Set(); scene.traverse(o => { if (o.material) for (const m of [].concat(o.material)) if (m) for (const k of TEX_KEYS) if (m[k] && m[k].isTexture) keep.add(m[k]); });
    const freed = new Set();
    world.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (!o.material) return;
      for (const m of [].concat(o.material)) {
        if (!m) continue;
        // antes solo se liberaban unas pocas: cada cambio de nivel dejaba ~100 texturas más en la memoria
        // de la tarjeta gráfica y, tras varios niveles, el celular podía ponerse lento o cerrarse
        for (const k of TEX_KEYS) { const t = m[k]; if (t && t.isTexture && !keep.has(t) && !freed.has(t)) { freed.add(t); t.dispose(); } }
        if (o.userData.own) m.dispose();
      }
    });
  }
  const r = rng(cfg.seed);
  const N = cfg.grid, T = N * PITCH + STREET, O = -T / 2;
  const group = new THREE.Group(); scene.add(group); pendingGroups.add(group); // no se dibuja hasta estar listo
  const colliders = [], blockers = [], coinSpots = [], platSpots = [], npcSpots = [];
  const W = { group, colliders, blockers, N, T, O, coins: [], cars: [], npcs: [], zones: [], lampPts: [] };
  const addBox = (minX, maxX, minZ, maxZ, top, bottom = 0, tag) => colliders.push({ minX, maxX, minZ, maxZ, top, bottom, tag });
  // Árboles de la Biblia: olivo (Salmo 52:8), higuera (Miqueas 4:4), cedro del Líbano (Salmo 92:12), palmera (Salmo 92:12)
  const treeGroup = new THREE.Group();
  async function plantBiblicalTrees(xa, xb, za, zb, count, avoid, kinds) {
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 20) {
      const x = xa + r() * (xb - xa), z = za + r() * (zb - za);
      if (avoid.some(([a1, a2, b1, b2]) => x > a1 && x < a2 && z > b1 && z < b2)) continue;
      if (colliders.some(c => c.top > .8 && c.top < 900 && x > c.minX - 2 && x < c.maxX + 2 && z > c.minZ - 2 && z < c.maxZ + 2)) continue;
      const k = kinds[placed % kinds.length], t = makeTree(k, r); t.position.set(x, 0, z); t.rotation.y = r() * 6; treeGroup.add(t);
      addBox(x - .35, x + .35, z - .35, z + .35, 5); placed++; await pace();
    }
  }
  const floorAtW = (x, z) => { let f = 0; for (const c of colliders) if (c.top < .6 && !c.ramp && x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ && c.top > f) f = c.top; return f; };
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
  // la casa del jugador (junto al inicio) y el edificio de oficinas
  types[0] = 'casa'; types[1] = 'oficinas'; types[2] = 'iglesia';
  if (!types.includes('plaza')) types[types.length - 1] = 'plaza';

  for (let bi = 0; bi < N; bi++) { if (bi) await idle(); for (let bj = 0; bj < N; bj++) { await pace();
    const x0 = O + bi * PITCH + STREET, z0 = O + bj * PITCH + STREET, cx = x0 + BLOCK / 2, cz = z0 + BLOCK / 2;
    const type = types[bi * N + bj];
    W.blocks = W.blocks || []; W.blocks.push([x0, z0, type]);
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
    } else if (type === 'plaza') {
      // Plaza / parque moderno
      // Jardines
      for (const [gx, gz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const gw = 11, gpx = cx + gx * 9.5, gpz = cz + gz * 9.5;
        const gm = box(gw, .5, gw, M.concrete, gpx, CURB + .25, gpz);
        const gr = box(gw - .6, .5, gw - .6, M.grass, gpx, CURB + .3, gpz, { cast: false });
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
          box(s.s + .06, .08, s.s + .06, M.led, sx, CURB + .5 + s.h - .16, sz, { cast: false }); // franja LED bajo el borde (sin tapar la cara de arriba: evita el parpadeo azul)
          addBox(sx - s.s / 2, sx + s.s / 2, sz - s.s / 2, sz + s.s / 2, CURB + .5 + s.h);
          if (k === 2) platSpots.push([sx, sz, CURB + .5 + s.h]);
          else if (k === 0) coinSpots.push([sx, sz, CURB + .5 + s.h]);
        });
      }
      coinSpots.push([cx + 6.5, cz - 6.5, CURB], [cx - 6.5, cz + 6.5, CURB], [cx - 6.5, cz - 6.5, CURB], [cx + 6.5, cz + 6.5, CURB]);
      npcSpots.push([cx, cz - 13], [cx, cz + 13], [cx - 13, cz], [cx + 13, cz]);
    }
  }
  }

  await idle();
  // Calles: líneas, pasos de cebra, monedas
  for (let i = 0; i <= N; i++) { await pace();
    const sc = streetCenters[i];
    for (let j = 0; j < N; j++) {
      const a = O + j * PITCH + STREET, b = a + BLOCK, mid = (a + b) / 2;
      for (const horiz of [true, false]) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(.22, BLOCK - 8), M.dash);
        dash.rotation.x = -Math.PI / 2; if (horiz) dash.rotation.z = Math.PI / 2;
        dash.position.set(horiz ? mid : sc, .05, horiz ? sc : mid); group.add(dash);
        for (const e of [a + 2, b - 2]) {
          const zb = new THREE.Mesh(new THREE.PlaneGeometry(STREET - 1, 3), M.zebra);
          zb.rotation.x = -Math.PI / 2; if (!horiz) zb.rotation.z = 0; else zb.rotation.z = Math.PI / 2;
          zb.position.set(horiz ? e : sc, .045, horiz ? sc : e); group.add(zb);
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
    if (x > O + T || z > O + T || x < O || z < O) continue; // oriente: desierto; sur: arca y valle; occidente: el mar; norte: lugares bíblicos
    const h = 40 + r() * 110, w = 22 + r() * 14;
    building(x, z, w, w, h, (r() * facades.length) | 0);
  }
  addBox(O - BEACH - 1400, O - BEACH - 2, O - NZ - 50, O + T + SZ + 50, 999, 0, 'sea'); addBox(O + T + DES, O + T + DES + 50, O - NZ - 50, O + T + SZ + 50, 999);
  addBox(O - BEACH - 60, O + T + DES + 50, O - NZ - 50, O - NZ, 999); addBox(O - BEACH - 60, O + T + DES + 50, O + T + SZ, O + T + SZ + 50, 999);

  await idle();
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
      W.lampPts.push([x + dx * 1.9, CURB + 6.1, z + dz * 1.9, CURB]);
      addBox(x - .15, x + .15, z - .15, z + .15, 7);
    });
    pole.castShadow = arm.castShadow = true;
    group.add(pole, arm, head);
  }
  await idle();
  // Instanciar árboles
  {
    const n = trees.length;
    // tronco con ramas y copa de varios grupos de hojas (con luz y sombra pintadas: más natural)
    const tg = [new THREE.CylinderGeometry(.12, .18, 2.6, 8)];
    for (const [ry, rz, h] of [[0, .7, .9], [2.1, .65, .8], [4.2, .75, .85]]) { const bg = new THREE.CylinderGeometry(.04, .07, 1.3, 6); bg.translate(0, .65, 0); bg.rotateZ(rz); bg.rotateY(ry); bg.translate(0, h, 0); tg.push(bg); }
    const trunk = new THREE.InstancedMesh(mergeGeometries(tg.map(g => { g.deleteAttribute('uv'); return g; })), M.trunk, n);
    const crown = [];
    const lumps = [[0, 3.0, 0, 1.25], [.85, 2.75, .3, .95], [-.8, 2.85, -.25, .95], [.2, 2.7, -.9, .9], [-.25, 2.8, .9, .9], [.15, 3.85, .1, 1.0], [.6, 3.55, -.5, .75], [-.55, 3.6, .45, .75]];
    for (const [lx, ly, lz, lr] of lumps) {
      const g0 = new THREE.IcosahedronGeometry(lr, 2); g0.deleteAttribute('uv'); g0.deleteAttribute('normal'); const g = mergeVertices(g0), p = g.attributes.position, c = new Float32Array(p.count * 3);
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k), nn = 1 + .16 * Math.sin(x * 5.1 + z * 3.7) * Math.cos(y * 4.3 + x * 2.2);
        p.setXYZ(k, x * nn + lx, y * nn + ly, z * nn + lz);
        const yy = (y * nn + ly - 2.2) / 2.4, ao = THREE.MathUtils.clamp(.45 + yy * .7, .4, 1.15);
        c[k * 3] = ao; c[k * 3 + 1] = ao; c[k * 3 + 2] = ao * .92;
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.computeVertexNormals(); crown.push(g);
    }
    const crownGeo = mergeGeometries(crown);
    const leafV = leafify(M.leaf.clone()); leafV.vertexColors = true; leafV.flatShading = false;
    const fol = new THREE.InstancedMesh(crownGeo, leafV, n);
    const o = new THREE.Object3D(), col = new THREE.Color();
    trees.forEach(([x, z, base], i) => {
      const y0 = base > .7 ? CURB + .5 : CURB;
      const s = .85 + r() * .5, ry = r() * 6;
      o.rotation.set(0, ry, 0); o.scale.set(s, s, s); o.position.set(x, y0 + 1.3 * s, z); o.updateMatrix(); trunk.setMatrixAt(i, o.matrix);
      o.rotation.set(0, ry, 0); o.scale.set(s, s * (1 + r() * .15), s); o.position.set(x, y0, z); o.updateMatrix(); fol.setMatrixAt(i, o.matrix);
      col.setHSL(.22 + r() * .08, .45 + r() * .2, .16 + r() * .08); fol.setColorAt(i, col);
      addBox(x - .2, x + .2, z - .2, z + .2, 6);
    });
    trunk.castShadow = fol.castShadow = true; fol.receiveShadow = true;
    group.add(trunk, fol);
  }

  await idle();
  // ===== Desierto con el tabernáculo y el campamento de Israel =====
  {
    const X0 = O + T, tcx = X0 + DES / 2, tcz = 0;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(DES, T), M.sand); sand.rotation.x = -Math.PI / 2; sand.position.set(tcx, .06, O + T / 2); sand.receiveShadow = true; group.add(sand);
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
      if (z < O + 20) continue; // el camino de la procesión del arca queda libre
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, 6, 8), palmT); tr.position.set(x, 3, z); tr.rotation.z = (r() - .5) * .2; tr.castShadow = true; group.add(tr);
      for (let k = 0; k < 7; k++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(.7, 3.2), palmL); lf.position.set(x, 6, z); lf.rotation.set(-1.0, k / 7 * 6.28, 0, 'YXZ'); lf.geometry.translate(0, 1.5, 0); lf.castShadow = true; group.add(lf); }
      addBox(x - .25, x + .25, z - .25, z + .25, 6);
    }
    await pace();
    const tab = await buildTabernacle({ group, addBox, blockers, cx: tcx, cz: tcz });
    W.tab = tab; W.zones = tab.zones;
    const tb = tab.bounds;
    await pace();
    W.camp = await buildCamp({ group, addBox, cx: tcx, cz: tcz, rnd: r, radiusX: (tb.x1 - tb.x0) / 2 + 18, radiusZ: Math.min((tb.z1 - tb.z0) / 2 + 16, T / 2 - 6) });
    W.desert = { X0, tcx, tcz, tb };
    // sacerdotes, levitas, el arca en procesión y los corderos del sacrificio (desde el nivel Básico)
    await pace();
    W.priests = await buildPriests({ group, tab, r, addBox });
    // los levitas llevan el arca del pacto por el desierto, al norte del campamento (lejos del arca de Noé, que está al sur)
    W.zones.push(W.priests.setProcessionPath({ x0: X0 + 16, x1: X0 + DES - 16, z0: O + 5, z1: O + 12 }));
    { // la procesión camina por una franja de grama verde (un oasis en el desierto) con bordes irregulares que se mezclan con la arena
      const gw = DES - 26, gd = 15, gx = X0 + DES / 2, gz = O + 8.5;
      const gtex = valleyTex.clone(); gtex.repeat.set(gw / 4, gd / 4); gtex.needsUpdate = true;
      const mc = document.createElement('canvas'); mc.width = 512; mc.height = 64; const mg = mc.getContext('2d');
      mg.fillStyle = '#000'; mg.fillRect(0, 0, 512, 64); mg.fillStyle = '#fff';
      for (let i = 0; i < 2600; i++) { const u = Math.random(), v = Math.random(), ex = Math.min(u, 1 - u) * gw, ez = Math.min(v, 1 - v) * gd;
        if (Math.min(ex, ez) > 1.2 + Math.random() * 1.6) { mg.beginPath(); mg.arc(u * 512, v * 64, 1.5 + Math.random() * 3, 0, 6.29); mg.fill(); } }
      mg.fillRect(512 * 2.6 / gw, 64 * 2.6 / gd, 512 * (1 - 5.2 / gw), 64 * (1 - 5.2 / gd));
      const amap = new THREE.CanvasTexture(mc);
      const meadow = new THREE.Mesh(new THREE.PlaneGeometry(gw, gd), new THREE.MeshStandardMaterial({ map: gtex, alphaMap: amap, alphaTest: .5, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      meadow.rotation.x = -Math.PI / 2; meadow.position.set(gx, .07, gz); meadow.receiveShadow = true; group.add(meadow);
      W.meadow = { x0: gx - gw / 2 + 2, x1: gx + gw / 2 - 2, z0: gz - gd / 2 + 2, z1: gz + gd / 2 - 2 };
    }
    // Niños corriendo y jugando en el campamento
    W.kids = [];
    const kidCols = [0xc0392b, 0x2a4a9a, 0xe0a31a, 0x2e7d4f, 0x8a5a9a, 0xd8c6a0];
    for (let k = 0; k < 6; k++) { await pace();
      const girl = k % 2 === 1;
      const kid = createHuman({ detail: .5, gender: girl ? 'f' : 'm', outfit: 'robe', robe: kidCols[k], mantle: null, sash: 0x5a3a1e, hair: girl ? 'long' : 'short', hairColor: [0x2a1a10, 0x4a2a14, 0x1a100a][k % 3], skin: [0xc68e6a, 0xa8714f, 0xb98260][k % 3] });
      kid.root.scale.setScalar(.6); group.add(kid.root);
      const ring = k < 3 ? { cx: tb.x1 + 14, cz: tb.z0 - 6, r: 5 + k * 1.3 } : { cx: tb.x0 - 12, cz: tb.z1 + 6, r: 4 + (k - 3) * 1.5 };
      W.kids.push({ h: kid, ...ring, a: k * 2.1, sp: (k % 2 ? -1 : 1) * (.55 + k * .05), jump: 0 });
    }
    await plantBiblicalTrees(X0 + 6, X0 + DES - 6, O + 8, O + T - 8, 14, [[tb.x0 - 4, tb.x1 + 4, tb.z0 - 4, tb.z1 + 4]], ['olivo', 'palmera', 'higuera']);
    coinSpots.push([tb.x1 + 8, tcz - 14, 0], [tb.x1 + 8, tcz + 14, 0], [tb.x0 - 8, tcz, 0], [tcx + 24, tcz - 10, 0], [tcx + 24, tcz + 10, 0], [tcx - 8, tcz - 13, 0], [tcx - 8, tcz + 13, 0], [X0 + 8, tcz - 20, 0], [X0 + 8, tcz + 20, 0]);
    npcSpots.push([tb.x1 + 10, tcz - 9], [tb.x1 + 10, tcz + 9], [tb.x0 - 10, tcz - 10], [tcx, tb.z0 - 8], [tcx, tb.z1 + 8], [X0 + 6, tcz]);
    W.mosesSpot = [tb.x1 + 5, tcz + 7]; W.aaronSpot = tab.aaronSpot;
    W.treasureSpots = { holy: tab.holyGift, holiest: tab.holiestGift };
  }

  await idle();
  // ===== Al sur: el arca de Noé y el valle de Ela =====
  {
    const Z0 = O + T, Wt = T + DES;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(Wt, SZ), M.valley); grass.rotation.x = -Math.PI / 2; grass.position.set(O + Wt / 2, .06, Z0 + SZ / 2); grass.receiveShadow = true; group.add(grass);
    for (let i = 0; i < 12; i++) { const hl = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.hill); hl.position.set(O + r() * Wt, 0, Z0 + SZ + 20 + r() * 40); hl.scale.set(20 + r() * 25, 6 + r() * 12, 14 + r() * 14); group.add(hl); }
    const ararat = new THREE.Mesh(mountainGeo(170, 210, r), M.rock); ararat.position.set(O + Wt * .3, 100, Z0 + SZ + 320); group.add(ararat);
    const snow = new THREE.Mesh(mountainGeo(54, 66, r, .04), new THREE.MeshStandardMaterial({ color: 0xf4f6fa, roughness: .6 })); snow.position.set(O + Wt * .3, 174, Z0 + SZ + 320); group.add(snow);
    await pace();
    const ark = await buildArk({ group, addBox, addRamp, blockers, x: O + Wt / 2, z: Z0 + SZ - 40, rnd: r });
    await pace();
    const valley = await buildValley({ group, addBox, blockers, x: O + Wt - 38, z: Z0 + 24, rnd: r });
    // El río Jordán, al occidente del valle (Juan el Bautista bautizando: Mateo 3)
    await pace();
    const jordan = await buildJordan({ group, addBox, x: O + 22, z0: Z0 + 3, z1: Z0 + SZ - 3, rnd: r });
    W.ark = ark; W.valley = valley; W.jordan = jordan; W.zones.push(...ark.zones, ...valley.zones, ...jordan.zones);
    W.johnSpot = jordan.johnSpot; W.johnPos = jordan.johnPos;
    W.south = { Z0, Wt, arkX: O + Wt / 2, arkZ: Z0 + SZ - 40 };
    await plantBiblicalTrees(O + 8, O + Wt - 8, Z0 + 8, Z0 + SZ - 6, 22, [[O + Wt / 2 - 80, O + Wt / 2 + 80, Z0 + 20, Z0 + SZ], [O + Wt - 75, O + Wt, Z0, Z0 + 52], [O, O + 46, Z0, Z0 + SZ]], ['olivo', 'cedro', 'higuera', 'olivo']);
    W.noahSpot = ark.noahSpot; W.davidSpot = valley.davidSpot; W.davidNPC = valley.davidNPC;
    coinSpots.push([O + Wt / 2 - 40, Z0 + 30, 0], [O + Wt / 2 + 20, Z0 + 30, 0], [O + Wt / 2 - 10, Z0 + 12, 0], [O + Wt - 38 - 14, Z0 + 10, 0], [O + Wt - 38 - 14, Z0 + 38, 0], [O + 6, Z0 + 20, 0], [O + Wt / 2 + 60, Z0 + 40, 0]);
    npcSpots.push([O + 44, Z0 + 30], [O + Wt / 2 + 30, Z0 + 20]);
  }

  await idle();
  // ===== Al occidente: la playa, el mar, el muelle y el barco =====
  {
    const SX = O - BEACH, Zc = O + T / 2, Zlen = T + SZ + 120;
    ground.position.set(SX + 800, 0, 0); // el asfalto termina en la playa
    const beach = new THREE.Mesh(new THREE.PlaneGeometry(BEACH, T + SZ + NZ), M.beach); beach.rotation.x = -Math.PI / 2; beach.position.set(O - BEACH / 2, .08, O + (T + SZ - NZ) / 2); beach.receiveShadow = true; group.add(beach);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, Zlen + 800, 140, 160), M.sea); sea.rotation.x = -Math.PI / 2; sea.position.set(SX - 700, -.25, O + (T + SZ) / 2); sea.receiveShadow = true; sea.userData.live = true; group.add(sea);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(2.2, T + SZ + NZ + 4), M.foam); foam.rotation.x = -Math.PI / 2; foam.position.set(SX + .6, .12, O + (T + SZ - NZ) / 2); foam.userData.live = true; group.add(foam); W.foam = foam;
    // palmeras en la playa
    const palmT = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: .9 }), palmL = new THREE.MeshStandardMaterial({ color: 0x3f7a2a, roughness: .8, side: THREE.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const px = O - 6 - r() * (BEACH - 14), pz = O + 6 + r() * (T + SZ - 12); if (Math.abs(pz - Zc) < 8) continue;
      const tr = new THREE.Mesh(new THREE.CylinderGeometry(.14, .22, 7, 8), palmT); tr.position.set(px, 3.5, pz); tr.rotation.z = (r() - .5) * .25; tr.castShadow = true; group.add(tr);
      for (let k = 0; k < 7; k++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(.7, 3.4), palmL); lf.geometry.translate(0, 1.6, 0); lf.position.set(px, 7, pz); lf.rotation.set(-1.0, k / 7 * 6.28, 0, 'YXZ'); lf.castShadow = true; group.add(lf); }
      addBox(px - .25, px + .25, pz - .25, pz + .25, 7);
    }
    // Gente en la playa: familias sobre toallas bajo sombrillas, personas conversando, bañistas en la orilla y niños jugando
    {
      W.beachFolk = []; W.kids = W.kids || [];
      const BSK = [0xf1cbb0, 0xe8b896, 0xc68e6a, 0xa8714f, 0x8a5636, 0x5e3a24];
      const shirts = [0xe74c3c, 0x2e86de, 0xf1c40f, 0x16a085, 0xffffff, 0xff7f50, 0x8e44ad, 0x1abc9c];
      const shorts = [0x1f3a5f, 0x2c3e50, 0x6d8a9e, 0xc0a080, 0x34495e];
      const spots = [O - 30, O - 22, O - 14].flatMap(x => [Zc - 46, Zc - 26, Zc + 22, Zc + 44, Zc + 70].map(z => [x + (r() - .5) * 4, z + (r() - .5) * 8])).filter(([, z]) => z > O + 6 && z < O + T + SZ - 6);
      const umbCols = [0xe74c3c, 0x2e86de, 0xf1c40f, 0x16a085, 0xff7f50];
      const poleM = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: .5, metalness: .3 });
      const person = (k, extra = {}) => createHuman({ detail: .45, gender: k % 2 ? 'f' : 'm', skin: BSK[(r() * 6) | 0], top: shirts[(r() * shirts.length) | 0], topStyle: 'camiseta', pants: shorts[(r() * shorts.length) | 0], hair: k % 2 ? (r() < .5 ? 'long' : 'ponytail') : 'short', hairColor: [0x1d130c, 0x3a2314, 0x6a4a2a, 0x0e0a08][(r() * 4) | 0], ...extra });
      spots.slice(0, 7).forEach(([x, z], i) => {
        // sombrilla y toalla
        const um = new THREE.Group(); um.position.set(x, 0, z); group.add(um);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, 2.4, 6), poleM); pole.position.y = 1.2; um.add(pole);
        const top = new THREE.Mesh(new THREE.ConeGeometry(1.5, .55, 12, 1, true), new THREE.MeshStandardMaterial({ color: umbCols[i % umbCols.length], roughness: .8, side: THREE.DoubleSide })); top.position.y = 2.45; top.castShadow = true; um.add(top);
        const towel = new THREE.Mesh(new THREE.PlaneGeometry(.9, 1.9), new THREE.MeshStandardMaterial({ color: shirts[(i * 3) % shirts.length], roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); towel.rotation.x = -Math.PI / 2; towel.position.set(x + 1, .1, z); group.add(towel);
        addBox(x - .1, x + .1, z - .1, z + .1, 2.4);
        // una persona acostada tomando el sol (boca arriba sobre la toalla)
        if (i % 2 === 0) {
          const h = person(i); for (const a of h.arms) { a.shoulder.rotation.x = -2.6; a.elbow.rotation.x = -1.2; }
          const b = bakeStatic(h.root); b.rotation.x = -Math.PI / 2; b.position.set(x + 1, .2, z + .9); group.add(b);
        }
        // personas conversando de pie junto a la sombrilla
        const n = i % 2 === 0 ? 1 : 2;
        for (let j = 0; j < n; j++) {
          const h = person(i + j + 1); const px = x - .9 - j * 1.1, pz = z + (j ? .9 : -.6);
          h.root.position.set(px, .08, pz); h.root.rotation.y = j ? Math.PI * .8 : -Math.PI * .3 + (n === 1 ? 0 : .5); group.add(h.root);
          W.beachFolk.push({ h, x: px, z: pz, female: h.opts.gender === 'f', talk: Math.random() * 4, gesture: Math.random() * 6 });
        }
      });
      // bañistas de pie en la orilla, con el agua a la cintura
      for (let k = 0; k < 4; k++) { await pace();
        const h = person(k + 3); const px = SX - 4 - r() * 2, pz = Zc + (k < 2 ? -30 - k * 9 : 28 + k * 8);
        h.root.position.set(px, -.95, pz); h.root.rotation.y = r() * 6.28; group.add(h.root);
        W.beachFolk.push({ h, x: px, z: pz, female: h.opts.gender === 'f', talk: Math.random() * 4, gesture: Math.random() * 6, water: true });
      }
      // niños jugando y corriendo en la arena (con sus risas y voces)
      const kidC = [0xff5e57, 0x3ec1d3, 0xffd32a, 0x7bed9f, 0xff9ff3, 0x70a1ff];
      for (let k = 0; k < 6; k++) { await pace();
        const girl = k % 2 === 1;
        const kid = createHuman({ detail: .45, gender: girl ? 'f' : 'm', top: kidC[k], topStyle: 'camiseta', pants: shorts[k % shorts.length], hair: girl ? 'ponytail' : 'short', hairColor: [0x2a1a10, 0x4a2a14, 0x1a100a][k % 3], skin: BSK[(k * 2 + 1) % 6] });
        kid.root.scale.setScalar(.6); group.add(kid.root);
        const ring = k < 3 ? { cx: O - 18, cz: Zc - 36, r: 3 + k * 1.4 } : { cx: O - 20, cz: Zc + 34, r: 2.5 + (k - 3) * 1.6 };
        W.kids.push({ h: kid, ...ring, a: k * 2.1, sp: (k % 2 ? -1 : 1) * (.7 + k * .06), jump: 0 });
      }
      // pelota de playa que rebota entre los niños
      const ballTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d'); ['#ff4757', '#ffffff', '#1e90ff', '#ffffff', '#ffd32a', '#ffffff'].forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 128 / 6, 0, 128 / 6 + 1, 64); }); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(.22, 16, 12), new THREE.MeshStandardMaterial({ map: ballTex, roughness: .4 })); ball.castShadow = true; group.add(ball);
      W.beachBall = { obj: ball, cx: O - 18, cz: Zc - 36 };
    }
    // muelle de madera
    const pierLen = 70, pz0 = Zc, pierX1 = SX + 2, pierX0 = SX - pierLen;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(pierLen + 2, .3, 4.4), M.wood); deck.position.set((pierX0 + pierX1) / 2, .45, pz0); deck.castShadow = deck.receiveShadow = true; group.add(deck);
    for (let i = 0; i <= 14; i++) for (const sz of [-1, 1]) { const pst = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, 2.4, 8), M.woodDark); pst.position.set(pierX0 + i * pierLen / 14, -.6, pz0 + sz * 2.1); group.add(pst); if (i % 2 === 0) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.1, 6), M.woodDark); rail.position.set(pierX0 + i * pierLen / 14, 1.1, pz0 + sz * 2.1); group.add(rail); } }
    for (const sz of [-1, 1]) { const rope = new THREE.Mesh(new THREE.BoxGeometry(pierLen, .08, .08), M.woodDark); rope.position.set((pierX0 + pierX1) / 2, 1.5, pz0 + sz * 2.1); group.add(rope); }
    addBox(pierX0 - 1, pierX1 + 2, pz0 - 2.2, pz0 + 2.2, .6);
    W.pier = { minX: pierX0 - 1.5, maxX: pierX1 + 2, minZ: pz0 - 2.7, maxZ: pz0 + 2.7 };
    addBox(pierX0 - 1, pierX1 - 2, pz0 - 2.6, pz0 - 2.2, 999); addBox(pierX0 - 1, pierX1 - 2, pz0 + 2.2, pz0 + 2.6, 999);
    // yate moderno que el jugador puede manejar
    await pace();
    const ship = buildYacht(); const shipX = pierX0 - 16, deckY = 1.05;
    ship.position.set(shipX, 0, pz0); group.add(ship); W.ship = ship;
    ship.traverse(m => { if (m.isMesh && m.userData.block) blockers.push(m); });
    addBox(shipX - 15, shipX + 15.2, pz0 - 3.4, pz0 + 3.4, deckY, 0, 'ship');
    addBox(shipX - 15, shipX + 14, pz0 - 4.2, pz0 - 3.4, 999, 0, 'ship'); addBox(shipX - 15, shipX + 14, pz0 + 3.4, pz0 + 4.2, 999, 0, 'ship'); addBox(shipX - 17, shipX - 15, pz0 - 4.2, pz0 + 4.2, 999, 0, 'ship');
    W.boat = { home: new THREE.Vector3(shipX, 0, pz0), heading: 0, speed: 0, away: false, deckY, minX: SX - 620, maxX: shipX, minZ: O - NZ - 150, maxZ: O + T + SZ + 150 };
    // islas y veleros a lo lejos
    // islas: se puede nadar hasta ellas y subirlas; el barco no las atraviesa
    W.islands = [];
    for (let i = 0; i < 6; i++) {
      const rad = 30 + r() * 50, h = 20 + r() * 40, ix = SX - 260 - r() * 400, iz = O + (r() - .3) * (T + SZ + 400);
      if (W.islands.some(o => Math.hypot(o.x - ix, o.z - iz) < o.rad * .7 + rad * .7 + 8)) continue; // que no se encimen
      const isl = new THREE.Mesh(mountainGeo(rad, h, r, .2), M.island); isl.position.set(ix, 0, iz); isl.receiveShadow = true; group.add(isl);
      W.islands.push({ x: ix, z: iz, rad, h, wl: rad * Math.pow(.5, .75) });
    }
    W.sails = [];
    for (let i = 0; i < 5; i++) { const sb = buildShip(.35); bakeInPlace(sb, [], false); sb.position.set(SX - 150 - r() * 300, 0, O + r() * (T + SZ)); sb.rotation.y = r() * 6; sb.userData.live = true; group.add(sb); W.sails.push({ obj: sb, a: r() * 6, r: 30 + r() * 40, cx: sb.position.x, cz: sb.position.z }); }
    { const sb = buildShip(.8); bakeInPlace(sb, [], true); sb.userData.live = true; group.add(sb); W.sails.push({ obj: sb, a: 0, r: 70, cx: SX - 140, cz: Zc + 40, speed: .05, near: true }); }
    W.seaInfo = { SX, Zc, shipX, deckY };
    // gaviotas que planean en círculos sobre el muelle y el mar, aleteando de vez en cuando
    W.gulls = [];
    { const gW = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: .8 }), gG = new THREE.MeshStandardMaterial({ color: 0x8a9099, roughness: .8 }), gB = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: .6 });
      const bodyGeo = new THREE.SphereGeometry(.13, 8, 6).scale(1, .8, 2.3), wingGeo = new THREE.BoxGeometry(.62, .02, .22).translate(.31, 0, 0), tipGeo = new THREE.BoxGeometry(.28, .018, .16).translate(.14, 0, 0), beakGeo = new THREE.ConeGeometry(.03, .12, 5).rotateX(Math.PI / 2);
      for (let i = 0; i < 7; i++) {
        const g = new THREE.Group(); g.userData.live = true;
        g.add(new THREE.Mesh(bodyGeo, gW)); const bk = new THREE.Mesh(beakGeo, gB); bk.position.set(0, .02, .34); g.add(bk);
        const wings = [];
        for (const sd of [-1, 1]) { const w = new THREE.Group(); w.position.set(sd * .08, .04, 0); w.scale.x = sd; const wm = new THREE.Mesh(wingGeo, gW); w.add(wm); const tp = new THREE.Mesh(tipGeo, gG); tp.position.x = .6; w.add(tp); g.add(w); w.userData.sd = sd; wings.push(w); }
        group.add(g);
        W.gulls.push({ obj: g, wings, cx: (i < 4 ? pierX0 + 10 : SX - 60 - Math.random() * 60) + (Math.random() - .5) * 20, cz: pz0 + (Math.random() - .5) * 30, rad: 9 + Math.random() * 14, y: 7 + Math.random() * 8, a: Math.random() * 6.28, sp: (Math.random() < .5 ? -1 : 1) * (.25 + Math.random() * .2), ph: Math.random() * 10 });
      } }
    W.zones.push({ id: 'mar', name: 'El mar y el barco', minX: shipX - 18, maxX: SX + 4, minZ: pz0 - 6, maxZ: pz0 + 6, pri: 3,
      text: 'Dios tiene poder sobre el mar, como lo vieron Jonás, los discípulos de Jesús y Pablo.',
      ref: 'Jonás 1:3-4; Marcos 4:35-41; Hechos 27:22-25' });
    coinSpots.push([SX - 30, pz0, .6], [O - 20, O + 20, 0], [O - 20, O + T - 20, 0], [O - 12, O + T + 40, 0]);
    npcSpots.push([O - 16, pz0 + 9], [O - 16, O + T + 20]);
    W.treasureSpots = Object.assign(W.treasureSpots || {}, { ship: [shipX + 8, pz0, deckY], ship2: [shipX - 2.5, pz0 - 1.6, deckY] });
  }

  await idle();
  // ===== Al norte: lugares bíblicos (algunos se abren al pasar niveles) =====
  {
    await pace();
    const pl = await buildPlaces({ group, addBox, blockers, x0: O, x1: O + T + DES, zN: O - NZ, zS: O, unlocked: save.unlocked, rnd: r, levelNames: LEVELS.map(l => l.name) });
    W.places = pl.places; W.placeLive = pl.live; W.zones.push(...pl.zones);
    const lockedP = pl.places.filter(p => p.locked);
    pl.coins.filter(c => !lockedP.some(p => c[0] > p.x0 && c[0] < p.x1)).forEach(c => coinSpots.push(c));
    W.treasureSpots = Object.assign(W.treasureSpots || {}, pl.treasures);
    W.north = { zN: O - NZ, zS: O };
    await plantBiblicalTrees(O + 4, O + T + DES - 4, O - NZ + 6, O - NZ + 14, 18, [], ['cedro', 'olivo', 'palmera']);
  }

  await idle();
  // Vida en la ciudad: peatones, niños, comerciantes, casa del jugador y oficinas
  W.life = await buildLife({ W, group, addBox, addRamp, blockers, M, r, CURB, BLOCK, blocks: W.blocks, playerName: (save.player && save.player.name) || '', npcSpots });
  // Cochera moderna con autos de lujo junto a la casa (se conducen desde el nivel Intermedio)
  W.lux = [];
  if (W.house) {
    const h = W.house, gx0 = h.minX - 8.6, gx1 = h.minX - 1.2, gz0 = h.cz - 4.5, gz1 = h.cz + 5;
    buildCarport(group, gx0, gx1, gz0, gz1, CURB);
    const drive = new THREE.Mesh(new THREE.BoxGeometry(gx1 - gx0, .05, gz0 - (h.cz - BLOCK / 2) + .2), new THREE.MeshStandardMaterial({ color: 0xa9acaf, roughness: .85 }));
    drive.position.set((gx0 + gx1) / 2, CURB + .025, (gz0 + h.cz - BLOCK / 2) / 2); drive.receiveShadow = true; group.add(drive);
    for (const [mk, col, x] of [[makeSportsCar, 0xf4f5f7, gx0 + 2.1], [makePickup, 0xf4f5f7, gx1 - 2.2]]) {
      const car = mk(col); car.position.set(x, CURB, h.cz + .6); car.rotation.y = Math.PI; group.add(car);
      W.lux.push({ obj: car, heading: Math.PI, speed: 0, steer: 0, ...car.userData });
    }
  }
  await idle();
  { const cb = W.blocks.find(b => b[2] === 'iglesia'); if (cb) { W.church = await buildChurch({ group, addBox, addRamp, blockers, block: cb, CURB, BLOCK, r, acts: W.life.acts, fx: k => W.life.fx(k) }); W.zones.push(...W.church.zones); } }

  await idle();
  // Faroles de aceite fuera de la ciudad: playa, muelle, desierto, valle y lugares bíblicos (para ver de noche)
  {
    const pts = [], free = (x, z) => !colliders.some(c => c.top > .3 && x > c.minX - 1.2 && x < c.maxX + 1.2 && z > c.minZ - 1.2 && z < c.maxZ + 1.2);
    const add = (x, z) => { if (free(x, z) && pts.every(q => Math.hypot(q[0] - x, q[1] - z) > 9)) pts.push([x, z]); };
    if (W.seaInfo) { const si = W.seaInfo; for (let z = O + 8; z < O + T + SZ - 6; z += 18) add(O - 4, z); for (let x = si.SX - 64; x < si.SX; x += 14) add(x, si.Zc + (Math.round(x / 14) % 2 ? 2.7 : -2.7)); }
    if (W.desert) { const d = W.desert; for (let x = d.X0 + 6; x < d.X0 + DES - 4; x += 16) { add(x, O + 4); add(x, O + T - 4); } for (let z = O + 10; z < O + T - 8; z += 16) add(d.X0 + 3, z); const tb = d.tb; for (const [x, z] of [[tb.x0 - 3, tb.z0 - 3], [tb.x1 + 3, tb.z0 - 3], [tb.x0 - 3, tb.z1 + 3], [tb.x1 + 3, tb.z1 + 3], [tb.x1 + 4, d.tcz - 5], [tb.x1 + 4, d.tcz + 5]]) add(x, z); }
    if (W.south) { const so = W.south; for (let x = O + 6; x < O + so.Wt - 4; x += 16) { add(x, so.Z0 + 4); add(x, so.Z0 + 30); } add(so.arkX - 6, so.arkZ - 16); add(so.arkX + 6, so.arkZ - 16); }
    if (W.north) { const nn = W.north; for (let x = O + 6; x < O + T + DES - 4; x += 16) { add(x, nn.zS - 4); add(x, nn.zN + NZ / 2); } }
    if (pts.length) {
      const postM = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: .85 });
      const post = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .1, 3.2, 8), postM, pts.length);
      const cg1 = new THREE.BoxGeometry(.42, .07, .42); cg1.translate(0, .25, 0); const cg2 = new THREE.BoxGeometry(.34, .05, .34); cg2.translate(0, -.2, 0);
      const cage = new THREE.InstancedMesh(mergeGeometries([cg1, cg2]), M.darkMetal, pts.length);
      const flame = new THREE.InstancedMesh(new THREE.BoxGeometry(.26, .32, .26), M.lamp, pts.length);
      const o = new THREE.Object3D();
      pts.forEach(([x, z], i) => {
        const y0 = floorAtW(x, z);
        o.position.set(x, y0 + 1.6, z); o.updateMatrix(); post.setMatrixAt(i, o.matrix);
        o.position.set(x, y0 + 3.4, z); o.updateMatrix(); cage.setMatrixAt(i, o.matrix);
        o.position.set(x, y0 + 3.4, z); o.scale.set(1.05, 1.02, 1.05); o.updateMatrix(); flame.setMatrixAt(i, o.matrix); o.scale.set(1, 1, 1);
        addBox(x - .14, x + .14, z - .14, z + .14, 3.6);
        W.lampPts.push([x, y0 + 3.4, z, y0]);
      });
      post.castShadow = true;
      group.add(post, cage, flame);
    }
    // Círculos de luz en el suelo bajo cada farol (solo de noche)
    const lp = W.lampPts;
    if (lp.length) {
      const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), lightPoolMat, lp.length);
      const o = new THREE.Object3D(); o.rotation.x = -Math.PI / 2;
      lp.forEach(([x, y, z, f], i) => { o.position.set(x, f + .14, z); o.scale.set(11, 11, 1); o.updateMatrix(); pool.setMatrixAt(i, o.matrix); });
      pool.renderOrder = 2; pool.frustumCulled = false; pool.visible = save.time === 'noche'; W.lightPools = pool; group.add(pool);
    }
  }

  await idle();
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
  const makeCoin = (p, i, extra = {}) => {
    const g = new THREE.Group();
    const coin = new THREE.Group();
    const c = new THREE.Mesh(coinMerged, M.gold); c.castShadow = true;
    coin.add(c);
    const glow = new THREE.Sprite(M.glow); glow.scale.set(2.4, 2.4, 1);
    const beam = new THREE.Mesh(beamGeo, M.beam); beam.position.y = 20;
    g.add(coin, glow, beam);
    g.position.set(p[0], p[2] + 1.1, p[1]);
    group.add(g);
    const c0 = { g, coin, x: p[0], z: p[1], y: p[2] + 1.1, taken: false, phase: i * .9, ...extra };
    W.coins.push(c0); return c0;
  };
  pick.forEach((p, i) => makeCoin(p, i));

  // Monedas en el barco (viajan con él) y, desde el nivel Intermedio, monedas en alta mar para buscarlas navegando
  if (W.seaInfo && W.boat) {
    const si = W.seaInfo, b = W.boat;
    for (const [lx, lz] of [[6.5, 1.7], [1.5, -1.8], [-4.5, 1.6]]) makeCoin([b.home.x + lx, b.home.z + lz, si.deckY], W.coins.length, { ship: [lx, lz, si.deckY] });
    if (cfg.idx >= 1) {
      const n = 3 + cfg.idx;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 1.6 - .8 + (r() - .5) * .3, d = 70 + r() * 110; makeCoin([si.SX - 25 - Math.cos(a) * d, si.Zc + Math.sin(a) * d, -.2], W.coins.length, { sea: true }); }
    }
  }

  await idle();
  // Relojes: tómalos para ganar más tiempo (en todos los niveles)
  W.clocks = [];
  {
    const faceTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(64, 64, 62, 0, 7); g.fill(); g.strokeStyle = '#1a2a44'; g.lineWidth = 5;
      for (let h = 0; h < 12; h++) { const a = h / 12 * Math.PI * 2; g.beginPath(); g.moveTo(64 + Math.sin(a) * 48, 64 - Math.cos(a) * 48); g.lineTo(64 + Math.sin(a) * 56, 64 - Math.cos(a) * 56); g.stroke(); }
      g.fillStyle = '#1a2a44'; g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+15', 64, 88);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const faceM = new THREE.MeshStandardMaterial({ map: faceTex, emissive: 0xffffff, emissiveMap: faceTex, emissiveIntensity: .35, roughness: .4 });
    const rimM = new THREE.MeshStandardMaterial({ color: 0x4fc3ff, metalness: .6, roughness: .25, emissive: 0x1a6aa0, emissiveIntensity: .6 });
    const handM = new THREE.MeshStandardMaterial({ color: 0x1a2a44, roughness: .5 });
    const faceG = new THREE.CircleGeometry(.5, 40), rimG = new THREE.TorusGeometry(.52, .07, 10, 40), bellG = new THREE.SphereGeometry(.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const nClocks = 3 + cfg.idx;
    const cpool = coinSpots.filter(p => Math.hypot(p[0] - startX, p[1] - startZ) > 12 && W.coins.every(c => Math.hypot(c.x - p[0], c.z - p[1]) > 5)).sort(() => r() - .5);
    const mkClock = (x, y, z) => {
      const g = new THREE.Group(), body = new THREE.Group();
      const f1 = new THREE.Mesh(faceG, faceM); f1.position.z = .03; const f2 = new THREE.Mesh(faceG, faceM); f2.rotation.y = Math.PI; f2.position.z = -.03;
      const rim = new THREE.Mesh(rimG, rimM); rim.castShadow = true;
      const hh = new THREE.Mesh(new THREE.BoxGeometry(.05, .26, .02), handM); hh.position.set(0, .11, .05);
      const hm = new THREE.Mesh(new THREE.BoxGeometry(.04, .36, .02), handM); hm.position.set(.12, .1, .052); hm.rotation.z = -.9;
      for (const sx of [-1, 1]) { const bl = new THREE.Mesh(bellG, rimM); bl.position.set(sx * .3, .5, 0); bl.rotation.z = -sx * .5; body.add(bl); }
      body.add(f1, f2, rim, hh, hm);
      const glow = new THREE.Sprite(M.glow); glow.material = M.glow; glow.scale.set(2.2, 2.2, 1);
      g.add(body, glow); g.position.set(x, y + 1.2, z); group.add(g);
      const c = { g, body, x, z, y: y + 1.2, taken: false, phase: W.clocks.length * 1.3 }; W.clocks.push(c); return c;
    };
    for (const p of cpool) { await pace();
      if (W.clocks.length >= nClocks) break;
      if (W.clocks.some(c => Math.hypot(c.x - p[0], c.z - p[1]) < 30)) continue;
      mkClock(p[0], p[2], p[1]);
    }
    // 3 relojes más sobre la cubierta del barco (viajan con él)
    if (W.boat && W.ship) for (const [lx, lz] of [[11, 1.4], [3, -1.6], [-4, 1.6]]) {
      const c = mkClock(W.boat.home.x + lx, W.boat.deckY, W.boat.home.z + lz); c.ship = [lx, lz];
    }
  }

  await idle();
  // Personajes bíblicos
  {
    const defs = forLevel(cfg.idx + 1);
    const spots = npcSpots.filter(p => Math.hypot(p[0] - startX, p[1] - startZ) > 10 && pick.every(c => Math.hypot(c[0] - p[0], c[1] - p[1]) > 2.2)).sort(() => r() - .5);
    const used = [];
    for (const def of defs) { await pace();
      let sp;
      if (def.id === 'moises') sp = W.mosesSpot;
      else if (def.spot === 'noah') sp = W.noahSpot;
      else if (def.spot === 'david') sp = W.davidSpot;
      else if (def.spot === 'aaron') sp = W.aaronSpot;
      else if (def.spot === 'jordan' && W.johnSpot) sp = W.johnSpot;
      else sp = spots.find(p => used.every(u => Math.hypot(u[0] - p[0], u[1] - p[1]) > 12)) || spots.find(p => !used.includes(p));
      if (!sp) continue; used.push(sp);
      // Juan el Bautista es el que está bautizando en el río (no un segundo Juan en la orilla): el regalo flota sobre él
      const inRiver = def.spot === 'jordan' && W.johnPos && sp === W.johnSpot;
      const g = new THREE.Group(); g.position.set(inRiver ? W.johnPos[0] : sp[0], 0, inRiver ? W.johnPos[1] : sp[1]);
      const body = def.spot === 'david' || inRiver ? null : createCharacter(def); if (body) g.add(body);
      const lyK = def.scale ? .5 : inRiver ? .55 : 0;
      if (!inRiver) { const label = nameSprite(def.name, def.kind); label.position.y = 2.25 - lyK; g.add(label); }
      const gift = giftBox(); gift.position.y = 2.75 - lyK; g.add(gift);
      const glow = new THREE.Sprite(M.glow); glow.scale.set(1.4, 1.4, 1); glow.position.y = 2.75 - lyK; g.add(glow);
      g.rotation.y = Math.atan2(startX - sp[0], startZ - sp[1]);
      group.add(g);
      if (def.spot !== 'david' && !inRiver) addBox(sp[0] - .35, sp[0] + .35, sp[1] - .35, sp[1] + .35, 1.8);
      W.npcs.push({ def, g, body, gift, glow, x: sp[0], z: sp[1], given: false, fixed: def.spot === 'david' || inRiver, gy: 2.75 - lyK });
    }
    // Regalos especiales: Lugar Santo, Lugar Santísimo y el barco
    for (const def of TREASURES) { await pace();
      const sp = W.treasureSpots && W.treasureSpots[def.spot]; if (!sp) continue;
      const y0 = sp[2] || 0;
      const g = new THREE.Group(); g.position.set(sp[0], y0, sp[1]);
      const label = nameSprite(def.gift, def.name); label.position.y = 1.65; label.scale.set(1.1, .28, 1); g.add(label);
      const gift = giftBox(); gift.position.y = 1.0; gift.scale.setScalar(1.3); g.add(gift);
      const glow = new THREE.Sprite(M.glow); glow.scale.set(1.6, 1.6, 1); glow.position.y = 1.0; g.add(glow);
      group.add(g);
      const onShip = def.spot.startsWith('ship') && W.boat ? [sp[0] - W.boat.home.x, sp[1] - W.boat.home.z] : null;
      W.npcs.push({ def, g, body: null, gift, glow, x: sp[0], z: sp[1], y: y0, given: false, fixed: true, treasure: true, gy: 1.0, ship: onShip });
    }
  }

  await idle();
  // Autos (solo en calles horizontales para evitar choques entre ellos)
  const carColors = [0xd7261e, 0x1f4fbf, 0xf1f1f1, 0x111215, 0x9aa3ad, 0x0f6d5f, 0xe0a31a];
  for (let k = 0; k < cfg.cars; k++) { await pace();
    const lane = streetCenters[(r() * streetCenters.length) | 0];
    const dir = r() < .5 ? 1 : -1;
    const car = makeCar(carColors[(r() * carColors.length) | 0]);
    car.position.set(O + r() * T, 0, lane + dir * 3.2);
    car.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(car);
    W.cars.push({ obj: car, dir, speed: cfg.carSpeed * (.8 + r() * .4), min: O - 10, max: O + T + 3 });
  }
  await idle();
  // Unir todas las piezas fijas de la ciudad en pocas mallas (muchas menos llamadas de dibujo)
  { treeGroup.updateMatrixWorld(true); group.add(bakeStatic(treeGroup)); }
  await idle();
  {
    const S = new THREE.Group();
    for (const o of group.children.slice()) if (o.isMesh && !o.isInstancedMesh && !o.userData.live) S.add(o);
    S.updateMatrixWorld(true);
    const baked = bakeStatic(S); group.add(baked);
    W.staticMeshes = S.children.length;
  }
  await idle();
  // cuerpos móviles con su tamaño
  const BODY_R = { elefante: 1.5, jirafa: .9, camello: 1.1, caballo: .9, oso: .9, cebra: .8, leon: .8, leona: .75, ciervo: .65, oveja: .55, mono: .35, gallo: .25, gallina: .25 };
  W.dyn = [];
  if (W.ark) for (const a of W.ark.lodItems) if (a.userData && a.userData.kind) W.dyn.push({ obj: a, r: BODY_R[a.userData.kind] || .6, ark: true });
  if (W.kids) for (const kd of W.kids) W.dyn.push({ obj: kd.h.root, r: .28 });
  if (W.beachFolk) for (const bf of W.beachFolk) W.dyn.push({ obj: bf.h.root, r: .3 });
  if (W.life) for (const w of W.life.walkers) W.dyn.push({ obj: w.h.root, r: .3 });
  // Lista de objetos que se ocultan cuando quedan lejos de la cámara
  W.lod = [];
  for (const n of W.npcs) W.lod.push({ obj: n.g, range: 130 });
  if (W.valley) W.lod.push({ obj: W.valley.group, range: 190, center: new THREE.Vector3(W.valley.goliathPos[0], 0, W.valley.goliathPos[1]) });
  if (W.ark) for (const a of W.ark.lodItems) W.lod.push({ obj: a, range: 110, animal: true });
  if (W.ark) for (const a of W.ark.insideItems) W.lod.push({ obj: a, range: 70 });
  for (const c of W.cars) W.lod.push({ obj: c.obj, range: 170 });
  await idle();
  W.humanLOD = [];
  await idle();
  W.cull = buildCull(group);
  W.start = new THREE.Vector3(startX, 0, startZ);
  W.startYaw = Math.atan2(-startX, -startZ);
  return W;
}

/* Ocultado por distancia (carga y fluidez en celulares):
   cada objeto pequeño o mediano del mundo deja de dibujarse (y de proyectar sombra) cuando queda lejos de la cámara.
   Lo grande (suelo, mar, montañas, edificios) se ve siempre. Se usa la capa 1 de three.js para no tocar "visible". */
const CULL_K = isTouch ? 1 : 1.8;
const _cb = new THREE.Box3(), _cs = new THREE.Sphere(), _ci = new THREE.Matrix4(), _cv = new THREE.Vector3();
// pieza diminuta bajo el suelo para que el material de las personas lejanas se prepare junto con los demás
{ const g = new THREE.BoxGeometry(.01, .01, .01); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3)); const m = new THREE.Mesh(g, FAR_MAT); m.position.y = -40; m.receiveShadow = true; m.frustumCulled = false; scene.add(m); }
const LOD_FAR = isTouch ? 16 : 22, LOD_HIDE = isTouch ? 110 : 170, _lv = new THREE.Vector3();
// Personas lejanas: una versión sencilla (una sola pieza, sin dedos) en la misma postura.
// Se prepara DESPUÉS de mostrar el mundo, de a poquito, para no alargar la carga ni congelar la pantalla.
let lodJob = 0;
async function buildHumanLOD(W, fast = false) {
  const job = ++lodJob;
  const roots = []; W.group.traverse(o => { if (((o.userData.isHuman && o.userData.hum) || o.userData.bakedHum) && !o.userData.noLOD && !o.userData.hasLOD) roots.push(o); });
  const cp = (a, b) => { if (a && b) { b.position.copy(a.position); b.rotation.copy(a.rotation); b.scale.copy(a.scale); } };
  // los más cercanos al jugador primero
  roots.sort((a, b) => a.getWorldPosition(_lv).distanceToSquared(P.pos) - b.getWorldPosition(_lv).distanceToSquared(P.pos));
  let t0 = performance.now();
  for (const root of roots) {
    // se trabaja ~6 ms por cuadro y luego se cede el turno (el juego sigue fluido)
    // jugando: ~6 ms por cuadro y luego cede el turno; en la pantalla de carga trabaja más seguido (solo cede para que la animación siga)
    if (!fast && performance.now() - t0 > (building ? 14 : 6)) { if (!building) await sleep(state === 'play' ? 8 : 2); await idle(); t0 = performance.now(); }
    if (job !== lodJob || world !== W) return;               // cambió el nivel: dejar de preparar este
    const h = root.userData.hum || root.userData.bakedHum, lo = createHuman({ ...h.opts, detail: .22, name: '' });
    for (const k of ['hips', 'spine', 'chest', 'neck', 'head']) cp(h[k], lo[k]);
    for (let i = 0; i < 2; i++) { for (const k of ['thigh', 'knee', 'ankle']) cp(h.legs[i] && h.legs[i][k], lo.legs[i] && lo.legs[i][k]); for (const k of ['shoulder', 'elbow', 'hand']) cp(h.arms[i] && h.arms[i][k], lo.arms[i] && lo.arms[i][k]); }
    const far = bakeColored(lo.root); far.visible = false;
    const near = root.children.slice();
    root.add(far); root.userData.hasLOD = true; delete root.userData.bakedHum;
    W.humanLOD.push({ root, far, near, isFar: false });
  }
}
function updateHumanLOD() {
  if (!world || !world.humanLOD) return;
  const cp = camera.position;
  for (const e of world.humanLOD) {
    if (!e.root.visible) continue;
    _lv.setFromMatrixPosition(e.root.matrixWorld);
    const d = Math.hypot(_lv.x - cp.x, _lv.z - cp.z), far = e.isFar ? d > LOD_FAR - 3 : d > LOD_FAR;
    if (far !== e.isFar) { e.isFar = far; for (const c of e.near) c.visible = !far; }
    e.far.visible = far && d < LOD_HIDE;
  }
}
function buildCull(root) {
  root.updateMatrixWorld(true);
  const units = [];
  const visit = o => {
    if (o.isLight || o.isCamera) return;
    _cb.makeEmpty().expandByObject(o);
    if (_cb.isEmpty()) return;
    _cb.getBoundingSphere(_cs);
    const rad = _cs.radius;
    if (rad > 34) { for (const ch of o.children) visit(ch); return; }
    const items = [];
    o.traverse(m => { if (m.isMesh || m.isSprite || m.isPoints || m.isLine) items.push(m); });
    if (!items.length) return;
    const range = (rad < 2 ? 85 : rad < 6 ? 125 : rad < 15 ? 190 : 300) * CULL_K + rad;
    units.push({ o, items, c: _cs.center.clone().applyMatrix4(_ci.copy(o.matrixWorld).invert()), range, hidden: false });
  };
  for (const ch of root.children) visit(ch);
  return units;
}
function updateCull(cp) {
  if (!world || !world.cull) return;
  for (const u of world.cull) {
    _cv.copy(u.c).applyMatrix4(u.o.matrixWorld);
    const hide = Math.hypot(_cv.x - cp.x, _cv.z - cp.z) > u.range;
    if (hide !== u.hidden) { u.hidden = hide; for (const m of u.items) m.layers.set(hide ? 1 : 0); }
  }
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
// Follaje más natural: racimos de hojas con huecos oscuros, brillos y relieve (se calcula en el sombreador, sin texturas)
function leafify(mat, scale = 4.5) {
  mat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLeafP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLeafP = position * ' + scale.toFixed(2) + ';');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vLeafP;
float lHash(vec3 p) { p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float lNoise(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(lHash(i), lHash(i + vec3(1, 0, 0)), f.x), mix(lHash(i + vec3(0, 1, 0)), lHash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(lHash(i + vec3(0, 0, 1)), lHash(i + vec3(1, 0, 1)), f.x), mix(lHash(i + vec3(0, 1, 1)), lHash(i + vec3(1, 1, 1)), f.x), f.y), f.z); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float lfA = lNoise(vLeafP), lfB = lNoise(vLeafP * 2.7 + 3.1);
float lfLeaf = smoothstep(.22, .78, lfA * .55 + lfB * .45);
diffuseColor.rgb *= mix(.42, 1.2, lfLeaf);
diffuseColor.rgb += vec3(.025, .04, -.01) * (lfB - .5);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
normal = normalize(normal + (vec3(lfA, lfB, lfA * lfB) - .45) * .9);`);
  };
  mat.customProgramCacheKey = () => 'leaf' + scale;
  return mat;
}
const TREE_M = {
  oliveLeaf: leafify(new THREE.MeshStandardMaterial({ color: 0x7d8c5a, roughness: .9 })),
  oliveBark: new THREE.MeshStandardMaterial({ color: 0x6a5a48, roughness: 1 }),
  figLeaf: leafify(new THREE.MeshStandardMaterial({ color: 0x3f6b28, roughness: .85 })),
  cedarLeaf: leafify(new THREE.MeshStandardMaterial({ color: 0x2c4a2a, roughness: .9 }), 3),
  bark: new THREE.MeshStandardMaterial({ color: 0x5a3e28, roughness: 1 }),
  palmLeaf: new THREE.MeshStandardMaterial({ color: 0x4a7a2a, roughness: .8, side: THREE.DoubleSide }),
  palmBark: new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 1 }),
  dates: new THREE.MeshStandardMaterial({ color: 0xb8641a, roughness: .7 }),
};
function blob(rad, r, det = 2) { const g = new THREE.SphereGeometry(rad, 16, 12), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + Math.sin(x * 3.1 + z * 2.3) * .12 + Math.sin(y * 4.7) * .08; p.setXYZ(i, x * k, y * k * .8, z * k); } g.computeVertexNormals(); return g; }
function makeTree(kind, r) {
  const g = new THREE.Group(), add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  if (kind === 'olivo') {
    // tronco retorcido y copa plateada
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.3, .8, .1), new THREE.Vector3(-.1, 1.6, -.2), new THREE.Vector3(.2, 2.3, 0)]);
    add(new THREE.TubeGeometry(curve, 12, .28, 8), TREE_M.oliveBark, 0, 0, 0);
    for (let i = 0; i < 5; i++) add(blob(1.1 + r() * .5, r), TREE_M.oliveLeaf, (r() - .5) * 2.2, 2.6 + r() * .9, (r() - .5) * 2.2);
  } else if (kind === 'higuera') {
    add(new THREE.CylinderGeometry(.16, .26, 2, 8), TREE_M.bark, 0, 1, 0);
    for (let i = 0; i < 4; i++) add(blob(1.3 + r() * .4, r), TREE_M.figLeaf, (r() - .5) * 2, 2.4 + r() * .6, (r() - .5) * 2);
  } else if (kind === 'cedro') {
    add(new THREE.CylinderGeometry(.25, .45, 9, 10), TREE_M.bark, 0, 4.5, 0);
    for (let i = 0; i < 5; i++) { const w = 3.6 - i * .55, y = 3 + i * 1.5; const t = add(new THREE.CylinderGeometry(w * .6, w, .7, 12), TREE_M.cedarLeaf, (r() - .5) * .4, y, (r() - .5) * .4); t.scale.z = .8 + r() * .3; }
  } else { // palmera datilera
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(.4, 3, 0), new THREE.Vector3(.9, 6.5, .1)]);
    add(new THREE.TubeGeometry(curve, 10, .2, 7), TREE_M.palmBark, 0, 0, 0);
    for (let k = 0; k < 9; k++) { const lf = new THREE.Mesh(new THREE.PlaneGeometry(.8, 3.6), TREE_M.palmLeaf); lf.geometry.translate(0, 1.7, 0); lf.position.set(.9, 6.5, .1); lf.rotation.set(-1.15, k / 9 * 6.28, 0, 'YXZ'); lf.castShadow = true; g.add(lf); }
    for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(.2, 6, 5), TREE_M.dates, .9 + Math.cos(k * 1.6) * .3, 6.1, .1 + Math.sin(k * 1.6) * .3);
  }
  const s = .85 + r() * .4; g.scale.setScalar(s);
  return g;
}
function buildShip(k = 1) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const L = 30, W = 7.6, D = 3.6;
  // casco con proa y popa curvas (se deforma una caja)
  const hg = new THREE.BoxGeometry(L, D, W, 24, 4, 6), p = hg.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const t = x / (L / 2), yy = (y + D / 2) / D;
    const taper = Math.pow(1 - Math.min(1, Math.abs(t)) ** 2.4, .6);
    z *= (.15 + .85 * taper) * (.55 + .45 * yy);
    y += Math.pow(Math.abs(t), 3) * 1.6 * yy;
    p.setXYZ(i, x, y, z);
  }
  hg.computeVertexNormals();
  // colores por altura: madera oscura abajo, franja roja y cubierta clara arriba
  const cols = [], cc = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const yy = (p.getY(i) + D / 2) / D, top = hg.attributes.normal.getY(i) > .8 && yy > .95; cc.set(top ? 0xb08a5a : yy > .78 ? 0x9a2a1a : yy > .7 ? 0xd8b060 : 0x5a3820); cols.push(cc.r, cc.g, cc.b); }
  hg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const woodM = new THREE.MeshStandardMaterial({ color: 0x6a4224, roughness: .8 });
  const hull = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .8 })); hull.position.y = 1.05 - D / 2; hull.castShadow = hull.receiveShadow = true; hull.userData.block = true; g.add(hull);
  // borda (baranda) que sigue la curva del casco
  const railPts = []; for (let i = 0; i <= 40; i++) { const t = -1 + i / 20; const tp = Math.pow(1 - Math.min(1, Math.abs(t)) ** 2.4, .6); railPts.push(new THREE.Vector3(t * L / 2 * .97, 1.05 + Math.pow(Math.abs(t), 3) * 1.6 + .45, (.15 + .85 * tp) * W / 2 * .97)); }
  const railCurve = new THREE.CatmullRomCurve3(railPts);
  for (const sz of [-1, 1]) { const rl = new THREE.Mesh(new THREE.TubeGeometry(railCurve, 60, .09, 6), woodM); rl.scale.z = sz; g.add(rl); }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 2.2, 5), woodM); cabin.position.set(-L * .36, 2.1, 0); cabin.castShadow = true; g.add(cabin);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(.5, .06, 8, 20), woodM); wheel.position.set(-7.6, 2.1, 0); wheel.rotation.y = Math.PI / 2; g.add(wheel);
  for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1.2, 5), woodM); sp.position.copy(wheel.position); sp.rotation.set(i * Math.PI / 4, 0, 0); sp.rotation.order = 'YXZ'; sp.rotation.y = Math.PI / 2; g.add(sp); }
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.08, .1, 1.1, 6), woodM); post.position.set(-7.75, 1.55, 0); g.add(post);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.18, .25, 15, 10), woodM); mast.position.set(0, 8.5, 0); mast.castShadow = true; g.add(mast);
  const yard = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 11, 8), woodM); yard.rotation.x = Math.PI / 2; yard.position.set(0, 14.2, 0); g.add(yard);
  const sailTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#f2ead8' : '#b8321e'; x.fillRect(i * 8, 0, 8, 64); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const sg = new THREE.PlaneGeometry(10.5, 9, 10, 6), sp = sg.attributes.position; for (let i = 0; i < sp.count; i++) sp.setZ(i, Math.sin((sp.getY(i) / 9 + .5) * Math.PI) * 1.1);
  sg.computeVertexNormals();
  const sail = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ map: sailTex, roughness: .9, side: THREE.DoubleSide })); sail.rotation.y = Math.PI / 2; sail.position.set(.6, 9.6, 0); sail.castShadow = true; g.add(sail); g.userData.sail = sail;
  for (const sz of [-1, 1]) for (let i = 0; i < 6; i++) { const oar = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 4.5, 5), woodM); oar.position.set(-6 + i * 2.6, .5, sz * (W * .5 + 1.2)); oar.rotation.x = sz * 1.1; g.add(oar); }
  g.scale.setScalar(k);
  return g;
}
function makeCar(color) {
  const g = new THREE.Group();
  const paint = physM({ color, metalness: .6, roughness: .25, clearcoat: 1, clearcoatRoughness: .08 });
  const glass = physM({ color: 0x0c1218, metalness: .9, roughness: .05 });
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
export const SKINS = [0xf1cbb0, 0xe8b896, 0xc68e6a, 0xa8714f, 0x8a5636, 0x5e3a24];
export const TOPS = [0x1f5c70, 0x7a3b6e, 0xc0392b, 0x2e2e38, 0xe0a31a, 0x2e7d4f, 0x2a4a9a, 0xe87aa0, 0xf2f0e8, 0x8a5a2a, 0x6a2a8a, 0x1a9ab0];
export const BOTTOMS = [0x2b3a57, 0x22243a, 0x1a1a1e, 0x6a4a2a, 0x8a2a3a, 0x2d3a6a, 0x5a6a3a, 0xe8dcc0, 0x7a3b6e, 0x9a6a3a];
export const OUTFITS = [
  { id: 'moderno', name: '👕 Moderna' },
  { id: 'tunica', name: '🧥 Túnica y manto' },
  { id: 'pastor', name: '🐑 Pastor' },
  { id: 'levita', name: '🤍 Levita (lino)' },
  { id: 'adaneva', name: '🌿 Adán y Eva', req: 3, lockText: 'Se desbloquea al completar el nivel Intermedio' },
  { id: 'aaron', name: '👑 Sumo sacerdote Aarón', req: 5, lockText: 'Se desbloquea al completar el nivel Experto' },
];
if (!save.player) save.player = { gender: 'm', name: '', skin: 2, top: 0 };
save.player = Object.assign({ bottom: 0, outfit: 'moderno', hairTone: 0, legwear: 'falda', topStyle: 'abrigo' }, save.player);
const outfitOK = id => { const o = OUTFITS.find(x => x.id === id); return !!o && !(o.req && save.unlocked < o.req); };
function playerOpts(pl = save.player) {
  const f = pl.gender === 'f', top = TOPS[pl.top] ?? TOPS[0], bot = BOTTOMS[pl.bottom] ?? BOTTOMS[0];
  const base = { gender: pl.gender, name: pl.name, skin: SKINS[pl.skin] ?? SKINS[2], hairColor: f ? 0x3a2314 : 0x1d130c, eye: f ? 0x4a6b3a : 0x5a3a22, detail: 1 };
  // en el baño de la casa el personaje se pone la bata de baño (blanca, con cinturón)
  if (enBata && pl === save.player) return { ...base, outfit: 'robe', robe: 0xf7f5ef, mantle: null, sash: 0xe9e3d6, hair: f ? 'long' : 'short', hairColor: base.hairColor };
  const out = outfitOK(pl.outfit) ? pl.outfit : 'moderno';
  if (out === 'tunica') return { ...base, outfit: 'robe', robe: top, mantle: bot, sash: 0x8a2b2b, hair: f ? 'cloth' : 'short', cloth: bot };
  if (out === 'pastor') return { ...base, outfit: 'robe', robe: 0xb8a074, mantle: bot, sash: 0x5a3a1e, hair: 'cloth', cloth: f ? bot : 0xe8dcc0 };
  if (out === 'levita') return { ...base, outfit: 'robe', robe: 0xf4f0e6, mantle: null, sash: top, hair: f ? 'cloth' : 'turban', cloth: 0xf4f0e6 };
  if (out === 'adaneva') return pairOpts(f ? 'eva' : 'adan', pl);
  if (out === 'aaron') return { ...base, gender: 'm', outfit: 'robe', robe: 0xf4f0e6, mantle: null, sash: 0x5b2a7a, hair: 'turban', priest: true, beard: { color: 0x5a4a3a, len: .13 }, hairColor: 0x4a3a2a };
  const suit = pl.topStyle === 'traje';
  return { ...base, top, pants: suit ? new THREE.Color(top).multiplyScalar(.92).getHex() : bot, skirt: suit ? top : bot, legwear: f ? pl.legwear : 'pantalon', topStyle: pl.topStyle || 'abrigo', tie: bot, hair: f ? 'long' : 'short', shoes: 0xf2f2f0 };
}
// Adán y Eva: túnicas de pieles que Dios les hizo (Génesis 3:21)
function pairOpts(who, pl = save.player) {
  const base = { name: who === 'eva' ? 'EVA' : 'ADÁN', skin: SKINS[pl.skin] ?? SKINS[2], detail: 1, outfit: 'robe', skins: true, mantle: null, sash: 0x5a3a1e };
  if (who === 'eva') return { ...base, gender: 'f', robe: 0x9a7350, hair: 'long', hairColor: 0x3a2314, eye: 0x4a6b3a };
  return { ...base, gender: 'm', robe: 0x86603c, hair: 'short', hairColor: 0x24160c, beard: { color: 0x24160c, len: .1 }, eye: 0x5a3a22 };
}
let enBata = false;
const isPair = () => outfitOK(save.player.outfit) && save.player.outfit === 'adaneva';
let human = createHuman(playerOpts());
scene.add(human.root);
let mate = null; // el compañero (Adán o Eva) que sigue al jugador
const MT = { pos: new THREE.Vector3(), vy: 0, heading: 0, speed: 0, onGround: true, stuck: 0, swim: false, sit: null };
function disposeH(h) { scene.remove(h.root); h.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
function rebuildPlayer() {
  const rot = human.root.rotation.y;
  disposeH(human);
  human = createHuman(playerOpts()); human.root.rotation.y = rot;
  scene.add(human.root);
  if (mate) { disposeH(mate); mate = null; }
  if (isPair()) {
    mate = createHuman({ ...pairOpts(save.player.gender === 'f' ? 'adan' : 'eva'), detail: .8 });
    scene.add(mate.root); placeMate();
  }
  const sw = document.getElementById('tSwap'); if (sw) sw.classList.toggle('hidden', !isPair());
}
// ponerse o quitarse la bata al entrar o salir del baño (solo cambia la ropa del jugador)
function ponerBata(on) {
  if (enBata === on) return; enBata = on;
  const rot = human.root.rotation.y, pos = human.root.position.clone();
  disposeH(human); human = createHuman(playerOpts()); human.root.rotation.y = rot; human.root.position.copy(pos); scene.add(human.root);
  if (typeof buildFpArms === 'function') try { buildFpArms(); } catch (e) {}
  toast(on ? '🛁 Te pusiste la bata de baño' : '👕 Te vestiste de nuevo', '#9fd8ff');
}
function placeMate() {
  if (!mate) return;
  const back = P.heading + Math.PI;
  MT.pos.set(P.pos.x + Math.sin(back) * 1.8 + Math.cos(back) * .6, P.pos.y, P.pos.z + Math.cos(back) * 1.8 - Math.sin(back) * .6);
  MT.vy = 0; MT.speed = 0; MT.heading = P.heading; MT.stuck = 0; MT.sit = null; MT.swim = false; MT.car = null;
}
// Cambiar en vivo entre Adán y Eva: el otro sigue al que manejas
function swapPair() {
  if (!isPair() || !mate || P.driving) return;
  const pp = P.pos.clone(), ph = P.heading;
  save.player.gender = save.player.gender === 'f' ? 'm' : 'f'; persist();
  P.pos.copy(MT.pos); P.heading = MT.heading; P.vy = 0;
  rebuildPlayer();
  MT.pos.copy(pp); MT.heading = ph;
  sound.gift(); toast(save.player.gender === 'f' ? '🌿 Ahora juegas con Eva · Adán te sigue' : '🌿 Ahora juegas con Adán · Eva te sigue', '#7ef0a4');
}
function updateMate(dt, t) {
  if (!mate) return;
  let mSwim = 0, mKneel = -1, mPraise = -1, mSit = 0;
  if (P.car) {
    // el jugador maneja un auto: el compañero va sentado al lado (asiento del pasajero)
    const c = P.car, o = c.obj, h = c.heading, cs = Math.cos(h), sn = Math.sin(h), lx = c.wid * .22, lz = -.1;
    MT.pos.set(o.position.x + lx * cs + lz * Math.sin(h), o.position.y, o.position.z - lx * sn + lz * Math.cos(h));
    MT.heading = h; MT.speed = 0; MT.vy = 0; MT.onGround = true; MT.swim = false; MT.sit = null; MT.stuck = 0;
    if (!MT.car) { MT.car = c; toast(save.player.gender === 'f' ? '🌿 Adán se sentó a tu lado' : '🌿 Eva se sentó a tu lado', '#7ef0a4'); }
    mSit = 1;
  } else if (MT.car) {
    // el jugador se bajó: el compañero se baja por la puerta del otro lado
    const c = MT.car, h = c.heading, cs = Math.cos(h), sn = Math.sin(h); MT.car = null;
    let ok = false;
    for (const side of [1, 1.6, -1, -1.6]) {
      const lx = side * (c.wid / 2 + .7), x = c.obj.position.x + lx * cs, z = c.obj.position.z - lx * sn;
      if (!blocked(x, z, c.obj.position.y) && Math.hypot(x - P.pos.x, z - P.pos.z) > .8) { MT.pos.set(x, floorAt(x, z, c.obj.position.y + .3), z); ok = true; break; }
    }
    if (!ok) placeMate();
    MT.heading = h; MT.speed = 0; MT.vy = 0; MT.onGround = true; MT.stuck = 0;
  } else if (P.driving && world.ship) {
    const b = world.boat, sh = world.ship, lx = -7, lz = 1.3;
    MT.pos.set(sh.position.x + Math.cos(b.heading) * lx + Math.sin(b.heading) * lz, b.deckY + sh.position.y, sh.position.z - Math.sin(b.heading) * lx + Math.cos(b.heading) * lz);
    MT.heading = P.heading; MT.speed = 0; MT.onGround = true; MT.swim = false; MT.sit = null;
  } else if (P.sit) {
    // el jugador se sentó en la iglesia: el compañero se sienta en la silla libre más cercana (o a su lado)
    if (!MT.sit) {
      const ps = P.sit, seats = (world.church && world.church.seats) || [];
      let best = null, bd = 3.2;
      for (const st of seats) { const d = Math.hypot(st.x - ps.x, (st.z - .06) - ps.z); if (d > .3 && d < bd && Math.abs(st.y - ps.y) < .5) { bd = d; best = st; } }
      MT.sit = best ? { x: best.x, y: best.y, z: best.z - .06, chair: true, back: MT.pos.clone() } : { x: MT.pos.x, y: MT.pos.y, z: MT.pos.z, chair: false, back: MT.pos.clone() };
    }
    MT.pos.set(MT.sit.x, MT.sit.y, MT.sit.z); MT.heading = MT.sit.chair ? P.sit.ry : P.heading; MT.speed = 0; MT.vy = 0; MT.onGround = true; MT.swim = false;
    mSit = MT.sit.chair ? 1 : 0;
  } else {
    if (MT.sit) { MT.pos.copy(MT.sit.back); MT.sit = null; MT.vy = 0; MT.onGround = true; }
    const dx = P.pos.x - MT.pos.x, dz = P.pos.z - MT.pos.z, d = Math.hypot(dx, dz);
    if (!isFinite(d) || d > 16 || Math.abs(P.pos.y - MT.pos.y) > 6 || MT.stuck > 1.5) placeMate();
    else {
      // ¿El compañero está en el agua? (misma regla que el jugador): flota y nada igual que él
      let inWater = false, waterY = 0;
      if (canSwim() && MT.pos.x < world.seaInfo.SX && floorAt(MT.pos.x, MT.pos.z, MT.pos.y) < .3) {
        inWater = true; waterY = -1.2 * THREE.MathUtils.clamp((world.seaInfo.SX - MT.pos.x) / 4, 0, 1) - (MT.swim && MT.speed > .5 ? .14 : 0);
        const ih = islandH(MT.pos.x, MT.pos.z); if (ih > waterY) waterY = ih;
      }
      // mientras el jugador alaba o se arrodilla, el compañero se queda quieto haciendo lo mismo
      const busy = !!(P.praise || P.kneel);
      let sp = 0;
      if (d > 1.9 && !busy) {
        const swimSp = P.turbo ? 5.6 : 4.3;
        sp = Math.min(MT.swim ? swimSp : d > 7 ? (P.turbo ? TURBO : RUN) : d > 3.5 ? RUN * .9 : WALK, (d - 1.6) * 3.2);
        if (inWater && !MT.swim) sp *= .6;
        const ux = dx / d, uz = dz / d, nx = MT.pos.x + ux * sp * dt, nz = MT.pos.z + uz * sp * dt;
        if (!blocked(nx, nz, MT.pos.y, true, mateGender())) { MT.pos.x = nx; MT.pos.z = nz; MT.stuck = 0; }
        else if (!blocked(nx, MT.pos.z, MT.pos.y, true, mateGender())) MT.pos.x = nx;
        else if (!blocked(MT.pos.x, nz, MT.pos.y, true, mateGender())) MT.pos.z = nz;
        else { MT.stuck += dt; sp = 0; }
        let df = Math.atan2(ux, uz) - MT.heading; df = Math.atan2(Math.sin(df), Math.cos(df)); MT.heading += df * Math.min(1, dt * 8);
      } else { let df = P.heading - MT.heading; df = Math.atan2(Math.sin(df), Math.cos(df)); MT.heading += df * Math.min(1, dt * 2); }
      MT.speed += (sp - MT.speed) * Math.min(1, dt * 10);
      if (inWater) {
        if (MT.onGround && !MT.swim && P.vy > 4 && d < 4) { MT.vy = JUMP_V * .6; MT.onGround = false; }
        if (!MT.onGround) { MT.vy -= GRAV * dt; MT.pos.y += MT.vy * dt; if (MT.pos.y <= waterY && MT.vy <= 0) { MT.pos.y = waterY; MT.vy = 0; MT.onGround = true; } }
        else MT.pos.y += (waterY - MT.pos.y) * Math.min(1, dt * 5);
        MT.swim = MT.onGround && waterY < -.75 && MT.pos.y < -.6;
      } else {
        MT.swim = false;
        const fl = floorAt(MT.pos.x, MT.pos.z, MT.pos.y);
        if (MT.onGround && P.vy > 4 && d < 4) { MT.vy = JUMP_V * .95; MT.onGround = false; }
        if (!MT.onGround || MT.pos.y > fl + .02) { MT.vy -= GRAV * dt; MT.pos.y += MT.vy * dt; MT.onGround = false; if (MT.pos.y <= fl) { MT.pos.y = fl; MT.vy = 0; MT.onGround = true; } }
        else { MT.pos.y = fl; MT.vy = 0; }
        if (MT.speed > 1 && MT.onGround && Math.random() < dt * MT.speed * .35) sound.stepAt(.25, 0);
      }
      mSwim = MT.swim ? 1 : 0;
      if (d < 6) { if (P.kneel) mKneel = P.kneel.t / P.kneel.dur; if (P.praise) mPraise = P.praise.t; }
    }
  }
  mate.root.position.copy(MT.pos); mate.root.rotation.y = MT.heading;
  animateHuman(mate, dt, { speed: MT.speed, onGround: MT.onGround, vy: MT.vy, land: 0, t, swim: mSwim, kneel: mKneel, praise: mPraise, sit: mSit, gesture: P.smell > 0 ? 1 : 0 });
}
const P = { holdFwd: 0, pos: new THREE.Vector3(), vy: 0, onGround: true, heading: 0, speed: 0, inv: 0, phase: 0, land: 0 };
const RADIUS = .32, STEP = .22, JUMP_V = 7.2, GRAV = 20, WALK = 4.3, RUN = 9.2, TURBO = 12.5;
queueMicrotask(() => { if (isPair()) rebuildPlayer(); });

const topOf = (c, z) => c.ramp ? c.ramp.y0 + (c.ramp.y1 - c.ramp.y0) * THREE.MathUtils.clamp((z - c.ramp.z0) / (c.ramp.z1 - c.ramp.z0), 0, 1) : c.top;
// altura del terreno de las islas del mar (perfil del cono de mountainGeo, sin el ruido)
function islandH(x, z) {
  let best = -99;
  if (!world || !world.islands) return best;
  for (const o of world.islands) {
    const d = Math.hypot(x - o.x, z - o.z); if (d >= o.rad) continue;
    const t = 1 - Math.pow(d / o.rad, 4 / 3), y = -o.h / 2 + t * o.h - o.h * .06 * t * t * t;
    if (y > best) best = y;
  }
  return best;
}
function floorAt(x, z, y) {
  let f = 0;
  if (world.islands) { const ih = islandH(x, z); if (ih > f) f = ih; }
  for (const c of world.colliders) {
    if (c.tag === 'ship' && world.boat && world.boat.away) continue;
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) { const tp = c.ramp ? topOf(c, z) : c.top; if (tp <= y + STEP && tp > f) f = tp; }
  }
  return f;
}
let fwdHeld = false;
// borde alcanzable con las manos delante del jugador
function tryGrab() {
  const fx = Math.sin(P.heading), fz = Math.cos(P.heading);
  for (const d of [RADIUS + .12, RADIUS + .4]) {
    const px = P.pos.x + fx * d, pz = P.pos.z + fz * d;
    let best = null;
    for (const c of world.colliders) {
      if (c.ramp || c.top > 900 || (c.tag === 'ship' && world.boat && world.boat.away)) continue;
      if (px > c.minX && px < c.maxX && pz > c.minZ && pz < c.maxZ) {
        const h = c.top - P.pos.y;
        if (h > STEP && h < 2.45 && (!best || c.top > best.top)) best = c;
      }
    }
    if (best) {
      const tx = P.pos.x + fx * (d + .45), tz = P.pos.z + fz * (d + .45);
      // que haya espacio arriba para pararse
      if (floorAt(tx, tz, best.top + .05) > best.top + STEP) return;
      P.climb = { t: 0, y0: P.pos.y, top: best.top, x0: P.pos.x, z0: P.pos.z, tx, tz };
      P.vy = 0; P.speed = 0; sound.step('hard', false); return;
    }
  }
}
function climbStep(dt) {
  const c = P.climb; c.t += dt;
  const hang = c.top - 1.95;
  if (c.t < .28) { const k = c.t / .28; P.pos.y = c.y0 + (Math.max(hang, c.y0) - c.y0) * k; }            // se cuelga del borde
  else if (c.t < .95) { const k = (c.t - .28) / .67, e = k * k * (3 - 2 * k); P.pos.y = Math.max(hang, c.y0) + (c.top - Math.max(hang, c.y0)) * e; P.pos.x = c.x0 + (c.tx - c.x0) * Math.max(0, e * 1.3 - .3); P.pos.z = c.z0 + (c.tz - c.z0) * Math.max(0, e * 1.3 - .3); }
  else { P.pos.set(c.tx, c.top, c.tz); P.onGround = true; P.vy = 0; P.climb = null; sound.step('hard', true); }
  updateHUD();
}
// Se puede nadar en el mar en todos los niveles, hasta las islas
const canSwim = () => !!world.seaInfo;
// baños de la iglesia: el de damas solo deja pasar mujeres y el de caballeros solo hombres
let avisoBanoT = 0;
const mateGender = () => (save.player && save.player.gender === 'f') ? 'm' : 'f';
function avisoBano(tag) {
  const now = performance.now(); if (now - avisoBanoT < 2500) return; avisoBanoT = now;
  sound.hurt(); toast(tag === 'bano-f' ? '🚺 Este baño es solo para damas' : '🚹 Este baño es solo para caballeros', '#ffd34d');
}
function blocked(x, z, y, swimmer = false, gender = null) {
  const sw = swimmer && canSwim();
  const g = gender || (save.player && save.player.gender) || 'm';
  if (world.npcs && y < 2) for (const n of world.npcs) if (!n.treasure && !n.ship && Math.hypot(x - n.x, z - n.z) < RADIUS + .28) return true;
  if (world.lux && y < 1.6) for (const c of world.lux) if (c !== P.car) { const dx = x - c.obj.position.x, dz = z - c.obj.position.z, cs = Math.cos(c.heading), sn = Math.sin(c.heading), lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; if (Math.abs(lx) < c.wid / 2 + RADIUS - .1 && Math.abs(lz) < c.len / 2 + RADIUS - .1) return true; }
  if (sw && world.boat && (x < world.boat.minX + 5 || z < world.boat.minZ + 5 || z > world.boat.maxZ - 5)) return true;
  for (const c of world.colliders) {
    if (c.tag === 'ship' && world.boat && world.boat.away) continue;
    if (sw && c.tag === 'sea') continue;
    const bano = c.tag === 'bano-f' || c.tag === 'bano-m';
    if (bano && (c.tag === 'bano-f') === (g === 'f')) continue;
    if (x + RADIUS > c.minX && x - RADIUS < c.maxX && z + RADIUS > c.minZ && z - RADIUS < c.maxZ) { if (c.ramp) continue; if (c.bottom && c.bottom > y + 1.75) continue; if (c.top > y + STEP) { if (bano && !gender) avisoBano(c.tag); return true; } }
  }
  return false;
}

/* =========================================================
   CÁMARA Y ENTRADA
   ========================================================= */
const cam = { yaw: 0, pitch: .3, dist: 6.4, cur: new THREE.Vector3(), look: new THREE.Vector3() };
/* ---------- Vistas de cámara: cerca, normal, lejos y primera persona (solo se ven las manos) ---------- */
const CAM_MODES = [{ id: 'normal', name: '🎥 Vista normal', dist: 6.4 }, { id: 'cerca', name: '🔎 Vista de cerca', dist: 3.2 }, { id: 'lejos', name: '🔭 Vista de lejos', dist: 10 }, { id: 'fp', name: '👀 Primera persona', dist: 0 }];
let camMode = 0;
try { camMode = Math.max(0, CAM_MODES.findIndex(m => m.id === localStorage.getItem('biblixia_cam'))); } catch (e) {}
const fpArms = new THREE.Group(); camera.add(fpArms); scene.add(camera); fpArms.visible = false;
let fpSwing = 0, honkPressed = false;
const FP_BASE = -2.35; // brazos hacia abajo (antes apuntaban al frente con las palmas arriba)
function buildFpArms() {
  fpArms.clear();
  const o = playerOpts(), skinM = new THREE.MeshStandardMaterial({ color: o.skin, roughness: .55 });
  for (const sx of [-1, 1]) {
    // brazo relajado: la mano cuelga hacia abajo y un poco adelante (en las esquinas de abajo de la pantalla)
    const arm = new THREE.Group(); arm.position.set(sx * .22, -.21, -.3); arm.rotation.set(FP_BASE, 0, sx * .18);
    // solo se ven las manos (sin brazos ni mangas flotando delante de la cámara)
    const hg = new THREE.Group(); hg.rotation.y = -sx * Math.PI / 2; arm.add(hg); // la palma mira hacia el cuerpo, como al caminar
    const hand = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), skinM); hand.scale.set(.8, 1.15, .55); hand.position.y = .09; hg.add(hand);
    for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(.0105, .045, 3, 6), skinM); f.position.set((k - 1.5) * .019, .16, .008); f.rotation.x = .15; hg.add(f); } // dedos relajados
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .04, 3, 6), skinM); th.position.set(sx * .045, .1, .02); th.rotation.z = -sx * .7; hg.add(th);
    arm.userData.sx = sx; fpArms.add(arm);
  }
  fpArms.traverse(m => { if (m.isMesh) { m.castShadow = false; m.renderOrder = 10; } });
}
function setCamMode(i, announce = true) {
  camMode = (i + CAM_MODES.length) % CAM_MODES.length; const m = CAM_MODES[camMode];
  if (m.id !== 'fp') { cam.dist = m.dist; fpArms.visible = false; camera.near = .3; } else { buildFpArms(); camera.near = .05; }
  camera.updateProjectionMatrix();
  try { localStorage.setItem('biblixia_cam', m.id); } catch (e) {}
  if (announce) { toast(m.name, '#ffd34d'); sound.click(); }
}
const isFP = () => CAM_MODES[camMode].id === 'fp' && !P.driving && !P.car && state !== 'menu' && state !== 'creator';
const keys = {};
let jumpPressed = false, takePressed = false, runToggle = false, look = { id: null, x: 0, y: 0 }, joy = { id: null, x: 0, y: 0, active: false };
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (state === 'verse' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyT')) { e.preventDefault(); closeVerse(); return; }
  if (state === 'talk' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyT')) { e.preventDefault(); takeGift(); return; }
  if (state === 'map' && (e.code === 'Escape' || e.code === 'KeyM')) { closeMap(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame(); return; }
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' && !keys.Space) jumpPressed = true;
  if (e.code === 'KeyT' && !keys.KeyT) takePressed = true;
  if (e.code === 'KeyR' && !keys.KeyR && state === 'play') toggleTurbo();
  if (e.code === 'KeyC' && !keys.KeyC && state === 'play') toggleRun();
  if (e.code === 'KeyV' && !keys.KeyV && (state === 'play' || state === 'pause')) setCamMode(camMode + 1);
  if ((e.code === 'Equal' || e.code === 'NumpadAdd') && state === 'play') zoomCam(-1.2);
  if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && state === 'play') zoomCam(1.2);
  if (e.code === 'KeyQ' && !keys.KeyQ && state === 'play') swapPair();
  if (e.code === 'KeyM' && !keys.KeyM) { if (state === 'play') openMap(); else if (state === 'map') closeMap(); }
  keys[e.code] = true;
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Girar la cámara (panorama): los movimientos del ratón o del dedo se acumulan y se aplican una vez por cuadro.
// Así nunca se acumula trabajo entre cuadros y un salto grande (por ejemplo tras un tirón) no da vueltas locas.
const lookAcc = { x: 0, y: 0 };
const addLook = (dx, dy, kx, ky) => { lookAcc.x += dx * kx; lookAcc.y += dy * ky; };
function applyLook() {
  if (!lookAcc.x && !lookAcc.y) return;
  // Antes todo lo que pasaba de 0,35 por cuadro se perdía: en celulares lentos el giro "fallaba" o se quedaba corto.
  // Ahora se aplica hasta 0,6 por cuadro y lo que sobra pasa al cuadro siguiente (sin vueltas locas: lo que sobra se limita).
  const mx = .6, C = THREE.MathUtils.clamp;
  const ax = C(lookAcc.x, -mx, mx), ay = C(lookAcc.y, -mx, mx);
  cam.yaw -= ax;
  cam.pitch = C(cam.pitch + ay, -.2, 1.1);
  lookAcc.x = C(lookAcc.x - ax, -1.2, 1.2); lookAcc.y = C(lookAcc.y - ay, -.6, .6);
  if (Math.abs(lookAcc.x) < 1e-4) lookAcc.x = 0; if (Math.abs(lookAcc.y) < 1e-4) lookAcc.y = 0;
}
// zonas de la interfaz donde arrastrar NO gira la cámara (botones, joystick, mapa, carteles que se desplazan)
const uiTarget = el => !!(el && el.closest && (el.closest('button') || el.closest('a') || el.closest('input') || el.closest('#joy') || el.closest('#wheel') || el.closest('.topright') || el.closest('#minimap') || el.closest('#info') || el.closest('.screen:not(.hidden)')));

// Ratón: arrastrar en cualquier parte del juego (no solo sobre el lienzo) para girar la cámara
let drag = null;
addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch' || state !== 'play' || e.button !== 0 || uiTarget(e.target)) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {} // sigue girando aunque el ratón salga de la ventana
});
addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  if (!(e.buttons & 1) || state !== 'play') { drag = null; return; } // se soltó el botón fuera de la ventana: no quedarse pegado
  addLook(e.clientX - drag.x, e.clientY - drag.y, .005, .004);
  drag.x = e.clientX; drag.y = e.clientY;
});
const endDrag = e => { if (drag && (!e || e.pointerId === drag.id)) drag = null; };
addEventListener('pointerup', endDrag); addEventListener('pointercancel', endDrag); canvas.addEventListener('lostpointercapture', endDrag);
addEventListener('dragstart', e => e.preventDefault()); // que el navegador no "arrastre" imágenes y corte el movimiento
addEventListener('contextmenu', e => { if (state === 'play') e.preventDefault(); });
canvas.addEventListener('wheel', e => { cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * .005, 2.6, 13); }, { passive: true });

// Táctil: botones de dirección, saltar, tomar y correr; arrastrar en la pantalla para mirar
// Joystick de bola: arrastra en cualquier dirección (al borde = correr)
const joyEl = $('joy'), knob = $('joyKnob');
const joyMove = (cx, cy) => { const r = joyEl.getBoundingClientRect(), mx = r.width / 2 - 20; let dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2); const L = Math.hypot(dx, dy); if (L > mx) { dx *= mx / L; dy *= mx / L; } joy.x = dx / mx; joy.y = dy / mx; knob.style.transform = `translate(${dx}px,${dy}px)`; };
const joyEnd = () => { joy.id = null; joy.active = false; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); };
joyEl.addEventListener('touchstart', e => { e.preventDefault(); sound.unlock(); const t = e.changedTouches[0]; joy.id = t.identifier; joy.active = true; joyEl.classList.add('on'); joyMove(t.clientX, t.clientY); }, { passive: false });
joyEl.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === joy.id) joyMove(t.clientX, t.clientY); }, { passive: false });
joyEl.addEventListener('touchend', e => { for (const t of e.changedTouches) if (t.identifier === joy.id) joyEnd(); });
joyEl.addEventListener('touchcancel', joyEnd);
joyEl.addEventListener('mousedown', e => { joy.active = true; joyEl.classList.add('on'); joyMove(e.clientX, e.clientY); const mv = ev => joyMove(ev.clientX, ev.clientY), up = () => { joyEnd(); removeEventListener('mousemove', mv); removeEventListener('mouseup', up); }; addEventListener('mousemove', mv); addEventListener('mouseup', up); });
// Girar el vehículo: botones izquierda / derecha, giro moderado; vuelve al centro al soltar
const wheel = { id: null, x: 0, active: false, sx: 0 }, pedal = { gas: false, rev: false };
const wheelEl = $('wheel');
// botones simples ◀ / ▶ para girar (más fácil que el volante): mientras estén presionados el vehículo gira
const steerHeld = { l: false, r: false };
const steerApply = () => { wheel.x = (steerHeld.r ? 1 : 0) - (steerHeld.l ? 1 : 0); wheel.active = steerHeld.l || steerHeld.r; };
const wheelEnd = () => { steerHeld.l = steerHeld.r = false; wheel.id = null; steerApply(); for (const id of ['wLeft', 'wRight']) $(id).classList.remove('on'); };
[['wLeft', 'l'], ['wRight', 'r']].forEach(([id, k]) => {
  const b = $(id);
  const on = e => { e.preventDefault(); sound.unlock(); steerHeld[k] = true; b.classList.add('on'); steerApply(); try { b.setPointerCapture(e.pointerId); } catch (er) {} };
  const off = e => { steerHeld[k] = false; b.classList.remove('on'); steerApply(); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  b.addEventListener('contextmenu', e => e.preventDefault()); b.addEventListener('click', e => e.preventDefault());
});
[['tGas', 'gas'], ['tRev', 'rev']].forEach(([id, k]) => {
  const b = $(id); if (!b) return;
  const on = e => { e.preventDefault(); sound.unlock(); pedal[k] = true; b.classList.add('on'); };
  const off = e => { e.preventDefault(); pedal[k] = false; b.classList.remove('on'); };
  b.addEventListener('touchstart', on, { passive: false }); b.addEventListener('touchend', off, { passive: false }); b.addEventListener('touchcancel', off, { passive: false });
  b.addEventListener('mousedown', on); b.addEventListener('mouseup', off); b.addEventListener('mouseleave', off); b.addEventListener('click', e => e.preventDefault());
});
function driveUI(on) { $('touch').classList.toggle('drive', on); if (!on) { wheelEnd(); pedal.gas = pedal.rev = false; $('tGas').classList.remove('on'); $('tRev').classList.remove('on'); } else joyEnd(); }
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
function toggleRun() { runToggle = !runToggle; $('tRun').classList.toggle('active', runToggle); $('tRun').textContent = runToggle ? '🏃 CORRIENDO' : 'CORRER'; toast(runToggle ? '🏃 Modo correr' : '🚶 Modo caminar', '#ffd34d', true); sound.click(); }
tap('tRun', () => { if (state === 'play') toggleRun(); });
tap('tTurbo', () => toggleTurbo());
tap('tSwap', () => { if (state === 'play') swapPair(); });
// Dedo: deslizar en la pantalla (fuera de botones y joystick) para mirar alrededor
const touchAlive = (list, id) => { for (const t of list) if (t.identifier === id) return true; return false; };
addEventListener('touchstart', e => {
  if (state !== 'play') return;
  // si el dedo que miraba ya no está en la pantalla (se perdió su "touchend"), se libera para no quedar congelado
  if (look.id !== null && !touchAlive(e.touches, look.id)) look.id = null;
  for (const t of e.changedTouches) {
    if (uiTarget(t.target)) continue; // deslizar sobre el cartel del lugar lo desplaza sin girar la cámara
    if (look.id === null) { look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }
  }
}, { passive: true });
addEventListener('touchmove', e => {
  if (look.id === null) return;
  if (state !== 'play') { look.id = null; return; }
  for (const t of e.changedTouches) if (t.identifier === look.id) {
    addLook(t.clientX - look.x, t.clientY - look.y, .008, .005);
    look.x = t.clientX; look.y = t.clientY;
  }
}, { passive: true });
const endTouch = e => { if (look.id !== null && (!touchAlive(e.touches, look.id) || touchAlive(e.changedTouches, look.id))) look.id = null; };
addEventListener('touchend', endTouch); addEventListener('touchcancel', endTouch);
// al cambiar de pestaña, bloquear la pantalla o perder el foco: soltar todo
const releaseLook = () => { look.id = null; drag = null; lookAcc.x = lookAcc.y = 0; };
// soltar también el joystick y los botones táctiles: si el celular pierde un "touchend" (notificación, llamada,
// gesto del sistema) el personaje ya no se queda caminando solo ni la cámara trabada
const releaseTouchControls = () => {
  if (joy.active) joyEnd();
  document.querySelectorAll('#touch [data-key].on').forEach(b => { keys[b.dataset.key] = false; b.classList.remove('on'); });
};
const releaseAll = () => { releaseLook(); releaseTouchControls(); for (const k in keys) keys[k] = false; };
addEventListener('blur', releaseAll);
addEventListener('pagehide', releaseAll);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
// cuando ya no queda ningún dedo en la pantalla, nada puede seguir "apretado"
const allUp = e => { if (!e.touches || e.touches.length) { if (joy.active && joy.id !== null && !touchAlive(e.touches, joy.id)) joyEnd(); return; } releaseLook(); releaseTouchControls(); };
addEventListener('touchend', allUp, { passive: true }); addEventListener('touchcancel', allUp, { passive: true });
// un toque nuevo revisa si el joystick quedó trabado con un dedo que ya no existe
addEventListener('touchstart', e => { if (joy.active && joy.id !== null && !touchAlive(e.touches, joy.id)) joyEnd(); }, { passive: true, capture: true });

/* =========================================================
   ESTADO DEL JUEGO
   ========================================================= */
let state = 'menu', L = null, lvlIdx = 0, timeLeft = 0, collected = 0, goal = 0, verseOrder = [], verseCursor = 0, menuT = 0;
const sound = new Sound();
try { sound.setMusic(localStorage.getItem(SAVE_KEY + '_music') !== '0'); sound.setSfx(localStorage.getItem(SAVE_KEY + '_sfx') !== '0'); } catch (e) {}
let musicStarted = false, kabodT = 0, trumpetT = 0, trumpetNear = false;
const ensureMusic = () => { sound.unlock(); if (!musicStarted) { musicStarted = true; sound.startMusic(); } };
['pointerdown', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, ensureMusic, { once: false, passive: true }));

const worldKey = i => [i, save.unlocked, (save.player && save.player.name) || '', save.player && save.player.gender].join('|');
let building = false;
async function startLevel(i) {
  if (building) return; building = true;
  const ld = $('loading'); ld.querySelector('.sub').textContent = `Preparando el nivel ${LEVELS[i].name}…`; ld.classList.remove('hidden');
  await new Promise(r => setTimeout(r, 40));
  try { await startLevelNow(i); } finally { building = false; ld.classList.add('hidden'); }
}
async function startLevelNow(i) {
  lodJob++; // dejar de preparar las personas lejanas del mundo anterior
  await menuReady; // si el mundo de la portada aún se está construyendo, esperar (no construir dos a la vez)
  lvlIdx = i; L = LEVELS[i];
  // Si el mundo de la portada ya es este nivel (Básico), se reutiliza: no se construye dos veces
  const wkey = worldKey(i);
  if (!(world && world.key === wkey && !world.used)) { world = await buildWorld(L); world.key = wkey; }
  world.used = true;
  goal = L.goal; collected = 0; timeLeft = L.time;
  P.pos.copy(world.start); P.vy = 0; P.onGround = true; P.heading = world.startYaw; P.speed = 0; P.inv = 0; P.climb = null; P.swim = false; P.kneel = null; P.praise = null; P.sit = null; sitBtns(''); P.timeStop = false; elTimer.classList.remove('paused'); trumpetT = 0; trumpetNear = false; sound.swimLoop(0); sound.boatLoop(0);
  setCamMode(camMode, false); lifeUsed.clear(); if (world.life) world.life.fx = lifeFx;
  cam.yaw = world.startYaw; cam.pitch = .3;
  cam.cur.set(P.pos.x - Math.sin(cam.yaw) * 7, 4, P.pos.z - Math.cos(cam.yaw) * 7);
  // Orden de los versículos de las monedas, para que no se repitan:
  // primero los que nunca has visto (al azar) y después los que hace más tiempo que no salen.
  const hist = Array.isArray(save.vHist) ? save.vHist : [], lastSeen = new Map(hist.map((k, n) => [k, n]));
  const mezclar = arr => { for (let n = arr.length - 1; n > 0; n--) { const j = Math.random() * (n + 1) | 0; [arr[n], arr[j]] = [arr[j], arr[n]]; } return arr; };
  const todos = VERSES.map((_, k) => k);
  const nuevos = mezclar(todos.filter(k => !save.verses.includes(k)));
  const viejos = mezclar(todos.filter(k => save.verses.includes(k))).sort((a, b) => (lastSeen.get(a) ?? -1) - (lastSeen.get(b) ?? -1));
  verseOrder = nuevos.concat(viejos); verseCursor = 0;
  hideScreens(); $('verse').classList.add('hidden'); $('talk').classList.add('hidden'); $('info').classList.remove('show'); curZone = null; talkNPC = null; if (enBata) ponerBata(false);
  human.root.rotation.y = 0;
  $('topbar').classList.add('hidden');
  $('hud').classList.remove('hidden'); $('touch').classList.remove('hidden'); $('touch').classList.toggle('pc', !isTouch);
  $('tRun').classList.toggle('active', runToggle); $('tRun').textContent = runToggle ? '🏃 CORRIENDO' : 'CORRER';
  $('hLevel').textContent = L.name; $('hGoal').textContent = goal;
  if (world.ark && world.ark.rainbow) world.ark.rainbow.visible = save.time !== 'noche';
  P.driving = false; if (P.car) { P.car = null; sound.carLoop(0); } honkBtns(false); driveUI(false);
  if (mate) { placeMate(); if (isPair()) setTimeout(() => toast('🌿 Adán y Eva van juntos · ' + (isTouch ? 'toca 👫' : 'pulsa Q') + ' para cambiar', '#7ef0a4'), 1800); }
  setTimeout(() => { if (state === 'play') toast('⏰ Toma los relojes azules para ganar +' + CLOCK_SECS + ' s', '#6fd0ff'); }, 3200);
  if (lvlIdx >= 1) setTimeout(() => { if (state === 'play') toast('⛵ ¡El barco ya está habilitado! Ve al muelle (oeste)', '#7ef0a4'); }, lvlIdx === 1 ? 5600 : 99999999);
  P.turbo = false; $('tTurbo').classList.remove('active'); $('tTurbo').textContent = lvlIdx < 1 ? '🔒 TURBO' : '⚡ TURBO'; $('tTurbo').classList.toggle('locked', lvlIdx < 1);
  hudCache = {}; updateHUD();
  // precompilar los sombreadores para que no se congele al empezar
  camera.position.copy(cam.cur); camera.lookAt(P.pos.x, 1.5, P.pos.z);
  camera.updateMatrixWorld(); updateCull(camera.position);
  // Las versiones lejanas (livianas) de las personas se preparan AQUÍ, durante la pantalla de carga.
  // Antes se preparaban ya jugando: los primeros segundos se dibujaban ~270 personas completas
  // (más de 3.000 llamadas de dibujo) y el juego daba tirones al empezar, sobre todo en el celular.
  await buildHumanLOD(world);
  await warmShaders(scene, camera); pendingGroups.clear();
  lastNow = performance.now();
  // al empezar a jugar suena otra canción (más activa) distinta a la del menú
  state = 'play'; sound.duck(1);
  if (musicStarted) sound.setMusicMode('play');            // cambia de la canción del menú a la del juego
  else { sound.mode = 'play'; ensureMusic(); }             // primera vez: arranca directamente con la canción del juego
}

const SCREENS = ['splash', 'help', 'levelsel', 'collection', 'pause', 'result', 'creator'];
function show(id) { SCREENS.forEach(s => $(s).classList.toggle('hidden', s !== id)); $('topbar').classList.toggle('hidden', !['splash', 'help', 'levelsel', 'collection', 'result'].includes(id)); }
function hideScreens() { SCREENS.forEach(s => $(s).classList.add('hidden')); }

function pauseGame() { if (state !== 'play') return; state = 'pause'; show('pause'); }
function resumeGame() { hideScreens(); state = 'play'; }

function openVerse() {
  const k = verseOrder[verseCursor % verseOrder.length]; verseCursor++;
  if (!save.verses.includes(k)) save.verses.push(k);
  // historial de los versículos que han salido (el último al final) para no repetirlos pronto
  save.vHist = (Array.isArray(save.vHist) ? save.vHist : []).filter(x => x !== k).concat(k).slice(-VERSES.length); persist();
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
function endLevel(won, why) {
  state = 'result'; sound.setMusicMode('menu');
  $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  if (P.car) { P.car.speed = 0; P.car = null; sound.carLoop(0); honkBtns(false); driveUI(false); }
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

/* ---------- Conducir el barco (se habilita al pasar el nivel Básico) ---------- */
// Las monedas y regalos del barco viajan con él
function followShip() {
  const sh = world.ship; if (!sh) return;
  const h = sh.rotation.y, cs = Math.cos(h), sn = Math.sin(h), px = sh.position.x, pz = sh.position.z;
  for (const c of world.coins) if (c.ship && !c.taken) { const [lx, lz] = c.ship; c.x = px + cs * lx + sn * lz; c.z = pz - sn * lx + cs * lz; c.g.position.x = c.x; c.g.position.z = c.z; }
  if (world.clocks) for (const c of world.clocks) if (c.ship && !c.taken) { const [lx, lz] = c.ship; c.x = px + cs * lx + sn * lz; c.z = pz - sn * lx + cs * lz; c.g.position.x = c.x; c.g.position.z = c.z; }
  for (const n of world.npcs) if (n.ship) { const [lx, lz] = n.ship; n.x = px + cs * lx + sn * lz; n.z = pz - sn * lx + cs * lz; n.g.position.x = n.x; n.g.position.z = n.z; n.g.rotation.y = h; }
}
const CLOCK_SECS = 15;
function pickClock(rad) {
  if (!world.clocks) return false;
  for (const c of world.clocks) {
    if (c.taken) continue;
    if (Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < rad && Math.abs(P.pos.y + 1 - c.y) < 1.6) {
      c.taken = true; c.g.visible = false; timeLeft += CLOCK_SECS; spawnBurst(c.g.position); sound.gift();
      toast(`⏰ ¡+${CLOCK_SECS} segundos!`, '#6fd0ff'); updateHUD(); return false;
    }
  }
  return false;
}
function startDriving() {
  driveUI(true); const b = world.boat; P.driving = true; b.away = true; b.speed = 0; b.heading = Math.PI; world.ship.position.x = b.home.x - 6; // zarpa con la proa hacia mar abierto
  cam.distSave = cam.dist; cam.dist = 17; cam.pitch = .28;
  $('prompt').classList.remove('show'); toast('⛵ ¡Conduces el barco! · T para bajar', '#7ef0a4'); sound.boatBoard();
}
function stopDriving() {
  driveUI(false); const b = world.boat; P.driving = false; b.away = false; b.speed = 0;
  world.ship.position.set(b.home.x, 0, b.home.z); world.ship.rotation.y = 0; b.heading = 0;
  P.pos.set(b.home.x - 4, b.deckY, b.home.z + 1.5); P.vy = 0; P.onGround = true; P.speed = 0;
  cam.dist = cam.distSave || 6.4; toast('⚓ El barco volvió al muelle', '#ffd34d'); sound.boatLoop(0); sound.splash(.4); sound.click();
}
/* ---------- Sentarse en una silla del templo ---------- */
let sitPressed = false;
function sitBtns(mode) { // mode: '' (oculto), 'sit' o 'stand'
  for (const id of ['tSit', 'btnSit']) { const b = document.getElementById(id); if (!b) continue; b.classList.toggle('hidden', !mode); if (mode) b.textContent = id === 'tSit' ? (mode === 'sit' ? '🪑 SENTARSE' : '🧍 PARARSE') : (mode === 'sit' ? '🪑' : '🧍'); b.title = mode === 'sit' ? 'Sentarse (tecla T)' : 'Levantarse (tecla T)'; }
}
['tSit', 'btnSit'].forEach(id => { const b = document.getElementById(id); if (b) { b.addEventListener('pointerdown', e => { e.preventDefault(); sitPressed = true; }); b.addEventListener('click', e => e.preventDefault()); } });
function nearSeat() {
  const ch = world && world.church; if (!ch || !ch.seats) return null;
  let best = null, bd = 1.15;
  for (const st of ch.seats) { const d = Math.hypot(P.pos.x - st.x, P.pos.z - (st.z + .55)); if (d < bd && Math.abs(P.pos.y - st.y) < 1) { bd = d; best = st; } }
  return best;
}
function sitDown(st) {
  P.sit = { x: st.x, y: st.y, z: st.z - .06, ry: 0, back: P.pos.clone(), t: 0 };
  P.speed = 0; P.vy = 0; P.praise = null; sitBtns('stand'); sound.click();
  toast('🪑 Te sentaste · ' + (isTouch ? 'toca 🧍 PARARSE' : 'T para levantarte'), '#9fd8ff');
}
function standUp() {
  const s = P.sit; if (!s) return;
  P.sit = null; P.pos.copy(s.back); P.vy = 0; P.onGround = true; P.speed = 0; sitBtns(''); sound.click();
}
function sitUpdate(dt) {
  const s = P.sit; s.t += dt;
  P.pos.set(s.x, s.y, s.z); P.heading = s.ry; P.speed = 0; P.vy = 0; P.onGround = true;
  const move = keys.KeyW || keys.ArrowUp || keys.KeyS || keys.ArrowDown || keys.KeyA || keys.ArrowLeft || keys.KeyD || keys.ArrowRight || (joy.active && Math.hypot(joy.x, joy.y) > .5);
  const pr = $('prompt'); if (!s.shown) { s.shown = true; pr.innerHTML = `${isTouch ? 'Toca <b>TOMAR</b>' : '<kbd>T</kbd>'} 🧍 Levantarse`; pr.classList.add('show'); }
  if (takePressed || sitPressed || jumpPressed || (move && s.t > .6)) { takePressed = sitPressed = jumpPressed = false; pr.classList.remove('show'); standUp(); }
  updateZone(dt); updateHUD();
}
/* ---------- Autos de lujo: subir, conducir y bajar ---------- */
const luxName = c => c.kind === 'pickup' ? 'la camioneta pickup blanca' : 'el superdeportivo blanco';
function carHits(c, x, z, h) {
  const cs = Math.cos(h), sn = Math.sin(h), hl = c.len / 2 - .15, hw = c.wid / 2 - .1;
  // el auto es una caja girada: se prueba contra cada obstáculo (paredes, postes de luz, árboles, bancas…)
  const ex = Math.abs(cs) * hw + Math.abs(sn) * hl, ez = Math.abs(sn) * hw + Math.abs(cs) * hl; // medio tamaño en x/z del auto girado
  const inCar = (qx, qz, r) => { const dx = qx - x, dz = qz - z, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hl, Math.min(hl, lz)); return (lx - cx) ** 2 + (lz - cz) ** 2 < r * r; };
  for (const k of world.colliders) {
    if (k.ramp || (k.tag === 'ship' && world.boat && world.boat.away)) continue;
    if (k.top < CURB + .45 || (k.bottom && k.bottom > 1.6)) continue;
    if (k.maxX < x - ex || k.minX > x + ex || k.maxZ < z - ez || k.minZ > z + ez) continue;      // eje x y z del mundo
    const kx = (k.minX + k.maxX) / 2, kz = (k.minZ + k.maxZ) / 2, khx = (k.maxX - k.minX) / 2, khz = (k.maxZ - k.minZ) / 2;
    const dx = kx - x, dz = kz - z;
    if (Math.abs(dx * cs - dz * sn) > hw + khx * Math.abs(cs) + khz * Math.abs(sn)) continue;    // ejes del auto
    if (Math.abs(dx * sn + dz * cs) > hl + khx * Math.abs(sn) + khz * Math.abs(cs)) continue;
    return true;
  }
  // personas, animales y personajes bíblicos
  if (world.dyn) for (const d of world.dyn) { const q = d.obj.position; if (d.obj.visible !== false && Math.abs(q.y - c.obj.position.y) < 2.5 && inCar(q.x, q.z, d.r + .15)) return true; }
  for (const n of world.npcs) if (!n.treasure && !n.ship && inCar(n.x, n.z, .55)) return true;
  for (const [lx, lz] of [[-hw, hl], [hw, hl], [-hw, -hl], [hw, -hl], [-hw, 0], [hw, 0], [0, hl + .1], [0, -hl - .1]]) {
    const px = x + lx * cs + lz * sn, pz = z - lx * sn + lz * cs;
    if (world.islands && islandH(px, pz) > .5) return true;
    for (const o of world.lux) if (o !== c) { const dx = px - o.obj.position.x, dz = pz - o.obj.position.z, oc = Math.cos(o.heading), os = Math.sin(o.heading); if (Math.abs(dx * oc - dz * os) < o.wid / 2 + .05 && Math.abs(dx * os + dz * oc) < o.len / 2 + .05) return true; }
  }
  return false;
}
function honkBtns(on) { for (const id of ['tHonk', 'btnHonk']) { const b = document.getElementById(id); if (b) b.classList.toggle('hidden', !on); } }
['tHonk', 'btnHonk'].forEach(id => { const b = document.getElementById(id); if (b) { const f = e => { e.preventDefault(); honkPressed = true; }; b.addEventListener('pointerdown', f); b.addEventListener('click', e => e.preventDefault()); } });
function startCar(c) {
  honkBtns(true); driveUI(true);
  P.car = c; c.speed = 0; c.steer = 0; cam.distSave = cam.dist; cam.dist = c.kind === 'pickup' ? 9.5 : 8; cam.pitch = .3;
  $('prompt').classList.remove('show'); sound.carStart(); toast(`🚗 ¡Conduces ${luxName(c)}! · T para bajar · ${isTouch ? 'botón 📯 para pitar' : 'H o Espacio para pitar'}`, '#7ef0a4');
}
function stopCar() {
  const c = P.car; if (!c) return;
  P.car = null; c.speed = 0; sound.carLoop(0); sound.click(); honkBtns(false); driveUI(false);
  const h = c.heading, cs = Math.cos(h), sn = Math.sin(h);
  for (const side of [-1, 1, -1.6, 1.6]) { // bajarse por la puerta del conductor (o la del otro lado si está tapada)
    const lx = side * (c.wid / 2 + .7), x = c.obj.position.x + lx * cs, z = c.obj.position.z - lx * sn;
    if (!blocked(x, z, c.obj.position.y)) { P.pos.set(x, floorAt(x, z, c.obj.position.y + .3), z); break; }
  }
  P.vy = 0; P.onGround = true; P.speed = 0; P.heading = h; cam.dist = cam.distSave || 6.4;
  toast(`🅿️ Te bajaste de ${luxName(c)}`, '#ffd34d');
}
function driveCar(dt) {
  const c = P.car, o = c.obj;
  let thr = 0, turn = 0;
  if (keys.KeyW || keys.ArrowUp) thr += 1; if (keys.KeyS || keys.ArrowDown) thr -= 1;
  if (keys.KeyA || keys.ArrowLeft) turn += 1; if (keys.KeyD || keys.ArrowRight) turn -= 1;
  if (pedal.gas) thr += 1; if (pedal.rev) thr -= 1;
  if (wheel.active) turn = -wheel.x;
  const top = c.top * (P.turbo ? 1.3 : 1);
  const want = thr > 0 ? thr * top : thr < 0 ? (c.speed > 1 ? 0 : thr * 7) : 0;
  const acc = thr < 0 && c.speed > 1 ? 3.5 : thr === 0 ? .9 : 1.1;              // frena fuerte, acelera suave
  c.speed += (want - c.speed) * Math.min(1, dt * acc);
  // dirección moderada: a más velocidad, menos se puede girar el volante
  const maxSteer = .24 * (1 - Math.min(.55, Math.abs(c.speed) / top * .6));
  c.steer += (turn * maxSteer - c.steer) * Math.min(1, dt * 2.5);
  c.heading += c.steer * dt * c.speed / (c.len * .62);
  const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
  const nx = o.position.x + fx * c.speed * dt, nz = o.position.z + fz * c.speed * dt;
  if (carHits(c, nx, nz, c.heading)) {
    if (Math.abs(c.speed) > 4 && (!c.bumpT || performance.now() - c.bumpT > 700)) { c.bumpT = performance.now(); sound.step('hard', true); toast('💥 ¡Choque! Maneja con cuidado', '#ffb36b'); }
    c.speed *= -.25; c.heading = o.rotation.y;
  } else { o.position.x = nx; o.position.z = nz; }
  o.rotation.y = c.heading;
  o.position.y = floorAt(o.position.x, o.position.z, CURB + .3);
  for (let k = 0; k < c.wheels.length; k++) { const w = c.wheels[k]; w.rotation.x += c.speed * dt / (c.kind === 'pickup' ? .45 : .36); if (k < 2) w.userData.steer.rotation.y = c.steer * 1.1; }
  if (keys.Space || keys.KeyH || jumpPressed || honkPressed) { jumpPressed = false; honkPressed = false; if (!c.honkT || performance.now() - c.honkT > 600) { c.honkT = performance.now(); sound.honk(.9, 0); } }
  // el jugador va sentado adentro
  P.pos.set(o.position.x, o.position.y, o.position.z); P.heading = c.heading; P.speed = 0; P.onGround = true; P.inv = .2;
  cam.yaw += Math.atan2(Math.sin(c.heading - cam.yaw), Math.cos(c.heading - cam.yaw)) * Math.min(1, dt * 3);
  sound.carLoop(.35 + Math.min(1, Math.abs(c.speed) / top) * .65, Math.abs(c.speed) / top);
  if (takePressed) { takePressed = false; if (Math.abs(c.speed) < 3) stopCar(); else toast('🛑 Frena primero para bajarte', '#ffd34d'); }
  // el tráfico sigue moviéndose y no se atraviesa
  for (const t of world.cars) {
    t.obj.position.x += t.dir * t.speed * dt; if (t.obj.position.x > t.max) t.obj.position.x = t.min; if (t.obj.position.x < t.min) t.obj.position.x = t.max;
    if (Math.abs(t.obj.position.x - o.position.x) < 3.2 && Math.abs(t.obj.position.z - o.position.z) < 2) { o.position.x -= fx * .4; o.position.z -= fz * .4; c.speed *= -.3; if (!c.honkT || performance.now() - c.honkT > 1500) { c.honkT = performance.now(); sound.honk(1, 0); } }
  }
  for (const k of world.coins) {
    if (k.taken || k.ship) continue;
    if (Math.hypot(o.position.x - k.x, o.position.z - k.z) < 3 && Math.abs(k.y - o.position.y) < 3) { k.taken = true; collected++; sound.coin(); spawnBurst(k.g.position); k.g.visible = false; updateHUD(); openVerse(); return; }
  }
  if (pickClock(3)) return;
  updateZone(dt); updateHUD();
}
// ¿El casco (unos 32 m de largo y 8 de ancho) tocaría algo en esa posición?
function shipHits(x, z, hd) {
  const W = world, cs = Math.cos(hd), sn = Math.sin(hd);
  for (let k = -16; k <= 16; k += 4) for (const lz of [-3.6, 0, 3.6]) {
    const px = x + cs * k + sn * lz, pz = z - sn * k + cs * lz;
    if (W.islands) for (const o of W.islands) if (Math.hypot(px - o.x, pz - o.z) < o.wl * 1.18 + 1.5) return true;
    if (W.sails) for (const sl of W.sails) { const p = sl.obj.position; if (Math.hypot(px - p.x, pz - p.z) < (sl.near ? 11 : 5)) return true; }
    if (W.pier && px > W.pier.minX && px < W.pier.maxX && pz > W.pier.minZ && pz < W.pier.maxZ) return true;
  }
  return false;
}
function driveBoat(dt) {
  const b = world.boat, sh = world.ship;
  let thr = 0, turn = 0;
  if (keys.KeyW || keys.ArrowUp) thr += 1; if (keys.KeyS || keys.ArrowDown) thr -= .5;
  if (keys.KeyA || keys.ArrowLeft) turn += 1; if (keys.KeyD || keys.ArrowRight) turn -= 1;
  if (pedal.gas) thr += 1; if (pedal.rev) thr -= .5;
  if (wheel.active) turn = -wheel.x * .7;
  b.speed += (thr * 13 - b.speed) * Math.min(1, dt * .5);
  b.heading += turn * dt * (.25 + Math.min(1, Math.abs(b.speed) / 8) * .45) * Math.sign(b.speed || 1);
  const fx = Math.cos(b.heading), fz = -Math.sin(b.heading);
  let nx = sh.position.x + fx * b.speed * dt, nz = sh.position.z + fz * b.speed * dt;
  if (nx > b.maxX || nx < b.minX || nz < b.minZ || nz > b.maxZ) { b.speed *= -.3; nx = THREE.MathUtils.clamp(nx, b.minX, b.maxX); nz = THREE.MathUtils.clamp(nz, b.minZ, b.maxZ); }
  // el barco choca con las islas, el muelle y los otros barcos (ya no los atraviesa)
  if (shipHits(nx, nz, b.heading) && !shipHits(sh.position.x, sh.position.z, sh.rotation.y)) {
    if (Math.abs(b.speed) > 3 && (!b.bumpT || performance.now() - b.bumpT > 900)) { b.bumpT = performance.now(); sound.step('hard', true); sound.splash(.5); toast('💥 ¡Cuidado! No se puede pasar por ahí', '#ffb36b'); }
    b.speed *= -.35; nx = sh.position.x; nz = sh.position.z;
  }
  sh.position.x = nx; sh.position.z = nz; sh.rotation.y = b.heading;
  sound.boatLoop(Math.min(1, .35 + Math.abs(b.speed) / 13));
  // el jugador va al timón
  const lx = -9, lz = 0; P.pos.set(nx + Math.cos(b.heading) * lx + Math.sin(b.heading) * lz, b.deckY + sh.position.y, nz - Math.sin(b.heading) * lx + Math.cos(b.heading) * lz);
  P.heading = Math.atan2(fx, fz); P.speed = 0; P.onGround = true;
  cam.yaw = P.heading;
  if (Math.abs(b.speed) > 2 && Math.random() < dt * 3) sound.stepAt(Math.min(.6, Math.abs(b.speed) / 20), 0);
  if (takePressed) { takePressed = false; stopDriving(); }
  // navegando también se recogen monedas y relojes del mar
  followShip();
  for (const c of world.coins) {
    if (c.taken || c.ship) continue;
    if (Math.hypot(sh.position.x - c.x, sh.position.z - c.z) < 7 || Math.hypot(P.pos.x - c.x, P.pos.z - c.z) < 2) {
      c.taken = true; collected++; sound.coin(); spawnBurst(c.g.position); c.g.visible = false; updateHUD(); openVerse(); return;
    }
  }
  if (pickClock(2)) return;
  // la flecha de monedas y el minimapa siguen funcionando
  updateHUD();
}

/* ---------- Vida diaria: efectos al comer, beber, dormir, bañarse ---------- */
const lifeUsed = new Set();
function lifeFx(kind, extra) {
  const ov = $('lifefx'); const bonus = { sleep: 8, shower: 5, bath: 5, wash: 2, tvon: 2, eat: 4, water: 3, coffee: 3, rest: 3, worship: 6, read: 5 }[kind] || 0;
  const first = !lifeUsed.has(kind); lifeUsed.add(kind);
  const msg = { sleep: '😴 Dormiste un rato… ¡recuperaste fuerzas!', shower: '🚿 ¡Qué baño tan fresco!', bath: '🛁 ¡Qué rico un baño de espuma calientito!', wash: '🧼 Te lavaste las manos y la cara', tvon: '📺 Tele encendida: MIPROAA TV', tvoff: '📺 Tele apagada', eat: extra ? `😋 ¡Qué rico! Compraste en el puesto de ${extra.toLowerCase()}` : '🍽 ¡Buen provecho!', water: '💧 ¡Agua fresca! Te hidrataste', coffee: '☕ ¡Un cafecito calientito!', rest: '🛋 Descansaste en el sofá', read: '📖 ¡Alimentaste tu espíritu con la Palabra!', worship: '🙌 ¡Gloria a Dios! Adoraste con todo tu corazón' }[kind] || '✨';
  if (kind === 'read') { const v = VERSES[Math.random() * VERSES.length | 0]; showInfo({ name: '📖 Leíste la Biblia', text: '«' + v[0] + '»', ref: v[1] + ' · LBLA' }); }
  if (kind === 'worship') setTimeout(() => sound.say('¡Aleluya! ¡Gloria a Dios!', { male: save.player.gender !== 'f', rate: .9 }), 600);
  if (kind !== 'tvon' && kind !== 'tvoff') { ov.className = 'lifefx ' + (kind === 'bath' ? 'shower bath' : kind === 'wash' ? 'water' : kind); void ov.offsetWidth; ov.classList.add('on'); }
  sound.life(kind);
  setTimeout(() => ov.classList.remove('on'), kind === 'sleep' ? 2200 : 1300);
  setTimeout(() => { toast(msg + (first && bonus ? `  +${bonus} s` : ''), '#7ef0a4'); if (first && bonus) { timeLeft += bonus; updateHUD(); } }, kind === 'sleep' ? 1400 : 400);
}
/* ---------- Turbo (correr ultra rápido) ---------- */
function toggleTurbo() {
  if (lvlIdx < 1) { P.turbo = false; toast('🔒 El turbo se desbloquea en el nivel Intermedio', '#ffd34d'); sound.hurt(); return; }
  P.turbo = !P.turbo; $('tTurbo').classList.toggle('active', !!P.turbo); toast(P.turbo ? '⚡ Modo turbo' : '🏃 Turbo apagado', '#ffd34d', true); sound.click(); }

/* ---------- Mapa completo ---------- */
function openMap() { if (state !== 'play') return; state = 'map'; for (const c in keys) keys[c] = false; $('bigmap').classList.remove('hidden'); drawBigMap(); }
function closeMap() { $('bigmap').classList.add('hidden'); if (state === 'map') state = 'play'; }
function drawBigMap() {
  const cv = $('bigmapCanvas'), W2 = world, dpr = Math.min(2, devicePixelRatio || 1);
  const bw = Math.min(innerWidth - 24, 1400), bh = Math.min(innerHeight - 110, 900);
  cv.style.width = bw + 'px'; cv.style.height = bh + 'px'; cv.width = bw * dpr; cv.height = bh * dpr;
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const minX = W2.O - BEACH - 90, maxX = W2.O + W2.T + DES, minZ = W2.O - NZ, maxZ = W2.O + W2.T + SZ;
  const k = Math.min((bw - 20) / (maxX - minX), (bh - 20) / (maxZ - minZ)), ox = (bw - (maxX - minX) * k) / 2, oz = (bh - (maxZ - minZ) * k) / 2;
  const X = x => ox + (x - minX) * k, Z = z => oz + (z - minZ) * k, rect = (x, z, w, h, c) => { g.fillStyle = c; g.fillRect(X(x), Z(z), w * k, h * k); };
  g.fillStyle = '#0b1220'; g.fillRect(0, 0, bw, bh);
  rect(minX, minZ, W2.seaInfo.SX - minX, maxZ - minZ, '#1f5f8a');
  rect(W2.O - BEACH, minZ, BEACH, maxZ - minZ, '#e8d2a2');
  rect(W2.O, W2.O, W2.T, W2.T, '#3a3d42');
  for (const [bx, bz, tp] of W2.blocks) rect(bx, bz, BLOCK, BLOCK, tp === 'plaza' ? '#6f9a52' : '#8a94a6');
  rect(W2.desert.X0, W2.O, DES, W2.T, '#d8b98a');
  const tb = W2.desert.tb; g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(X(tb.x0), Z(tb.z0), (tb.x1 - tb.x0) * k, (tb.z1 - tb.z0) * k); rect(W2.desert.tcx - 24, W2.desert.tcz - 4, 24, 8, '#f5c542');
  rect(W2.O, W2.south.Z0, W2.south.Wt, SZ, '#7a9a4a'); rect(W2.south.arkX - 75, W2.south.arkZ - 12.5, 150, 25, '#7a4a24');
  rect(W2.O, W2.north.zN, W2.T + DES, NZ, '#c9b48a');
  for (const p of W2.places) { if (p.locked) { g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X(p.x0), Z(W2.north.zN), (p.x1 - p.x0) * k, NZ * k); } }
  rect(W2.seaInfo.SX - 70, W2.seaInfo.Zc - 2, 72, 4, '#8a5e36'); rect(W2.seaInfo.shipX - 15, W2.seaInfo.Zc - 3.5, 30, 7, '#6a4224');
  // textos
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const label = (txt, x, z, size = 13, col = '#fff') => { g.font = `700 ${size}px system-ui, sans-serif`; g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.65)'; g.strokeText(txt, X(x), Z(z)); g.fillStyle = col; g.fillText(txt, X(x), Z(z)); };
  label('CIUDAD', W2.O + W2.T / 2, W2.O + W2.T / 2, 16);
  label('DESIERTO · TABERNÁCULO', W2.desert.tcx, W2.O + 8, 13, '#3a2a10');
  label('ARCA DE NOÉ', W2.south.arkX, W2.south.arkZ, 13);
  if (W2.jordan) { rect(W2.O + 17, W2.south.Z0 + 3, 10, SZ - 6, '#3f8fa8'); label('RÍO JORDÁN', W2.O + 22, W2.south.Z0 + SZ / 2, 11); }
  label('PROCESIÓN DEL ARCA', W2.desert.tcx, W2.O + 16, 10, '#3a2a10');
  label('VALLE DE ELA · DAVID Y GOLIAT', W2.valley.goliathPos[0] - 6, W2.valley.goliathPos[1] - 18, 12);
  label('MAR', (minX + W2.seaInfo.SX) / 2, W2.O + W2.T / 2, 16);
  label('BARCO', W2.seaInfo.shipX, W2.seaInfo.Zc - 9, 11);
  W2.places.forEach((p, i) => { const sz = Math.max(9, Math.min(13, (p.x1 - p.x0) * k / 9)); label((p.locked ? '🔒 ' : '') + p.name.replace('La torre de ', 'Torre de '), p.x, W2.north.zN + NZ * (i % 2 ? .62 : .38), sz, p.locked ? '#ddd' : '#3a2a10'); });
  // monedas, personajes y regalos
  for (const c of W2.coins) if (!c.taken) { g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(X(c.x), Z(c.z), 3.5, 0, 7); g.fill(); }
  if (W2.clocks) for (const c of W2.clocks) if (!c.taken) drawClockIcon(g, X(c.x), Z(c.z), 6);
  g.font = '18px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (W2.house) { g.fillText('🏠', X(W2.house.cx), Z(W2.house.cz)); g.font = '600 11px system-ui'; g.fillStyle = '#fff'; g.fillText('Mi casa', X(W2.house.cx), Z(W2.house.cz) + 16); g.font = '18px system-ui'; }
  if (W2.church) { g.fillText('⛪', X(W2.church.cx), Z(W2.church.cz)); g.font = '600 11px system-ui'; g.fillStyle = '#fff'; g.fillText('MIPROAA', X(W2.church.cx), Z(W2.church.cz) + 16); }
  for (const n of W2.npcs) { g.fillStyle = n.given ? 'rgba(160,200,255,.5)' : n.treasure ? '#ff7ab6' : '#6fd0ff'; g.beginPath(); g.arc(X(n.x), Z(n.z), 4, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1; g.stroke(); }
  // jugador
  g.save(); g.translate(X(P.pos.x), Z(P.pos.z)); g.rotate(-P.heading + Math.PI); g.fillStyle = '#ff4040'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.stroke(); g.restore();
  $('bigmapLegend').innerHTML = `<span><i style="background:#ff4040"></i>Tú</span><span><i style="background:#ffd34d"></i>Monedas (${W2.coins.filter(c => !c.taken).length})</span><span><i style="background:#6fd0ff"></i>Personajes con regalo</span><span><i style="background:#ff7ab6"></i>Regalos de lugares</span><span>⏰ Relojes (+15 s)</span><span>🏠 Mi casa</span><span>⛪ MIPROAA</span><span>🔒 Lugar bloqueado</span>`;
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
  $('tGift').innerHTML = n.given ? `Ya recibiste: <b>${d.emoji} ${d.gift}</b>` : `${n.treasure ? 'Encontraste' : 'Te regala'}: <b>${d.emoji} ${d.gift}</b> <span>+1 moneda · +10 s</span>`;
  $('btnTake').textContent = n.given ? 'Continuar' : (isTouch ? 'Tomar regalo' : 'Tomar regalo (T)');
  $('talk').classList.remove('hidden'); $('info').classList.remove('show'); infoTimer = 0;
  sound.talk();
  if (!n.treasure) sound.say(`¡Hola! Soy ${d.name.split(' (')[0]}.`, { male: d.gender !== 'f' });
}
function takeGift() {
  const n = talkNPC; if (!n) return;
  $('talk').classList.add('hidden');
  if (!n.given) {
    n.given = true; timeLeft += 10; collected++; updateHUD(); sound.gift(); setTimeout(() => sound.say('¡Shalom!', { male: n.def.gender !== 'f', rate: .85 }), 350);
    if (!save.gifts.includes(n.def.id)) { save.gifts.push(n.def.id); persist(); }
    n.glow.visible = false;
    const wp = new THREE.Vector3(); n.gift.getWorldPosition(wp); n.g.remove(n.gift); n.gift.position.copy(wp); world.group.add(n.gift);
    flying.push({ obj: n.gift, t: 0, from: wp.clone() });
    toast(`${n.def.emoji} +1 moneda · +10 s`, '#7ef0a4');
  }
  talkNPC = null; state = 'play';
  if (collected >= goal) endLevel(true);
}
// Lugares especiales (tabernáculo, casa, oficinas, templo…): tarjeta al entrar y cierre automático.
// Se llama también cuando hay una acción cerca (adorar, comer, dormir…) para que la tarjeta no se quede vieja.
function updateZone(dt) {
  let z = null;
  for (const zz of world.zones) if (P.pos.x > zz.minX && P.pos.x < zz.maxX && P.pos.z > zz.minZ && P.pos.z < zz.maxZ && (!z || zz.pri > z.pri)) z = zz;
  const bano = !!(z && z.id === 'bano'); if (bano !== enBata) ponerBata(bano);
  // al entrar al Lugar Santísimo: reverencia y se arrodilla (una vez cada vez que entra)
  const holy = world.zones.some(q => q.id === 'santisimo' && P.pos.x > q.minX && P.pos.x < q.maxX && P.pos.z > q.minZ && P.pos.z < q.maxZ);
  if (holy && !P.inHoly && !P.kneel && !P.driving && !P.car) {
    P.kneel = { t: 0, dur: 5.5 }; P.speed = 0;
    setTimeout(() => { toast('🙏 Reverencia ante la presencia del SEÑOR', '#ffe9a8'); sound.life('worship'); }, 200);
  }
  P.inHoly = holy;
  // al entrar al templo MIPROAA: salta de alegría, se arroja de rodillas y adora moviendo la cabeza
  const church = world.zones.some(q => q.id === 'iglesia' && P.pos.x > q.minX && P.pos.x < q.maxX && P.pos.z > q.minZ && P.pos.z < q.maxZ);
  if (church && !P.inChurch && !P.praise && !P.kneel && !P.driving && !P.car) {
    P.praise = { t: 0, dur: 6.6, j: 0 }; P.speed = 0;
    toast('🙌 ¡Gloria a Dios! ¡Aleluya!', '#ffe9a8');
    setTimeout(() => sound.say('¡Gloria a Dios! ¡Aleluya!', { male: save.player.gender !== 'f', rate: .95 }), 300);
  }
  P.inChurch = church;
  // la servidora de la recepción saluda cuando llegas
  const gr = world.church && world.church.greeter;
  if (gr && gr.cool <= 0 && Math.hypot(P.pos.x - gr.x, P.pos.z - gr.z) < 5 && Math.abs(P.pos.y - gr.y) < 2) {
    gr.g = 3.5; gr.cool = 20;
    const f = save.player.gender === 'f';
    sound.say(`¡Bendiciones! ${f ? 'Bienvenida' : 'Bienvenido'} a la casa de Dios.`, { male: false, rate: .95 });
    toast(`💬 Servidora: «¡Bendiciones! ${f ? 'Bienvenida' : 'Bienvenido'} a la casa de Dios»`, '#ffe9a8');
  }
  if (z !== curZone) { curZone = z; $('btnArkExit').classList.toggle('hidden', !(z && z.id === 'arca-dentro')); if (z) showInfo(z); if (z && z.id === 'arca-dentro') { P.smell = 3.2; setTimeout(() => toast('🤢 ¡Uf, qué olor a animales!', '#b8e07a'), 300); sound.say('¡Uf, qué olor!', { male: save.player.gender !== 'f', rate: 1 }); } }
  if (infoTimer > 0 && (infoTimer -= dt) <= 0) $('info').classList.remove('show');
}

function showInfo(z) {
  $('iName').textContent = z.name; $('iText').textContent = z.text; $('iRef').textContent = z.ref;
  $('info').classList.add('show'); infoTimer = 12;
}

function toast(txt, color = '#ff6b6b', mini = false) { const t = $('toast'); t.style.color = color; t.textContent = txt; t.classList.toggle('mini', mini); t.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 1100); }
function toastOld(txt) { const t = $('toast'); t.textContent = txt; t.style.opacity = 1; clearTimeout(toast.h); toast.h = setTimeout(() => t.style.opacity = 0, 900); }

/* =========================================================
   ACTUALIZACIÓN
   ========================================================= */
const tmpV = new THREE.Vector3(), ray = new THREE.Raycaster();

function update(dt) {
  // dentro de la iglesia el tiempo se detiene hasta que el jugador salga
  const enTemplo = !!(world.church && world.church.inside(P.pos) && P.pos.y < 9.5);
  if (enTemplo !== P.timeStop) {
    P.timeStop = enTemplo; elTimer.classList.toggle('paused', enTemplo);
    toast(enTemplo ? '⏸ En la casa de Dios el tiempo se detiene' : '▶ El tiempo sigue corriendo', enTemplo ? '#9fd8ff' : '#ffd34d');
  }
  if (!enTemplo) { timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; updateHUD(); endLevel(false); return; } }

  // Entrada → dirección relativa a cámara
  let ix = 0, iz = 0;
  if (P.driving) { driveBoat(dt); return; }
  if (P.car) { driveCar(dt); return; }
  if (P.sit) { sitUpdate(dt); return; }
  if (keys.KeyW || keys.ArrowUp) iz += 1;
  if (keys.KeyS || keys.ArrowDown) iz -= 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  let mag = Math.min(1, Math.hypot(ix, iz));
  let run = keys.ShiftLeft || keys.ShiftRight;
  if (joy.active) { ix = joy.x; iz = -joy.y; mag = Math.min(1, Math.hypot(ix, iz)); if (mag < .12) mag = 0; else mag = Math.min(1, mag * 1.15); }
  // reverencia en el Lugar Santísimo: se queda quieto mientras se inclina y se arrodilla
  if (P.kneel) { P.kneel.t += dt; mag = 0; ix = iz = 0; jumpPressed = false; if (P.kneel.t >= P.kneel.dur) P.kneel = null; }
  // alabanza al entrar al templo: tres saltos de alegría, luego de rodillas moviendo la cabeza
  if (P.praise) {
    const w = P.praise; w.t += dt; mag = 0; ix = iz = 0; jumpPressed = false;
    if (w.j < 3 && w.t > .15 + w.j * .8 && P.onGround) { w.j++; jumpPressed = true; }
    if (w.t >= w.dur) P.praise = null;
  }
  if (runToggle) run = true;
  // Mantener presionada la flecha ↑ (o W) hace correr más rápido
  if ((keys.KeyW || keys.ArrowUp) && P.onGround !== null) P.holdFwd = (P.holdFwd || 0) + dt; else P.holdFwd = 0;
  if (P.holdFwd > 1.4 && !isTouch) run = true;
  const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);           // adelante
  const rx = -fz, rz = fx;                                          // derecha
  let dx = fx * iz + rx * ix, dz = fz * iz + rz * ix;
  const dl = Math.hypot(dx, dz);
  // ¿Está en el agua? (más allá de la orilla y no sobre el muelle ni el barco)
  let inWater = false, waterY = 0;
  if (canSwim() && P.pos.x < world.seaInfo.SX && !P.climb && floorAt(P.pos.x, P.pos.z, P.pos.y) < .3) {
    inWater = true; waterY = -1.2 * THREE.MathUtils.clamp((world.seaInfo.SX - P.pos.x) / 4, 0, 1) - (P.swim && P.speed > .5 ? .14 : 0);
    const ih = islandH(P.pos.x, P.pos.z); if (ih > waterY) waterY = ih;   // la orilla de una isla: se camina en el agua
  }
  const target = mag > 0 ? (P.swim ? (P.turbo ? 5.6 : run ? 4.3 : 2.7) : (P.turbo ? TURBO : run ? RUN : WALK) * (inWater ? .6 : 1)) * mag : 0;
  P.speed += (target - P.speed) * Math.min(1, dt * (P.onGround ? 10 : 3));
  if (dl > 0.01 && mag > 0) {
    dx /= dl; dz /= dl;
    const want = Math.atan2(dx, dz);
    let d = want - P.heading; d = Math.atan2(Math.sin(d), Math.cos(d));
    P.heading += d * Math.min(1, dt * 12);
  }
  if (isFP()) { let d2 = cam.yaw - P.heading; d2 = Math.atan2(Math.sin(d2), Math.cos(d2)); if (mag === 0 || iz > 0) P.heading += d2 * Math.min(1, dt * 14); }
  const vx = Math.sin(P.heading) * P.speed, vz = Math.cos(P.heading) * P.speed;

  fwdHeld = !!(keys.KeyW || keys.ArrowUp);
  // Movimiento con colisiones por eje
  const nx = P.pos.x + vx * dt; if (!blocked(nx, P.pos.z, P.pos.y, true)) P.pos.x = nx;
  const nz = P.pos.z + vz * dt; if (!blocked(P.pos.x, nz, P.pos.y, true)) P.pos.z = nz;

  // Agarrarse del borde y subir: en el aire, empujando hacia adelante (flecha arriba / W / joystick)
  if (P.climb) { climbStep(dt); jumpPressed = false; return; }
  if ((!P.onGround || P.swim) && (fwdHeld || (joy.active && -joy.y > .35))) tryGrab();
  if (P.climb) { P.swim = false; jumpPressed = false; return; }
  if (inWater) {
    // Agua: flota a la altura del pecho, nada si está hondo y chapotea al caminar en la orilla
    if (jumpPressed && P.onGround && !P.swim) { P.vy = JUMP_V * .6; P.onGround = false; sound.swim(.6); }
    jumpPressed = false;
    if (!P.onGround) {
      P.vy -= GRAV * dt; P.pos.y += P.vy * dt;
      if (P.pos.y <= waterY && P.vy <= 0) { if (P.vy < -4) sound.splash(Math.min(1, -P.vy / 10)); P.pos.y = waterY; P.vy = 0; P.onGround = true; }
    } else P.pos.y += (waterY - P.pos.y) * Math.min(1, dt * 5);
    const was = P.swim; P.swim = P.onGround && waterY < -.75 && P.pos.y < -.6;
    if (P.swim && !was) { toast('🏊 ¡Estás nadando!', '#7ecbff'); if (!P.splashT || performance.now() - P.splashT > 3000) { P.splashT = performance.now(); sound.splash(.6); } }
    P.land = 0;
    if (P.swim) sound.swimLoop(Math.min(1, .35 + P.speed / 5)); else sound.swimLoop(0);
    if (P.speed > .5) {
      const st = P.swim ? Math.floor(human.swimPh / Math.PI) : Math.floor(human.phase / Math.PI);
      if (st !== P.lastStep) { P.lastStep = st; if (P.swim) sound.swim(P.speed > 3.5 ? 1 : .7); else sound.step('water', P.speed > 4); }
    }
  } else { if (P.swim) sound.swimLoop(0); P.swim = false;
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
      const d = world.desert, sth = world.south, si = world.seaInfo;
      const onWood = si && P.pos.x < si.SX + 2.5 && P.pos.y > .3 && P.pos.y < 1.6;          // muelle o cubierta del barco
      const onBeach = si && P.pos.x < world.O && P.pos.x > si.SX - .5 && P.pos.y < .3;        // arena de la playa
      const mw = world.meadow, onMeadow = mw && P.pos.y < .3 && P.pos.x > mw.x0 && P.pos.x < mw.x1 && P.pos.z > mw.z0 && P.pos.z < mw.z1;
      const surface = onWood ? 'wood' : onBeach ? 'sand' : onMeadow ? 'grass' : (d && P.pos.x > d.X0 && P.pos.y < .3) ? 'sand' : (sth && P.pos.z > sth.Z0 && P.pos.y < .3) ? 'grass' : 'hard';
      sound.step(surface, P.speed > 6.2);
    }
  } else P.lastStep = Math.floor(human.phase / Math.PI);
  }

  // Cuerpos que se mueven (animales y niños): el jugador no los atraviesa
  const ps = world.ark && world.ark.passage;
  const inArkPassage = !!ps && P.pos.x > ps.minX && P.pos.x < ps.maxX && P.pos.z > ps.minZ && P.pos.z < ps.maxZ;
  if (world.dyn) for (const b of world.dyn) {
    if (!b.obj.visible) continue;
    if (b.ark && inArkPassage) continue;   // en la rampa y la puerta del arca se pasa entre los animales
    b.obj.getWorldPosition(tmpV);
    if (Math.abs(tmpV.y - P.pos.y) > 1.6) continue;
    const dx = P.pos.x - tmpV.x, dz = P.pos.z - tmpV.z, d = Math.hypot(dx, dz), min = b.r + RADIUS;
    if (d < min && d > 1e-4) { const push = (min - d); const nx2 = P.pos.x + dx / d * push, nz2 = P.pos.z + dz / d * push; if (!blocked(nx2, nz2, P.pos.y)) { P.pos.x = nx2; P.pos.z = nz2; } P.speed *= .6; }
  }
  // Sonidos de los animales: fuertes de cerca, suaves de lejos
  if (world.ark) for (const a of world.ark.lodItems.concat(world.ark.insideItems)) {
    const kind = a.userData && a.userData.kind; if (!kind || !a.visible) continue;
    a.getWorldPosition(tmpV); const dx = tmpV.x - P.pos.x, dz = tmpV.z - P.pos.z, dist = Math.hypot(dx, dz);
    if (dist > 50) continue;
    a.userData.callT = (a.userData.callT ?? 2 + Math.random() * 8) - dt;
    if (a.userData.callT <= 0) { a.userData.callT = 6 + Math.random() * 9; const vol = Math.pow(1 - dist / 50, 2), pan = (dx * -Math.cos(cam.yaw) + dz * Math.sin(cam.yaw)) / Math.max(1, dist); sound.animal(kind, vol, pan); }
  }
  // Autos
  if (P.inv > 0) P.inv -= dt;
  for (const c of world.cars) {
    c.obj.position.x += c.dir * c.speed * dt;
    // sonido: el carro se oye al pasar cerca y pita si el jugador está delante
    {
      const now = performance.now() / 1000, dx = P.pos.x - c.obj.position.x, dz = P.pos.z - c.obj.position.z, dd = Math.hypot(dx, dz), ahead = dx * c.dir > 0;
      const right = Math.cos(cam.yaw) * -dx + Math.sin(cam.yaw) * dz; // izquierda/derecha respecto a la cámara
      if (dd < 22 && ahead && dd > 6 && (!c.passT || now - c.passT > 4)) { c.passT = now; sound.carPass(Math.min(.9, 9 / dd), THREE.MathUtils.clamp(-right / 10, -1, 1), c.dir); }
      if (ahead && Math.abs(dz) < 3.2 && dx * c.dir < 14 && P.pos.y < 2 && (!c.honkT || now - c.honkT > 3.5)) { c.honkT = now; sound.honk(Math.min(1, 12 / Math.max(3, dd)), THREE.MathUtils.clamp(-right / 10, -1, 1)); }
    }
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
  // Relojes: más tiempo
  if (pickClock(1.1)) return;
  // Personajes bíblicos cercanos
  let near = null, nd = 2.8;
  for (const n of world.npcs) {
    const d = Math.hypot(P.pos.x - n.x, P.pos.z - n.z);
    if (d < 9 && !n.fixed) { const want = Math.atan2(P.pos.x - n.x, P.pos.z - n.z); let df = want - n.g.rotation.y; df = Math.atan2(Math.sin(df), Math.cos(df)); n.g.rotation.y += df * Math.min(1, dt * 4); }
    if (d < nd) { nd = d; near = n; }
  }
  const pr = $('prompt');
  if (world.lux && P.pos.y < 1.6) {
    let lc = null, ld = 3.4;
    for (const c of world.lux) { const d = Math.hypot(P.pos.x - c.obj.position.x, P.pos.z - c.obj.position.z); if (d < ld) { ld = d; lc = c; } }
    if (lc) {
      const can = lvlIdx >= 1;
      pr.innerHTML = can ? `${isTouch ? 'Toca <b>TOMAR</b>' : '<kbd>T</kbd>'} 🚗 Conducir ${luxName(lc)}` : `🔒 Los autos de lujo se manejan desde el nivel <b>Intermedio</b>`;
      pr.classList.add('show'); $('tTake').classList.toggle('ready', can);
      if (takePressed) { takePressed = false; if (can) startCar(lc); else { toast('🔒 Pasa el nivel Básico para manejar los autos de lujo', '#ffd34d'); sound.hurt(); } }
      takePressed = false; updateZone(dt); updateHUD(); return;
    }
  }
  const bt = world.boat, onDeck = bt && !bt.away && P.pos.y > bt.deckY - .2 && Math.abs(P.pos.x - (bt.home.x - 9)) < 4.5 && Math.abs(P.pos.z - bt.home.z) < 3.4;
  if (onDeck) {
    const can = lvlIdx >= 1;
    pr.innerHTML = can ? `${isTouch ? 'Toca <b>TOMAR</b>' : '<kbd>T</kbd>'} ⛵ Conducir el barco` : `🔒 El barco se habilita al pasar el nivel <b>Básico</b> (desde Intermedio)`;
    pr.classList.add('show'); $('tTake').classList.toggle('ready', can);
    if (takePressed) { takePressed = false; if (can) startDriving(); else { toast('🔒 Pasa el nivel Básico para usar el barco', '#ffd34d'); sound.hurt(); } }
    takePressed = false;
    updateZone(dt); updateHUD(); return;
  }
  // Silla libre del templo: sentarse (T, TOMAR o el botón 🪑)
  const seat = !near && nearSeat();
  sitBtns(seat ? 'sit' : '');
  if (seat) {
    pr.innerHTML = `${isTouch ? 'Toca <b>TOMAR</b> o 🪑' : '<kbd>T</kbd> o 🪑'} Sentarse`; pr.classList.add('show'); $('tTake').classList.add('ready');
    if (takePressed || sitPressed) { takePressed = sitPressed = false; sitDown(seat); }
    takePressed = false; sitPressed = false; updateZone(dt); updateHUD(); return;
  }
  sitPressed = false;
  // Acciones de la vida diaria (comer, beber, dormir, bañarse, comprar)
  if (world.life && !near) {
    let ba = null, bd = 9;
    for (const a of world.life.acts) { const d = Math.hypot(P.pos.x - a.x, P.pos.z - a.z); if (d < a.r && Math.abs(P.pos.y - a.y) < 1.3 && d < bd) { bd = d; ba = a; } }
    if (ba) {
      pr.innerHTML = `${isTouch ? 'Toca <b>TOMAR</b>:' : '<kbd>T</kbd>'} ${ba.label}`; pr.classList.add('show'); $('tTake').classList.add('ready');
      if (takePressed) { takePressed = false; ba.fn(); }
      takePressed = false; updateZone(dt); updateHUD(); return;
    }
  }
  if (near) {
    // los tesoros ya se llaman «Regalo del …»: no repetir la palabra regalo
    const nm = near.def.name, esRegalo = /^regalo\b/i.test(nm);
    pr.innerHTML = near.given ? (near.treasure ? `<b>${nm}</b> ✓` : `<kbd>T</kbd> Hablar con <b>${nm}</b>`)
      : esRegalo ? `<kbd>T</kbd> Tomar el <b>${'r' + nm.slice(1)}</b>` : `<kbd>T</kbd> Tomar el regalo de <b>${nm}</b>`;
    pr.classList.add('show'); $('tTake').classList.add('ready');
    if (takePressed) { takePressed = false; openTalk(near); return; }
  } else { pr.classList.remove('show'); $('tTake').classList.remove('ready'); }
  takePressed = false;
  updateZone(dt);
  if (!isFinite(P.pos.x) || !isFinite(P.pos.y) || !isFinite(P.pos.z)) { P.pos.copy(P.safe || world.start); P.vy = 0; P.speed = 0; } else if (P.onGround && !P.driving) (P.safe || (P.safe = new THREE.Vector3())).copy(P.pos);
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

const tmpV2 = new THREE.Vector3();
function updateCamera(dt, follow = true) {
  if (isFP()) {
    // ojos del jugador: la mirada sigue el giro del ratón / dedo
    const eye = tmpV2.set(P.pos.x + Math.sin(cam.yaw) * .12, P.pos.y + 1.6 + Math.sin(human.phase * 2) * Math.min(.03, P.speed * .004), P.pos.z + Math.cos(cam.yaw) * .12);
    camera.position.copy(eye); cam.cur.copy(eye);
    const look = -(cam.pitch - .3) * 1.5;
    camera.lookAt(eye.x + Math.sin(cam.yaw) * Math.cos(look), eye.y + Math.sin(look), eye.z + Math.cos(cam.yaw) * Math.cos(look));
    cam.look.copy(eye);
    fpArms.visible = false; // en primera persona solo se ve lo que mira la cámara (sin manos ni brazos)
    const sw = Math.sin(human.phase) * Math.min(1, P.speed / 6);
    // balanceo natural: quieto casi no se mueve, caminando suave, corriendo más amplio y en turbo todavía más rápido y amplio
    const spd = P.speed, amp = spd < .3 ? 0 : spd < WALK + .5 ? .28 : spd < RUN + .5 ? .5 : .62;
    fpSwing += (amp - fpSwing) * Math.min(1, dt * 6);
    const ph = Math.sin(human.phase), breath = Math.sin(performance.now() / 900) * .006;
    for (const a of fpArms.children) {
      const sx = a.userData.sx, k = ph * sx * fpSwing;            // un brazo adelante y el otro atrás
      if (P.climb) { a.position.set(sx * .22, -.05, -.4); a.rotation.set(-1.2, 0, sx * .1); continue; }
      a.position.set(sx * .22, -.21 + Math.max(0, k) * .1 + breath, -.3 - k * .1);
      a.rotation.set(FP_BASE + k * .9, 0, sx * (.18 + fpSwing * .1));
    }
    if (camera.fov !== 70) { camera.fov = 70; camera.updateProjectionMatrix(); }
    return;
  }
  fpArms.visible = false;
  const head = tmpV.set(P.pos.x, P.pos.y + 1.55, P.pos.z);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const want = new THREE.Vector3(head.x - Math.sin(cam.yaw) * cam.dist * cp, head.y + cam.dist * sp, head.z - Math.cos(cam.yaw) * cam.dist * cp);
  // Evitar que la cámara atraviese edificios
  const dir = want.clone().sub(head); const len = dir.length(); dir.normalize();
  ray.set(head, dir); ray.far = len;
  const hit = ray.intersectObjects(world.blockers, false)[0];
  if (hit) want.copy(head).addScaledVector(dir, Math.max(1.2, hit.distance - .4));
  if (want.y < P.pos.y + .45) want.y = P.pos.y + .45;   // la cámara no baja del suelo
  if (world.islands) { const ih = islandH(want.x, want.z) + 1.6; if (want.y < ih) want.y = ih; } // ni se mete dentro de las islas
  cam.cur.lerp(want, follow ? Math.min(1, dt * 10) : 1);
  camera.position.copy(cam.cur);
  // mirando hacia arriba: se ve un poco más de cielo
  const upLook = cam.pitch < .05 ? (.05 - cam.pitch) * 7 : 0;
  cam.look.lerp(tmpV2.set(head.x, head.y + upLook, head.z), Math.min(1, dt * 14));
  camera.lookAt(cam.look);
  // sensación de velocidad: la cámara se abre un poco al correr
  const fovT = 58 + THREE.MathUtils.clamp((P.speed - WALK) / (TURBO - WALK), 0, 1) * 9;
  if (Math.abs(camera.fov - fovT) > .05) { camera.fov += (fovT - camera.fov) * Math.min(1, dt * 4); camera.updateProjectionMatrix(); }
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
// relojito para los mapas: esfera blanca, borde azul y manecillas
function drawClockIcon(g, x, y, r) {
  g.save(); g.fillStyle = '#ffffff'; g.strokeStyle = '#1a8fd8'; g.lineWidth = r * .32; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#1a8fd8'; for (const sx of [-1, 1]) { g.beginPath(); g.arc(x + sx * r * .75, y - r * 1.02, r * .32, 0, 7); g.fill(); }
  g.strokeStyle = '#123'; g.lineWidth = r * .18; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - r * .65); g.moveTo(x, y); g.lineTo(x + r * .5, y + r * .15); g.stroke(); g.restore();
}
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
    if (world.meadow) { const m = world.meadow; mg.fillStyle = 'rgba(122,170,80,.55)'; mg.fillRect(m.x0, m.z0, m.x1 - m.x0, m.z1 - m.z0); }
    mg.strokeStyle = 'rgba(255,255,255,.8)'; mg.lineWidth = 1.2; mg.strokeRect(d.tcx - 25, d.tcz - 12.5, 50, 25);
    mg.fillStyle = 'rgba(245,197,66,.9)'; mg.fillRect(d.tcx - 15, d.tcz - 2.5, 15, 5);
  }
  if (world.seaInfo) { mg.fillStyle = 'rgba(40,110,170,.7)'; mg.fillRect(world.seaInfo.SX - 2000, world.O - 2000, 2000, 4000); mg.fillStyle = 'rgba(232,210,162,.5)'; mg.fillRect(world.O - BEACH, world.O, BEACH, world.T + SZ); mg.fillStyle = 'rgba(120,80,40,.95)'; mg.fillRect(world.seaInfo.shipX - 15, world.seaInfo.Zc - 3.5, 30, 7); mg.fillRect(world.seaInfo.SX - 70, world.seaInfo.Zc - 2, 72, 4); }
  if (world.north) { mg.fillStyle = 'rgba(201,180,138,.5)'; mg.fillRect(world.O, world.north.zN, world.T + DES, NZ); for (const p of world.places) if (p.locked) { mg.fillStyle = 'rgba(0,0,0,.4)'; mg.fillRect(p.x0, world.north.zN, p.x1 - p.x0, NZ); } }
  if (world.south) { const S2 = world.south; mg.fillStyle = 'rgba(122,154,74,.45)'; mg.fillRect(world.O, S2.Z0, S2.Wt, SZ); mg.fillStyle = 'rgba(120,80,40,.9)'; mg.fillRect(S2.arkX - 75, S2.arkZ - 12.5, 150, 25); }
  for (const n of world.npcs) { mg.fillStyle = n.given ? 'rgba(160,200,255,.6)' : n.treasure ? '#ff7ab6' : '#6fd0ff'; mg.beginPath(); mg.arc(n.x, n.z, 2.6, 0, 7); mg.fill(); if (!n.given) { mg.strokeStyle = '#fff'; mg.lineWidth = .8; mg.stroke(); } }
  mg.fillStyle = '#ff5a5a';
  for (const c of world.cars) mg.fillRect(c.obj.position.x - 2, c.obj.position.z - 1, 4, 2);
  for (const c of world.coins) if (!c.taken) { mg.fillStyle = '#ffd34d'; mg.beginPath(); mg.arc(c.x, c.z, 2.2, 0, 7); mg.fill(); }
  if (world.clocks) for (const c of world.clocks) if (!c.taken) drawClockIcon(mg, c.x, c.z, 3.4);
  if (world.house) { mg.save(); mg.translate(world.house.cx, world.house.cz); mg.rotate(-(cam.yaw + Math.PI)); mg.font = '9px system-ui'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('🏠', 0, 0); mg.restore(); }
  if (world.church) { const c = world.church; mg.save(); mg.translate(c.cx, c.cz); mg.rotate(-(cam.yaw + Math.PI)); mg.font = '9px system-ui'; mg.textAlign = 'center'; mg.textBaseline = 'middle'; mg.fillText('⛪', 0, 0); mg.restore(); }
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
let lastNow = performance.now(), elapsed = 0; const perf = { acc: 0, n: 0, changes: 0, lowered: false };
let mmTimer = 0, lodTimer = 0, worshipT = 0, worshipStep = 0;
// Luciérnagas: de noche, unas lucecitas verde‑amarillas flotan y parpadean cerca del jugador (no dentro de los edificios)
const fireflies = (() => {
  const n = 46, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seeds = [];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  for (let i = 0; i < n; i++) seeds.push({ a: Math.random() * 6.28, d: 7 + Math.random() * 22, h: .4 + Math.random() * 2.2, ph: Math.random() * 6.28, sp: .15 + Math.random() * .35, bl: 1.2 + Math.random() * 1.8 });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const p = new THREE.Points(geo, new THREE.PointsMaterial({ size: .26, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  p.frustumCulled = false; p.visible = false; scene.add(p);
  const INDOOR = new Set(['casa', 'oficinas', 'iglesia', 'iglesia-lobby', 'arca-dentro', 'santo', 'santisimo']);
  let cx = 0, cz = 0, chk = 0, inside = false, crk = 2;
  return {
    update(dt, t, cp) {
      if (!stars.visible || !world) { p.visible = false; return; }
      if ((chk -= dt) <= 0) { chk = .5; inside = (world.zones || []).some(z => INDOOR.has(z.id) && cp.x > z.minX && cp.x < z.maxX && cp.z > z.minZ && cp.z < z.maxZ); }
      p.visible = !inside; if (inside) return;
      if (state === 'play' && (crk -= dt) <= 0) { crk = .9 + Math.random() * 2.6; sound.cricket(.35 + Math.random() * .4, Math.random() * 1.6 - .8); } // grillos de noche al aire libre
      if (Math.hypot(cp.x - cx, cp.z - cz) > 18) { cx = cp.x; cz = cp.z; }
      const gy = P.pos.y;
      for (let i = 0; i < n; i++) {
        const s2 = seeds[i], a = s2.a + t * s2.sp * .2;
        pos[i * 3] = cx + Math.cos(a) * s2.d + Math.sin(t * s2.sp + s2.ph) * 1.2;
        pos[i * 3 + 1] = gy + s2.h + Math.sin(t * s2.sp * 2 + s2.ph) * .35;
        pos[i * 3 + 2] = cz + Math.sin(a) * s2.d + Math.cos(t * s2.sp * 1.3 + s2.ph) * 1.2;
        const k = Math.max(0, Math.sin(t * s2.bl + s2.ph)); const b = k * k;
        col[i * 3] = .75 * b; col[i * 3 + 1] = 1 * b; col[i * 3 + 2] = .3 * b;
      }
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    }
  };
})();
// Mariposas: de día, unas mariposas de colores revolotean cerca del jugador (no dentro de los edificios ni de noche)
const butterflies = (() => {
  const grp = new THREE.Group(), list = [], n = 9;
  const COLS = [0xffb020, 0xf5f5f0, 0x4aa8ff, 0xff6a3d, 0xffe14d, 0xc77dff];
  const wingGeo = s => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .03, s * .13, 0, .1, s * .15, 0, -.01, 0, 0, .03, s * .15, 0, -.01, 0, 0, -.02, 0, 0, -.02, s * .14, 0, -.02, s * .08, 0, -.12], 3)); g.computeVertexNormals(); return g; };
  const gL = wingGeo(-1), gR = wingGeo(1), gB = new THREE.CylinderGeometry(.008, .006, .1, 4).rotateX(Math.PI / 2);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a1410 });
  for (let i = 0; i < n; i++) {
    const mat = new THREE.MeshLambertMaterial({ color: COLS[i % COLS.length], side: THREE.DoubleSide });
    const b = new THREE.Group(), L = new THREE.Mesh(gL, mat), R = new THREE.Mesh(gR, mat); b.add(new THREE.Mesh(gB, bodyMat), L, R);
    const sc = 1.5 + Math.random() * .6; b.scale.setScalar(sc); b.traverse(m => { m.frustumCulled = false; m.castShadow = false; });
    list.push({ b, L, R, sc, a: Math.random() * 6.28, d: 3 + Math.random() * 9, h: .7 + Math.random() * 1.2, ph: Math.random() * 6.28, sp: .25 + Math.random() * .35, fs: 16 + Math.random() * 8, dir: Math.random() < .5 ? 1 : -1 });
    grp.add(b);
  }
  grp.visible = false; scene.add(grp);
  const INDOOR = new Set(['casa', 'oficinas', 'iglesia', 'iglesia-lobby', 'arca-dentro', 'santo', 'santisimo', 'mar']);
  let cx = 0, cz = 0, chk = 0, inside = false;
  return {
    update(dt, t, cp) {
      if (!world || stars.visible || save.time === 'atardecer' || state !== 'play') { grp.visible = false; return; }
      if ((chk -= dt) <= 0) { chk = .5; inside = (world.zones || []).some(z => INDOOR.has(z.id) && cp.x > z.minX && cp.x < z.maxX && cp.z > z.minZ && cp.z < z.maxZ) || (P.pos.y > 3); }
      grp.visible = !inside; if (inside) return;
      if (Math.hypot(P.pos.x - cx, P.pos.z - cz) > 14) { cx = P.pos.x; cz = P.pos.z; }
      for (const k of list) {
        const a = k.a + t * k.sp * .25 * k.dir, wob = Math.sin(t * k.sp * 3 + k.ph);
        const x = cx + Math.cos(a) * k.d + wob * .8, z = cz + Math.sin(a) * k.d + Math.cos(t * k.sp * 2.3 + k.ph) * .8;
        const y = P.pos.y + k.h + Math.sin(t * 2.2 + k.ph) * .18 + Math.abs(Math.sin(t * k.fs * .5 + k.ph)) * .05;
        const vx = -Math.sin(a) * k.dir, vz = Math.cos(a) * k.dir; // tangente: miran hacia donde vuelan
        k.b.position.set(x, y, z); k.b.rotation.set(-.15, Math.atan2(vx, vz), 0);
        // Si una mariposa pasa pegada a la cámara se veía enorme tapando la pantalla: cerca de la cámara se encoge suavemente
        const dc = Math.hypot(x - cp.x, y - cp.y, z - cp.z), near = Math.min(1, Math.max(0, (dc - 1.2) / 1.6));
        k.b.scale.setScalar(k.sc * near); k.b.visible = near > .02;
        const f = Math.sin(t * k.fs + k.ph) * 1.1 + .25; k.L.rotation.z = -f; k.R.rotation.z = f;
      }
    }
  };
})();
// Estrellas fugaces: de noche, de vez en cuando cruza el cielo una estela brillante (Salmo 19:1)
const shootingStar = (() => {
  const pos = new Float32Array(6), col = new Float32Array([1, 1, .95, 0, 0, 0]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  line.frustumCulled = false; line.visible = false; line.renderOrder = -1; scene.add(line);
  const start = new THREE.Vector3(), dir = new THREE.Vector3();
  let wait = 4 + Math.random() * 6, life = 0, dur = 1;
  return {
    update(dt, cp) {
      if (!stars.visible) { line.visible = false; return; }
      if (life <= 0) {
        line.visible = false;
        if ((wait -= dt) > 0) return;
        wait = 7 + Math.random() * 12; dur = .7 + Math.random() * .6; life = dur;
        const th = Math.random() * Math.PI * 2, el = .45 + Math.random() * .5;
        start.set(Math.cos(th) * Math.cos(el), Math.sin(el), Math.sin(th) * Math.cos(el)).multiplyScalar(1200);
        dir.set(-Math.sin(th) + (Math.random() - .5) * .4, -.35 - Math.random() * .3, Math.cos(th) + (Math.random() - .5) * .4).normalize().multiplyScalar(Math.random() < .5 ? 700 : -700); dir.y = -Math.abs(dir.y);
      }
      life -= dt; const k = 1 - Math.max(0, life) / dur, fade = Math.sin(Math.PI * Math.min(1, k));
      const hx = cp.x + start.x + dir.x * k, hy = cp.y + start.y + dir.y * k, hz = cp.z + start.z + dir.z * k, tl = .16 + .1 * k;
      pos[0] = hx; pos[1] = hy; pos[2] = hz; pos[3] = hx - dir.x * tl; pos[4] = hy - dir.y * tl; pos[5] = hz - dir.z * tl;
      col[0] = fade; col[1] = fade; col[2] = .95 * fade;
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; line.visible = true;
    }
  };
})();
// Si algo falla en un cuadro, se registra y el juego sigue dibujando (antes un error repetido dejaba la imagen congelada)
let loopErrs = 0;
function loop() {
  requestAnimationFrame(loop);
  try { loopBody(); } catch (e) {
    if (loopErrs++ < 5) console.error('BIBLIXIA cuadro:', e);
    lastNow = performance.now();
    try { for (const g of pendingGroups) g.visible = true; renderer.render(scene, camera); } catch (_) {}
  }
}
function loopBody() {
  if (state !== 'play' && (sound._car || sound._boat || sound._swim)) { sound.carLoop(0); sound.boatLoop(0); sound.swimLoop(0); }
  if (building) { lastNow = performance.now(); return; }
  const now = performance.now(), raw = (now - lastNow) / 1000, dt = Math.min(raw, .05); lastNow = now; elapsed += dt; const t = elapsed;
  // Resolución automática suave: solo baja un poco si el equipo va lento (nunca quita sombras ni detalle)
  // Cambiar la resolución obliga a rehacer la imagen de la pantalla (da un tirón), así que se hace pocas veces:
  // se mide durante 4 s, solo baja si de verdad va lento, solo sube si va muy sobrado y nunca sube y baja sin parar
  if (!building && state === 'play' && raw < .25 && perf.changes < 2) {
    perf.acc += raw; perf.n++;
    if (perf.acc > 4) {
      const avg = perf.acc / perf.n; let pr = renderer.getPixelRatio();
      const MIN_PR = Math.min(MAX_PR, .85);
      if (avg > .04 && pr > MIN_PR) { renderer.setPixelRatio(Math.max(MIN_PR, pr - .2)); perf.changes++; perf.lowered = true; }
      else if (avg < .017 && pr < MAX_PR && !perf.lowered) { renderer.setPixelRatio(Math.min(MAX_PR, pr + .2)); perf.changes++; }
      perf.acc = 0; perf.n = 0;
    }
  }
  if (state === 'play') { applyLook(); update(dt); } else lookAcc.x = lookAcc.y = 0;
  birds.update(dt, elapsed, camera.position);
  fireflies.update(dt, elapsed, camera.position);
  butterflies.update(dt, elapsed, camera.position);
  shootingStar.update(dt, camera.position);

  if (world) {
    followShip();
    for (const c of world.coins) if (!c.taken) { c.coin.rotation.y = t * 2 + c.phase; c.g.position.y = c.y + Math.sin(t * 2.2 + c.phase) * .12; }
    if (world.clocks) for (const c of world.clocks) if (!c.taken) { c.body.rotation.y = t * 1.6 + c.phase; c.g.position.y = c.y + Math.sin(t * 2 + c.phase) * .15; }
    world.group.children.forEach(o => { if (o.userData.spin) o.rotation.y = t; });
    if (world.tab) world.tab.update(t);
    if (world.camp) world.camp.update(t);
    if (world.priests) {
      world.priests.update(dt, t, camera.position);
      // al acercarte al arca del pacto: música de adoración y los levitas proclaman «¡Kabod! ¡Presencia de Dios!»
      const ak = world.priests.ark, dA = ak && ak.visible ? Math.hypot(ak.position.x - P.pos.x, ak.position.z - P.pos.z) : 1e9;
      if (state === 'play') {
        if (dA < 28) sound.setMusicMode('ark'); else if (dA > 36 && sound.mode === 'ark') sound.setMusicMode('play');
        kabodT -= dt; trumpetT -= dt;
        // trompetas de los sacerdotes: suenan al llegar cerca del arca y luego cada pocos segundos mientras sigas cerca
        if (dA < 24 && trumpetT <= 0) { trumpetT = 7; const pan = THREE.MathUtils.clamp((ak.position.x - P.pos.x) / 20, -.8, .8); sound.trumpet(dA < 12 ? 1 : .6 + (24 - dA) / 30, pan); if (!trumpetNear) toast('🎺 ¡Las trompetas suenan delante del arca del pacto!', '#ffd34d'); trumpetNear = true; }
        else if (dA > 30) { trumpetNear = false; trumpetT = Math.min(trumpetT, 0); }
        if (dA < 16 && kabodT <= 0) { kabodT = 9; setTimeout(() => sound.say('¡Kabod! ¡Presencia de Dios!', { male: true, rate: .82 }), 2700); }
      }
    }
    if (world.church) {
      world.church.update(dt, t, camera.position);
      // música de alabanza mientras estás dentro de la iglesia
      const inChurch = state === 'play' && world.church.inside(P.pos);
      sound.duck(inChurch ? .2 : 1); // la música del juego baja para que se oiga la alabanza
      if (inChurch) { worshipT += dt; if (worshipT > .5) { worshipT = 0; sound.worshipBeat(worshipStep++); } }
    }
    if (world.ark) world.ark.update(t, dt);
    if (world.jordan) world.jordan.update(t, dt, state === 'play' ? P.pos : camera.position, state === 'play' ? () => {
      // al acercarte al río Jordán los hombres dicen: ¡Santo, Santo, Santo! (Isaías 6:3; Apocalipsis 4:8)
      sound.say('¡Santo, Santo, Santo!', { male: true, rate: .8 }); toast('🙌 ¡Santo, Santo, Santo!', '#ffd34d');
    } : null);
    if (world.life) world.life.update(dt, t, camera.position, P.pos);
    if (world.kids) for (const kd of world.kids) {
      const near = Math.hypot(kd.cx - camera.position.x, kd.cz - camera.position.z) < 120; kd.h.root.visible = near; if (!near) continue;
      kd.a += dt * kd.sp; const x2 = kd.cx + Math.cos(kd.a) * kd.r, z2 = kd.cz + Math.sin(kd.a) * kd.r;
      kd.h.root.position.set(x2, Math.max(0, Math.sin(t * 3 + kd.a * 4)) * (kd.sp > 0 ? .25 : 0), z2); kd.h.root.rotation.y = Math.atan2(-Math.sin(kd.a) * kd.sp, Math.cos(kd.a) * kd.sp);
      animateHuman(kd.h, dt, { speed: 4.2, onGround: true, vy: 0, land: 0, t });
      // sonidos de los niños: pasos, risas y voces según la distancia al jugador
      if (state === 'play') {
        const dx2 = x2 - P.pos.x, dz2 = z2 - P.pos.z, dist = Math.hypot(dx2, dz2);
        if (dist < 45) {
          const vol = Math.pow(1 - dist / 45, 2) * .9, rightX = -Math.cos(cam.yaw), rightZ = Math.sin(cam.yaw), pan = (dx2 * rightX + dz2 * rightZ) / Math.max(1, dist);
          const st = Math.floor(kd.h.phase / Math.PI); if (st !== kd.lastStep) { kd.lastStep = st; sound.stepAt(vol * .7, pan); }
          kd.voiceT = (kd.voiceT ?? Math.random() * 3) - dt;
          if (kd.voiceT <= 0) { kd.voiceT = 1.8 + Math.random() * 3.5; sound.kidVoice(vol, pan, Math.random() < .55 ? 0 : 1); }
        }
      }
    }
    // gente de la playa: respiran, gesticulan al hablar y se oyen sus voces de cerca
    if (world.beachFolk) for (const bf of world.beachFolk) {
      const near = Math.hypot(bf.x - camera.position.x, bf.z - camera.position.z) < 110; bf.h.root.visible = near; if (!near) continue;
      animateHuman(bf.h, dt, { speed: 0, onGround: true, vy: 0, land: 0, t: t + bf.gesture });
      bf.gesture += dt;
      const g2 = Math.sin(bf.gesture * .9); if (g2 > .6 && !bf.water) { bf.h.arms[1].shoulder.rotation.x = -.5 - (g2 - .6) * 1.5; bf.h.arms[1].elbow.rotation.x = -1.2; }
      if (bf.water) bf.h.root.position.y = -.95 + Math.sin(t * 1.3 + bf.x) * .05;
      if (state === 'play') {
        const dx2 = bf.x - P.pos.x, dz2 = bf.z - P.pos.z, dist = Math.hypot(dx2, dz2);
        if (dist < 35) {
          bf.talk -= dt;
          if (bf.talk <= 0) { bf.talk = 2.5 + Math.random() * 5; const vol = Math.pow(1 - dist / 35, 2) * .8, pan = (dx2 * -Math.cos(cam.yaw) + dz2 * Math.sin(cam.yaw)) / Math.max(1, dist); sound.chatter(vol, pan, bf.female); }
        }
      }
    }
    if (world.beachBall) { const bb = world.beachBall, k3 = t * 1.1; bb.obj.position.set(bb.cx + Math.sin(k3) * 3, .22 + Math.abs(Math.sin(k3 * 3)) * 1.6, bb.cz + Math.sin(k3 * .7) * 1.2); bb.obj.rotation.x = t * 3; bb.obj.rotation.z = t * 2; }
    if (world.valley) world.valley.update(t, dt);
    for (const n of world.npcs) if (!n.given) { n.gift.rotation.y = t * 1.5; n.gift.position.y = (n.gy ?? 2.75) + Math.sin(t * 2 + n.x) * .08; }
    if (M.sea.userData.shader) M.sea.userData.shader.uniforms.uTime.value = t;
    seaNormal.offset.set(t * .012, t * .008);
    if (world.placeLive) for (const it of world.placeLive) { if (it.kind === 'spin') it.obj.rotation.y = t * .8; else if (it.kind === 'barrier') it.obj.material.opacity = .2 + Math.sin(t * 2) * .08; else if (it.kind === 'wave') it.obj.position.y = it.base + Math.sin(t * 1.3) * .15; }
    if (world.ship) { world.ship.rotation.x = Math.sin(t * .7) * .035; world.ship.rotation.z = Math.sin(t * .5) * .012; world.ship.position.y = Math.sin(t * .9) * .14; const sl = world.ship.userData.sail; if (sl) sl.scale.z = 1 + Math.sin(t * 2.2) * .12; const ud = world.ship.userData; if (ud.radar) ud.radar.rotation.y = t * 2.5; if (ud.flag) ud.flag.rotation.x = Math.sin(t * 3) * .25; }
    if (world.gulls) for (const gl of world.gulls) { gl.a += dt * gl.sp; const cx = gl.cx + Math.cos(gl.a) * gl.rad, cz = gl.cz + Math.sin(gl.a) * gl.rad; gl.obj.position.set(cx, gl.y + Math.sin(t * .6 + gl.ph) * 1.2, cz); gl.obj.rotation.set(0, Math.atan2(-Math.sin(gl.a) * gl.sp, Math.cos(gl.a) * gl.sp), -Math.sign(gl.sp) * .3); const flap = Math.sin(t * .35 + gl.ph) > .3 ? Math.sin(t * 9 + gl.ph) * .55 : .12 + Math.sin(t * 1.5 + gl.ph) * .05; for (const w of gl.wings) w.rotation.z = flap * w.userData.sd; }
    if (world.foam) world.foam.material.opacity = .45 + Math.sin(t * 1.4) * .2;
    if (world.sails) for (const sb of world.sails) { sb.a += dt * (sb.speed || .02); sb.obj.position.set(sb.cx + Math.cos(sb.a) * sb.r * 1.4, Math.sin(t + sb.a) * .15, sb.cz + Math.sin(sb.a) * sb.r); sb.obj.rotation.y = -sb.a; sb.obj.rotation.x = Math.sin(t * .8 + sb.a) * .03; }
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
  human.root.visible = !P.car && !(P.inv > 0 && Math.floor(t * 12) % 2) && !(isFP() && state !== 'map');
  if (P.smell > 0) P.smell -= dt;
  if (mate) { mate.root.visible = !P.car && (state === 'play' || state === 'pause' || state === 'talk' || state === 'verse' || state === 'map'); if (state === 'play') updateMate(dt, t); }
  if (state === 'play' || state === 'menu' || state === 'creator') animateHuman(human, dt, { speed: P.speed, onGround: P.onGround || !!P.climb, vy: P.vy, land: P.land, t, gesture: P.smell > 0 ? 1 : 0, climb: P.climb ? P.climb.t : -1, swim: state === 'play' && P.swim ? 1 : 0, kneel: P.kneel ? P.kneel.t / P.kneel.dur : -1, praise: P.praise ? P.praise.t : -1, sit: P.sit ? 1 : 0 });

  if (window.__freeCam) { /* cámara de pruebas */ }
  else if (state === 'creator') {
    const wide = innerWidth > 760, ox = wide ? .62 : 0, dd = wide ? 3.1 : 4.8;
    camera.position.set(P.pos.x + dd, P.pos.y + (wide ? 1.25 : 1.0), P.pos.z + ox);
    camera.lookAt(P.pos.x, P.pos.y + (wide ? 1.0 : -.5), P.pos.z + ox);
  }
  else if (state === 'menu') {
    menuT += dt * .06;
    const r = 46, mx = world && world.desert ? world.desert.tcx : P.pos.x, mz = world && world.desert ? world.desert.tcz : P.pos.z;
    camera.position.set(mx + Math.sin(menuT + 1.2) * r, 15 + Math.sin(menuT * .7) * 3, mz + Math.cos(menuT + 1.2) * r);
    camera.lookAt(mx, 3, mz);
  } else if (world && state !== 'result') updateCamera(dt);

  // Sombra que sigue al jugador
  const sc = state === 'menu' && world && world.desert ? tmpV.set(world.desert.tcx, 0, world.desert.tcz) : P.pos;
  // la sombra sigue al jugador en pasos del tamaño de un píxel de sombra (sin bordes que tiemblan)
  snapShadow(sc);
  updateNightAndBlobs(dt);

  if (state === 'play' && (mmTimer += dt) > .05) { mmTimer = 0; drawMinimap(); }
  if (world && (lodTimer += dt) > .25) {
    lodTimer = 0; const cp = camera.position;
    for (const it of world.lod) {
      const p = it.center || it.obj.position, far = Math.hypot(p.x - cp.x, p.z - cp.z) > it.range;
      if (it.animal) { it.obj.userData.far = far; if (far) it.obj.visible = false; } else it.obj.visible = !far;
    }
    updateCull(cp);
  }
  if (gradePass) gradePass.uniforms.time.value = (t * 60) % 1000;
  for (const g of pendingGroups) g.visible = false;
  updateHumanLOD();
  if (composer) { const prN = renderer.getPixelRatio(); if (prN !== composer._pr) { composer._pr = prN; composer.setPixelRatio(prN); } composer.render(); } else renderer.render(scene, camera);
  for (const g of pendingGroups) g.visible = true;
  skyClouds.grp.position.set(camera.position.x * .3, 0, camera.position.z * .3);
  stars.position.copy(camera.position); moon.position.copy(moonDir).multiplyScalar(1400).add(camera.position); sunGlow.position.copy(skyDir).multiplyScalar(1500).add(camera.position);
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
    const ALL = CHARACTERS.concat(TREASURES);
    $('colCount').textContent = `Has recibido ${save.gifts.filter(id => ALL.some(c => c.id === id)).length} de ${ALL.length} regalos de los personajes y lugares de la Biblia`;
    const l = $('vlist'); l.innerHTML = '';
    ALL.forEach(c => {
      const has = save.gifts.includes(c.id), d = document.createElement('div'); d.className = 'vitem gift' + (has ? '' : ' lock');
      const lvl = c.level === 0 || c.level === undefined ? 'todos los niveles' : 'nivel ' + c.level;
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
  state = 'menu'; sound.setMusicMode('menu');
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
  const bt = $('bottoms'); bt.innerHTML = '';
  BOTTOMS.forEach((c, i) => { const b = document.createElement('button'); b.className = 'swatch' + (draft.bottom === i ? ' sel' : ''); b.style.background = '#' + new THREE.Color(c).getHexString(); b.setAttribute('aria-label', 'Color ' + (i + 1)); b.onclick = () => { draft.bottom = i; apply(); }; bt.appendChild(b); });
  const robeOut = draft.outfit !== 'moderno';
  $('lblTop').textContent = robeOut ? (draft.outfit === 'levita' ? 'Color del cinto' : 'Color de la túnica') : 'Color de la ropa';
  const showLeg = draft.gender === 'f' && !robeOut; $('legRow').classList.toggle('hidden', !showLeg); $('lblLeg').classList.toggle('hidden', !showLeg);
  document.querySelectorAll('[data-leg]').forEach(b => b.classList.toggle('sel', b.dataset.leg === (draft.legwear || 'falda')));
  const dress = draft.gender === 'f' && draft.legwear === 'vestido' && !robeOut;
  $('lblBottom').textContent = robeOut ? 'Color del manto' : (draft.gender === 'f' && draft.legwear === 'falda') ? 'Color de la falda' : 'Color del pantalón';
  const suitOn = !robeOut && draft.topStyle === 'traje';
  if (suitOn) $('lblBottom').textContent = 'Color de la corbata';
  const hideBot = dress || (suitOn && draft.gender === 'f');
  $('lblBottom').classList.toggle('hidden', hideBot); $('bottoms').classList.toggle('hidden', hideBot);
  $('topRow').classList.toggle('hidden', robeOut); $('lblTopStyle').classList.toggle('hidden', robeOut);
  document.querySelectorAll('[data-topstyle]').forEach(b => b.classList.toggle('sel', b.dataset.topstyle === (draft.topStyle || 'abrigo')));
  if (!robeOut) $('lblTop').textContent = dress ? 'Color del vestido' : suitOn ? 'Color del traje' : 'Color de la ropa';
  const ol = $('outfits'); ol.innerHTML = '';
  OUTFITS.forEach(o => {
    const locked = o.req && save.unlocked < o.req, b = document.createElement('button');
    b.className = 'opt small' + (draft.outfit === o.id ? ' sel' : '') + (locked ? ' locked' : '');
    b.innerHTML = (locked ? '🔒 ' : '') + o.name + (locked ? `<small>${o.lockText}</small>` : '');
    b.onclick = () => { if (locked) { sound.hurt(); toast('🔒 ' + o.lockText, '#ffd34d'); return; } sound.click(); draft.outfit = o.id; if (o.id === 'aaron') draft.gender = 'm'; apply(); };
    ol.appendChild(b);
  });
  const ok = draft.name.length >= 2;
  $('btnCreate').disabled = !ok;
  $('pHint').textContent = ok ? `Así se verá en tu espalda: ${draft.name.toUpperCase()}` : 'Una sola palabra, solo letras, de 2 a 10 letras.';
  $('pHint').classList.toggle('ok', ok);
}
function apply() { save.player = Object.assign({}, draft); rebuildPlayer(); refreshCreator(); }
document.querySelectorAll('[data-leg]').forEach(b => b.onclick = () => { sound.click(); draft.legwear = b.dataset.leg; apply(); });
document.querySelectorAll('[data-topstyle]').forEach(b => b.onclick = () => { sound.click(); draft.topStyle = b.dataset.topstyle; apply(); });
document.querySelectorAll('[data-gender]').forEach(b => b.onclick = () => { sound.click(); draft.gender = b.dataset.gender; if (draft.gender === 'f' && draft.outfit === 'aaron') draft.outfit = 'tunica'; apply(); });
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
// Pantalla completa (botón en la barra y en el juego; tecla F en la PC)
const fsReq = document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const fsActive = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function toggleFull() {
  if (!fsReq) { toast(isIOS ? 'En iPhone: Compartir ⬆️ → «Agregar a inicio»' : 'Tu navegador no permite pantalla completa', '#ffd34d'); return; }
  if (fsActive()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else { try { const r2 = fsReq.call(document.documentElement, { navigationUI: 'hide' }); if (r2 && r2.catch) r2.catch(() => {}); } catch (e) {} }
}
function paintFull() { const on = fsActive(); $('tbFull').innerHTML = on ? '✕ <span class="chip-txt">Salir de pantalla completa</span>' : '⛶ <span class="chip-txt">Pantalla completa</span>'; $('btnFull').textContent = on ? '✕' : '⛶'; }
$('tbFull').onclick = toggleFull; $('btnFull').onclick = toggleFull;
document.addEventListener('fullscreenchange', paintFull); document.addEventListener('webkitfullscreenchange', paintFull);
addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return; if ((e.key || '').toLowerCase() !== 'f') return; const tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return; e.preventDefault(); toggleFull(); });
paintFull();
// Inicio y Salir (igual que en Desafío Bíblico RD)
const SITE = 'https://davidgarcia-star.github.io/luisdavidgarcia/';
function goHome() { sound.click(); toMenu('splash'); }
function exitGame() { sound.click(); window.close(); setTimeout(() => { if (!window.closed) location.href = SITE; }, 250); }
$('btnHome').onclick = goHome; $('btnPauseHome').onclick = goHome;
$('btnExit').onclick = exitGame; $('btnPauseExit').onclick = exitGame;
$('btnPause').onclick = () => { sound.click(); pauseGame(); };
$('btnCam').onclick = () => setCamMode(camMode + 1);
// Salir del arca de Noé: lleva al jugador al pie de la rampa, mirando hacia afuera
$('btnArkExit').onclick = e => {
  e.currentTarget.blur(); if (!world || !world.ark || !world.ark.exitPos) return;
  sound.click(); const [ex, ez] = world.ark.exitPos;
  P.pos.set(ex, floorAt(ex, ez, 0), ez); P.vy = 0; P.speed = 0; P.onGround = true; P.climb = null; P.heading = Math.PI;
  if (P.safe) P.safe.copy(P.pos);
  $('btnArkExit').classList.add('hidden'); toast('🌈 Saliste del arca', '#9fd8ff');
};
function zoomCam(d) {
  if (CAM_MODES[camMode].id === 'fp') { if (d > 0) { setCamMode(1, false); cam.dist = 2.6; } return; }
  if (d < 0 && cam.dist <= 2.6) { setCamMode(3); return; }   // acercando más: primera persona
  cam.dist = THREE.MathUtils.clamp(cam.dist + d, 2.6, 13); sound.click();
}

$('btnMap').onclick = () => { sound.click(); openMap(); }; $('minimap').addEventListener('click', () => openMap());
$('bigmapClose').onclick = () => { sound.click(); closeMap(); };
addEventListener('resize', () => { if (state === 'map') drawBigMap(); });
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

// Hora del día elegida (día por defecto): se aplica justo después de mostrar la portada
function renderTimeButtons() {
  document.querySelectorAll('.time-opts').forEach(box => { box.innerHTML = ''; for (const [k, v] of Object.entries(TIMES)) { const b = document.createElement('button'); b.className = 'opt small' + ((save.time || 'dia') === k ? ' sel' : ''); b.textContent = v.name; b.onclick = () => { sound.click(); applyTime(k); renderTimeButtons(); }; box.appendChild(b); } });
}
renderTimeButtons();

// Carga rápida: la portada y el personaje aparecen al instante; el mundo 3D se construye
// de a poquitos detrás (sin congelar la pantalla) y aparece cuando ya está listo para dibujarse
$('loading').classList.add('hidden');
let looping = false;
const startLoop = () => { if (looping) return; looping = true; lastNow = performance.now(); loop(); };
const buildMenuWorld = async () => {
  const w = await buildWorld(LEVELS[0]); world = w; world.key = worldKey(0);
  if (world.ark && world.ark.rainbow) world.ark.rainbow.visible = save.time !== 'noche';
  // Compilar los sombreadores en segundo plano antes de mostrarlo (así no se congela en el celular)
  const cp = new THREE.PerspectiveCamera().copy(camera); const tx = world.desert.tcx + 34, tz = world.desert.tcz - 2;
  cp.position.set(tx + 20, 15, tz + 20); cp.lookAt(tx, 2, tz); cp.updateMatrixWorld(); updateCull(cp.position);
  await warmShaders(scene, cp);
  // listo: el jugador pasa al desierto junto al tabernáculo y el mundo aparece
  P.pos.set(tx, 0, tz); P.heading = -1.2; lodTimer = 1;
  pendingGroups.clear();
};
// La portada aparece primero; después, paso a paso: cielo y luz, personaje, mundo 3D, sombreadores
let menuReadyDone;
const menuReady = new Promise(r => menuReadyDone = r);
setTimeout(async () => {
  // primero se prepara el sombreador del cielo (aparte), luego se calcula la luz del cielo
  try { if (renderer.compileAsync) await Promise.race([renderer.compileAsync(envScene, camera), new Promise(r => setTimeout(r, 4000))]); } catch (e) {}
  await idle();
  try { applyTime(save.time || 'dia'); } catch (e) {}
  await idle();
  // el cielo y el personaje se preparan sin bloquear y empiezan a dibujarse enseguida
  try { if (renderer.compileAsync) await Promise.race([renderer.compileAsync(scene, camera), new Promise(r => setTimeout(r, 4000))]); } catch (e) {}
  startLoop();
  await idle();
  try { await buildMenuWorld(); } catch (e) { console.error(e); pendingGroups.clear(); }
  startLoop();
  // el mundo 3D ya se dibuja: la imagen de fondo provisional se desvanece (después de un par de cuadros)
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('mundo-listo')));
  menuReadyDone();
  if (world) buildHumanLOD(world);
}, 30);

// Acceso para pruebas
window.__game = { carHits, islandH, buildLODNow: () => buildHumanLOD(world, true), sun, get composer() { return composer; }, set composer(v) { composer = v; }, renderer, scene, applyTime, toggleRun, get runToggle() { return runToggle; }, get human() { return human; }, openCreator, camera, THREE, P, cam, LEVELS, startLevel, get world() { return world; }, get state() { return state; }, keys, setJump: () => jumpPressed = true, setTake: () => takePressed = true };

/* =========================================================
   Contador de personas que han entrado al juego (una vez por navegador)
   ========================================================= */
(function () {
// la última cifra conocida se muestra enseguida, sin esperar al servidor
try { const c = localStorage.getItem('miproaa-monedas-visitas'); if (c !== null) document.querySelectorAll('.js-visitas').forEach(e => e.textContent = Number(c).toLocaleString('es-DO')); } catch (e) {}
function iniciarContador() {
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
  // Si el servicio está ocupado (muchas personas a la vez, p. ej. en el wifi de la iglesia), se reintenta
  // hasta 3 veces con esperas crecientes y al azar para no golpear el servidor todos al mismo tiempo.
  const reintentar = (n) => pedir(contado ? 'get' : 'hit').then(ok).catch(() => {
    if (n < 3) setTimeout(() => reintentar(n + 1), (3 + 4 * n) * 1000 + Math.random() * 4000);
    else if (previo === null) mostrar(0);
  });
  p.then(ok).catch(() => setTimeout(() => reintentar(1), 2000 + Math.random() * 3000));
}
// el contador se pide cuando la página ya cargó, así no compite con la descarga del juego;
// una pequeña espera al azar reparte las peticiones cuando muchas personas entran juntas
if (document.readyState === 'complete') setTimeout(iniciarContador, 400 + Math.random() * 1600);
else addEventListener('load', () => setTimeout(iniciarContador, 400 + Math.random() * 1600), { once: true });
})();

/* ---------- Intro: brasas doradas que suben (solo mientras se ve la portada) ---------- */
(() => {
  const cv = document.getElementById('embers'); if (!cv) return;
  const g = cv.getContext('2d'), sp = document.getElementById('splash'); let W = 0, H = 0, parts = [];
  const fit = () => { const d = Math.min(2, devicePixelRatio || 1); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0); };
  const spawn = () => ({ x: Math.random() * W, y: H + 10, r: .6 + Math.random() * 2.2, v: 18 + Math.random() * 55, w: Math.random() * 6.28, a: .35 + Math.random() * .6 });
  addEventListener('resize', fit); fit();
  for (let i = 0; i < 70; i++) { const p = spawn(); p.y = Math.random() * H; parts.push(p); }
  let last = performance.now();
  (function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (sp.classList.contains('hidden')) return;
    if (cv.clientWidth !== W || cv.clientHeight !== H) fit();
    g.clearRect(0, 0, W, H); g.globalCompositeOperation = 'lighter';
    for (const p of parts) {
      p.y -= p.v * dt; p.w += dt * 1.6; p.x += Math.sin(p.w) * 12 * dt;
      if (p.y < -10) Object.assign(p, spawn());
      const fl = .6 + .4 * Math.sin(p.w * 3);
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4); gr.addColorStop(0, `rgba(255,232,160,${p.a * fl})`); gr.addColorStop(1, 'rgba(255,170,40,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r * 4, 0, 7); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  })(last);
})();

/* ---------- Portada: un rugido de león una sola vez al entrar (o al primer toque si el navegador bloquea el sonido) ---------- */
(() => {
  let done = false;
  const go = () => {
    if (done) return;
    try {
      const a = sound.unlock(); if (!a) return;
      if (a.state === 'running') { done = true; sound.roar(); return; }
      a.resume().then(() => { if (!done && a.state === 'running') { done = true; sound.roar(); } }).catch(() => {});
    } catch (e) {}
  };
  setTimeout(go, 900);
  // dentro del mismo toque (requisito de los navegadores para permitir el sonido)
  ['pointerdown', 'touchend', 'click', 'keydown'].forEach(ev => addEventListener(ev, go, { passive: true, capture: true }));
})();
