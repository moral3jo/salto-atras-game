// Los pensamientos de Martínez: tinta azul a mano, escrita letra a letra sobre
// la escena, algo torcida, como en el margen de su libreta. Los pensamientos
// seguidos se apilan hacia abajo como renglones (lo escrito no se mueve; lo de
// antes se apaga un poco). Si uno nuevo no cabe antes del límite, lo de antes
// se borra y se vuelve a empezar arriba.
//
// Un BLOQUE son varios pensamientos seguidos que se escriben solos, uno tras
// otro, casi sin pausa: nadie tiene que pinchar para que avancen. NO se pueden
// saltar ni rellenar con un clic: los tachados y subrayados son parte del juego.
// Al acabar parpadea una marca de tinta tras la última línea ("ya está todo").
//
// Cada renglón tiene su vida: solo empieza a apagarse cuando lleva un rato
// entero a la vista y ya hay otro más nuevo. Nunca antes (si se rellena de
// golpe, todo se ve claro).
//
// Marcas (en Ink):
//   ~~así~~      se escribe y luego se tacha (y el texto sigue al lado)
//   _así_        se subraya con un trazo ondulado
//   (así)        si la línea empieza por "(", es un aparte: más pequeño

import * as Phaser from "phaser";
import { MANO, PENSAMIENTOS, TINTA, ZOOM } from "../config";
import { ajuste } from "../motor/ajustes";
import { DURACION, aparecer } from "./animar";

/** Hueco a la derecha de cada palabra: esta letra sobresale de su caja y, sin él, se corta el último trazo. */
const RELLENO_DER = 10;

interface Palabra {
  texto: string;
  tachado: boolean;
  subrayado: boolean;
  /** Trozo marcado al que pertenece (todo él se tacha o subraya de una vez); -1 si ninguno. */
  grupo: number;
  objeto: Phaser.GameObjects.Text;
}

/** Trocea una línea en palabras con sus marcas. */
function trocear(linea: string) {
  const piezas: Omit<Palabra, "objeto">[] = [];
  let grupos = 0;
  for (const parte of linea.split(/(~~[^~]+~~|_[^_]+_)/)) {
    if (!parte) continue;
    const tachado = parte.startsWith("~~");
    const subrayado = !tachado && parte.startsWith("_") && parte.endsWith("_");
    const limpio = tachado ? parte.slice(2, -2) : subrayado ? parte.slice(1, -1) : parte;
    const grupo = tachado || subrayado ? grupos++ : -1;
    for (const palabra of limpio.split(/\s+/)) if (palabra) piezas.push({ texto: palabra, tachado, subrayado, grupo });
  }
  return piezas;
}

export class Boli {
  readonly contenedor: Phaser.GameObjects.Container;
  private renglones: Phaser.GameObjects.Container[] = [];
  private alto = 0;
  private palabras: Palabra[] = [];
  private escritas = 0;
  private letras = 0;
  private reloj?: Phaser.Time.TimerEvent;
  /** La pausa antes (y durante) un tachado: el boli espera. */
  private espera?: Phaser.Time.TimerEvent;
  /** Grupos ya tachados o subrayados en el renglón que se escribe. */
  private adornados = new Set<number>();
  private alAcabar?: () => void;
  /** Grosor del contorno de las palabras que se están escribiendo. */
  private grosor = 0;

  /**
   * Los renglones empiezan en (x, y) y crecen hacia abajo sin pasar de `limite`.
   */
  constructor(
    private escena: Phaser.Scene,
    x: number,
    private y: number,
    private ancho: number,
    private limite: number,
    /** Un borde oscuro fino, para que se lea sobre cualquier imagen. */
    private contorno = false,
  ) {
    this.contenedor = escena.add.container(x, y).setAngle(ajuste("boli.inclinacion"));
  }

