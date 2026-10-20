// El velo de una capa que se abre encima del lugar (conversación, papel de cerca…). En
// vez de un rectángulo negro encima de todo (que oscurece DESPUÉS de los filtros y se come
// el tramado), el velo es invisible y le pide al lugar que se oscurezca él mismo: el lugar
// baja su brillo antes de pasar por los filtros, así que el tramado sigue siendo tramado
// (puntos claros sobre fondo oscuro) y no una imagen negra con grano.

import * as Phaser from "phaser";
import { ALTO, ANCHO } from "../config";
import { partida } from "../juego";

const pedidos = new Map<Phaser.Scene, number>();

function avisar() {
  partida.eventos.emit("oscuridad", Math.max(0, ...pedidos.values()));
}

/** Un rectángulo invisible que se traga los clics, y el lugar de detrás se oscurece `valor` (0-1). */
export function velo(escena: Phaser.Scene, valor: number) {
  const r = escena.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0).setOrigin(0).setInteractive();
  pedidos.set(escena, valor);
  avisar();
  escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    pedidos.delete(escena);
    avisar();
  });
  return r;
}
