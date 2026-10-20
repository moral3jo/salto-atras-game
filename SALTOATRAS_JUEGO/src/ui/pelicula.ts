// La capa de "película antigua" sobre un lugar: grano que se mueve, parpadeo de
// luz, rayas de la cinta, motas y pelos, bordes oscuros que respiran y un leve
// temblor del proyector. Va a saltos de fotograma (como el cine), no suave.
// Todo sale de los ajustes `peli.*` (panel F2 → Estilo). Los pensamientos y
// papeles van en otras escenas, encima, y no se ensucian.

import * as Phaser from "phaser";
import { ALTO, ANCHO } from "../config";
import { ajuste, type AjusteId } from "../motor/ajustes";

const FOTOGRAMAS = 8;
const GRANO = { ancho: 640, alto: 360 };

/** Texturas de ruido y de bordes, una sola vez para todo el juego. */
function texturas(escena: Phaser.Scene) {
  if (escena.textures.exists("peli-vineta")) return;
  for (let n = 0; n < FOTOGRAMAS; n++) {
    const t = escena.textures.createCanvas(`peli-grano-${n}`, GRANO.ancho, GRANO.alto)!;
    const d = t.context.createImageData(GRANO.ancho, GRANO.alto);
    for (let i = 0; i < d.data.length; i += 4) {
      const claro = Math.random() < 0.5 ? 255 : 0;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = claro;
      d.data[i + 3] = Math.random() ** 2 * 255;
    }
    t.context.putImageData(d, 0, 0);
    t.refresh();
  }
  const v = escena.textures.createCanvas("peli-vineta", 256, 144)!;
  const c = v.context;
  const g = c.createRadialGradient(128, 72, 20, 128, 72, 150);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, "rgba(10,6,2,0.15)");
  g.addColorStop(1, "rgba(10,6,2,1)");
  c.fillStyle = g;
  c.fillRect(0, 0, 256, 144);
  v.refresh();
}

/**
 * Cuánto de la película es la del juego (1) y cuánto la de los menús (0). La portada es
 * del todo de menú; al empezar, la llegada y el primer lugar evolucionan despacio hacia la
 * del juego, para que el cambio sea un fundido y no un salto.
 */
export const peliculaMezcla = { valor: 1 };
let pararMezcla: (() => void) | undefined;

export function reiniciarPelicula(valor = 0) {
  pararMezcla?.();
  pararMezcla = undefined;
  peliculaMezcla.valor = valor;
}

export const evolucionandoPelicula = () => !!pararMezcla;

/** Lleva la película de menú a la del juego en `segundos`. */
export function evolucionarPelicula(segundos: number) {
  pararMezcla?.();
  const desde = peliculaMezcla.valor;
  const inicio = performance.now();
  let marco = 0;
  const paso = () => {
    const t = Math.min(1, (performance.now() - inicio) / (segundos * 1000));
    peliculaMezcla.valor = desde + (1 - desde) * (t * t * (3 - 2 * t));
    if (t < 1) marco = requestAnimationFrame(paso);
    else pararMezcla = undefined;
  };
  pararMezcla = () => cancelAnimationFrame(marco);
  marco = requestAnimationFrame(paso);
}

export class Pelicula {
  private grano: Phaser.GameObjects.Image;
  private parpadeo: Phaser.GameObjects.Rectangle;
  private bordes: Phaser.GameObjects.Image;
  private marcas: Phaser.GameObjects.Graphics;
  private base: { x: number; y: number };
  /** Con `temblor` false, el proyector no mueve la cámara (en la conversación lo que tiembla es la interfaz). */
  private acumulado = 0;
  /** 0-1: cuánto se ve la capa (el lugar la baja cuando algo lo oscurece). */
  private visible = 1;
  private ultimo = 0;
  private reloj = 0;

