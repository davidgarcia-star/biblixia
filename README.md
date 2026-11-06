# BIBLIXIA – ¡Aprende, juega y vive la Biblia!

Juego bíblico en 3D. Recorre una ciudad moderna, el desierto con el **tabernáculo** y la zona del **arca de Noé** y el **valle de Ela**. Recoge monedas antes de que se acabe el tiempo: cada moneda muestra un versículo de **La Biblia de las Américas (LBLA)**. Habla con profetas, apóstoles y personajes de la Biblia y recibe sus regalos.

Creado por **Luis David Esteban García** · MIPROAA Ministerio Profético Ardiendo Por El Avivamiento.

## Controles
| Acción | Computadora | Teléfono |
|---|---|---|
| Avanzar / retroceder | `W` / `S` o `↑` / `↓` | ▲ / ▼ |
| Izquierda / derecha | `A` / `D` o `←` / `→` | ◀ / ▶ |
| Correr | Mantener `↑` o `W` presionada (o `Shift`) | Mantener ▲ o botón CORRER |
| Saltar | `Espacio` | SALTAR |
| Tomar regalo / hablar | `T` | TOMAR |
| Girar la cámara | Arrastrar con el ratón | Arrastrar en la pantalla |
| Pausa | `P` o `Esc` | ❚❚ |

## Contenido
- **Personaje propio**: jugador o jugadora (con falda), tono de piel, color de ropa y nombre en la espalda (una sola palabra, solo letras, máximo 10).
- **5 niveles** (Básico, Intermedio, Avanzado, Experto, Master) con tiempo límite y meta de monedas; autos en la calle a partir del nivel 2.
- **Tabernáculo** (Éxodo 25–27; 30; 36–40), escala 1 codo = 0,5 m: atrio de 100 × 50 codos con 60 columnas, puerta, altar de bronce, fuente, Lugar Santo (mesa de los panes, candelabro, altar del incienso), velo, Lugar Santísimo y arca del pacto con los querubines, columna de nube y campamento de Israel.
- **Arca de Noé** (Génesis 6–9): 300 × 50 × 30 codos, puerta al costado con rampa, animales de dos en dos, palomas y arcoíris.
- **David y Goliat** (1 Samuel 17): Goliat con casco de bronce, cota de malla y lanza, el escudero, el ejército filisteo, el arroyo con piedras lisas y David girando su honda.
- **39 personajes bíblicos** con mensaje, cita y regalo (+10 segundos): Moisés, Noé, David, Samuel, Natán, Elías, Eliseo, Débora, Isaías, Jeremías, Ezequiel, Daniel, los 12 profetas menores, Juan el Bautista, Ana y los apóstoles (Pedro, Andrés, Jacobo, Juan, Felipe, Bartolomé, Tomás, Mateo, Jacobo hijo de Alfeo, Tadeo, Simón el Zelote, Matías y Pablo).
- **Mi colección**: versículos descubiertos y regalos recibidos (se guardan en el navegador).
- Barra superior con contador de visitantes, Inicio, Sitio Web y Salir; logo de MIPROAA y redes sociales.

## Ejecutar
Necesita un servidor web (usa módulos de JavaScript). Con GitHub Pages: *Settings → Pages → rama `main`, carpeta `/`*. En la computadora: `python3 -m http.server` y abrir `http://localhost:8000`.

## Archivos
- `index.html`, `css/style.css` – interfaz
- `js/game.js` – mundo, física, niveles, menús
- `js/human.js` – personajes 3D (rostro, pelo, ropa, animación)
- `js/characters.js` – personajes bíblicos, mensajes y regalos
- `js/tabernacle.js` – el tabernáculo y el campamento
- `js/scenes.js` – el arca de Noé, los animales, David y Goliat
- `js/verses.js` – versículos (LBLA)
- `js/vendor/` – three.js (licencia MIT)

Las citas bíblicas son de La Biblia de las Américas® (LBLA), © The Lockman Foundation. Usadas con permiso.

