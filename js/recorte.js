// Recorte de objetos diminutos: lo que en la pantalla mide menos de ~2 píxeles (lejos y pequeño)
// ya no se manda a dibujar. Casi no se nota a la vista, pero ahorra cientos de dibujos por cuadro
// en celulares modestos (lo que más los hacía trabarse).
// Se aplica solo a la cámara del juego; los objetos con material sin neblina (cielo, sol, luna,
// estrellas) o con userData.siempre = true nunca se recortan.
import { Frustum, Sphere, Vector2 } from 'three';
export function recortePequenos(renderer, camera, px) {
  const io = Frustum.prototype.intersectsObject;
  const s = new Sphere();
  let activo = false, cx = 0, cy = 0, cz = 0, k = 0;
  Frustum.prototype.intersectsObject = function (o) {
    if (!io.call(this, o)) return false;
    if (!activo || o.boundingSphere !== undefined || !o.isMesh || o.isSkinnedMesh || o.userData.siempre) return true;
    const m = o.material; if (!m || (m.fog === false && !Array.isArray(m))) return true;
    const g = o.geometry; if (!g || !g.boundingSphere) return true;
    s.copy(g.boundingSphere).applyMatrix4(o.matrixWorld);
    const dx = s.center.x - cx, dy = s.center.y - cy, dz = s.center.z - cz;
    const r = s.radius * k; // radio en píxeles = radio / distancia * k
    return r * r >= dx * dx + dy * dy + dz * dz;
  };
  const render = renderer.render.bind(renderer);
  const v = new Vector2();
  renderer.render = function (scene, cam) {
    activo = cam === camera && px > 0;
    if (activo) {
      cam.updateMatrixWorld();
      const e = cam.matrixWorld.elements; cx = e[12]; cy = e[13]; cz = e[14];
      renderer.getDrawingBufferSize(v);
      k = (v.y / 2) / Math.tan(cam.fov * Math.PI / 360) / (cam.zoom ? 1 / cam.zoom : 1) / px;
    }
    try { render(scene, cam); } finally { activo = false; }
  };
  return { set px(n) { px = n; }, get px() { return px; } };
}
