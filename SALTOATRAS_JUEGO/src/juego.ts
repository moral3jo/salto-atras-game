// La partida en curso, compartida por todas las escenas, y los saltos entre
// la portada y el juego. Cada salto funde a negro antes de cambiar.

import type * as Phaser from "phaser";
import { ALTO, ANCHO } from "./config";
import type { Partida } from "./motor/partida";
import { DURACION } from "./ui/animar";

export let partida: Partida;

/** Cómo arranca la página: con ?nuevo, directo a una partida nueva (para probar). */
export const arranque = { nueva: false };

export function iniciarPartida(p: Partida) {
  partida = p;
}

/** Para todas las escenas menos `salvo` (la que acaba de empezar). */
function pararTodo(escena: Phaser.Scene, salvo: string) {
  for (const s of escena.scene.manager.getScenes(false)) {
    if (s.scene.key !== salvo && (s.scene.isActive() || s.scene.isPaused() || s.scene.isSleeping())) s.scene.stop();
  }
}

/**
 * Cambia a `destino` sin dejar nunca la pantalla sin escenas (ahí el lienzo puede dejar un
 * fotograma raro, un fogonazo) y sin cortar la película:
 *
 * 1. Una tapa negra va cubriendo el contenido de la escena que llama, POR DEBAJO de su
 *    película (el grano sigue, en negro).
 * 2. Cuando está todo negro, la escena nueva EMPIEZA mientras la vieja sigue viva.
 * 3. En cuanto la nueva ha creado su primer fotograma, la vieja apaga su película (para que
 *    no haya dos granos a la vez) y, al fotograma siguiente, se paran todas las demás.
 */
function saltar(escena: Phaser.Scene, destino: string) {
  escena.input.enabled = false;
  const tapa = escena.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 1).setOrigin(0).setDepth(49).setAlpha(0);
  escena.tweens.add({
    targets: tapa,
    alpha: 1,
    duration: DURACION.lenta / 2,
    onComplete: () => {
      escena.scene.get(destino).events.once("create", () => {
        (escena.data.get("pelicula") as { atenuar(v: number): void } | undefined)?.atenuar(0);
        escena.game.events.once("postrender", () => {
          pararTodo(escena, destino);
          escena.input.enabled = true;
        });
      });
      escena.scene.launch(destino);
    },
  });
}

/**
 * Entra en el juego: con la partida guardada o con una nueva. Una nueva pasa
 * antes por la llegada (salvo `directo`, para probar).
 */
export function jugar(escena: Phaser.Scene, nueva: boolean, directo = false) {
  if (nueva || !partida.cargar()) partida.reiniciar();
  const llegada = nueva && !directo && partida.datos.llegada;
  saltar(escena, llegada ? "llegada" : "lugar");
}

export function irAPortada(escena: Phaser.Scene) {
  partida.guardar();
  saltar(escena, "portada");
}
