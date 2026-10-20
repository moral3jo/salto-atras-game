// Mirar cosas y lo que pasa al llegar a un sitio. Lee un nudo de Ink línea
// a línea:
//   "Policía: Texto"  → habla alguien: en la caja de abajo.
//   "Texto"           → pensamiento de Martínez: a boli, sobre la escena.
// Los pensamientos seguidos son un bloque que se escribe solo (sin clics) y se
// queda en pantalla hasta que se pincha. Un clic mientras se escribe no hace
// nada (no se salta); ya escrito, cierra. Mientras se escribe el cursor es un
// boli; al acabar, vuelve a ser normal y parpadea una marca tras la última línea. La
// caja de abajo avanza con clics. Hablar con alguien es otra escena
// (Conversacion).

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, CURSOR_BOLI, camara, texto } from "../config";
import { partida } from "../juego";
import { ajuste } from "../motor/ajustes";
import { leerBloque, leerLinea, type Paso } from "../motor/lineas";
import type { Aviso } from "../motor/partida";
import { verDeCerca } from "./DeCerca";
import { DURACION, aparecer, salir } from "../ui/animar";
import { Boli } from "../ui/Boli";

const CAJA = { x: 40, y: ALTO - 170, ancho: ANCHO - 80, alto: 150 };

export class Dialogo extends Phaser.Scene {
  private caja!: Phaser.GameObjects.Container;
  private quien!: Phaser.GameObjects.Text;
  private linea!: Phaser.GameObjects.Text;
  private opciones!: Phaser.GameObjects.Container;
  private completa = "";
  private escribiendo?: Phaser.Time.TimerEvent;
  private eligiendo = false;
  private boli!: Boli;
  /** Lo que sigue a un papel de cerca: se dice al cerrarlo. */
  private cola: Paso[] = [];
  /** Hay un bloque de pensamientos en pantalla (escribiéndose o esperando el clic que lo cierra). */
  private pensando = false;
  /** Se está cerrando un bloque: los clics no hacen nada hasta que acabe. */
  private cerrando = false;
  /** Avisos del bloque en pantalla: salen al cerrarlo. */
  private avisosBloque: Aviso[] = [];

  constructor() {
    super("dialogo");
  }

  create(datos: { nudo: string }) {
    camara(this);
    this.eligiendo = false;
    this.cola = [];
    this.pensando = false;
    this.cerrando = false;
    this.avisosBloque = [];
    // Al irse la escena, el cursor vuelve a ser el de siempre.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.input.setDefaultCursor(""));

    // Tapa el lugar entero: mientras se habla, no se pincha nada de detrás.
    this.add
      .zone(0, 0, ANCHO, ALTO)
      .setOrigin(0)
      .setInteractive()
      .on("pointerup", () => this.pulsar());
    this.input.keyboard?.on("keydown-SPACE", () => this.pulsar());
    this.input.keyboard?.on("keydown-ENTER", () => this.pulsar());

    const fondo = this.add.graphics();
    fondo.fillStyle(COLOR.caja, 0.92).fillRoundedRect(CAJA.x, CAJA.y, CAJA.ancho, CAJA.alto, 6);
    this.quien = texto(this, CAJA.x + 20, CAJA.y + 14, "", { fontSize: "14px", color: COLOR.nombre, fontStyle: "bold" });
    this.linea = texto(this, CAJA.x + 20, CAJA.y + 38, "", { fontSize: "18px", wordWrap: { width: CAJA.ancho - 40 }, lineSpacing: 4 });
    this.opciones = this.add.container();
    this.caja = this.add.container(0, 0, [fondo, this.quien, this.linea, this.opciones]).setVisible(false);
    this.boli = Boli.enZona(this);

    partida.entrarEn(datos.nudo);
    this.siguiente();
  }

  private pulsar() {
    if (this.eligiendo || this.cerrando) return;
    // Los pensamientos se escriben enteros, sin atajo: un clic mientras se escriben
    // no hace nada; ya escritos, lo cierra.
    if (this.pensando) {
      if (!this.boli.pendiente) this.cerrarPensamientos();
      return;
    }
    if (this.escribiendo) {
      this.escribiendo.remove();
      this.escribiendo = undefined;
      this.linea.setText(this.completa);
      return;
    }
    this.siguiente();
  }

