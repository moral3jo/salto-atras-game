// Pensar: el cuaderno de Martínez. A la izquierda las preguntas del panel; a
// la derecha la elegida, con dos huecos: la respuesta y la prueba que la
// sostiene. Abajo, la bandeja de fichas: pinchar una la pone en el hueco.
// Si se sostiene, queda resuelta y pasa al panel; si no, Martínez lo dice
// (nudo pensar_fallo) y se puede volver a probar.

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, MANO, MAQUINA, camara, texto } from "../config";
import { partida } from "../juego";
import { carta, dibujarBandeja, MEDIDAS_CARTA } from "../ui/Bandeja";
import { ajuste } from "../motor/ajustes";
import { entrar, salir } from "../ui/animar";
import { estilarCamara } from "../ui/estilo";
import { Pelicula } from "../ui/pelicula";
import { velo } from "../ui/velo";

const HOJA = { x: 40, y: 24, ancho: ANCHO - 80, alto: 320 };
const LISTA = { x: HOJA.x + 18, ancho: 250 };
const DER = HOJA.x + 300;
const BANDEJA_Y = 360;
const FALLO = "pensar_fallo";

type Hueco = "respuesta" | "prueba";

export class Pensar extends Phaser.Scene {
  private elegida: string | null = null;
  private respuesta: string | null = null;
  private prueba: string | null = null;
  private hueco: Hueco = "respuesta";
  private aviso = "";
  private resueltaAhora: string | null = null;
  private todo!: Phaser.GameObjects.Container;

  constructor() {
    super("pensar");
  }

  init(datos: { pregunta?: string }) {
    const posits = partida.estado.posits;
    const sinResolver = (id: string) => !partida.estado.resueltas[id];
    const abierta = posits.find(sinResolver);
    // Una pregunta obligatoria sin resolver va antes que cualquier otra.
    const obligatoria = posits.find((id) => partida.datos.posits[id].obligatoria && sinResolver(id));
    this.elegida = obligatoria ?? datos.pregunta ?? abierta ?? posits[0] ?? null;
    this.resueltaAhora = null;
    this.limpiar();
  }

  create() {
    camara(this);
    // Tapa todo lo de detrás; esta hoja solo se cierra con su botón o Escape.
    velo(this, 0.6);
    this.input.keyboard?.on("keydown-ESC", () => !this.bloqueada() && this.cerrar());
    this.todo = this.add.container();
    this.dibujar();
    // Con el mismo estilo que el resto del juego (tramado y grano).
    new Pelicula(this, 50, true, "peli", ajuste("peli.granoOscuro"));
    estilarCamara(this.cameras.main);
    entrar(this);
  }

  /** Una pregunta obligatoria sin resolver: no se puede salir ni cambiar de pregunta. */
  private bloqueada() {
    const p = this.elegida ? partida.datos.posits[this.elegida] : null;
    return !!p?.obligatoria && !partida.estado.resueltas[this.elegida!];
  }

  private limpiar() {
    this.respuesta = null;
    this.prueba = null;
    this.aviso = "";
    const p = this.elegida ? partida.datos.posits[this.elegida] : null;
    this.hueco = p?.opciones ? "prueba" : "respuesta";
  }

  private dibujar() {
    this.todo.removeAll(true);
    const g = this.add.graphics();
    g.fillStyle(COLOR.papel).fillRect(HOJA.x, HOJA.y, HOJA.ancho, HOJA.alto);
    g.fillStyle(COLOR.papelOscuro).fillRect(HOJA.x, HOJA.y, LISTA.ancho + 36, HOJA.alto);
    this.todo.add(g);

    this.dibujarLista();
    this.dibujarPregunta();

    if (!this.bloqueada()) {
      const luego = texto(this, HOJA.x + HOJA.ancho - 16, HOJA.y + HOJA.alto - 14, "Lo pienso luego", {
        fontSize: "13px", color: COLOR.tinta, backgroundColor: "#d9cfb6", padding: { x: 10, y: 4 },
      }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).on("pointerup", () => this.cerrar());
      this.todo.add(luego);
    }

    const resuelta = this.elegida ? partida.estado.resueltas[this.elegida] : null;
    dibujarBandeja(this, this.todo, {
      y: BANDEJA_Y,
      activa: !!this.elegida && !resuelta,
      marcada: (id) => id === this.respuesta || id === this.prueba,
      elegir: (id) => this.poner(id),
      redibujar: () => this.dibujar(),
    });
  }

