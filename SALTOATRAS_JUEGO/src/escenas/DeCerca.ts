// Ver algo de cerca: un papel en primer plano con su texto encima (la nota del
// alcalde, la multa…). Lo pide Ink con ~ ver("id"); el contenido es el
// "de_cerca" de la ficha. Primero se ve el papel solo, para leerlo. Los
// pensamientos que Ink da justo después salen con el primer clic, escritos a boli
// encima (no se pueden saltar); con todo escrito, el siguiente clic cierra el
// papel y los pensamientos a la vez, y la historia sigue.

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, CURSOR_BOLI, MANO, camara, camaraTinta, repartir, texto } from "../config";
import { partida } from "../juego";
import { ajuste } from "../motor/ajustes";
import { entrar, salir } from "../ui/animar";
import { Boli } from "../ui/Boli";
import { estilarCamara } from "../ui/estilo";
import { velo } from "../ui/velo";
import { Pelicula } from "../ui/pelicula";

const PAPEL = { ancho: 440, alto: 320 };

/** Abre el primer plano de una ficha y llama a `luego` al cerrarlo. */
export function verDeCerca(escena: Phaser.Scene, ficha: string, luego: () => void, pensamientos: string[] = []) {
  partida.eventos.once("fin-decerca", luego);
  // Si la escena que lo pidió se para antes (p. ej. al ir al menú), se olvida.
  escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => partida.eventos.off("fin-decerca", luego));
  escena.scene.launch("decerca", { ficha, pensamientos });
}

export class DeCerca extends Phaser.Scene {
  private ficha!: string;
  private pensamientos: string[] = [];
  private boli!: Boli;
  /** Ya han salido los pensamientos (con el primer clic). */
  private empezados = false;

  constructor() {
    super("decerca");
  }

  init(datos: { ficha: string; pensamientos?: string[] }) {
    this.ficha = datos.ficha;
    this.pensamientos = datos.pensamientos ?? [];
    this.empezados = false;
  }

  preload() {
    const imagen = partida.datos.fichas[this.ficha]?.de_cerca?.imagen;
    const url = imagen && partida.datos.imagenes[imagen];
    if (imagen && url && !this.textures.exists(imagen)) this.load.image(imagen, url);
  }

  create() {
    camara(this);
    const { de_cerca } = partida.datos.fichas[this.ficha];
    const cortina = velo(this, 0.8).on("pointerup", () => this.pulsar());
    this.input.keyboard?.on("keydown-SPACE", () => this.pulsar());
    this.input.keyboard?.on("keydown-ESC", () => this.cerrar());

    const papel = this.add.container(ANCHO / 2, ALTO / 2);
    let ancho = PAPEL.ancho;
    if (de_cerca?.imagen && this.textures.exists(de_cerca.imagen)) {
      const img = this.add.image(0, 0, de_cerca.imagen);
      img.setScale(Math.min((ANCHO - 120) / img.width, (ALTO - 80) / img.height));
      papel.add(img);
      ancho = img.displayWidth * 0.8;
    } else {
      // Sin arte: un papel dibujado.
      const g = this.add.graphics();
      g.fillStyle(0x000000, 0.35).fillRect(-PAPEL.ancho / 2 + 8, -PAPEL.alto / 2 + 10, PAPEL.ancho, PAPEL.alto);
      g.fillStyle(0xf4efe0).fillRect(-PAPEL.ancho / 2, -PAPEL.alto / 2, PAPEL.ancho, PAPEL.alto);
      papel.add(g);
      ancho = PAPEL.ancho - 60;
    }
    const contenido = (de_cerca?.texto ?? "").trim();
    if (contenido.includes("[[")) {
      papel.add(this.escribirMezclado(contenido, ancho, de_cerca?.letra === "maquina"));
    } else {
      papel.add(texto(this, 0, 0, contenido, {
        fontFamily: de_cerca?.letra === "maquina" ? '"Courier New", monospace' : MANO,
        fontSize: de_cerca?.letra === "maquina" ? "20px" : "28px",
        color: de_cerca?.letra === "maquina" ? COLOR.tinta : COLOR.boliPapel,
        align: de_cerca?.letra === "maquina" ? "left" : "center",
        lineSpacing: 6,
        wordWrap: { width: ancho },
      }).setOrigin(0.5));
    }
    papel.setAngle(-2);

    // Los pensamientos se escriben encima, en su zona de siempre (el papel no se mueve).
    // Con un borde oscuro fino para que se lean también sobre el papel claro.
    this.boli = Boli.enZona(this, { contorno: true });

    // El papel y su texto se pintan juntos en la cámara del mundo, con los filtros del
    // estilo y la película encima, para que queden fundidos. La tinta de Martínez va en
    // otra cámara, sin filtros: es su mundo interior.
    const tinta = camaraTinta(this);
    const pelicula = new Pelicula(this, 50, true, "peli", ajuste("peli.granoOscuro"));
    pelicula.ocultarEn(tinta);
    repartir(this, tinta, { obj: cortina, en: "mundo" }, { obj: papel, en: "mundo" }, { obj: this.boli.contenedor, en: "tinta" });
    estilarCamara(this.cameras.main);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.input.setDefaultCursor(""));