  /**
   * Un boli en la zona de pensamientos, que es la misma en todas las escenas (al
   * mirar, en una conversación y con un papel abierto). Solo se puede hacer más
   * estrecha, no moverla.
   */
  static enZona(escena: Phaser.Scene, opciones: { ancho?: number; contorno?: boolean } = {}) {
    return new Boli(
      escena,
      PENSAMIENTOS.x,
      PENSAMIENTOS.y,
      opciones.ancho ?? PENSAMIENTOS.ancho,
      PENSAMIENTOS.y + PENSAMIENTOS.alto,
      opciones.contorno,
    );
  }

  get escribiendo() {
    return !!this.reloj;
  }

  // ---- Bloques: varios pensamientos que se escriben solos ----

  private cola: string[] = [];
  private lectura?: Phaser.Time.TimerEvent;
  private enBloque = false;
  private saltando = false;
  private alAcabarBloque?: () => void;

  /** ¿Queda algo por escribir de un bloque? (Una vez escrito todo, solo falta el clic.) */
  get pendiente() {
    return this.enBloque && (!!this.reloj || this.cola.length > 0);
  }

  /** Escribe los pensamientos uno tras otro, casi sin pausa y sin clics. `alAcabar` se llama al terminar el último. */
  bloque(lineas: string[], alAcabar?: () => void) {
    this.soltarBloque();
    this.cola = [...lineas];
    this.enBloque = true;
    this.alAcabarBloque = alAcabar;
    this.siguienteDelBloque();
  }

  private siguienteDelBloque() {
    const linea = this.cola.shift();
    if (linea === undefined) return this.acabarBloque();
    this.escribir(linea, () => {
      if (this.saltando) return;
      // La última no espera: ya está todo escrito.
      if (!this.cola.length) return this.acabarBloque();
      this.lectura = this.escena.time.delayedCall(ajuste("boli.pausaEntreLineas"), () => {
        this.lectura = undefined;
        this.siguienteDelBloque();
      });
    });
  }

  private acabarBloque() {
    this.enBloque = false;
    this.mostrarFin();
    const luego = this.alAcabarBloque;
    this.alAcabarBloque = undefined;
    luego?.();
  }

  /** Olvida lo que quedaba de un bloque, sin avisar a nadie. */
  private soltarBloque() {
    this.lectura?.remove();
    this.lectura = undefined;
    this.cola = [];
    this.enBloque = false;
    this.alAcabarBloque = undefined;
  }

  // ---- La marca de "ya está todo" ----

  private marca?: Phaser.GameObjects.Graphics;

  /** Un punto de tinta que parpadea tras la última línea: todo escrito, se puede cerrar. */
  private mostrarFin() {
    this.quitarMarca();
    const renglon = this.renglones.at(-1);
    const ultima = this.palabras.at(-1)?.objeto;
    if (!renglon || !ultima) return;
    const g = this.escena.add.graphics({
      x: ultima.x + ultima.width - RELLENO_DER - this.grosor + 1,
      y: ultima.y + ultima.height * 0.72,
    });
    // Un punto pequeño, como el que se escribe a boli al final de una frase.
    g.fillStyle(Phaser.Display.Color.HexStringToColor(TINTA.texto).color, 1).fillEllipse(0, 0, 3.6, 3.2);
    renglon.add(g);
    this.marca = g;
    this.escena.tweens.add({ targets: g, alpha: 0.15, duration: ajuste("boli.parpadeoPunto"), yoyo: true, repeat: -1, ease: "Sine.InOut" });
  }

  private quitarMarca() {
    if (!this.marca) return;
    this.escena.tweens.killTweensOf(this.marca);
    this.marca.destroy();
    this.marca = undefined;
  }

  // ---- La vida de cada renglón ----

  /** Al empezar un renglón nuevo, apaga los viejos que ya llevan su tiempo a la vista. */
  private atenuarLosViejos() {
    const ahora = this.escena.time.now;
    for (const r of this.renglones) {
      const desde = r.getData("completado") as number | undefined;
      if (desde !== undefined && ahora - desde >= ajuste("boli.vidaLinea")) this.atenuar(r);
    }
  }

  private atenuar(r: Phaser.GameObjects.Container) {
    if (!r.active || r.getData("atenuado")) return;
    r.setData("atenuado", true);
    this.escena.tweens.add({ targets: r, alpha: ajuste("boli.opacidadApagado"), duration: ajuste("boli.duracionApagado") });
  }

