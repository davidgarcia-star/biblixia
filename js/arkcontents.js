import * as THREE from 'three';
// Lo que había dentro del arca: las tablas del pacto, la vasija de oro con el maná y la vara de Aarón que retoñó (Hebreos 9:4; Éxodo 16:33-34; Números 17:8-10)
export function arkContents(L = 1.1, H = .62) {
  const g = new THREE.Group(), k = L / 1.1;
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: 1, roughness: .2, emissive: 0x6b4300, emissiveIntensity: .4 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: .8 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4a8a3a, roughness: .7 }), bloom = new THREE.MeshStandardMaterial({ color: 0xfff0f4, roughness: .6 }), almond = new THREE.MeshStandardMaterial({ color: 0xb8864a, roughness: .7 });
  const sh = new THREE.Shape(); sh.moveTo(-.09, 0); sh.lineTo(-.09, .2); sh.absarc(0, .2, .09, Math.PI, 0, true); sh.lineTo(.09, 0); sh.lineTo(-.09, 0);
  const tg = new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: true, bevelSize: .005, bevelThickness: .005, bevelSegments: 1 });
  for (const s of [-1, 1]) { const t = new THREE.Mesh(tg, stone); t.position.set(-.25 * k + s * .1, -H / 2 + .03, -.05); t.rotation.x = -.08; g.add(t); }
  const jar = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.06, .005], [.08, .06], [.075, .14], [.045, .2], [.05, .24], [.04, .25]].map(([x, y]) => new THREE.Vector2(x, y)), 20), gold);
  jar.position.set(.12 * k, -H / 2 + .03, 0); g.add(jar);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .016, .9 * k, 8), wood); rod.rotation.z = Math.PI / 2 - .12; rod.position.set(0, -H / 2 + .1, .2); g.add(rod);
  for (let i = 0; i < 9; i++) { const x = -.38 * k + i * .095 * k, y = -H / 2 + .1 + (x * .12); const m = new THREE.Mesh(new THREE.SphereGeometry(i % 3 === 2 ? .022 : .018, 8, 6), i % 3 === 0 ? leaf : i % 3 === 1 ? bloom : almond); m.position.set(x, y + .02, .2 + (i % 2 ? .015 : -.015)); m.scale.set(1, .6, 1.4); g.add(m); }
  return g;
}
// oro semitransparente para ver lo que hay dentro del arca
export const arkGlassGold = () => new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: .85, roughness: .2, emissive: 0x5a3800, emissiveIntensity: .3, transparent: true, opacity: .42, depthWrite: false });
