// Hablar con alguien. El cuerpo grande a la derecha, el bocadillo arriba a la
// izquierda, los pensamientos de Martínez un poco por debajo del bocadillo
// (sin llegar nunca a la bandeja) y, abajo, la bandeja con todo lo que sabe Martínez por pestañas:
// pinchar una ficha es preguntar por ella (la carta se ve junto al bocadillo,
// así que no hace falta escribir la pregunta). En Ink, la conversación es el nudo
// con_<persona> y cada tema una subsección con el id de la ficha
// (ver docs/FORMATO.md).

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, CURSOR_BOLI, PENSAMIENTOS, camara, texto } from "../config";
import { partida } from "../juego";
import { ajuste } from "../motor/ajustes";
import { conversacion } from "../motor/datos";
import { alCambiarEstilo, esVariante, estiloActual, imagenDe } from "../motor/estilo";
import { centroDeCuerpo } from "../ui/anclaje";
import { estilar } from "../ui/estilo";
import { velo } from "../ui/velo";
import { Pelicula } from "../ui/pelicula";
import { leerBloque, leerLinea, type Paso } from "../motor/lineas";
import type { Aviso } from "../motor/partida";
import { carta, dibujarBandeja } from "../ui/Bandeja";
import { verDeCerca } from "./DeCerca";
import { DURACION, aparecer, entrar, salir } from "../ui/animar";
import { Boli } from "../ui/Boli";


const CUERPO = { x: ANCHO - 360, y: 40, ancho: 320, alto: 320 };
const BOCADILLO = { x: 40, y: 40, ancho: 530 };
const BANDEJA = { y: 360 };

/** pensando: Ink ha pedido pensar algo y la hoja de pensar está abierta encima. */
/** mirando: hay un papel de cerca abierto encima. */
type Modo = "hablando" | "eligiendo" | "temas" | "pensando" | "mirando";

export class Conversacion extends Phaser.Scene {
  private persona!: string;
  private modo: Modo = "hablando";
  /** Lo leído de Ink que falta por enseñar: líneas y papeles de cerca. */
  private cola: Paso[] = [];
  /** Líneas de "repetir" que van delante de la primera respuesta de la persona. */
  private repeticion: string[] | null = null;
  /** La ficha por la que se está preguntando: se ve junto al bocadillo mientras contestan. */
  private tema: string | null = null;
  private completa = "";
  private escribiendo?: Phaser.Time.TimerEvent;

  private cuerpo!: Phaser.GameObjects.Container;
  private bocadillo!: Phaser.GameObjects.Container;
  private bandeja!: Phaser.GameObjects.Container;

  constructor() {
    super("conversacion");
  }

  init(datos: { persona: string }) {
    this.persona = datos.persona;
    this.cola = [];
    this.repeticion = null;
    this.tema = null;
    this.avisosBloque = [];
  }

  preload() {
    const { imagenes, fichas } = partida.datos;
    const base = fichas[this.persona]?.cuerpo;
    const nombres = Object.keys(imagenes).filter((n) => base && (n === base || n.startsWith(base + "-")) && !esVariante(n));
    // Con un estilo elegido, también las imágenes de ese estilo.
    if (base && estiloActual()) {
      nombres.push(...Object.keys(imagenes).filter((n) => n.startsWith(base + "-") && n.includes(`-${estiloActual()}-`)));
    }
    for (const f of Object.values(fichas)) if (f.icono && imagenes[f.icono]) nombres.push(f.icono);
    // Las personas sin icono se ven en su carta con la cabeza de su cuerpo.
    for (const f of Object.values(fichas)) if (f.tipo === "persona" && !f.icono && f.cuerpo && imagenes[f.cuerpo]) nombres.push(f.cuerpo);
    for (const n of new Set(nombres)) if (!this.textures.exists(n)) this.load.image(n, imagenes[n]);
  }