  /** Escribe un renglón nuevo debajo de los anteriores. */
  escribir(linea: string, alAcabar?: () => void) {
    this.completar();
    this.quitarMarca();
    this.alAcabar = alAcabar;
    const aparte = linea.startsWith("(");
    const tam = aparte ? ajuste("boli.tamanoAparte") : ajuste("boli.tamanoNormal");
    const renglon = this.escena.add.container(aparte ? 18 : 0, this.alto);

    // Coloca las palabras (con su texto completo, para medir) y luego las vacía.
    // El contorno ensancha cada palabra (Phaser lo suma al lienzo): se descuenta al colocarlas.
    const grosor = Math.max(TINTA.grosor, this.contorno ? 3 : 0);
    this.grosor = grosor;
    const estilo: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: MANO,
      fontSize: `${tam}px`,
      color: aparte ? TINTA.suave : TINTA.texto,
      resolution: ZOOM,
      // Con brillo, la sombra es un resplandor del color de la tinta; sin él, una sombra suave.
      shadow: TINTA.brillo > 0
        ? { offsetX: 0, offsetY: 0, color: TINTA.brilloColor, blur: TINTA.brillo, fill: true, stroke: true }
        : { offsetX: 0, offsetY: 1, color: "#000000", blur: 6, fill: true },
      padding: { left: 2, right: RELLENO_DER, top: 4, bottom: 4 },
      ...(grosor > 0 ? { stroke: TINTA.contorno, strokeThickness: grosor } : {}),
    };
    const espacio = tam * 0.28;
    let px = 0;
    let py = 0;
    this.palabras = trocear(linea).map((p) => {
      const t = this.escena.add.text(0, 0, p.texto, estilo);
      const visible = t.width - RELLENO_DER - grosor;
      if (px > 0 && px + visible > this.ancho) {
        px = 0;
        py += tam * ajuste("boli.interlineado");
      }
      t.setPosition(px - grosor / 2, py - grosor / 2);
      px += visible + espacio;
      renglon.add(t);
      return { ...p, objeto: t };
    });
    for (const p of this.palabras) p.objeto.setText("");

    const altoRenglon = py + tam * ajuste("boli.interlineado") + 4;
    // Si no cabe, lo de antes se va y se empieza otra vez arriba.
    const empiezaDeNuevo = this.renglones.length > 0 && this.y + this.alto + altoRenglon > this.limite;
    if (empiezaDeNuevo) this.vaciar();
    renglon.y = this.alto;
    this.alto += altoRenglon;
    this.contenedor.add(renglon);

    // Lo de antes se apaga solo si ya lleva su tiempo a la vista; si no, nada.
    this.atenuarLosViejos();
    this.renglones.push(renglon);
    aparecer(this.escena, renglon, { desde: { x: -4 }, duracion: DURACION.rapida, retraso: empiezaDeNuevo ? DURACION.normal : 0 });

