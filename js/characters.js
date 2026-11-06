import * as THREE from 'three';
import { createHuman, bakeStatic } from './human.js';

/* =========================================================
   PERSONAJES BÍBLICOS — mensajes resumidos con referencias.
   level: nivel donde aparecen (Moisés aparece siempre en el tabernáculo).
   ========================================================= */
export const CHARACTERS = [
  // ---------- Nivel 1 ----------
  { id: 'aaron', name: 'Aarón', kind: 'Sumo sacerdote', level: 0, spot: 'aaron', prop: null, look: { priest: true, mantle: null, robe: 0xf4f0e6, sash: 0x5b2a7a, hair: 'turban', beard: { color: 0x8a8278, len: .14 }, hairColor: 0x8a8278, age: 1 },
    msg: 'Soy Aarón, hermano de Moisés. Dios me escogió como sumo sacerdote. Llevo el efod, el manto azul con granadas y campanillas de oro, y sobre el pecho el pectoral con doce piedras, una por cada tribu de Israel. En la mitra dice: «Santidad al SEÑOR».',
    ref: 'Éxodo 28:1-38', gift: 'El pectoral con las doce piedras', emoji: '💎' },
  { id: 'noe', name: 'Noé', kind: 'Patriarca', level: 0, spot: 'noah', prop: 'staff', look: { beard: { color: 0xeeeae2, len: .2 }, hairColor: 0xe6e2da, hair: 'long', age: 1, robe: 0xbfa77a, mantle: 0x4a5a3a },
    msg: 'El SEÑOR me mandó construir un arca porque iba a enviar un diluvio. Hallé gracia ante los ojos del SEÑOR y, por la fe, obedecí: entré con mi familia y los animales de dos en dos. Al final, la paloma volvió con una hoja de olivo, y Dios puso su arco en las nubes como señal de su pacto.',
    ref: 'Génesis 6:8, 13-22; 8:11; 9:13; Hebreos 11:7', gift: 'La rama de olivo de la paloma', emoji: '🫒' },
  { id: 'david', name: 'David', kind: 'Pastor y rey', level: 0, spot: 'david', prop: null, look: {},
    msg: 'Era el más joven, un pastor de ovejas. Cuando el gigante Goliat desafió a Israel, tomé cinco piedras lisas del arroyo y mi honda. Le dije que yo venía en el nombre del SEÑOR de los ejércitos, porque la batalla es del SEÑOR. Con una sola piedra el gigante cayó.',
    ref: '1 Samuel 17:40-50', gift: 'La honda y cinco piedras lisas', emoji: '🪨' },
  { id: 'moises', name: 'Moisés', kind: 'Profeta', level: 0, prop: 'tablets', look: { beard: { color: 0xe8e4dc, len: .16 }, hairColor: 0xe0dcd2, age: 1, robe: 0xd8c9a8, mantle: 0x6a3d24, hair: 'long' },
    msg: 'Dios me habló desde la zarza ardiente y por su mano sacó a Israel de Egipto. En el monte Sinaí recibí las tablas de piedra con los Diez Mandamientos, y Dios me mostró el modelo de este tabernáculo para habitar en medio de su pueblo.',
    ref: 'Éxodo 3; 20; 25:8-9', gift: 'Las tablas de la Ley', emoji: '🪨' },
  { id: 'samuel', name: 'Samuel', kind: 'Profeta', level: 1, prop: 'horn', look: { beard: { color: 0xbdb6aa, len: .1 }, hairColor: 0xbdb6aa, age: 1, robe: 0xe6dcc6, mantle: 0x3e4f6b },
    msg: 'Siendo niño serví en el tabernáculo de Silo, y una noche el SEÑOR me llamó por mi nombre. Respondí: «Habla, que tu siervo escucha». Más tarde ungí a Saúl y luego a David como reyes de Israel.',
    ref: '1 Samuel 3; 10; 16', gift: 'El cuerno de aceite de la unción', emoji: '🫗' },
  { id: 'natan', name: 'Natán', kind: 'Profeta', level: 1, prop: 'scroll', look: { beard: { len: .07 }, hairColor: 0x3a2a1c, robe: 0xa9b8c2, mantle: 0x30465a },
    msg: 'Dios me envió a confrontar al rey David por su pecado. Le conté la parábola de un hombre rico que tomó la única corderita de un pobre, y le dije: «Tú eres aquel hombre». David se arrepintió de corazón.',
    ref: '2 Samuel 12:1-13; Salmo 51', gift: 'El pergamino de la parábola', emoji: '📜' },
  { id: 'elias', name: 'Elías', kind: 'Profeta', level: 1, prop: 'staff', look: { beard: { color: 0x5a4632, len: .14 }, hairColor: 0x5a4632, hair: 'long', robe: 0x8f7a5a, mantle: 0x4a3a28 },
    msg: 'En el monte Carmelo oré, y Dios respondió con fuego del cielo, mostrando que solo el SEÑOR es Dios. Después oí su voz como un susurro apacible. Al final fui llevado al cielo en un torbellino.',
    ref: '1 Reyes 18–19; 2 Reyes 2:11', gift: 'El manto de Elías', emoji: '🧥' },
  { id: 'eliseo', name: 'Eliseo', kind: 'Profeta', level: 1, prop: 'jar', look: { beard: { len: .06 }, hairColor: 0x2a1c12, hair: 'cloth', robe: 0xcbb994, mantle: 0x7a2e2e, cloth: 0xe2d6bc },
    msg: 'Pedí una doble porción del espíritu de Elías y recibí su manto. Por medio de mí Dios multiplicó el aceite de una viuda, resucitó al hijo de la sunamita y sanó a Naamán de la lepra.',
    ref: '2 Reyes 2; 4; 5', gift: 'La vasija de aceite que no se acaba', emoji: '🏺' },
  { id: 'bautista', name: 'Juan el Bautista', kind: 'Profeta', level: 1, spot: 'jordan', prop: 'staff', look: { beard: { len: .1, color: 0x2a1c12 }, hairColor: 0x2a1c12, hair: 'long', robe: 0x9a7a4a, mantle: 0x7a5a32, sash: 0x3a2412 },
    msg: 'Preparé el camino del Señor en el desierto, llamando al arrepentimiento y bautizando en el Jordán. Cuando vi a Jesús, dije: «He aquí el Cordero de Dios que quita el pecado del mundo».',
    ref: 'Mateo 3; Juan 1:29', gift: 'Agua del río Jordán', emoji: '💧' },
  { id: 'pedro', name: 'Pedro', kind: 'Apóstol', level: 1, prop: 'net', look: { beard: { len: .07, color: 0x6a6258 }, hairColor: 0x6a6258, age: 1, robe: 0x5d7a8c, mantle: 0xc9a86a },
    msg: 'Era pescador hasta que Jesús me dijo: «Venid en pos de mí, y yo os haré pescadores de hombres». Confesé: «Tú eres el Cristo, el Hijo del Dios viviente». En Pentecostés prediqué y unas tres mil personas creyeron.',
    ref: 'Mateo 4:19; 16:16-19; Hechos 2:41', gift: 'Las llaves del reino', emoji: '🗝️' },
  { id: 'andres', name: 'Andrés', kind: 'Apóstol', level: 1, prop: 'basket', look: { beard: { len: .05 }, hairColor: 0x3b2b1e, robe: 0xb7a07a, mantle: 0x2f5a4a },
    msg: 'Fui discípulo de Juan el Bautista y llevé a mi hermano Simón Pedro a Jesús. También le presenté al muchacho que tenía cinco panes de cebada y dos pescados, con los que Jesús alimentó a una multitud.',
    ref: 'Juan 1:40-42; 6:8-13', gift: 'La cesta de panes y peces', emoji: '🧺' },
  { id: 'nino-panes', name: 'El niño de los panes', kind: 'Niño generoso', level: 0, prop: 'loaves', scale: .68, look: { hairColor: 0x2a1a10, hair: 'short', robe: 0xc9a86a, mantle: null, sash: 0x7a3a1e, skin: 0xb07a52 },
    msg: '¡Hola! Yo tenía cinco panes de cebada y dos pececillos. Se los di a Jesús, Él dio gracias, los repartió y comieron como cinco mil hombres, ¡y sobraron doce cestas! Lo poco que le damos a Jesús, Él lo multiplica.',
    ref: 'Juan 6:5-13', gift: 'Cinco panes y dos peces', emoji: '🐟' },
  // ---------- Nivel 2 ----------
  { id: 'debora', name: 'Débora', kind: 'Profetisa', level: 2, prop: 'staff', gender: 'f', look: { hairColor: 0x2a1c12, hair: 'cloth', robe: 0x8a5a7a, mantle: 0xd8c49a, cloth: 0x6a3a5a },
    msg: 'Fui profetisa y juzgaba a Israel sentada bajo una palmera. Animé a Barac a salir a la batalla, porque el SEÑOR iba delante de su pueblo, y después cantamos juntos su victoria.',
    ref: 'Jueces 4–5', gift: 'Una hoja de palmera', emoji: '🌴' },
  { id: 'isaias', name: 'Isaías', kind: 'Profeta', level: 2, prop: 'scroll', look: { beard: { len: .1, color: 0x4a3a2a }, hairColor: 0x4a3a2a, robe: 0x6b5aa0, mantle: 0xd9c9a0 },
    msg: 'Vi al Señor sentado en un trono alto y sublime. Un serafín tocó mis labios con un carbón encendido, y respondí: «Heme aquí; envíame a mí». Profeticé del Mesías, herido por nuestras transgresiones.',
    ref: 'Isaías 6:1-8; 53:5', gift: 'El carbón encendido del altar', emoji: '🔥' },
  { id: 'jeremias', name: 'Jeremías', kind: 'Profeta', level: 2, prop: 'jar', look: { beard: { len: .08 }, hairColor: 0x2c2018, robe: 0x9a8a6a, mantle: 0x4a2a22 },
    msg: 'Dios me llamó cuando era joven. En la casa del alfarero aprendí que somos como el barro en sus manos. Lloré por mi pueblo, pero anuncié un nuevo pacto: Dios escribiría su ley en el corazón.',
    ref: 'Jeremías 1:4-8; 18:1-6; 31:31-33', gift: 'La vasija del alfarero', emoji: '🏺' },
  { id: 'ezequiel', name: 'Ezequiel', kind: 'Profeta', level: 2, prop: 'scroll', look: { beard: { len: .09, color: 0x3a2a1c }, hairColor: 0x3a2a1c, hair: 'cloth', robe: 0xb0a080, mantle: 0x2a4a6a, cloth: 0xd0c0a0 },
    msg: 'Junto al río Quebar vi visiones de la gloria de Dios. En un valle lleno de huesos secos profeticé, y Dios les dio vida. Así promete darnos un corazón nuevo y poner su Espíritu dentro de nosotros.',
    ref: 'Ezequiel 1; 36:26-27; 37', gift: 'El rollo de la visión', emoji: '📜' },
  { id: 'daniel', name: 'Daniel', kind: 'Profeta', level: 2, prop: 'book', look: { beard: { len: .05, color: 0x1e140c }, hairColor: 0x1e140c, robe: 0x5a2a6a, mantle: 0xd4af37 },
    msg: 'En Babilonia me propuse no contaminarme. Oraba tres veces al día con las ventanas abiertas hacia Jerusalén, y cuando me echaron al foso, Dios envió su ángel y cerró la boca de los leones.',
    ref: 'Daniel 1:8; 6:10-22', gift: 'La figura del león', emoji: '🦁' },
  { id: 'jacobo', name: 'Jacobo (hijo de Zebedeo)', kind: 'Apóstol', level: 2, prop: 'net', look: { beard: { len: .06 }, hairColor: 0x3a2818, robe: 0x7a8a9a, mantle: 0x8a3a2a },
    msg: 'Con mi hermano Juan dejé la barca y las redes para seguir a Jesús. Estuve con Él en el monte de la transfiguración y fui el primero de los apóstoles en dar la vida por la fe.',
    ref: 'Mateo 4:21-22; 17:1-2; Hechos 12:2', gift: 'La red de pescador', emoji: '🎣' },
  { id: 'juan', name: 'Juan', kind: 'Apóstol', level: 2, prop: 'scroll', look: { beard: { len: .03 }, hairColor: 0x4a3420, hair: 'long', robe: 0xe8e0d0, mantle: 0xa02a2a },
    msg: 'Soy el discípulo a quien Jesús amaba. Escribí: «Dios es amor». Estando desterrado en la isla de Patmos, recibí la revelación de Jesucristo que hoy leemos en el Apocalipsis.',
    ref: 'Juan 13:23; 1 Juan 4:8; Apocalipsis 1:9', gift: 'El rollo del Apocalipsis', emoji: '📜' },
  // ---------- Nivel 3 ----------
  { id: 'oseas', name: 'Oseas', kind: 'Profeta', level: 3, prop: 'staff', look: { beard: { len: .07 }, hairColor: 0x2a1e14, robe: 0xa08a6a, mantle: 0x3a5a3a },
    msg: 'Mi propia vida fue una imagen del amor fiel de Dios hacia un pueblo infiel. Por eso llamé: «Venid, volvamos al SEÑOR. Pues Él nos ha desgarrado, pero nos sanará».',
    ref: 'Oseas 3:1; 6:1', gift: 'El anillo de la fidelidad', emoji: '💍' },
  { id: 'joel', name: 'Joel', kind: 'Profeta', level: 3, prop: 'scroll', look: { beard: { len: .08, color: 0x5a4a3a }, hairColor: 0x5a4a3a, robe: 0xc8b890, mantle: 0x2a3a6a },
    msg: 'Anuncié el día del SEÑOR y llamé al pueblo a rasgar su corazón y no sus vestidos. Dios prometió derramar su Espíritu sobre toda carne, y en Pentecostés Pedro dijo que eso se estaba cumpliendo.',
    ref: 'Joel 2:13, 28; Hechos 2:16-17', gift: 'La promesa del Espíritu', emoji: '🕊️' },
  { id: 'amos', name: 'Amós', kind: 'Profeta', level: 3, prop: 'staff', look: { beard: { len: .07 }, hairColor: 0x3a2a1a, hair: 'cloth', robe: 0x8a7a5a, mantle: 0x5a4a2a, cloth: 0xc0b090 },
    msg: 'Era pastor y cultivaba higos silvestres cuando Dios me llamó. Vi al Señor con una plomada en la mano, y clamé: «Que corra el juicio como las aguas y la justicia como corriente inagotable».',
    ref: 'Amós 5:24; 7:7-15', gift: 'La plomada del constructor', emoji: '⚖️' },
  { id: 'abdias', name: 'Abdías', kind: 'Profeta', level: 3, prop: 'scroll', look: { beard: { len: .06 }, hairColor: 0x2a1c10, robe: 0xb8a888, mantle: 0x6a2a3a },
    msg: 'Escribí el libro más corto del Antiguo Testamento. Anuncié el juicio sobre Edom por su orgullo y la violencia contra su hermano, y proclamé que el reino será del SEÑOR.',
    ref: 'Abdías 1:3-4, 21', gift: 'La corona del reino', emoji: '👑' },
  { id: 'jonas', name: 'Jonás', kind: 'Profeta', level: 3, prop: 'staff', look: { beard: { len: .07 }, hairColor: 0x4a3018, robe: 0x7a9aa8, mantle: 0x3a4a5a },
    msg: 'Huí de Dios en un barco, pero el SEÑOR preparó un gran pez que me tragó, y estuve tres días y tres noches en su vientre. Al fin prediqué en Nínive, y toda la ciudad se arrepintió.',
    ref: 'Jonás 1–3', gift: 'La figura del gran pez', emoji: '🐟' },
  { id: 'felipe', name: 'Felipe', kind: 'Apóstol', level: 3, prop: 'scroll', look: { beard: { len: .04 }, hairColor: 0x2a1a10, robe: 0xa8b0a0, mantle: 0x5a3a6a },
    msg: 'Jesús me encontró y me dijo: «Sígueme». Entonces le dije a Natanael: «Ven y ve». Un día le pedí: «Señor, muéstranos al Padre», y Él respondió: «El que me ha visto a mí, ha visto al Padre».',
    ref: 'Juan 1:43-46; 14:8-9', gift: 'La invitación «Ven y ve»', emoji: '✉️' },
  { id: 'bartolome', name: 'Bartolomé (Natanael)', kind: 'Apóstol', level: 3, prop: 'book', look: { beard: { len: .06 }, hairColor: 0x1e1a14, robe: 0x9a6a4a, mantle: 0xd0c090 },
    msg: 'Jesús me vio debajo de la higuera antes de que Felipe me llamara. Asombrado, le dije: «Rabí, tú eres el Hijo de Dios; tú eres el Rey de Israel».',
    ref: 'Juan 1:47-49', gift: 'La hoja de higuera', emoji: '🍃' },
  { id: 'tomas', name: 'Tomás', kind: 'Apóstol', level: 3, prop: 'staff', look: { beard: { len: .05 }, hairColor: 0x2e2216, robe: 0x6a7a5a, mantle: 0xb08a5a },
    msg: 'Dudé de la resurrección hasta ver al Señor. Cuando lo vi, exclamé: «¡Señor mío y Dios mío!». Jesús me dijo: «Dichosos los que no vieron, y sin embargo creyeron».',
    ref: 'Juan 20:24-29', gift: 'El corazón de fe', emoji: '❤️' },
  // ---------- Nivel 4 ----------
  { id: 'miqueas', name: 'Miqueas', kind: 'Profeta', level: 4, prop: 'staff', look: { beard: { len: .08 }, hairColor: 0x3a2818, robe: 0xc0b090, mantle: 0x2a3a2a },
    msg: 'Profeticé que de Belén saldría el que gobernaría a Israel. Y recordé lo que Dios pide: practicar la justicia, amar la misericordia y andar humildemente con tu Dios.',
    ref: 'Miqueas 5:2; 6:8', gift: 'La estrella de Belén', emoji: '⭐' },
  { id: 'nahum', name: 'Nahúm', kind: 'Profeta', level: 4, prop: 'scroll', look: { beard: { len: .09, color: 0x6a5a4a }, hairColor: 0x6a5a4a, age: 1, robe: 0x9a8a7a, mantle: 0x4a3a5a },
    msg: 'Anuncié la caída de Nínive, la ciudad orgullosa. Pero también proclamé el consuelo de Dios: «Bueno es el SEÑOR, una fortaleza en el día de la angustia, y conoce a los que en Él se refugian».',
    ref: 'Nahúm 1:7', gift: 'La torre fuerte', emoji: '🏰' },
  { id: 'habacuc', name: 'Habacuc', kind: 'Profeta', level: 4, prop: 'book', look: { beard: { len: .07 }, hairColor: 0x2a1e14, robe: 0xb0a890, mantle: 0x6a4a2a },
    msg: 'Le pregunté a Dios por qué permitía tanta injusticia. Me respondió que escribiera la visión en tablas, para que corra el que la lea, y aprendí que el justo por su fe vivirá.',
    ref: 'Habacuc 1:2-4; 2:2-4', gift: 'La tabla de la visión', emoji: '📝' },
  { id: 'sofonias', name: 'Sofonías', kind: 'Profeta', level: 4, prop: 'staff', look: { beard: { len: .07 }, hairColor: 0x2a1a10, hair: 'cloth', robe: 0x8a9a7a, mantle: 0x3a2a1a, cloth: 0xd8c8a8 },
    msg: 'Llamé al pueblo a buscar al SEÑOR con humildad. Y anuncié una promesa hermosa: Dios está en medio de su pueblo, se goza sobre él con alegría y se regocija con cantos de júbilo.',
    ref: 'Sofonías 2:3; 3:17', gift: 'El arpa de júbilo', emoji: '🎵' },
  { id: 'ana', name: 'Ana', kind: 'Profetisa', level: 4, prop: 'book', gender: 'f', look: { hairColor: 0xd0ccc4, hair: 'cloth', age: 1, robe: 0x5a6a8a, mantle: 0xc8b8a0, cloth: 0xe0d8c8 },
    msg: 'Era una viuda de edad avanzada que no se apartaba del templo, sirviendo noche y día con ayunos y oraciones. Cuando vi al niño Jesús, di gracias a Dios y hablé de Él a todos los que esperaban la redención.',
    ref: 'Lucas 2:36-38', gift: 'La lámpara del templo', emoji: '🪔' },
  { id: 'mateo', name: 'Mateo', kind: 'Apóstol', level: 4, prop: 'book', look: { beard: { len: .04 }, hairColor: 0x1e1610, robe: 0x4a6a5a, mantle: 0xc0a060 },
    msg: 'Era recaudador de impuestos. Jesús pasó, me miró y me dijo: «Sígueme», y me levanté y lo seguí. Escribí un evangelio que muestra a Jesús como el Rey prometido a Israel.',
    ref: 'Mateo 9:9-13', gift: 'La bolsa de monedas', emoji: '💰' },
  { id: 'jacoboalfeo', name: 'Jacobo (hijo de Alfeo)', kind: 'Apóstol', level: 4, prop: 'staff', look: { beard: { len: .06 }, hairColor: 0x3a2a1a, robe: 0xa09070, mantle: 0x2a4a5a },
    msg: 'Fui uno de los doce. La Biblia dice poco de mí, pero Jesús me llamó por mi nombre y me envió a anunciar su reino. En su reino nadie es demasiado pequeño para servir.',
    ref: 'Mateo 10:1-7', gift: 'El bastón del caminante', emoji: '🦯' },
  { id: 'tadeo', name: 'Tadeo (Judas, hijo de Jacobo)', kind: 'Apóstol', level: 4, prop: 'scroll', look: { beard: { len: .05 }, hairColor: 0x2a2018, robe: 0x8a7a9a, mantle: 0x5a4a2a },
    msg: 'En la última cena le pregunté a Jesús por qué se manifestaría a nosotros y no al mundo. Me respondió: «Si alguno me ama, guardará mi palabra; y mi Padre lo amará».',
    ref: 'Juan 14:22-23', gift: 'La lámpara de aceite', emoji: '🪔' },
  // ---------- Nivel 5 ----------
  { id: 'hageo', name: 'Hageo', kind: 'Profeta', level: 5, prop: 'staff', look: { beard: { len: .1, color: 0xa09888 }, hairColor: 0xa09888, age: 1, robe: 0xb8a880, mantle: 0x5a3a2a },
    msg: 'Animé al pueblo que volvió del exilio a reconstruir la casa de Dios. El SEÑOR les dijo: «Esforzaos y trabajad, porque yo estoy con vosotros».',
    ref: 'Hageo 1:8; 2:4', gift: 'La piedra del templo', emoji: '🧱' },
  { id: 'zacarias', name: 'Zacarías', kind: 'Profeta', level: 5, prop: 'scroll', look: { beard: { len: .08 }, hairColor: 0x2a1c12, robe: 0xd0c4a4, mantle: 0x3a3a6a },
    msg: 'Dios me dio visiones, como un candelabro de oro: «No por el poder ni por la fuerza, sino por mi Espíritu». También anuncié al Rey que vendría humilde, montado en un asno.',
    ref: 'Zacarías 4:6; 9:9', gift: 'El candelabro de oro', emoji: '🕎' },
  { id: 'malaquias', name: 'Malaquías', kind: 'Profeta', level: 5, prop: 'book', look: { beard: { len: .07 }, hairColor: 0x3a2a1c, hair: 'cloth', robe: 0x9a8a6a, mantle: 0x6a2a2a, cloth: 0xd8ccb0 },
    msg: 'Soy el último de los profetas del Antiguo Testamento. Llamé al pueblo a traer todo el diezmo al alfolí y anuncié al mensajero que prepararía el camino del Señor.',
    ref: 'Malaquías 3:1, 10, 16', gift: 'El libro memorial', emoji: '📖' },
  { id: 'simon', name: 'Simón el Zelote', kind: 'Apóstol', level: 5, prop: 'staff', look: { beard: { len: .07 }, hairColor: 0x1e140c, robe: 0x6a5a4a, mantle: 0x9a2a2a },
    msg: 'Me llamaban el Zelote. Jesús me escogió entre los doce, y aprendí a poner todo mi celo al servicio de su reino de paz.',
    ref: 'Lucas 6:12-16', gift: 'La llama del celo', emoji: '🔥' },
  { id: 'matias', name: 'Matías', kind: 'Apóstol', level: 5, prop: 'scroll', look: { beard: { len: .05 }, hairColor: 0x3a2a1a, robe: 0xb0b8b0, mantle: 0x4a5a3a },
    msg: 'Acompañé a Jesús desde el bautismo de Juan y fui testigo de su resurrección. Después de orar, los apóstoles echaron suertes y fui elegido para ocupar el lugar de Judas.',
    ref: 'Hechos 1:21-26', gift: 'El testimonio de la resurrección', emoji: '✨' },
  { id: 'pablo', name: 'Pablo', kind: 'Apóstol', level: 5, prop: 'scroll', look: { beard: { len: .08, color: 0x3a2a1c }, hairColor: 0x3a2a1c, robe: 0x8a3a3a, mantle: 0xd0c098 },
    msg: 'Perseguía a la iglesia hasta que Jesús se me apareció en el camino a Damasco. Desde entonces llevé el evangelio a las naciones y escribí cartas a las iglesias. No me avergüenzo del evangelio.',
    ref: 'Hechos 9:1-20; Romanos 1:16', gift: 'Las cartas a las iglesias', emoji: '✉️' },
];
// Regalos especiales en lugares santos (también suman como moneda)
export const TREASURES = [
  { id: 'lugar-santo', name: 'Regalo del Lugar Santo', kind: 'Tesoro del tabernáculo', spot: 'holy', gift: 'El pan de la Presencia', emoji: '🍞',
    msg: 'Sobre la mesa de oro siempre había doce panes delante del SEÑOR, uno por cada tribu de Israel. Jesús dijo: «Yo soy el pan de la vida; el que viene a mí no tendrá hambre».', ref: 'Levítico 24:5-9; Juan 6:35' },
  { id: 'lugar-santisimo', name: 'Regalo del Lugar Santísimo', kind: 'Tesoro del tabernáculo', spot: 'holiest', gift: 'La vasija de oro con el maná', emoji: '🏺',
    msg: 'Dentro del arca del pacto se guardaban la vasija de oro con el maná, la vara de Aarón que reverdeció y las tablas del pacto. Dios alimentó a su pueblo con maná del cielo cada día en el desierto.', ref: 'Éxodo 16:31-35; Hebreos 9:4' },
  { id: 'barco', name: 'Regalo del barco', kind: 'Tesoro del mar', spot: 'ship', gift: 'El ancla de la esperanza', emoji: '⚓',
    msg: 'En medio de la tormenta, la esperanza en Dios es como un ancla del alma, segura y firme. Jesús calmó el viento y el mar con su palabra.', ref: 'Hebreos 6:19; Marcos 4:39' },
  { id: 'barco2', name: 'Regalo de los pescadores', kind: 'Tesoro del mar', spot: 'ship2', gift: 'La red llena de peces', emoji: '🐟',
    msg: 'Pedro había trabajado toda la noche sin pescar nada, pero obedeció a Jesús y echó la red: pescaron tantos peces que la red se rompía. Jesús le dijo: «Desde ahora serás pescador de hombres».', ref: 'Lucas 5:4-10' },
  { id: 'belen', name: 'Regalo de Belén', kind: 'Lugar bíblico', spot: 'belen', gift: 'Oro, incienso y mirra', emoji: '🎁',
    msg: 'Los magos vieron la estrella, se regocijaron con gran gozo y, al ver al niño con María, su madre, se postraron y lo adoraron. Le ofrecieron presentes: oro, incienso y mirra.', ref: 'Mateo 2:10-11' },
  { id: 'jerico', name: 'Regalo de Jericó', kind: 'Lugar bíblico', spot: 'jerico', gift: 'El cordón escarlata de Rahab', emoji: '🧵',
    msg: 'Rahab ató el cordón escarlata a su ventana, como le dijeron los espías, y ella y toda su familia fueron salvados cuando cayó Jericó. Por la fe, Rahab no pereció.', ref: 'Josué 2:18-21; 6:25; Hebreos 11:31' },
  { id: 'babel', name: 'Regalo de Babel', kind: 'Lugar bíblico', spot: 'babel', gift: 'El ladrillo de Babel', emoji: '🧱',
    msg: 'En Babel el orgullo dividió a los hombres en muchas lenguas. En Pentecostés el Espíritu Santo hizo lo contrario: personas de muchas naciones oyeron las maravillas de Dios en su propia lengua.', ref: 'Génesis 11:7-9; Hechos 2:6-11' },
  { id: 'marrojo', name: 'Regalo del Mar Rojo', kind: 'Lugar bíblico', spot: 'marrojo', gift: 'La vara de Moisés', emoji: '🪄',
    msg: 'Dios le dijo a Moisés: «Alza tu vara y extiende tu mano sobre el mar y divídelo». El SEÑOR peleó por su pueblo, e Israel vio la gran obra que hizo y creyó en Él.', ref: 'Éxodo 14:16, 31' },
  { id: 'calvario', name: 'Regalo del Calvario', kind: 'Lugar bíblico', spot: 'calvario', gift: 'La tumba vacía: ¡Ha resucitado!', emoji: '✝️',
    msg: 'Jesús dijo: «Yo soy la resurrección y la vida; el que cree en mí, aunque muera, vivirá». La tumba vacía es la gran noticia: ¡Cristo vive!', ref: 'Juan 11:25; Mateo 28:6' },
];
export const forLevel = lvl => CHARACTERS.filter(c => c.level === lvl || c.level === 0);

