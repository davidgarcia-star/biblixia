#!/bin/sh
# Empaqueta y comprime todo el juego en un solo archivo para que cargue mucho más rápido.
# Uso: sh build.sh   (requiere esbuild)
ESB=${ESBUILD:-esbuild}
$ESB js/game.js --bundle --format=esm --minify --target=es2020 \
  --alias:three=./js/vendor/three.module.js \
  "--alias:three/addons=./js/vendor/addons" \
  --outfile=js/biblixia.min.js --legal-comments=none
