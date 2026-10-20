// Los objetos de Martínez arriba a la derecha (expediente, panel, pensar,
// informe, mapa), que aparecen cuando Ink los activa, y los avisos de lo que se apunta.
// Por ahora son etiquetas; luego serán dibujos de los objetos.

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, camara, texto } from "../config";
import { partida } from "../juego";
import { ajuste } from "../motor/ajustes";
import { DURACION, aparecer } from "../ui/animar";
import { musica } from "../motor/musica";

const PARTES: { id: string; nombre: string; escena?: string }[] = [
  { id: "expediente", nombre: "Expediente", escena: "expediente" },
  { id: "panel", nombre: "Panel", escena: "panel" },
  { id: "pensar", nombre: "Pensar", escena: "pensar" },
  { id: "informe", nombre: "Informe", escena: "informe" },
  { id: "mapa", nombre: "Mapa" },
];

/** El dedo que señala (SALTOATRAS_ARTE/juego), apuntando a la derecha. */
const DEDO = "ui-flechas-1";

/** Si alguna de estas está abierta, Escape es suyo (cierra eso), no abre la pausa. */
const ENCIMA = ["dialogo", "conversacion", "pensar", "expediente", "panel", "informe", "decerca", "pausa"];

export class Interfaz extends Phaser.Scene {
  private botones!: Phaser.GameObjects.Container;
  private avisos: string[] = [];
  /** Partes ya enseñadas: las que se activan después aparecen con una transición. */
  private vistas = new Set<string>();
  private listo = false;
  private avisando = false;
  private textos = new Map<string, Phaser.GameObjects.Text>();
  private guiaObjetos: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super("interfaz");
  }

  preload() {
    const url = partida.datos.imagenes[DEDO];
    if (url && !this.textures.exists(DEDO)) this.load.image(DEDO, url);
  }

  create() {
    camara(this);
    this.botones = this.add.container();
    this.vistas.clear();
    this.listo = false;
    this.dibujar();
    this.listo = true;
    this.input.keyboard?.on("keydown-ESC", () => {
      if (!ENCIMA.some((k) => this.scene.isActive(k))) this.scene.launch("pausa");
    });

    const ev = partida.eventos;
    const alActivar = () => this.dibujar();
    // Solo lo que se añade: a dónde va (expediente o panel) ya se sabe.
    const alFicha = (id: string) => this.avisar(partida.nombre(id));
    const alPosit = (id: string) => this.avisar(partida.datos.posits[id].pregunta);
    const alResolver = (id: string) => this.avisar(`Resuelto: ${partida.datos.posits[id].pregunta}`);
    // Un aviso con texto libre (lo usa el panel de debug para probarlos).
    const alAviso = (texto: string) => this.avisar(texto);
    const alGuiar = () => this.time.delayedCall(DURACION.lenta, () => this.guiar());
    ev.on("guia", alGuiar);
    const alMusica = (pista: string) => musica(this, pista);
    ev.on("musica", alMusica);
    ev.on("activar", alActivar);
    ev.on("ficha", alFicha);
    ev.on("posit", alPosit);
    ev.on("resuelta", alResolver);
    ev.on("aviso", alAviso);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off("activar", alActivar);
      ev.off("ficha", alFicha);
      ev.off("posit", alPosit);
      ev.off("resuelta", alResolver);
      ev.off("aviso", alAviso);
      ev.off("musica", alMusica);
      ev.off("guia", alGuiar);
    });
  }

  private dibujar() {
    this.botones.removeAll(true);
    this.textos.clear();
    const menu = texto(this, ANCHO - 12, 12, "≡", {
      fontSize: "16px", color: COLOR.texto, backgroundColor: "#00000088", padding: { x: 8, y: 2 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on("pointerup", () => this.scene.launch("pausa"));
    this.botones.add(menu);
    let x = ANCHO - 12 - menu.width - 8;
    for (const parte of [...PARTES].reverse()) {
      if (!partida.activo(parte.id)) continue;
      const b = texto(this, x, 12, parte.nombre, {
        fontSize: "13px",
        color: COLOR.tinta,
        backgroundColor: "#eee6d2",
        padding: { x: 8, y: 4 },
      }).setOrigin(1, 0);
      if (!this.vistas.has(parte.id)) {
        if (this.listo) aparecer(this, b, { desde: { y: -8 }, escala: 0.9 });
        this.vistas.add(parte.id);
      }
      if (parte.escena) {
        b.setInteractive({ useHandCursor: true }).on("pointerup", () => this.scene.launch(parte.escena!));
      }
      this.botones.add(b);
      this.textos.set(parte.id, b);
      x -= b.width + 8;
    }
  }

  /**
   * Guía obligada (guiar() en Ink): un dedo señala la parte que hay que abrir y nada más se
   * puede tocar. Al cerrar esa parte, se sigue la conversación donde estaba.
   */
  private guiar() {
    const guia = partida.guia;
    const parte = PARTES.find((p) => p.id === guia?.parte);
    const boton = guia && this.textos.get(guia.parte);
    if (!guia || !parte?.escena || !boton) {
      partida.guia = null;
      return;
    }
    const cerca = boton.getBounds();
    // Un velo invisible por debajo de los botones se traga los clics de lo de detrás.
    const velo = this.add.zone(0, 0, ANCHO, ALTO).setOrigin(0).setInteractive().setDepth(-5);
    const dedo = this.textures.exists(DEDO)
      ? this.add.image(cerca.centerX, cerca.bottom + 42, DEDO).setAngle(-90).setScale(72 / this.textures.get(DEDO).getSourceImage().width)
      : texto(this, cerca.centerX, cerca.bottom + 20, "▲", { fontSize: "28px", color: COLOR.texto }).setOrigin(0.5);
    dedo.setDepth(5).setAlpha(0);
    this.tweens.add({ targets: dedo, alpha: 1, duration: DURACION.normal });
    this.tweens.add({ targets: dedo, y: dedo.y + 8, duration: 520, yoyo: true, repeat: -1, ease: "Sine.InOut" });
    this.guiaObjetos = [velo, dedo];

    this.scene.get(parte.escena).events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.tweens.killTweensOf(dedo);
      this.guiaObjetos.forEach((o) => o.destroy());
      this.guiaObjetos = [];
      partida.guia = null;
      this.time.delayedCall(DURACION.rapida, () => this.scene.launch("conversacion", { persona: guia.persona }));
    });
  }

  /** Una línea arriba a la izquierda con lo que se acaba de apuntar, de una en una. */
  private avisar(mensaje: string) {
    this.avisos.push(mensaje);
    if (!this.avisando) this.siguienteAviso();
  }

  private siguienteAviso() {
    const mensaje = this.avisos.shift();
    this.avisando = !!mensaje;
    if (!mensaje) return;
    const t = texto(this, ajuste("aviso.x"), ajuste("aviso.y"), "+ " + mensaje, {
      fontSize: `${ajuste("aviso.tamano")}px`,
      color: COLOR.tinta,
      backgroundColor: "#f2df74",
      padding: { x: 8, y: 4 },
    }).setAlpha(0);
    this.tweens.chain({
      targets: t,
      tweens: [
        { alpha: 1, duration: ajuste("aviso.entra") },
        { alpha: 1, duration: ajuste("aviso.dura") },
        { alpha: 0, duration: ajuste("aviso.sale") },
      ],
      onComplete: () => {
        t.destroy();
        this.siguienteAviso();
      },
    });
  }
}
