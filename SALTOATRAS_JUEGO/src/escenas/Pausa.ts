// La pausa: se abre con Escape (o el botón de menú) cuando no hay nada más
// abierto. Congela lo de detrás hasta que se sigue.

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, camara, texto } from "../config";
import { irAPortada, jugar } from "../juego";
import { poner, valorDe } from "../motor/ajustes";
import { opciones } from "../ui/Opciones";
import { entrar, salir } from "../ui/animar";

/** "Movimiento de la imagen": para quien se maree o se canse con el grano y el temblor. */
const MOVIMIENTOS = [
  { nombre: "Normal", valor: 1 },
  { nombre: "Suave", valor: 0.4 },
  { nombre: "Quieto", valor: 0 },
];

export class Pausa extends Phaser.Scene {
  private menu?: Phaser.GameObjects.Container;
  private congeladas: Phaser.Scene[] = [];

  constructor() {
    super("pausa");
  }

  create() {
    camara(this);
    this.congeladas = this.scene.manager.getScenes(true).filter((s) => s !== this);
    for (const s of this.congeladas) s.scene.pause();

    this.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0.75).setOrigin(0).setInteractive();
    texto(this, ANCHO / 2, 150, "PAUSA", { fontSize: "28px", color: COLOR.texto, letterSpacing: 4 }).setOrigin(0.5);
    this.input.keyboard?.on("keydown-ESC", () => this.seguir());
    this.principal();
    entrar(this);
  }

  private principal() {
    this.menu?.destroy();
    const lista = [
      { texto: "Seguir", accion: () => this.seguir() },
      { texto: `Movimiento de la imagen: ${this.movimiento().nombre}`, accion: () => this.cambiarMovimiento() },
      { texto: "Nueva partida", accion: () => this.confirmar() },
      { texto: "Volver a la portada", accion: () => irAPortada(this) },
    ];
    // Solo en desarrollo: el panel de ajustes (también con F2).
    if (import.meta.env.DEV) lista.push({ texto: "Ajustes (debug)", accion: () => window.dispatchEvent(new Event("debug:alternar")) });
    this.menu = opciones(this, ANCHO / 2, 220, lista);
  }

  private movimiento() {
    const v = valorDe("peli.comodidad");
    return MOVIMIENTOS.reduce((a, b) => (Math.abs(b.valor - v) < Math.abs(a.valor - v) ? b : a));
  }

  private cambiarMovimiento() {
    const i = MOVIMIENTOS.indexOf(this.movimiento());
    poner("peli.comodidad", MOVIMIENTOS[(i + 1) % MOVIMIENTOS.length].valor);
    this.principal();
  }

  private confirmar() {
    this.menu?.destroy();
    this.menu = this.add.container(0, 0, [
      texto(this, ANCHO / 2, 220, "Se perderá la partida.", { fontSize: "15px", color: "#ffffff99" }).setOrigin(0.5, 0),
      opciones(this, ANCHO / 2, 260, [
        { texto: "Empezar de cero", accion: () => jugar(this, true) },
        { texto: "Mejor no", accion: () => this.principal() },
      ]),
    ]);
  }

  private seguir() {
    salir(this, () => {
      for (const s of this.congeladas) s.scene.resume();
    });
  }
}
