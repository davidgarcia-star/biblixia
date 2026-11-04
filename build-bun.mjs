// Empaqueta el juego con Bun (alternativa a build.sh): bun build-bun.mjs
import path from 'path';
const root = path.dirname(new URL(import.meta.url).pathname);
const alias = {
  name: 'three-alias',
  setup(b) {
    b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(root, 'js/vendor/three.module.js') }));
    b.onResolve({ filter: /^three\/addons\// }, a => ({ path: path.join(root, 'js/vendor/addons', a.path.slice('three/addons/'.length)) }));
  },
};
const r = await Bun.build({ entrypoints: [path.join(root, 'js/game.js')], format: 'esm', minify: true, target: 'browser', plugins: [alias] });
if (!r.success) { console.error(r.logs); process.exit(1); }
await Bun.write(path.join(root, 'js/biblixia.min.js'), r.outputs[0]);
console.log('js/biblixia.min.js', (r.outputs[0].size / 1024).toFixed(0) + ' KB');