## Novedades
- **Mar, playa, muelle y barco** al occidente (se puede subir al barco).
- **Lugares bíblicos al norte** que se desbloquean nivel a nivel: Belén, Jericó, la torre de Babel, el Mar Rojo abierto y el Calvario con la tumba vacía.
- **Tabernáculo más grande** (1 codo = 0,8 m), con Aarón el sumo sacerdote, sacerdotes levitas y ovejas; regalos en el Lugar Santo y el Lugar Santísimo.
- **Arca de Noé por dentro**, con rampa de una sola inclinación, animales que suben (incluidos gallinas y monos) y aves volando.
- **Hora del día**: día, atardecer o noche con luna y estrellas.
- **Vestimentas**: moderna, túnica y manto, pastor, levita y sumo sacerdote Aarón (se desbloquea al completar el nivel Intermedio), con más colores.
- **Mapa completo** (tecla `M` o botón 🗺), **turbo** (tecla `R` o botón ⚡), pantalla completa (tecla `F`), joystick de bola en el celular.
- Cada regalo cuenta como una moneda y suma 10 segundos. Niños jugando con voces y pasos que se oyen según la distancia.

- **Arca de Noé exacta** (Génesis 6–7): caja rectangular de 300 × 50 × 30 codos, brea por dentro y por fuera, ventana de un codo bajo el techo, puerta al costado, tres pisos, siete parejas de animales limpios y de aves, alimento guardado y las ocho personas (Noé, su esposa, Sem, Cam, Jafet y sus esposas).
- **Procesión del arca del pacto** (1 Crónicas 15) por el desierto, lejos del arca de Noé: los levitas la llevan con las varas sobre los hombros, siete sacerdotes con trompetas, cantores con címbalos, arpas y liras, cuatro porteros y David danzando con efod de lino.
- **Río Jordán** (Mateo 3): Juan el Bautista bautiza a la gente; al acercarte, los hombres alaban diciendo «¡Santo, Santo, Santo!».
- **Juan el Bautista identificado**: el profeta que bautiza en el río Jordán lleva su nombre encima en todos los niveles; en el nivel Básico se le habla desde la orilla y su regalo flota sobre él (ya no hay un segundo Juan en la orilla).
- **Voces de hombre y de mujer**: las mujeres (Débora, Ana, la servidora, la jugadora) hablan con voz de mujer y los hombres con voz de hombre en Windows, Edge, Chrome, Android, iPhone y Mac.
- **Servidora de la iglesia** con vestido, aretes y cadena (antes parecía un hombre de esmoquin) y cartel «Recepción · Servidora».
- Primera persona: solo se ve la cámara (sin manos ni brazos). La jugadora también lleva su nombre en la espalda.

- **Rendimiento** (evaluación general): las versiones livianas de las personas lejanas se preparan durante la pantalla de carga (antes, los primeros segundos de cada nivel se dibujaban más de 3.000 piezas y el juego daba tirones); las figuras unidas ocupan ~3 veces menos memoria (de ~540 MB a ~170 MB); y al cambiar de nivel se liberan las texturas del nivel anterior (antes se acumulaban ~100 por cada cambio).

- **Música más activa al jugar**: en el menú suena la música tranquila y, al entrar al juego, cambia con un fundido a una pista instrumental más animada (batería suave, bajo, acordes y melodía a 104 pulsos por minuto) con volumen cómodo. Dentro de la iglesia baja para que se oiga la alabanza. Se apaga con el botón 🎵.

- **Versículos variados en las monedas**: 197 versículos LBLA de toda la Biblia (antes 39). Primero salen los que nunca has visto y después los que hace más tiempo que no salen, así no se repiten hasta haberlos visto todos.

## Compilación (carga rápida)
El juego se publica empaquetado y comprimido en `js/biblixia.min.js` (un solo archivo, ~3 veces más liviano).
Después de cambiar cualquier archivo de `js/`, ejecuta `sh build.sh` (necesita [esbuild](https://esbuild.github.io/)) y sube también `js/biblixia.min.js`.
También se puede compilar con [Bun](https://bun.sh/): `bun build-bun.mjs`.
