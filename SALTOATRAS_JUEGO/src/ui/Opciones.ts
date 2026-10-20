// Una lista de opciones de menú en columna, centrada en x. Devuelve el
// contenedor para poder borrarla y poner otra (p. ej. una confirmación).

import * as Phaser from "phaser";
import { COLOR, texto } from "../config";
import { aparecer } from "./animar";

export interface Opcion {
  texto: string;
  accion: () => void;
}

export function opciones(escena: Phaser.Scene, x: number, y: number, lista: Opcion[]) {
  const c = escena.add.container();
  lista.forEach((o, i) => {
    const t = texto(escena, x, y + i * 40, o.texto, { fontSize: "20px", color: COLOR.opcion })
      .setOrigin(0.5, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => t.setColor(COLOR.opcionEncima))
      .on("pointerout", () => t.setColor(COLOR.opcion))
      .on("pointerup", o.accion);
    c.add(t);
    aparecer(escena, t, { desde: { y: 8 }, retraso: i * 70 });
  });
  return c;
}