/* ---------- Accesorios que sostienen ---------- */
function prop(kind) {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: .9 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: .8 });
  const parch = new THREE.MeshStandardMaterial({ color: 0xe8d8b0, roughness: .9 });
  const clay = new THREE.MeshStandardMaterial({ color: 0xa65a32, roughness: .8 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: 1, roughness: .25 });
  if (kind === 'tablets') {
    const sh = new THREE.Shape(); sh.moveTo(-.11, 0); sh.lineTo(-.11, .22); sh.absarc(0, .22, .11, Math.PI, 0, true); sh.lineTo(.11, 0); sh.lineTo(-.11, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: .035, bevelEnabled: true, bevelSize: .006, bevelThickness: .006, bevelSegments: 2 });
    for (const s of [-1, 1]) { const m = new THREE.Mesh(geo, stone); m.position.set(s * .12, 0, 0); g.add(m); }
    g.position.set(0, 1.08, .2);
  } else if (kind === 'staff') {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(.018, .022, 1.85, 8), wood); s.position.set(.33, .92, .16); s.rotation.z = -.04; g.add(s);
    const top = new THREE.Mesh(new THREE.TorusGeometry(.05, .016, 6, 12, Math.PI), wood); top.position.set(.31, 1.86, .16); g.add(top);
  } else if (kind === 'scroll') {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .26, 12), parch); p.rotation.z = Math.PI / 2; p.position.set(0, 1.06, .22); g.add(p);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .3, 6), wood); r.rotation.z = Math.PI / 2; r.position.set(0, 1.06, .22); r.scale.x = 1; g.add(r); }
  } else if (kind === 'jar') {
    const j = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.07, .01], [.1, .08], [.09, .16], [.04, .22], [.045, .26]].map(([x, y]) => new THREE.Vector2(x, y)), 18), clay); j.position.set(0, .95, .22); g.add(j);
  } else if (kind === 'horn') {
    const h = new THREE.Mesh(new THREE.ConeGeometry(.04, .28, 12), new THREE.MeshStandardMaterial({ color: 0xd8c8a0, roughness: .5 })); h.position.set(0, 1.08, .22); h.rotation.set(.3, 0, 1.2); g.add(h);
  } else if (kind === 'net') {
    const n = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), new THREE.MeshStandardMaterial({ color: 0xa89060, wireframe: true })); n.position.set(0, .98, .22); n.scale.set(1.3, .8, .6); g.add(n);
  } else if (kind === 'basket') {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.16, .12, .13, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0xb08850, roughness: .9, side: THREE.DoubleSide })); b.position.set(0, 1.0, .24); g.add(b);
    for (let i = 0; i < 5; i++) { const br = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd9a35b })); br.position.set(Math.cos(i * 1.3) * .08, 1.06, .24 + Math.sin(i * 1.3) * .06); br.scale.y = .6; g.add(br); }
  } else if (kind === 'loaves') {
    // canasta con cinco panes de cebada y dos peces (Juan 6:9)
    const bm = new THREE.MeshStandardMaterial({ color: 0xa87a42, roughness: .9, side: THREE.DoubleSide });
    const b = new THREE.Mesh(new THREE.CylinderGeometry(.2, .15, .14, 18, 1, true), bm); b.position.set(0, 1.0, .26); g.add(b);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(.15, 18), bm); bot.rotation.x = -Math.PI / 2; bot.position.set(0, .935, .26); g.add(bot);
    const bread = new THREE.MeshStandardMaterial({ color: 0xc98a3e, roughness: .8 });
    [[-.09, .04], [0, .07], [.09, .04], [-.05, -.05], [.06, -.05]].forEach(([x, z]) => { const br = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 8), bread); br.scale.set(1.15, .55, .9); br.position.set(x, 1.07, .26 + z); g.add(br); });
    const fishM = new THREE.MeshStandardMaterial({ color: 0x9fb0b8, metalness: .4, roughness: .35 });
    for (const s of [-1, 1]) {
      const f = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(.05, 12, 8), fishM); body.scale.set(2.2, .7, .5); f.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(.04, .07, 4), fishM); tail.rotation.z = s > 0 ? Math.PI / 2 : -Math.PI / 2; tail.position.x = -.13 * 1; tail.rotation.z = Math.PI / 2; f.add(tail);
      f.position.set(s * .03, 1.12, .26 + s * .02); f.rotation.set(0, s * .5, s * .25); g.add(f);
    }
  } else if (kind === 'book') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(.2, .26, .04), new THREE.MeshStandardMaterial({ color: 0x6a2a1a, roughness: .7 })); b.position.set(0, 1.06, .22); b.rotation.x = -.3; g.add(b);
    const c = new THREE.Mesh(new THREE.BoxGeometry(.08, .012, .045), gold); c.position.set(0, 1.08, .225); c.rotation.x = -.3; g.add(c);
  }
  return g;
}