  /** `profundidad`: por encima de todo lo del lugar. */
  constructor(
    private escena: Phaser.Scene,
    profundidad = 50,
    private temblor = true,
    /** Qué ajustes lee: "peli" (el juego) o "menu" (portada y pausa, más fuerte). */
    private grupo: "peli" | "menu" = "peli",
    /** Multiplica el grano (en las conversaciones y los papeles, que van sobre fondo oscuro, baja). */
    private escalaGrano = 1,
  ) {
    texturas(escena);
    // Todo nace invisible: hasta el primer fotograma, el grano sería una pantalla de motas al 100 %.
    this.grano = escena.add.image(0, 0, "peli-grano-0").setOrigin(0).setDisplaySize(ANCHO, ALTO).setDepth(profundidad).setAlpha(0);
    this.parpadeo = escena.add.rectangle(0, 0, ANCHO, ALTO, 0x000000, 0).setOrigin(0).setDepth(profundidad);
    this.bordes = escena.add.image(0, 0, "peli-vineta").setOrigin(0).setDisplaySize(ANCHO, ALTO).setDepth(profundidad);
    this.marcas = escena.add.graphics().setDepth(profundidad);
    const cam = escena.cameras.main;
    this.base = { x: cam.scrollX, y: cam.scrollY };

    escena.events.on(Phaser.Scenes.Events.UPDATE, this.actualizar, this);
    escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escena.events.off(Phaser.Scenes.Events.UPDATE, this.actualizar, this);
    });
    // El primer fotograma, ya: sin esperar a que pase el primer intervalo.
    this.actualizar(0, 0);
    this.fotograma();
  }

  /** Cuánto se ve la capa (0-1). */
  atenuar(visible: number) {
    this.visible = visible;
    this.marcas.setAlpha(visible);
  }

  /** La capa no se ve en esta cámara (p. ej. la de la tinta, que va limpia). */
  ocultarEn(camara: Phaser.Cameras.Scene2D.Camera) {
    for (const o of [this.grano, this.parpadeo, this.bordes, this.marcas]) o.cameraFilter |= camara.id;
  }

  /** El valor de un ajuste de la película: el del menú, el del juego o, a medio fundido, una mezcla. */
  private a(nombre: string) {
    const menu = ajuste(`menu.${nombre}` as AjusteId);
    if (this.grupo === "menu") return menu;
    const m = peliculaMezcla.valor;
    const juego = ajuste(`peli.${nombre}` as AjusteId);
    return m >= 1 ? juego : menu * (1 - m) + juego * m;
  }

  private actualizar(_t: number, delta: number) {
    this.reloj += delta;
    this.acumulado += delta;
    // Los bordes respiran de forma continua; lo demás, a saltos de fotograma.
    const respira = this.a("respiracion");
    this.bordes.setAlpha(Math.min(1, this.a("vineta") * (1 + respira * 0.3 * Math.sin(this.reloj / 1300))) * this.visible);

    const paso = 1000 / Math.max(1, this.a("fps"));
    if (this.acumulado < paso) return;
    this.acumulado %= paso;
    this.fotograma();
  }

  private fotograma() {
    const grano = this.a("grano");
    this.grano.setVisible(grano > 0);
    if (grano > 0) {
      let n = this.ultimo;
      while (n === this.ultimo) n = Math.floor(Math.random() * FOTOGRAMAS);
      this.ultimo = n;
      this.grano
        .setTexture(`peli-grano-${n}`)
        .setFlip(Math.random() < 0.5, Math.random() < 0.5)
        .setAlpha(grano * 0.55 * this.escalaGrano * this.visible);
    }

    // Parpadeo: el brillo de la lámpara baja un poco, de golpe, en algunos fotogramas.
    // En los menús el fondo es oscuro: el parpadeo es un destello cálido (oscurecer no se vería).
    const claro = this.grupo === "menu" || peliculaMezcla.valor < 0.5;
    this.parpadeo.setFillStyle(claro ? 0xffe3b0 : 0x000000, this.a("parpadeo") * (claro ? 0.45 : 1) * Math.random() ** 2 * this.visible);

    // Rayas y motas: nacen y mueren en un fotograma.
    const m = this.marcas.clear();
    const rayas = this.a("rayas");
    if (Math.random() < rayas * 0.35) {
      const x = Math.random() * ANCHO;
      const y = Math.random() * ALTO * 0.6;
      m.lineStyle(1, Math.random() < 0.7 ? 0xffffff : 0x000000, 0.15 + Math.random() * 0.3);
      m.lineBetween(x, y, x + (Math.random() - 0.5) * 6, y + 80 + Math.random() * 380);
    }
    const polvo = this.a("polvo");
    const cuantas = Math.floor(polvo * 7 * Math.random());
    for (let i = 0; i < cuantas; i++) {
      const x = Math.random() * ANCHO;
      const y = Math.random() * ALTO;
      const oscura = Math.random() < (claro ? 0.15 : 0.75);
      if (Math.random() < 0.25) {
        // Un pelo: una curva corta.
        m.lineStyle(1, claro ? 0xe9dcc0 : 0x000000, 0.45);
        m.beginPath();
        m.moveTo(x, y);
        m.lineTo(x + 3 + Math.random() * 5, y + (Math.random() - 0.5) * 6);
        m.lineTo(x + 6 + Math.random() * 6, y + (Math.random() - 0.5) * 9);
        m.strokePath();
      } else {
        m.fillStyle(oscura ? 0x000000 : 0xffffff, 0.25 + Math.random() * 0.4);
        m.fillCircle(x, y, 0.5 + Math.random() * 1.4);
      }
    }

    // El proyector tiembla un poco.
    if (!this.temblor) return;
    const b = this.a("balanceo");
    this.escena.cameras.main.setScroll(this.base.x + (Math.random() - 0.5) * 2 * b, this.base.y + (Math.random() - 0.5) * 2 * b);
  }
}
