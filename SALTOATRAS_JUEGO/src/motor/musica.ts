// La música de fondo: una sola pista a la vez, en bucle, con fundido al cambiar.
// Las pistas son ficheros de SALTOATRAS_ARTE/sonido/ (se nombran sin extensión). Se piden por
// datos: `musica:` en juego.yaml (portada y juego), `musica:` en un lugar, o `~ musica("pista")`
// en Ink (`~ musica("")` para callarla). Pedir la pista que ya suena no la reinicia.
// El volumen sale de `audio.musica` (pausa y panel F2). Sin el fichero, silencio.

import * as Phaser from "phaser";
import { partida } from "../juego";
import { ajuste, alCambiarAjuste } from "./ajustes";

interface Suena {
  clave: string;
  sonido: Phaser.Sound.BaseSound;
}

let actual: Suena | null = null;
let pedida = "";
let escuchando = false;

/** Sube o baja el volumen de un sonido poco a poco (no depende de la escena: sigue aunque se cambie). */
function fundir(sonido: Phaser.Sound.BaseSound, hasta: number, ms: number, alAcabar?: () => void) {
  const desde = (sonido as Phaser.Sound.WebAudioSound).volume;
  const t0 = performance.now();
  const paso = () => {
    const k = ms <= 0 ? 1 : Math.min(1, (performance.now() - t0) / ms);
    (sonido as Phaser.Sound.WebAudioSound).volume = desde + (hasta - desde) * k;
    if (k < 1) setTimeout(paso, 50);
    else alAcabar?.();
  };
  paso();
}

/** Pone esa pista ("" = silencio). Si ya suena, no hace nada. */
export function musica(escena: Phaser.Scene, clave: string, fundido = 1500) {
  if (!escuchando) {
    escuchando = true;
    alCambiarAjuste(() => {
      if (actual) (actual.sonido as Phaser.Sound.WebAudioSound).volume = ajuste("audio.musica");
    });
  }
  pedida = clave;
  if (actual?.clave === clave) return;
  const antes = actual;
  actual = null;
  if (antes) fundir(antes.sonido, 0, fundido, () => antes.sonido.destroy());
  const url = clave && partida.datos.sonidos[clave];
  if (!url) return;

  const empezar = () => {
    // Si mientras cargaba se ha pedido otra cosa, esta ya no toca.
    if (pedida !== clave || actual) return;
    const sonido = escena.sound.add(clave, { loop: true, volume: 0 });
    actual = { clave, sonido };
    sonido.play();
    fundir(sonido, ajuste("audio.musica"), fundido);
  };
  if (escena.cache.audio.exists(clave)) return empezar();
  escena.load.audio(clave, url);
  escena.load.once(`filecomplete-audio-${clave}`, empezar);
  if (!escena.load.isLoading()) escena.load.start();
}