  create() {
    camara(this);
    velo(this, 0.75).on("pointerup", () => this.pulsar());
    this.input.keyboard?.on("keydown-SPACE", () => this.pulsar());
    this.input.keyboard?.on("keydown-ENTER", () => this.pulsar());
    this.input.keyboard?.on("keydown-ESC", () => this.modo === "temas" && this.cerrar());

    this.cuerpo = this.add.container(CUERPO.x, CUERPO.y);
    this.bocadillo = this.add.container();
    this.bandeja = this.add.container();
    // Más estrecho que el bocadillo: la carta del tema asoma por su esquina de abajo.
    // La misma zona de pensamientos que en todas partes; solo más estrecha para no pisar a la persona.
    this.boli = Boli.enZona(this, { ancho: Math.min(PENSAMIENTOS.ancho, CUERPO.x + 50 - PENSAMIENTOS.x) });
    // La película cubre el fondo y a la persona (para que se fundan); el bocadillo, la
    // bandeja y los pensamientos van encima, limpios.
    new Pelicula(this, 10, false, "peli", ajuste("peli.granoOscuro"));
    this.bocadillo.setDepth(20);
    this.bandeja.setDepth(20);
    this.boli.contenedor.setDepth(30);
    this.ponerPose();
    entrar(this);
    aparecer(this, this.cuerpo, { desde: { x: 30 }, duracion: DURACION.lenta / 2 });
    this.quienHabla = null;

    partida.eventos.on("fin-pensar", this.alPensar, this);
    const quitarEstilo = alCambiarEstilo(() => this.cambiarEstilo());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      quitarEstilo();
      partida.eventos.off("fin-pensar", this.alPensar, this);
      this.game.input.setDefaultCursor("");
    });

    partida.conocer(this.persona);
    partida.entrarEn(conversacion(this.persona));
    this.hablar();
  }

  // ---- El hilo de la conversación ----

  private hablar() {
    this.modo = "hablando";
    this.dibujarBandeja();
    this.siguiente();
  }

  private pulsar() {
    // Los pensamientos no se saltan: mientras se escriben, un clic no hace nada.
    // Un clic sobre una frase hablada la completa; avanzar, solo si se está hablando.
    if (this.boli.pendiente) return;
    if (this.escribiendo) {
      this.escribiendo.remove();
      this.escribiendo = undefined;
      this.bocadilloTexto?.setText(this.completa);
      return;
    }
    if (this.modo === "hablando") this.siguiente();
  }

  /** Lee de Ink hasta tener algo que enseñar (una línea o un papel). false si no queda nada. */
  private leer(): boolean {
    const h = partida.historia;
    while (!this.cola.length && h.canContinue) {
      const linea = (h.Continue() ?? "").trim();
      // Si Ink pidió ver un papel, va antes que la línea que salió con él; los
      // pensamientos que le siguen se escriben sobre él, y lo demás, al cerrarlo.
      const papel = partida.tomarVer();
      // Una línea vacía no tiene nada que enseñar: sus avisos esperan a la siguiente.
      if (!linea && !papel) continue;
      // Los avisos se atan a lo que se va a mostrar: salen cuando el jugador se entera.
      const avisos = partida.tomarAvisos();
      if (papel) {
        const bloque = leerBloque(linea, avisos);
        this.cola.push({ ver: papel, pensamientos: bloque.pensamientos, avisos: bloque.avisos });
        this.encolarResto(bloque.resto);
        continue;
      }
      if (!leerLinea(linea).quien) {
        // Pensamientos seguidos: un solo paso, que se escribe solo.
        const bloque = leerBloque(linea, avisos);
        this.cola.push({ pensar: bloque.pensamientos, avisos: bloque.avisos });
        this.encolarResto(bloque.resto);
        continue;
      }
      this.encolar(linea, avisos);
    }
    return this.cola.length > 0;
  }

  /** Una línea de alguien hablando; si toca, antes va el "como ya le dije…". */
  private encolar(linea: string, avisos?: Aviso[]) {
    if (this.repeticion && this.esDeLaPersona(linea)) {
      this.cola.push(...this.repeticion.map((l) => ({ linea: l })));
      this.repeticion = null;
    }
    this.cola.push({ linea, avisos });
  }

  private encolarResto(resto: Paso[]) {
    for (const p of resto) {
      if ("linea" in p) this.encolar(p.linea, p.avisos);
      else this.cola.push(p);
    }
  }

  /** Avisos del bloque en pantalla: salen cuando se ha leído (o al pasar a lo siguiente). */
  private avisosBloque: Aviso[] = [];

  private soltarAvisosDelBloque() {
    const a = this.avisosBloque;
    this.avisosBloque = [];
    partida.soltarAvisos(a);
  }

  /** Un bloque de pensamientos a boli, bajo el bocadillo: se escribe solo. */
  private pensar(lineas: string[], avisos: Aviso[] = []) {
    this.soltarAvisosDelBloque();
    this.completa = lineas.at(-1) ?? "";
    this.avisosBloque = avisos;
    this.input.setDefaultCursor(CURSOR_BOLI);
    this.boli.bloque(lineas, () => {
      this.input.setDefaultCursor("");
      this.soltarAvisosDelBloque();
    });
  }

  private siguiente(): void {
    if (!this.leer()) return this.acabarRespuesta();
    const paso = this.cola.shift()!;
    if ("ver" in paso) {
      this.modo = "mirando";
      return verDeCerca(
        this,
        paso.ver,
        () => {
          // Ya se ha visto: ahora sí se avisa de lo que se ha añadido.
          partida.soltarAvisos(paso.avisos);
          this.modo = "hablando";
          this.siguiente();
        },
        paso.pensamientos,
      );
    }
    if ("pensar" in paso) {
      // La bandeja espera a que se cierren los pensamientos con un clic: ocupan la
      // zona de abajo y no se pisan.
      return this.pensar(paso.pensar, paso.avisos);
    }
    this.decir(paso.linea);
    partida.soltarAvisos(paso.avisos);
    // Si es lo último y no hay nada que esperar, la bandeja ya se puede usar
    // mientras se lee: no hace falta otro clic.
    if (!this.leer() && !partida.hayPendiente()) this.acabarRespuesta();
  }

  /** No queda nada que decir: opciones, pensar, cortar o volver a los temas. */
  private acabarRespuesta() {
    // Los pensamientos (si quedaban) se van antes de que salga la bandeja.
    this.boli.borrar();
    // Lo que quedara suelto al final de la respuesta también se avisa.
    partida.soltarAvisos(partida.tomarAvisos());
    if (partida.historia.currentChoices.length) return this.elegir();
    this.repeticion = null;
    this.tema = null;
    const pregunta = partida.tomarPensar();
    if (pregunta) {
      this.modo = "pensando";
      this.dibujarBandeja();
      this.scene.launch("pensar", { pregunta });
      return;
    }
    if (partida.tomarCorte()) return this.cerrar();
    this.modo = "temas";
    this.dibujarBandeja();
  }

  /** Al cerrar la hoja de pensar: si se resolvió algo que esta persona comenta, lo dice. */
  private alPensar(resuelta: string | null) {
    const comentario = resuelta && partida.datos.posits[resuelta]?.al_resolver;
    if (comentario && comentario.startsWith(conversacion(this.persona) + ".") && this.modo !== "hablando") {
      partida.entrarEn(comentario);
      return this.hablar();
    }
    if (this.modo === "pensando") {
      this.modo = "temas";
      this.dibujarBandeja();
    }
  }

  private esDeLaPersona(linea: string) {
    const l = leerLinea(linea);
    return !!l.quien && !l.protagonista;
  }

  private preguntar(ficha: string) {
    const nudo = conversacion(this.persona);
    const ruta = partida.respuesta(this.persona, ficha);
    const esSuTema = ruta === `${nudo}.${ficha}`;
    if (esSuTema && partida.yaPreguntado(this.persona, ficha) && partida.existe(`${nudo}.repetir`)) {
      this.repeticion = partida.lineasDe(`${nudo}.repetir`);
    }
    if (esSuTema && !partida.yaPreguntado(this.persona, ficha)) partida.marcarPreguntado(this.persona, ficha);
    else if (!esSuTema && !partida.tocada(this.persona, ficha)) partida.marcarPreguntado(this.persona, `~${ficha}`);
    this.tema = ficha;
    partida.entrarEn(ruta);
    this.hablar();
  }

  private cerrar() {
    this.soltarAvisosDelBloque();
    partida.soltarAvisos(partida.tomarAvisos());
    const parte = partida.tomarGuia();
    salir(this, () => {
      partida.eventos.emit("fin-conversacion");
      if (parte) {
        partida.guia = { parte, persona: this.persona };
        partida.eventos.emit("guia");
      }
    });
  }

  // ---- El bocadillo y el cuerpo ----

  private bocadilloTexto?: Phaser.GameObjects.Text;
  /** Los pensamientos de Martínez, a boli bajo el bocadillo. */
  private boli!: Boli;
  /** Quién dijo la última línea: si cambia, el bocadillo aparece con un "pop". */
  private quienHabla: string | null = null;

  private decir(linea: string) {
    const l = leerLinea(linea);
    const quien = l.quien;
    const dice = l.texto;
    const piensa = !quien;
    const esMartinez = l.protagonista;
    if (piensa) return this.pensar([linea]);
    this.soltarAvisosDelBloque();
    this.boli.borrar();
    if (!esMartinez) this.ponerPose(l.pose);

    // Se puede pinchar otro tema mientras la última línea aún se escribe.
    this.escribiendo?.remove();
    this.bocadillo.removeAll(true);
    const ancho = BOCADILLO.ancho - 40 - (this.tema ? 70 : 0);
    const cuerpo = texto(this, BOCADILLO.x + 20, BOCADILLO.y + (piensa ? 16 : 40), dice, {
      fontSize: "19px",
      color: piensa ? COLOR.pensamiento : esMartinez ? "#cfd8e3" : COLOR.texto,
      fontStyle: piensa ? "italic" : "normal",
      wordWrap: { width: ancho },
      lineSpacing: 5,
    });
    const alto = cuerpo.height + (piensa ? 32 : 56);
    const fondo = this.add.graphics();
    fondo.fillStyle(piensa ? 0x000000 : COLOR.caja, piensa ? 0.45 : 0.92).fillRoundedRect(BOCADILLO.x, BOCADILLO.y, BOCADILLO.ancho, alto, 8);
    if (!piensa && !esMartinez) {
      // El pico del bocadillo apunta al cuerpo.
      const borde = BOCADILLO.x + BOCADILLO.ancho;
      fondo.fillTriangle(borde, BOCADILLO.y + 30, borde + 16, BOCADILLO.y + 42, borde, BOCADILLO.y + 50);
    }
    this.bocadillo.add(fondo);
    if (quien) {
      this.bocadillo.add(texto(this, BOCADILLO.x + 20, BOCADILLO.y + 14, (esMartinez ? quien : partida.nombre(this.persona)).toUpperCase(), {
        fontSize: "13px", color: esMartinez ? "#9fb3c8" : COLOR.nombre, fontStyle: "bold",
      }));
    }
    this.bocadillo.add(cuerpo);
    const habla = quien ?? "";
    if (habla !== this.quienHabla) {
      this.quienHabla = habla;
      this.bocadillo.setAlpha(1).setPosition(0, 0);
      aparecer(this, this.bocadillo, { desde: { y: 6 }, duracion: DURACION.rapida });
    }
    if (this.tema) {
      // La carta que se ha enseñado, en la esquina del bocadillo: es la pregunta.
      const c = carta(this, partida.datos.fichas[this.tema], BOCADILLO.x + BOCADILLO.ancho - 74, BOCADILLO.y + alto - 30, { activa: false });
      this.bocadillo.add(c.setAngle(4));
    }
    this.bocadilloTexto = cuerpo;

    this.completa = dice;
    cuerpo.setText("");
    let n = 0;
    this.escribiendo = this.time.addEvent({
      delay: 1000 / ajuste("dialogo.letrasPorSegundo"),
      repeat: dice.length - 1,
      callback: () => {
        cuerpo.setText(dice.slice(0, ++n));
        if (n >= dice.length) this.escribiendo = undefined;
      },
    });
  }

  /** Dibuja a la persona con una pose: <cuerpo>-<pose>.png, <cuerpo>.png o una silueta. */
  private ponerPose(pose?: string) {
    const ficha = partida.datos.fichas[this.persona];
    const base = ficha?.cuerpo;
    const { imagenes } = partida.datos;
    const conPose = base && pose ? imagenDe(`${base}-${pose}`, imagenes) : null;
    const sola = base ? imagenDe(base, imagenes) : null;
    const clave = conPose && this.textures.exists(conPose) ? conPose : sola && this.textures.exists(sola) ? sola : null;

    const antes = this.cuerpo.getData("pose");
    this.cuerpo.setData("pose", pose ?? "");
    this.cuerpo.removeAll(true);
    if (clave) {
      // Todas las poses con la misma escala (la de la imagen base) y con el centro del cuerpo
      // siempre en el mismo sitio: si no, al cambiar de pose la persona salta de lado.
      const img = estilar(this.add.image(0, ALTO - CUERPO.y, clave), "personaje").setOrigin(0.5, 1);
      const ref = sola && this.textures.exists(sola) ? this.textures.get(sola).getSourceImage() : img;
      img.setScale(Math.min((CUERPO.ancho + 60) / ref.width, (ALTO - CUERPO.y) / ref.height));
      img.x = CUERPO.ancho / 2 + (0.5 - centroDeCuerpo(this, clave)) * img.displayWidth;
      this.cuerpo.add(img);
    } else {
      this.cuerpo.add(this.silueta(ficha ? partida.nombre(ficha.id) : this.persona, pose));
    }
    if (antes !== undefined && antes !== (pose ?? "")) {
      this.tweens.add({ targets: this.cuerpo, y: { from: CUERPO.y + 6, to: CUERPO.y }, duration: 140, ease: "Quad.Out" });
    }
  }

  /** Cambia la imagen de la persona al estilo elegido (se carga si hace falta). */
  private cambiarEstilo() {
    const base = partida.datos.fichas[this.persona]?.cuerpo;
    if (!base) return;
    const { imagenes } = partida.datos;
    const pose = this.cuerpo.getData("pose") || undefined;
    const claves = [imagenDe(base, imagenes), pose ? imagenDe(`${base}-${pose}`, imagenes) : ""].filter((k) => k && imagenes[k]);
    const faltan = claves.filter((k) => !this.textures.exists(k));
    const repintar = () => this.scene.isActive() && this.ponerPose(pose);
    if (!faltan.length) return void repintar();
    for (const k of faltan) this.load.image(k, imagenes[k]);
    this.load.once(Phaser.Loader.Events.COMPLETE, repintar);
    this.load.start();
  }

  private silueta(nombre: string, pose?: string) {
    let semilla = 0;
    for (const c of this.persona) semilla = (semilla * 31 + c.charCodeAt(0)) >>> 0;
    const color = Phaser.Display.Color.HSVToRGB((semilla % 360) / 360, 0.25, 0.55).color;
    const g = this.add.graphics();
    g.fillStyle(color).fillCircle(CUERPO.ancho / 2, 90, 52);
    g.fillRoundedRect(CUERPO.ancho / 2 - 100, 150, 200, ALTO, 40);
    const c = this.add.container(0, 0, [g]);
    c.add(texto(this, CUERPO.ancho / 2, 230, nombre, { fontSize: "14px", color: "#00000099", align: "center", wordWrap: { width: 180 } }).setOrigin(0.5, 0));
    if (pose) c.add(texto(this, CUERPO.ancho / 2, 270, `(${pose})`, { fontSize: "13px", color: "#00000099", fontStyle: "italic" }).setOrigin(0.5, 0));
    return c;
  }

  // ---- La bandeja: temas por pestañas, u opciones de Ink ----

  private dibujarBandeja() {
    const estaba = this.bandeja.length > 0;
    this.bandeja.removeAll(true);
    // Mientras hablan, la bandeja no se ve: solo aparece cuando toca elegir.
    if (this.modo !== "temas" && this.modo !== "eligiendo") return;
    if (!estaba) aparecer(this, this.bandeja.setAlpha(1).setY(0), { desde: { y: 16 } });
    if (this.modo === "eligiendo") {
      const g = this.add.graphics();
      g.fillStyle(0x1a1612, 0.96).fillRect(0, BANDEJA.y, ANCHO, ALTO - BANDEJA.y);
      this.bandeja.add(g);
      return this.dibujarOpciones();
    }
    dibujarBandeja(this, this.bandeja, {
      y: BANDEJA.y,
      activa: true,
      marcada: (id) => partida.tocada(this.persona, id),
      primera: this.persona,
      elegir: (id) => this.preguntar(id),
      redibujar: () => this.dibujarBandeja(),
    });
    const adios = texto(this, ANCHO - 20, BANDEJA.y + 10, "Adiós", {
      fontSize: "14px", color: COLOR.texto, backgroundColor: "#3a2f26", padding: { x: 12, y: 4 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on("pointerup", () => this.cerrar());
    this.bandeja.add(adios);
  }

  private elegir() {
    this.modo = "eligiendo";
    this.dibujarBandeja();
  }

  private dibujarOpciones() {
    const h = partida.historia;
    h.currentChoices.forEach((opcion, i) => {
      const t = texto(this, 30, BANDEJA.y + 18 + i * 30, "— " + opcion.text, { fontSize: "18px", color: COLOR.opcion })
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => t.setColor(COLOR.opcionEncima))
        .on("pointerout", () => t.setColor(COLOR.opcion))
        .on("pointerup", () => {
          h.ChooseChoiceIndex(i);
          this.hablar();
        });
      this.bandeja.add(t);
    });
  }
}
