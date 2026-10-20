// Vida por zonas: pequeños efectos que solo ocurren en un trozo del fondo, para que
// la imagen no esté muerta. Se declaran en el lugar (`vida:` en datos/lugares/*.yaml,
// ver docs/FORMATO.md); el motor no sabe qué hay en la plaza.
//
//   luz     una mancha cálida que respira (el sol bajo)
//   polvo   motas flotando despacio dentro de la zona
//   agua    esa parte de la imagen tiembla rápido (fuentes, charcos)
//   viento  esa parte de la imagen se mece despacio (árboles, ropa tendida)
//
// La intensidad de cada tipo sale de los ajustes `vida.*` (panel F2).

import * as Phaser from "phaser";
import { ajuste } from "../motor/ajustes";
import type { VidaZona } from "../motor/datos";
import { estilar } from "./estilo";

const PROFUNDIDAD = -9;
const AMPLITUD = { agua: 0.0035, viento: 0.0022 };

function texturas(escena: Phaser.Scene) {
  if (escena.textures.exists("vida-luz")) return;
  const luz = escena.textures.createCanvas("vida-luz", 128, 128)!;
  const g = luz.context.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  luz.context.fillStyle = g;
  luz.context.fillRect(0, 0, 128, 128);
  luz.refresh();

  const mota = escena.textures.createCanvas("vida-mota", 16, 16)!;
  const m = mota.context.createRadialGradient(8, 8, 0, 8, 8, 8);
  m.addColorStop(0, "rgba(255,255,255,1)");
  m.addColorStop(1, "rgba(255,255,255,0)");
  mota.context.fillStyle = m;
  mota.context.fillRect(0, 0, 16, 16);
  mota.refresh();

  // Mapas de ondas: ruido suave (celdas gordas estiradas con suavizado), 4 distintos.
  for (let n = 0; n < 4; n++) {
    const t = escena.textures.createCanvas(`vida-ondas-${n}`, 128, 72)!;
    const chico = document.createElement("canvas");
    chico.width = 12;
    chico.height = 7;
    const cc = chico.getContext("2d")!;
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 12; x++) {
        const v = Math.floor(Math.random() * 256);
        cc.fillStyle = `rgb(${v},${v},${v})`;
        cc.fillRect(x, y, 1, 1);
      }
    }
    t.context.imageSmoothingEnabled = true;
    t.context.drawImage(chico, 0, 0, 128, 72);
    t.refresh();
  }
}

interface Temblor {
  tipo: "agua" | "viento";
  imagen: Phaser.GameObjects.Image;
  filtro?: Phaser.Filters.Displacement;
  fase: number;
}

export class Vida {
  private objetos: Phaser.GameObjects.GameObject[] = [];
  private luces: { imagen: Phaser.GameObjects.Image; fase: number }[] = [];
  private motas: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private temblores: Temblor[] = [];
  private reloj = 0;
  private colorOscuro = 0xffffff;
  private cuentaAgua = 0;