  private dibujarLista() {
    this.todo.add(texto(this, LISTA.x, HOJA.y + 16, "PREGUNTAS", { fontSize: "11px", color: "#6b5f4c", fontStyle: "bold" }));
    let y = HOJA.y + 38;
    for (const id of partida.estado.posits) {
      const p = partida.datos.posits[id];
      const hecha = !!partida.estado.resueltas[id];
      const t = texto(this, LISTA.x + 14, y, p.pregunta, {
        fontSize: "14px",
        color: COLOR.tinta,
        fontStyle: id === this.elegida ? "bold" : "normal",
        wordWrap: { width: LISTA.ancho - 14 },
      }).setInteractive({ useHandCursor: !this.bloqueada() }).on("pointerup", () => {
        if (this.bloqueada()) return;
        this.elegida = id;
        this.limpiar();
        this.dibujar();
      });
      this.todo.add(t);
      this.todo.add(texto(this, LISTA.x, y, hecha ? "✓" : "·", { fontSize: "14px", color: COLOR.tinta }));
      y += t.height + 10;
    }
    if (!partida.estado.posits.length) {
      this.todo.add(texto(this, LISTA.x, y, "Nada que pensar todavía.", { fontSize: "14px", color: COLOR.tinta, fontStyle: "italic" }));
    }
  }

  private dibujarPregunta() {
    if (!this.elegida) return;
    const p = partida.datos.posits[this.elegida];
    const resuelta = partida.estado.resueltas[this.elegida];
    this.todo.add(texto(this, DER, HOJA.y + 18, p.pregunta, {
      fontSize: "21px", color: COLOR.tinta, fontStyle: "bold", wordWrap: { width: HOJA.ancho - 320 },
    }));

    const respuesta = resuelta?.respuesta ?? this.respuesta;
    const prueba = resuelta?.prueba ?? this.prueba;
    const yHuecos = HOJA.y + 96;
    this.etiqueta(DER, yHuecos - 22, "RESPUESTA");
    if (p.opciones) {
      p.opciones.forEach((op, i) => {
        const marcada = op === respuesta;
        const b = texto(this, DER + i * 70, yHuecos, op, {
          fontSize: "16px",
          color: marcada ? COLOR.texto : COLOR.tinta,
          backgroundColor: marcada ? "#1d1a16" : "#d9cfb6",
          padding: { x: 14, y: 8 },
        });
        if (!resuelta) {
          b.setInteractive({ useHandCursor: true }).on("pointerup", () => {
            this.respuesta = op;
            this.aviso = "";
            this.dibujar();
          });
        }
        this.todo.add(b);
      });
    } else {
      this.dibujarHueco(DER, yHuecos, "respuesta", respuesta, !!resuelta);
    }

    const xPrueba = DER + 190;
    this.todo.add(texto(this, xPrueba - 50, yHuecos + 16, "porque", { fontSize: "14px", color: "#6b5f4c", fontStyle: "italic" }));
    this.etiqueta(xPrueba, yHuecos - 22, "PRUEBA");
    this.dibujarHueco(xPrueba, yHuecos, "prueba", prueba, !!resuelta);

    const yAbajo = yHuecos + MEDIDAS_CARTA.alto + 24;
    if (resuelta) {
      this.todo.add(texto(this, DER, yAbajo, p.conclusion ?? "", {
        fontFamily: MAQUINA, fontSize: "15px", color: COLOR.tinta, wordWrap: { width: HOJA.ancho - 340 },
      }));
      return;
    }

    if (respuesta && prueba) {
      this.todo.add(texto(this, xPrueba + MEDIDAS_CARTA.ancho + 30, yHuecos + 14, "Concluir", {
        fontSize: "16px", color: COLOR.texto, backgroundColor: "#1d1a16", padding: { x: 14, y: 8 },
      }).setInteractive({ useHandCursor: true }).on("pointerup", () => this.concluir()));
    }
    if (this.aviso) {
      this.todo.add(texto(this, DER, yAbajo, this.aviso, {
        fontFamily: MANO, fontSize: "26px", color: COLOR.boliPapel, wordWrap: { width: HOJA.ancho - 340 },
      }));
    }
  }

