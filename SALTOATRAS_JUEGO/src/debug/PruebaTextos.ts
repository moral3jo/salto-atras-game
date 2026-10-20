// Escena de prueba del panel de debug: escribe un bloque de pensamientos de
// muestra donde salen los de verdad, con las mismas reglas (el cursor es un
// boli mientras se escribe; no se salta; ya escrito, un clic lo cierra). Sirve
// para ver cómo quedan los ajustes sin tener que jugar hasta un pensamiento.
// Los textos de aquí son de prueba, no de la historia.

import * as Phaser from "phaser";
import { ALTO, ANCHO, CURSOR_BOLI, camara } from "../config";
import { Boli } from "../ui/Boli";
import { salir } from "../ui/animar";

export const MUESTRAS: Record<string, { nombre: string; lineas: string[] }> = {
  corto: { nombre: "Corto", lineas: ["Un pensamiento corto."] },
  medio: { nombre: "Medio", lineas: ["Cobertura: ~~poca~~ ninguna.", "(Un aparte, más pequeño.)"] },
  largo: {
    nombre: "Largo",
    lineas: [
      "Este es un pensamiento largo, de los que no caben en una sola línea y obligan a partir el texto para ver cómo respira la letra y cuánto se tarda en leerlo entero.",
    ],
  },
  marcas: {
    nombre: "Tachados y subrayados",
    lineas: [
      "Mal aparcado. ~~Un coche~~ _Mi_ coche.",
      "_Subrayado_ y ~~tachado~~ en la misma línea.",
      "(Y un aparte con ~~otro tachado~~ al final.)",
    ],
  },
  seguidos: {
    nombre: "Cuatro seguidos",
    lineas: ["Primera línea del bloque.", "Segunda, algo más larga que la primera.", "Tercera.", "(Y un aparte para cerrar.)"],
  },
  muchos: {
    nombre: "Muchos (se llena)",
    lineas: ["Uno.", "Dos, un poco más largo.", "Tres.", "Cuatro, con ~~un tachado~~ y _un subrayado_.", "(Cinco, aparte.)", "Seis.", "Siete, para que no quepan."],
  },
};

export class PruebaTextos extends Phaser.Scene {
  private lineas: string[] = [];
  private boli!: Boli;

  constructor() {
    super("pruebatextos");
  }

  init(datos: { lineas: string[] }) {
    this.lineas = datos.lineas;
  }

  create() {
    camara(this);
    // Como el diálogo de verdad: tapa el escenario y se cierra con un clic cuando acaba.
    this.add
      .zone(0, 0, ANCHO, ALTO)
      .setOrigin(0)
      .setInteractive()
      .on("pointerup", () => {
        if (!this.boli.pendiente) salir(this);
      });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.input.setDefaultCursor(""));
    this.boli = Boli.enZona(this);
    this.input.setDefaultCursor(CURSOR_BOLI);
    this.boli.bloque(this.lineas, () => this.input.setDefaultCursor(""));
  }
}