  private siguiente(): void {
    const h = partida.historia;
    if (this.cola.length) return this.paso(this.cola.shift()!);
    while (h.canContinue) {
      const linea = (h.Continue() ?? "").trim();
      const papel = partida.tomarVer();
      // Una línea vacía no tiene nada que enseñar: sus avisos esperan a la siguiente.
      if (!linea && !papel) continue;
      const avisos = partida.tomarAvisos();
      if (papel) {
        // Los pensamientos que siguen se escriben sobre el papel abierto;
        // lo demás, al cerrarlo.
        const bloque = leerBloque(linea, avisos);
        this.cola.push(...bloque.resto);
        return this.verPapel(papel, bloque.pensamientos, bloque.avisos);
      }
      return this.decir(linea, avisos);
    }
    if (h.currentChoices.length) return this.elegir();
    this.terminar();
  }

  private paso(p: Paso) {
    if ("ver" in p) return this.verPapel(p.ver, p.pensamientos, p.avisos);
    if ("pensar" in p) return this.pensar(p.pensar, p.avisos);
    this.decir(p.linea, p.avisos);
  }

  /** Un bloque de pensamientos: se escriben solos y se quedan hasta que se pincha. */
  private pensar(lineas: string[], avisos: Aviso[] = []) {
    if (this.caja.visible) this.caja.setVisible(false);
    this.pensando = true;
    this.avisosBloque = avisos;
    this.input.setDefaultCursor(CURSOR_BOLI);
    // Mientras se escribe, el cursor es un boli; al acabar, vuelve a ser normal y
    // una marca parpadea tras la última línea: ya se puede cerrar con un clic.
    this.boli.bloque(lineas, () => this.input.setDefaultCursor(""));
  }

  /** El clic que cierra los pensamientos: salen los avisos y sigue lo que haya. */
  private cerrarPensamientos() {
    this.cerrando = true;
    this.pensando = false;
    this.input.setDefaultCursor("");
    partida.soltarAvisos(this.avisosBloque);
    this.avisosBloque = [];
    this.boli.borrar();
    const h = partida.historia;
    if (!this.cola.length && !h.canContinue && !h.currentChoices.length) {
      // No queda nada: se cierra ya, así el siguiente clic llega al escenario.
      this.terminar();
      return;
    }
    this.time.delayedCall(DURACION.normal, () => {
      this.cerrando = false;
      this.siguiente();
    });
  }

  private verPapel(papel: string, pensamientos?: string[], avisos: Aviso[] = []) {
    this.caja.setVisible(false);
    this.eligiendo = true;
    verDeCerca(
      this,
      papel,
      () => {
        // Ya se ha visto: ahora sí se avisa de lo que se ha añadido.
        partida.soltarAvisos(avisos);
        this.eligiendo = false;
        this.siguiente();
      },
      pensamientos,
    );
  }

  private decir(linea: string, avisos: Aviso[] = []) {
    const l = leerLinea(linea);
    if (!l.quien) {
      // Pensamiento: se reúne con los que le siguen y se escriben a boli, sin caja.
      const bloque = leerBloque(linea, avisos);
      this.cola.push(...bloque.resto);
      return this.pensar(bloque.pensamientos, bloque.avisos);
    }
    partida.soltarAvisos(avisos);
    this.boli.borrar();
    if (!this.caja.visible) aparecer(this, this.caja.setVisible(true), { desde: { y: 12 } });
    this.opciones.removeAll(true);
    this.quien.setText(l.quien.toUpperCase());
    this.completa = l.texto;
    this.linea.setText("");

    let n = 0;
    this.escribiendo = this.time.addEvent({
      delay: 1000 / ajuste("dialogo.letrasPorSegundo"),
      repeat: this.completa.length - 1,
      callback: () => {
        this.linea.setText(this.completa.slice(0, ++n));
        if (n >= this.completa.length) this.escribiendo = undefined;
      },
    });
  }

  private elegir() {
    const h = partida.historia;
    this.eligiendo = true;
    this.caja.setVisible(true);
    this.quien.setText("");
    this.linea.setText("");
    this.opciones.removeAll(true);

    h.currentChoices.forEach((opcion, i) => {
      const t = texto(this, CAJA.x + 24, CAJA.y + 16 + i * 26, "— " + opcion.text, { fontSize: "17px", color: COLOR.opcion })
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => t.setColor(COLOR.opcionEncima))
        .on("pointerout", () => t.setColor(COLOR.opcion))
        .on("pointerup", () => {
          this.eligiendo = false;
          this.opciones.removeAll(true);
          h.ChooseChoiceIndex(i);
          this.siguiente();
        });
      this.opciones.add(t);
    });
  }

  private terminar() {
    // Lo que quedara suelto al final de la historia también se avisa.
    partida.soltarAvisos(partida.tomarAvisos());
    salir(this, () => partida.eventos.emit("fin-conversacion"));
  }
}