  private etiqueta(x: number, y: number, t: string) {
    this.todo.add(texto(this, x, y, t, { fontSize: "11px", color: "#6b5f4c", fontStyle: "bold" }));
  }

  /** Un hueco para una ficha. El activo se marca; pincharlo lo vacía y lo activa. */
  private dibujarHueco(x: number, y: number, cual: Hueco, id: string | null, fijo: boolean) {
    const { ancho, alto } = MEDIDAS_CARTA;
    const activo = !fijo && this.hueco === cual;
    const marco = this.add.rectangle(x, y, ancho, alto, 0x000000, 0.06).setOrigin(0)
      .setStrokeStyle(activo ? 2 : 1, 0x1d1a16, activo ? 0.9 : 0.35);
    this.todo.add(marco);
    if (id) {
      this.todo.add(carta(this, partida.datos.fichas[id], x, y, { activa: false }));
    } else {
      this.todo.add(texto(this, x + ancho / 2, y + alto / 2, activo ? "elige abajo" : "—", {
        fontSize: "11px", color: "#6b5f4c", fontStyle: "italic",
      }).setOrigin(0.5));
    }
    if (!fijo) {
      // Encima de la carta, para que se pueda pinchar aunque esté llena.
      this.todo.add(this.add.zone(x, y, ancho, alto).setOrigin(0).setInteractive({ useHandCursor: true }).on("pointerup", () => {
        this.hueco = cual;
        if (cual === "respuesta") this.respuesta = null;
        else this.prueba = null;
        this.dibujar();
      }));
    }
  }

  /** Pone la ficha en el hueco activo y pasa al otro si está vacío. */
  private poner(id: string) {
    const p = partida.datos.posits[this.elegida!];
    if (this.hueco === "respuesta" && !p.opciones) {
      this.respuesta = id;
      if (!this.prueba) this.hueco = "prueba";
    } else {
      this.prueba = id;
      if (!this.respuesta && !p.opciones) this.hueco = "respuesta";
    }
    this.aviso = "";
    this.dibujar();
  }

  private concluir() {
    const id = this.elegida!;
    if (partida.concluir(id, this.respuesta!, this.prueba!)) {
      this.resueltaAhora = id;
      this.dibujar();
      // Se queda hasta que el jugador lo haya leído: un clic (o Espacio) cierra.
      texto(this, ANCHO / 2, ALTO - 22, "Pulsa para continuar", { fontSize: "14px", color: "#ffffff99", fontStyle: "italic" }).setOrigin(0.5).setDepth(20);
      this.add.zone(0, 0, ANCHO, ALTO).setOrigin(0).setDepth(19).setInteractive({ useHandCursor: true }).once("pointerup", () => this.cerrar());
      this.input.keyboard?.once("keydown-SPACE", () => this.cerrar());
      return;
    }
    // No se vacía nada: el jugador decide qué cambiar.
    this.aviso = partida.existe(FALLO) ? partida.lineasDe(FALLO).join(" ") : "";
    this.dibujar();
  }

  private cerrar() {
    const resuelta = this.resueltaAhora;
    salir(this, () => partida.eventos.emit("fin-pensar", resuelta));
  }
}