/* ---------- Crear personaje (estático y unido para rendimiento) ---------- */
export function createCharacter(def) {
  const h = createHuman(Object.assign({ detail: .6, outfit: 'robe', hair: 'short', gender: def.gender || 'm', skin: [0xa8714f, 0xb98260, 0x9a6444, 0xc08a66][def.id.length % 4], eye: 0x3a2414 }, def.look));
  // pose: brazos sosteniendo el objeto
  const two = ['tablets', 'scroll', 'jar', 'net', 'basket', 'book', 'horn', 'loaves'].includes(def.prop);
  if (two) {
    for (const [i, s] of [[0, -1], [1, 1]]) { h.arms[i].shoulder.rotation.set(-.55, 0, s * -.12); h.arms[i].elbow.rotation.x = -1.05; }
  } else if (def.prop === 'staff') {
    h.arms[1].shoulder.rotation.set(-.35, 0, .28); h.arms[1].elbow.rotation.x = -.55;
    h.arms[0].shoulder.rotation.set(.05, 0, -.08);
  }
  h.hips.position.y = .93;
  if (def.prop) h.root.add(prop(def.prop));
  const baked = bakeStatic(h.root);
  if (def.scale) baked.scale.setScalar(def.scale);
  return baked;
}

/* ---------- Etiqueta con el nombre ---------- */
export function nameSprite(text, sub) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = 'rgba(12,20,36,.78)'; const w = 480, x = 16;
  g.beginPath(); g.roundRect(x, 14, w, 100, 28); g.fill();
  g.strokeStyle = 'rgba(245,197,66,.8)'; g.lineWidth = 3; g.stroke();
  g.textAlign = 'center'; g.fillStyle = '#ffd34d'; g.font = '700 26px system-ui, sans-serif'; g.fillText(sub.toUpperCase(), 256, 50);
  g.fillStyle = '#fff'; g.font = '800 42px system-ui, sans-serif';
  const tw = g.measureText(text).width; if (tw > 440) g.font = `800 ${Math.floor(42 * 440 / tw)}px system-ui, sans-serif`;
  g.fillText(text, 256, 98);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(1.15, .29, 1);
  return s;
}

export function giftBox() {
  const g = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({ color: 0xc8243c, roughness: .4, metalness: .1 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcc44, metalness: .9, roughness: .25, emissive: 0x553300, emissiveIntensity: .5 });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.34, .28, .34), red));
  const lid = new THREE.Mesh(new THREE.BoxGeometry(.37, .07, .37), red); lid.position.y = .16; g.add(lid);
  const r1 = new THREE.Mesh(new THREE.BoxGeometry(.06, .36, .375), gold); r1.position.y = .02; g.add(r1);
  const r2 = new THREE.Mesh(new THREE.BoxGeometry(.375, .36, .06), gold); r2.position.y = .02; g.add(r2);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.TorusGeometry(.06, .02, 8, 16), gold); b.position.set(s * .05, .24, 0); b.rotation.y = s * .6; g.add(b); }
  return g;
}
