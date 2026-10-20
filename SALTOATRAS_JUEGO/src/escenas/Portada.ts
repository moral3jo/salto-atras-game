// La portada: el título, el aviso de contenido y entrar en el juego
// (continuar la partida guardada o empezar una nueva).

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, camara, texto } from "../config";
import { arranque, jugar, partida } from "../juego";
import { Partida } from "../motor/partida";
import { opciones } from "../ui/Opciones";
import { DURACION, aparecer } from "../ui/animar";
import { estilarCamara } from "../ui/estilo";
import { Pelicula, reiniciarPelicula } from "../ui/pelicula";
import { musica } from "../motor/musica";

export class Portada extends Phaser.Scene {
  private menu?: Phaser.GameObjects.Container;

  constructor() {
    super("portada");
  }

  preload() {
    const emblema = partida.datos.imagenes["logo-emblema"];
    if (emblema && !this.textures.exists("logo-emblema")) this.load.image("logo-emblema", emblema);
  }

  create() {
    // ?nuevo en la URL: directo a una partida nueva (para probar).
    if (arranque.nueva) {
      arranque.nueva = false;
      return jugar(this, true, true);
    }

    camara(this);
    const { titulo, aviso } = partida.datos;
    musica(this, partida.datos.musica?.portada ?? "");
    if (this.textures.exists("logo-emblema")) {
      const e = this.add.image(ANCHO / 2, 118, "logo-emblema");
      // El óvalo del grabado es más alto que ancho: se ensancha un poco para que el círculo sea redondo.
      e.setScale((150 / e.height) * 1.09, 150 / e.height);
      aparecer(this, e, { desde: { y: 10 }, duracion: DURACION.lenta * 1.5 });
    }
    const t = texto(this, ANCHO / 2, 238, titulo, { fontSize: "52px", color: COLOR.texto, letterSpacing: 6 }).setOrigin(0.5);
    aparecer(this, t, { desde: { y: 10 }, duracion: DURACION.lenta * 1.5 });
    if (aviso) {
      texto(this, ANCHO / 2, ALTO - 70, aviso, {
        fontSize: "13px", color: "#ffffff77", fontStyle: "italic", align: "center", wordWrap: { width: 560 },
      }).setOrigin(0.5);
    }
    this.principal();
    // La película va por encima de todo, letras incluidas.
    reiniciarPelicula(0);
    this.data.set("pelicula", new Pelicula(this, 1000, true, "menu"));
    this.cameras.main.setBackgroundColor("#000000");
    // Todo el menú (emblema, título y opciones, con la película) pasa por el mismo estilo que el juego.
    estilarCamara(this.cameras.main);
    this.cameras.main.fadeIn(400);
  }

  private principal() {
    this.menu?.destroy();
    const lista = [];
    if (Partida.hayGuardada()) lista.push({ texto: "Continuar", accion: () => jugar(this, false) });
    lista.push({
      texto: "Nueva partida",
      accion: () => (Partida.hayGuardada() ? this.confirmar() : jugar(this, true)),
    });
    this.menu = opciones(this, ANCHO / 2, 300, lista);
  }

  private confirmar() {
    this.menu?.destroy();
    this.menu = this.add.container(0, 0, [
      texto(this, ANCHO / 2, 300, "Se perderá la partida guardada.", { fontSize: "15px", color: "#ffffff99" }).setOrigin(0.5, 0),
      opciones(this, ANCHO / 2, 340, [
        { texto: "Empezar de cero", accion: () => jugar(this, true) },
        { texto: "Mejor no", accion: () => this.principal() },
      ]),
    ]);
  }
}