    entrar(this);
    // Entra como si se acercara.
    papel.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: papel, scale: 1, alpha: 1, duration: 220, ease: "Quad.Out" });
  }

  /**
   * Un papel impreso (a máquina) con huecos rellenados a mano: lo que va entre [[ ]] sale en
   * letra a mano, algo torcida, y el resto en la letra del papel. Cada palabra es un texto
   * suelto, para que las dos letras convivan en el mismo renglón y se partan donde toque.
   */
  private escribirMezclado(contenido: string, ancho: number, maquina: boolean) {
    const impreso = { fontFamily: maquina ? '"Courier New", monospace' : MANO, fontSize: maquina ? "20px" : "28px", color: COLOR.tinta };
    // Lo escrito a mano es de bolígrafo negro azulado: otra tinta que la azul de los pensamientos.
    const a_mano = { fontFamily: MANO, fontSize: "27px", color: "#232a38" };
    const salida = this.add.container(0, 0);
    let y = 0;
    for (const linea of contenido.split("\n")) {
      if (!linea.trim()) {
        y += 14;
        continue;
      }
      const piezas = linea.split(/(\[\[.*?\]\])/).filter(Boolean).flatMap((trozo) => {
        const mano = trozo.startsWith("[[");
        const limpio = mano ? trozo.slice(2, -2) : trozo;
        return (limpio.match(/\S+\s*/g) ?? []).map((p) => ({ p, mano }));
      });
      // Se colocan por renglones y luego se alinean por abajo (la letra a mano es más alta).
      let fila: { t: Phaser.GameObjects.Text; mano: boolean }[] = [];
      let x = 0;
      let alto = 0;
      const cerrarFila = () => {
        for (const { t, mano } of fila) {
          t.y = y + alto;
          if (mano) t.y += Phaser.Math.Between(-1, 1);
        }
        y += alto + 6;
        fila = [];
        x = 0;
        alto = 0;
      };
      for (const { p, mano } of piezas) {
        const t = texto(this, 0, 0, p, mano ? a_mano : impreso).setOrigin(0, 1);
        if (mano) t.setAngle(Phaser.Math.FloatBetween(-1.8, 1.2));
        if (x > 0 && x + t.width > ancho) cerrarFila();
        t.x = x;
        x += t.width;
        alto = Math.max(alto, t.height);
        fila.push({ t, mano });
        salida.add(t);
      }
      cerrarFila();
    }
    // Centrado en el papel; a máquina, alineado a la izquierda.
    salida.setPosition(-ancho / 2, -(y - 6) / 2);
    return salida;
  }

  private escribirPensamientos() {
    this.input.setDefaultCursor(CURSOR_BOLI);
    this.boli.bloque(this.pensamientos, () => this.input.setDefaultCursor(""));
  }

  /**
   * El papel se lee solo. Primer clic: salen los pensamientos. Mientras se escriben,
   * los clics no hacen nada (no se saltan). Con todo escrito, un clic cierra las dos cosas.
   */
  private pulsar() {
    if (this.pensamientos.length && !this.empezados) {
      this.empezados = true;
      this.escribirPensamientos();
      return;
    }
    if (this.boli.pendiente) return;
    this.cerrar();
  }

  private cerrar() {
    salir(this, () => partida.eventos.emit("fin-decerca"));
  }
}