  constructor(private escena: Phaser.Scene, private zonas: VidaZona[], private fondo: () => Phaser.GameObjects.Image | undefined) {
    texturas(escena);
    escena.events.on(Phaser.Scenes.Events.UPDATE, this.actualizar, this);
    escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      escena.events.off(Phaser.Scenes.Events.UPDATE, this.actualizar, this);
    });
  }

  /** El brillo de las copias del fondo (como el lugar: antes de los filtros) y la luz que se apaga con él. */
  oscurecer(color: number, visible: number) {
    this.colorOscuro = color;
    for (const t of this.temblores) (color === 0xffffff ? t.imagen.clearTint() : t.imagen.setTint(color));
    for (const l of this.luces) l.imagen.setData("visible", visible);
    for (const e of this.motas) e.setAlpha(visible);
  }

  /** Crea (o vuelve a crear, p. ej. al cambiar el fondo) los efectos sobre el fondo de ahora. */
  construir() {
    this.objetos.forEach((o) => o.destroy());
    this.objetos = [];
    this.luces = [];
    this.motas = [];
    this.temblores = [];
    const fondo = this.fondo();
    if (!fondo) return;

    for (const { tipo, zona } of this.zonas) {
      const [x, y, w, h] = zona;
      if (tipo === "luz") {
        const imagen = this.escena.add
          .image(x + w / 2, y + h / 2, "vida-luz")
          .setDisplaySize(w, h)
          .setTint(0xffd79a)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(PROFUNDIDAD + 1)
          .setAlpha(0);
        this.objetos.push(imagen);
        this.luces.push({ imagen, fase: Math.random() * 10 });
      } else if (tipo === "polvo") {
        const e = this.escena.add
          .particles(0, 0, "vida-mota", {
            emitZone: { type: "random", source: new Phaser.Geom.Rectangle(x, y, w, h), quantity: 1 },
            lifespan: 7000,
            frequency: 300,
            speedX: { min: -5, max: 9 },
            speedY: { min: -7, max: -1 },
            scale: { min: 0.25, max: 0.7 },
            alpha: { onUpdate: (_p: unknown, _k: unknown, t: number) => Math.sin(Math.PI * t) * 0.8 },
            tint: 0xffe6b8,
          })
          .setBlendMode(Phaser.BlendModes.ADD)
          .setDepth(PROFUNDIDAD + 2);
        this.objetos.push(e);
        this.motas.push(e);
      } else {
        const t = this.copiaQueTiembla(fondo, tipo, zona);
        if (this.colorOscuro !== 0xffffff) t.imagen.setTint(this.colorOscuro);
        this.temblores.push(t);
      }
    }
  }

  /** Una copia del fondo recortada a la zona, encima de él, con un desplazamiento que se anima. */
  private copiaQueTiembla(fondo: Phaser.GameObjects.Image, tipo: "agua" | "viento", [x, y, w, h]: [number, number, number, number]): Temblor {
    const imagen = this.escena.add.image(fondo.x, fondo.y, fondo.texture.key).setScale(fondo.scaleX, fondo.scaleY).setDepth(PROFUNDIDAD);
    const izq = fondo.x - fondo.displayWidth / 2;
    const arr = fondo.y - fondo.displayHeight / 2;
    const e = fondo.scaleX;
    imagen.setCrop(Math.max(0, (x - izq) / e), Math.max(0, (y - arr) / e), w / e, h / e);
    const t: Temblor = { tipo, imagen, fase: Math.random() * 10 };
    estilar(imagen, "fondo", (f) => {
      t.filtro = f.addDisplacement(`vida-ondas-${tipo === "agua" ? 0 : 1}`, 0, 0);
    });
    this.objetos.push(imagen);
    return t;
  }

  private actualizar(_t: number, delta: number) {
    this.reloj += delta;
    const s = this.reloj / 1000;

    const luz = ajuste("vida.luz");
    for (const l of this.luces) {
      // Respira despacio y, de vez en cuando, parpadea (una luz de verdad nunca es fija).
      const respiro = 0.7 + 0.3 * Math.sin(s * 0.8 + l.fase) + 0.05 * Math.sin(s * 5.1 + l.fase);
      l.imagen.setAlpha(luz * 0.55 * respiro * ((l.imagen.getData("visible") as number | undefined) ?? 1));
    }

    const polvo = ajuste("vida.motas");
    for (const e of this.motas) {
      e.setVisible(polvo > 0);
      if (polvo > 0) e.setFrequency(Math.max(60, 900 - 800 * polvo), 1);
    }

    // El agua cambia de mapa de ondas a trompicones; el viento va suave.
    this.cuentaAgua += delta;
    const cambiar = this.cuentaAgua > 110;
    if (cambiar) this.cuentaAgua = 0;
    for (const t of this.temblores) {
      const a = ajuste(t.tipo === "agua" ? "vida.agua" : "vida.viento") * AMPLITUD[t.tipo];
      t.imagen.setVisible(a > 0);
      if (!t.filtro) continue;
      if (t.tipo === "agua") {
        t.filtro.x = a * Math.sin(s * 9 + t.fase);
        t.filtro.y = a * Math.cos(s * 7 + t.fase);
        if (cambiar) t.filtro.setTexture(`vida-ondas-${Math.floor(Math.random() * 4)}`);
      } else {
        t.filtro.x = a * Math.sin(s * 1.3 + t.fase);
        t.filtro.y = a * 0.4 * Math.sin(s * 0.9 + t.fase);
      }
    }
  }
}
