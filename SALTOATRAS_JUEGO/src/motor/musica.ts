// La música de fondo: suena una pista a la vez, con fundido al cambiar. Las pistas son
// ficheros de SALTOATRAS_ARTE/sonido/ (se nombran sin extensión). Se piden por datos:
// `musica:` en juego.yaml (portada y juego), `musica:` en un lugar, o `~ musica("pista")` en Ink
// (`~ musica("")` para callarla). Con varias pistas (una lista, o "a,b" en Ink) se turnan: cuando
// una está acabando entra la siguiente, y al llegar a la última vuelve a la primera. Pedir lo
// que ya suena no lo reinicia. El volumen sale de `audio.musica` (pausa y panel F2).
// Sin el fichero, silencio.

import * as Phaser from "phaser";
import { partida } from "../juego";
import { ajuste, alCambiarAjuste } from "./ajustes";

export type Pista = string | string[];

type Suena = Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;

let actual: { clave: string; sonido: Suena } | null = null;
let pedida = "";
let turno: ReturnType<typeof setTimeout> | undefined;
let escuchando = false;

/** Sube o baja el volumen de un sonido poco a poco (no depende de la escena: sigue aunque se cambie). */
function fundir(sonido: Suena, hasta: number, ms: number, alAcabar?: () => void, desde = sonido.volume) {
  const t0 = performance.now();
  const paso = () => {
    const k = ms <= 0 ? 1 : Math.min(1, (performance.now() - t0) / ms);
    sonido.volume = desde + (hasta - desde) * k;
    if (k < 1) setTimeout(paso, 50);
    else alAcabar?.();
  };
  paso();
}

const comoLista = (p: Pista) => (Array.isArray(p) ? p : p.split(",")).map((x) => x.trim()).filter((x) => partida.datos.sonidos[x]);

/** Pone esa música ("" = silencio): una pista o una lista que se turna. Si ya suena, no hace nada. */
export function musica(escena: Phaser.Scene, pista: Pista, fundido = 1500) {
  if (!escuchando) {
    escuchando = true;
    alCambiarAjuste(() => {
      if (actual) actual.sonido.volume = ajuste("audio.musica");
    });
  }
  const lista = comoLista(pista);
  const clave = lista.join("|");
  if (clave === pedida) return;
  pedida = clave;
  clearTimeout(turno);
  const antes = actual;
  actual = null;
  if (antes) fundir(antes.sonido, 0, fundido, () => antes.sonido.destroy());
  if (!lista.length) return;
  // Entre varias, empieza por una al azar: no siempre la misma al abrir el juego.
  tocar(escena, lista, Math.floor(Math.random() * lista.length), fundido, clave);
}

function tocar(escena: Phaser.Scene, lista: string[], i: number, fundido: number, clave: string) {
  const pista = lista[i];
  const empezar = () => {
    // Si mientras cargaba se ha pedido otra cosa, esta ya no toca.
    if (pedida !== clave) return;
    const sonido = escena.game.sound.add(pista, { loop: lista.length === 1, volume: 0 }) as Suena;
    const anterior = actual;
    actual = { clave: pista, sonido };
    // play() sin ajustes deja el volumen en 1: entra desde 0, sin golpe.
    sonido.play({ volume: 0, loop: lista.length === 1 });
    fundir(sonido, ajuste("audio.musica"), fundido, undefined, 0);
    if (anterior && anterior.sonido !== sonido) fundir(anterior.sonido, 0, fundido, () => anterior.sonido.destroy());
    // La siguiente entra mientras esta se está acabando.
    if (lista.length > 1) {
      const resta = Math.max(1, sonido.duration * 1000 - fundido * 2);
      turno = setTimeout(() => tocar(escena, lista, (i + 1) % lista.length, fundido * 2, clave), resta);
    }
  };
  // Se cargan todas ya (la escena que pide puede no estar viva cuando toque la siguiente).
  const faltan = lista.filter((n) => !escena.game.cache.audio.exists(n));
  if (!faltan.length) return empezar();
  for (const n of faltan) escena.load.audio(n, partida.datos.sonidos[n]);
  if (faltan.includes(pista)) escena.load.once(`filecomplete-audio-${pista}`, empezar);
  else empezar();
  if (!escena.load.isLoading()) escena.load.start();
}
