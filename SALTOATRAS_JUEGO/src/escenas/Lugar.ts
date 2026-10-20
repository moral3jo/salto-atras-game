// Un lugar: el fondo y las cosas que se pueden pinchar. Una cosa se mira (su
// nudo de Ink en la caja de diálogo), es alguien con quien hablar o es una
// salida. Al acabar, lo que ha aparecido o desaparecido lo hace con una
// transición, o se cambia de lugar si Ink lo ha pedido.

import * as Phaser from "phaser";
import { ALTO, ANCHO, camara, texto } from "../config";
import { partida } from "../juego";
import type { Cosa } from "../motor/datos";
import { alCambiarEstilo, imagenDe } from "../motor/estilo";
import { DURACION, aparecer, desaparecer } from "../ui/animar";
import { estilar } from "../ui/estilo";
import { Pelicula, evolucionandoPelicula, evolucionarPelicula, peliculaMezcla } from "../ui/pelicula";
import { Vida } from "../ui/vida";
import { musica } from "../motor/musica";

/** Escenas que se abren encima del lugar: mientras alguna está, no hay rótulo ni mano. */
const ENCIMA = ["dialogo", "conversacion", "decerca", "pensar", "expediente", "panel", "informe", "pausa"];

const DEPURAR = new URLSearchParams(location.search).has("debug");

export class Lugar extends Phaser.Scene {
  /** Lo que se ve ahora, por id de cosa: para saber qué aparece y qué se va. */
  private vistas = new Map<string, Phaser.GameObjects.Container>();
  /** El cuadrado que sigue al ratón con el nombre de lo que hay debajo. */
  private etiqueta!: Phaser.GameObjects.Container;
  private etiquetaTexto!: Phaser.GameObjects.Text;
  private etiquetaFondo!: Phaser.GameObjects.Graphics;
  private estabaBloqueado = false;
  private pelicula?: Pelicula;
  private oscuridad = 0;
  private conArte = false;
  private fondo?: Phaser.GameObjects.Image;
  private provisional?: Phaser.GameObjects.Container;
  private vida?: Vida;
  private entrada: "normal" | "lenta" = "normal";
  /** Un clic que llegó mientras se cerraba un diálogo: se hace en cuanto acaba. */
  private pendiente?: { hacer: () => void; hora: number };

  constructor() {
    super("lugar");
  }

  init(datos: { entrada?: "lenta" }) {
    this.entrada = datos?.entrada ?? "normal";
    this.vistas = new Map();
    this.pendiente = undefined;
    this.vida = this.fondo = this.provisional = this.pelicula = undefined;
    this.oscuridad = 0;
  }

  preload() {
    const { lugar, datos } = partida;
    const nombres = [lugar.fondo && imagenDe(lugar.fondo, datos.imagenes), ...lugar.cosas.map((c) => c.imagen)];
    for (const n of nombres) {
      if (n && datos.imagenes[n] && !this.textures.exists(n)) this.load.image(n, datos.imagenes[n]);
    }
  }

  create() {
    camara(this);
    const lugar = partida.lugar;

    const clave = lugar.fondo ? imagenDe(lugar.fondo, partida.datos.imagenes) : "";
    this.conArte = !!clave && this.textures.exists(clave);
    if (this.conArte) {
      this.fondo = estilar(this.add.image(ANCHO / 2, ALTO / 2, clave).setDepth(-10), "fondo");
      this.ajustarFondo();
      this.ponerVida();
    } else {
      this.provisional = this.fondoProvisional(lugar.nombre);
    }

    this.etiquetaFondo = this.add.graphics();
    this.etiquetaTexto = texto(this, 10, 5, "", { fontSize: "13px", color: "#ecd29a" });
    this.etiqueta = this.add.container(0, 0, [this.etiquetaFondo, this.etiquetaTexto]).setDepth(60).setVisible(false);
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.etiqueta.visible && this.situarEtiqueta(p));

