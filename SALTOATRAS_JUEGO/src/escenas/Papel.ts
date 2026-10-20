// Base de las pantallas de papel (expediente, panel, informe): oscurece lo de
// detrás, dibuja la hoja y se cierra pinchando fuera o con Escape.

import * as Phaser from "phaser";
import { ALTO, ANCHO, camara } from "../config";
import { ajuste } from "../motor/ajustes";
import { entrar, salir } from "../ui/animar";
import { estilarCamara } from "../ui/estilo";
import { Pelicula } from "../ui/pelicula";
import { velo } from "../ui/velo";

export const HOJA = { x: 70, y: 40, ancho: ANCHO - 140, alto: ALTO - 80 };

export abstract class Papel extends Phaser.Scene {
  create() {
    camara(this);
    velo(this, 0.6).on("pointerup", () => salir(this));
    // La hoja se traga los clics para que no cierren.
    this.add.zone(HOJA.x, HOJA.y, HOJA.ancho, HOJA.alto).setOrigin(0).setInteractive();
    this.input.keyboard?.on("keydown-ESC", () => salir(this));
    this.dibujar();
    // Con el mismo estilo que el resto del juego (tramado y grano).
    new Pelicula(this, 50, true, "peli", ajuste("peli.granoOscuro"));
    estilarCamara(this.cameras.main);
    entrar(this);
  }

  protected abstract dibujar(): void;
}
