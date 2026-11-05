// Ceder el turno al navegador mientras se construye el mundo, para que la pantalla
// NUNCA se quede congelada (el celular sigue dibujando y atendiendo los toques).
// Se usa MessageChannel en vez de setTimeout: no tiene la espera mínima de 4 ms.
const mc = new MessageChannel(), cola = [];
let ultimo = performance.now();
mc.port1.onmessage = () => { ultimo = performance.now(); const f = cola.shift(); if (f) f(); };
export const idle = () => new Promise(r => { cola.push(r); mc.port2.postMessage(0); });
// Solo cede si ya se trabajó más de ~8 ms seguidos (si no, sigue de inmediato)
export const pace = () => (performance.now() - ultimo > 8 ? idle() : null);