    musica(this, lugar.musica ?? partida.datos.musica?.juego ?? "");
    if (!this.scene.isActive("interfaz")) this.scene.launch("interfaz");
    partida.eventos.on("fin-conversacion", this.alAcabarConversacion, this);
    partida.eventos.on("oscuridad", this.alOscurecer, this);
    const quitarEstilo = alCambiarEstilo(() => this.cambiarEstilo());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      partida.eventos.off("oscuridad", this.alOscurecer, this);
      quitarEstilo();
      partida.eventos.off("fin-conversacion", this.alAcabarConversacion, this);
    });

    this.dibujarCosas(false);
    // Si se entra sin pasar por la llegada (Continuar), la película también evoluciona desde la del menú.
    if (peliculaMezcla.valor < 1 && !evolucionandoPelicula()) evolucionarPelicula(3);
    this.pelicula = new Pelicula(this);
    this.data.set("pelicula", this.pelicula);
    const lenta = this.entrada === "lenta";
    this.cameras.main.fadeIn(lenta ? DURACION.lenta * 1.5 : DURACION.normal);
    if (lugar.al_llegar) this.time.delayedCall(lenta ? DURACION.lenta : 0, () => this.mirar(lugar.al_llegar!));
  }

  /**
   * Una capa de encima (conversación, papel…) pide que el lugar se oscurezca. Se hace aquí, en
   * las imágenes, antes de que pasen por los filtros: así el tramado sigue siendo tramado.
   */
  private alOscurecer(valor: number) {
    if (!this.scene.isActive() && !this.sys.isPaused()) return;
    const proxy = { v: this.oscuridad };
    this.tweens.killTweensOf(proxy);
    this.tweens.add({ targets: proxy, v: valor, duration: DURACION.normal, onUpdate: () => this.aplicarOscuridad(proxy.v) });
  }

  private aplicarOscuridad(v: number) {
    this.oscuridad = v;
    const g = Math.round(255 * (1 - v));
    const color = (g << 16) | (g << 8) | g;
    const tintar = (o: Phaser.GameObjects.Image) => (v > 0.001 ? o.setTint(color) : o.clearTint());
    if (this.fondo) tintar(this.fondo);
    for (const c of this.vistas.values()) c.each((o: Phaser.GameObjects.GameObject) => o.type === "Image" && tintar(o as Phaser.GameObjects.Image));
    this.vida?.oscurecer(v > 0.001 ? color : 0xffffff, 1 - v);
    this.pelicula?.atenuar(1 - v);
  }

  private ponerVida() {
    if (!this.vida) this.vida = new Vida(this, partida.lugar.vida ?? [], () => this.fondo);
    this.vida.construir();
  }

  /** Un fondo de al menos el doble de ancho trae margen alrededor: se centra y se recorta a la vista. */
  private ajustarFondo() {
    const f = this.fondo!;
    if (f.width >= ANCHO * 2) f.setScale(0.5);
    else f.setDisplaySize(ANCHO, ALTO);
  }

  /** Cambia el fondo al del estilo elegido (se carga si hace falta). */
  private cambiarEstilo() {
    const fondo = partida.lugar.fondo;
    if (!fondo) return;
    const clave = imagenDe(fondo, partida.datos.imagenes);
    if (!partida.datos.imagenes[clave]) return;
    const poner = () => {
      if (!this.scene.isActive() || !this.textures.exists(clave)) return;
      if (this.fondo) {
        this.fondo.setTexture(clave);
        this.ajustarFondo();
        this.ponerVida();
      } else {
        // Había un fondo provisional: se cambia por el arte y se redibujan las cosas (sin sus recuadros).
        this.provisional?.destroy();
        this.provisional = undefined;
        this.fondo = estilar(this.add.image(ANCHO / 2, ALTO / 2, clave).setDepth(-10), "fondo");
        this.conArte = true;
        for (const c of this.vistas.values()) c.destroy();
        this.vistas.clear();
        this.dibujarCosas(false);
        this.ajustarFondo();
        this.ponerVida();
      }
    };
    if (this.textures.exists(clave)) return poner();
    this.load.image(clave, partida.datos.imagenes[clave]);
    this.load.once(Phaser.Loader.Events.COMPLETE, poner);
    this.load.start();
  }

  private fondoProvisional(nombre: string) {
    const g = this.add.graphics();
    g.fillStyle(0x4a4038).fillRect(0, 0, ANCHO, ALTO);
    g.fillStyle(0x6b5a48).fillRect(0, 0, ANCHO, ALTO * 0.55);
    g.fillStyle(0x382f28).fillRect(0, ALTO * 0.55, ANCHO, ALTO * 0.45);
    return this.add.container(0, 0, [
      g,
      texto(this, ANCHO / 2, 40, nombre.toUpperCase(), { fontSize: "28px", color: "#ffffff33" }).setOrigin(0.5, 0),
      texto(this, ANCHO / 2, 76, "fondo provisional", { fontSize: "12px", color: "#ffffff33" }).setOrigin(0.5, 0),
    ]);
  }

  /** Pone lo que toca y quita lo que no; con `animar`, lo nuevo aparece y lo viejo se va despacio. */
  private dibujarCosas(animar = true) {
    for (const cosa of partida.lugar.cosas) {
      const esta = this.vistas.get(cosa.id);
      const toca = partida.cumple(cosa.si);
      if (toca && !esta) {
        const c = this.dibujarCosa(cosa);
        this.vistas.set(cosa.id, c);
        if (animar) aparecer(this, c, { desde: { y: 6 }, duracion: DURACION.lenta });
      } else if (!toca && esta) {
        this.vistas.delete(cosa.id);
        esta.each((o: Phaser.GameObjects.GameObject) => o.disableInteractive());
        if (animar) desaparecer(this, esta, { duracion: DURACION.lenta });
        else esta.destroy();
      }
    }
  }

  private dibujarCosa(cosa: Cosa) {
    const [x, y, w, h] = cosa.zona;
    const c = this.add.container();
    if (cosa.imagen && this.textures.exists(cosa.imagen)) {
      // La figura cabe en su zona sin deformarse, de pie sobre el borde de abajo, con una sombra suave.
      const img = estilar(this.add.image(x + w / 2, y + h, cosa.imagen).setOrigin(0.5, 1), "personaje");
      img.setScale(Math.min(w / img.width, h / img.height));
      if (cosa.sombra !== false) {
        c.add(this.add.ellipse(x + w / 2, y + h - Math.max(5, img.displayHeight * 0.035), img.displayWidth * 0.95, Math.max(8, img.displayHeight * 0.06), 0x000000, 0.3));
      }
      if (this.oscuridad > 0.001) img.setTint((Math.round(255 * (1 - this.oscuridad)) * 0x010101) | 0);
      c.add(img);
    } else if (!this.conArte || DEPURAR) {
      // Sin arte, la cosa se ve como un recuadro con su nombre.
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.06).fillRect(x, y, w, h);
      g.lineStyle(1, 0xffffff, 0.35).strokeRect(x, y, w, h);
      c.add(g);
      c.add(texto(this, x + 4, y + 3, cosa.nombre, { fontSize: "10px", color: "#ffffff88", wordWrap: { width: w - 8 } }));
    }

    const zona = this.add.zone(x, y, w, h).setOrigin(0).setInteractive({ useHandCursor: true });
    zona.on("pointerover", () => {
      if (!this.bloqueado()) this.mostrarEtiqueta(cosa.hablar && partida.datos.fichas[cosa.hablar] ? partida.nombre(cosa.hablar) : cosa.nombre);
    });
    zona.on("pointerout", () => this.etiqueta.setVisible(false));
    zona.on("pointerup", () => {
      this.etiqueta.setVisible(false);
      const hacer = () => {
        if (cosa.nudo) this.mirar(cosa.nudo);
        else if (cosa.hablar) this.scene.launch("conversacion", { persona: cosa.hablar });
        else if (cosa.ir) this.irA(cosa.ir);
      };
      // Si justo se está cerrando un diálogo, este clic espera a que acabe: relanzarlo
      // a medias es lo que lo dejaba atascado.
      if (this.scene.isActive("dialogo") || this.scene.isActive("conversacion")) {
        this.pendiente = { hacer, hora: performance.now() };
      } else {
        hacer();
      }
    });
    c.add(zona);
    return c;
  }

  /** ¿Hay algo encima (pensamientos, conversación, un papel…)? Entonces ni rótulo ni mano. */
  private bloqueado() {
    return ENCIMA.some((e) => this.scene.isActive(e));
  }

  /** Mientras hay algo encima, el rótulo se esconde y el cursor es el del juego (el boli, si escribe). */
  update() {
    const bloqueado = this.bloqueado();
    if (bloqueado && !this.estabaBloqueado) {
      this.etiqueta.setVisible(false);
      this.input.manager.canvas.style.cursor = this.input.manager.defaultCursor || "";
    }
    this.estabaBloqueado = bloqueado;
    // La mano solo sale al pasar por una zona si no hay nada encima.
    for (const c of this.vistas.values()) {
      c.each((o: Phaser.GameObjects.GameObject) => {
        if (o.input) o.input.cursor = bloqueado ? "" : "pointer";
      });
    }
  }

  /** Ocre oscuro, con un filo más claro a la izquierda; se hace del ancho de su texto. */
  private mostrarEtiqueta(nombre: string) {
    this.etiquetaTexto.setText(nombre);
    const ancho = this.etiquetaTexto.width + 20;
    const alto = this.etiquetaTexto.height + 10;
    this.etiquetaFondo
      .clear()
      .fillStyle(0x2a1c10, 0.94)
      .fillRect(0, 0, ancho, alto)
      .lineStyle(1, 0xb88a45, 0.9)
      .strokeRect(0.5, 0.5, ancho - 1, alto - 1)
      .fillStyle(0xd0a050, 1)
      .fillRect(0, 0, 3, alto);
    this.etiqueta.setSize(ancho, alto).setVisible(true).setAlpha(0);
    this.situarEtiqueta(this.input.activePointer);
    this.tweens.killTweensOf(this.etiqueta);
    this.tweens.add({ targets: this.etiqueta, alpha: 1, duration: DURACION.rapida });
  }

  /** Junto al puntero (abajo a la derecha); si no cabe, al otro lado. */
  private situarEtiqueta(p: Phaser.Input.Pointer) {
    const ancho = this.etiqueta.width;
    const alto = this.etiqueta.height;
    const x = p.worldX + 16 + ancho > ANCHO - 4 ? p.worldX - 12 - ancho : p.worldX + 16;
    const y = p.worldY + 18 + alto > ALTO - 4 ? p.worldY - 10 - alto : p.worldY + 18;
    this.etiqueta.setPosition(x, y);
  }

  private mirar(nudo: string) {
    this.scene.launch("dialogo", { nudo });
  }

  private alAcabarConversacion() {
    const destino = partida.tomarDestino();
    const pendiente = this.pendiente;
    this.pendiente = undefined;
    if (!destino) {
      this.dibujarCosas();
      partida.guardar();
      // El clic que esperaba, si es reciente (no uno olvidado de hace rato).
      if (pendiente && performance.now() - pendiente.hora < 1500) pendiente.hacer();
      return;
    }
    this.irA(destino);
  }

  private irA(destino: string) {
    this.input.enabled = false;
    this.cameras.main.fadeOut(DURACION.normal, 0, 0, 0);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      partida.irA(destino);
      this.input.enabled = true;
      this.scene.restart();
    });
  }
}