    this.escritas = 0;
    this.letras = 0;
    this.adornados.clear();
    this.reloj = this.escena.time.addEvent({
      delay: 1000 / ajuste("boli.letrasPorSegundo"),
      loop: true,
      callback: () => this.trazo(),
    });
  }

  /** Una letra más. Al acabar un trozo marcado: si es tachado, pausa, se tacha y sigue. */
  private trazo() {
    const p = this.palabras[this.escritas];
    if (!p) return this.terminar();
    this.letras++;
    p.objeto.setText(p.texto.slice(0, this.letras));
    if (this.letras < p.texto.length) return;
    this.escritas++;
    this.letras = 0;

    const finDeGrupo = p.grupo >= 0 && this.palabras[this.escritas]?.grupo !== p.grupo;
    if (!finDeGrupo) return;
    // Tachar: lo escribe, se lo queda mirando, lo tacha y sigue.
    // Subrayar: lo escribe, lo subraya y se queda un momento para marcarlo con fuerza.
    const antes = p.tachado ? ajuste("boli.pausaTachar") : 0;
    const despues = DURACION.normal + (p.tachado ? 120 : ajuste("boli.pausaSubrayar"));
    this.reloj!.paused = true;
    this.espera = this.escena.time.delayedCall(antes, () => {
      this.adornar(p.grupo, true);
      this.espera = this.escena.time.delayedCall(despues, () => {
        this.espera = undefined;
        if (this.reloj) this.reloj.paused = false;
      });
    });
  }

  /** Tacha o subraya un trozo entero (espacios incluidos), una línea por fila. */
  private adornar(grupo: number, animar: boolean) {
    if (this.adornados.has(grupo)) return;
    this.adornados.add(grupo);
    const palabras = this.palabras.filter((p) => p.grupo === grupo);
    const tachado = palabras[0].tachado;
    const filas = new Map<number, Phaser.GameObjects.Text[]>();
    for (const p of palabras) filas.set(p.objeto.y, [...(filas.get(p.objeto.y) ?? []), p.objeto]);

    for (const [y, textos] of filas) {
      const x0 = Math.min(...textos.map((t) => t.x));
      const x1 = Math.max(...textos.map((t) => t.x + t.width - RELLENO_DER - this.grosor));
      const alto = textos[0].height;
      const ancho = x1 - x0 - 4;
      const g = this.escena.add.graphics({ x: x0 + 2, y });
      g.lineStyle(tachado ? 2.5 : 1.8, Phaser.Display.Color.HexStringToColor(TINTA.texto).color, 0.95);
      if (tachado) {
        // Un trazo algo inclinado, como hecho con prisa.
        const yMedio = alto * 0.55;
        g.lineBetween(0, yMedio + 1, ancho, yMedio - 2);
      } else {
        const yBase = alto - 4;
        g.beginPath();
        g.moveTo(0, yBase);
        for (let i = 0; i <= ancho; i += 4) g.lineTo(i, yBase + Math.sin(i / 3) * 1.5);
        g.strokePath();
      }
      (textos[0].parentContainer ?? this.contenedor).add(g);
      if (animar) {
        g.setScale(0, 1);
        this.escena.tweens.add({ targets: g, scaleX: 1, duration: DURACION.normal, ease: "Cubic.Out" });
      }
    }
  }

  /** Si se está escribiendo, lo termina de golpe. Devuelve si lo estaba. */
  completar(): boolean {
    if (!this.reloj) return false;
    this.espera?.remove();
    this.espera = undefined;
    for (const p of this.palabras) p.objeto.setText(p.texto);
    for (const p of this.palabras) if (p.grupo >= 0) this.adornar(p.grupo, false);
    this.escritas = this.palabras.length;
    this.terminar();
    return true;
  }

  private terminar() {
    this.reloj?.remove();
    this.reloj = undefined;
    // Este renglón ya está entero a la vista: empieza su vida. Pasado su tiempo,
    // se apaga si ya hay otro más nuevo (el último nunca se apaga).
    const r = this.renglones.at(-1);
    if (r) {
      r.setData("completado", this.escena.time.now);
      this.escena.time.delayedCall(ajuste("boli.vidaLinea"), () => {
        if (r !== this.renglones.at(-1)) this.atenuar(r);
      });
    }
    const luego = this.alAcabar;
    this.alAcabar = undefined;
    luego?.();
  }

  /** Borra todo lo escrito (y lo que quedara de un bloque), con un fundido. */
  borrar() {
    this.soltarBloque();
    this.saltando = true;
    this.vaciar();
    this.saltando = false;
  }

  /** Borra lo escrito sin tocar el bloque en curso (para empezar de nuevo arriba). */
  private vaciar() {
    this.completar();
    this.quitarMarca();
    if (!this.renglones.length) return;
    const viejos = this.renglones;
    this.renglones = [];
    this.alto = 0;
    this.escena.tweens.add({
      targets: viejos,
      alpha: 0,
      duration: DURACION.normal,
      onComplete: () => viejos.forEach((r) => r.destroy()),
    });
  }
}
