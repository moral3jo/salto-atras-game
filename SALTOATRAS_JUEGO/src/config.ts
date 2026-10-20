// Medidas y estilo comunes. Todo se coloca en 960×540; el lienzo se dibuja al
// doble para que el texto salga nítido (ver docs/MOTOR.md → Resolución).

import * as Phaser from "phaser";
import { ajuste } from "./motor/ajustes";

export const ANCHO = 960;
export const ALTO = 540;
export const ZOOM = 2;

export const LETRA = 'Georgia, "Times New Roman", serif';
export const MAQUINA = '"Courier New", Courier, monospace';
/** Letra a mano (Caveat, incluida en el juego): pensamientos y papeles a boli. */
export const MANO = '"Caveat", "Segoe Print", cursive';

export const COLOR = {
  tinta: "#1d1a16",
  papel: 0xeee6d2,
  papelOscuro: 0xd9cfb6,
  corcho: 0x9b7650,
  posit: 0xf2df74,
  caja: 0x14110e,
  texto: "#f3ead8",
  pensamiento: "#c9b98f",
  nombre: "#e0a95b",
  opcion: "#f3ead8",
  opcionEncima: "#e0a95b",
  /** Tinta de boli sobre la escena (clara, para que se lea en lo oscuro). */
  boli: "#a9c7ff",
  boliSuave: "#8aa9dd",
  /** Tinta de boli sobre papel claro. */
  boliPapel: "#2c4a9a",
};

/** El cursor mientras Martínez piensa: un boli. Dice "está escribiendo, espera" sin oscurecer nada. */
export const CURSOR_BOLI =
  "url(\"data:image/svg+xml;utf8," +
  "<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'>" +
  "<path d='M3 29 L7 19 L24 2 L30 8 L13 25 Z' fill='%23a9c7ff' stroke='%230a0f1e' stroke-width='1.6' stroke-linejoin='round'/>" +
  "<path d='M3 29 L7 19 L13 25 Z' fill='%230a0f1e'/></svg>\") 3 29, wait";

/** Un color HSL (tono 0-360, saturación y luz 0-100) como "#rrggbb". */
export function hsl(h: number, s: number, l: number): string {
  const c = Phaser.Display.Color.HSLToColor((((h % 360) + 360) % 360) / 360, Math.min(1, Math.max(0, s / 100)), Math.min(1, Math.max(0, l / 100)));
  return `#${c.color.toString(16).padStart(6, "0")}`;
}

/** La tinta del boli (los pensamientos): sale de los ajustes `boli.tono/saturacion/luz/contorno/brillo`. */
export const TINTA = {
  get texto() {
    return hsl(ajuste("boli.tono"), ajuste("boli.saturacion"), ajuste("boli.luz"));
  },
  /** Los apartes, un poco más apagados. */
  get suave() {
    return hsl(ajuste("boli.tono"), ajuste("boli.saturacion") * 0.85, ajuste("boli.luz") - 10);
  },
  /** El borde: casi negro, del mismo tono. */
  get contorno() {
    return hsl(ajuste("boli.tono"), 60, 8);
  },
  get grosor() {
    return ajuste("boli.contorno");
  },
  /** El brillo de alrededor (0 = sin brillo, solo una sombra suave). */
  get brillo() {
    return ajuste("boli.brillo");
  },
  get brilloColor() {
    return hsl(ajuste("boli.tono"), 100, 55);
  },
};

/** Dónde empiezan los pensamientos al mirar el lugar: abajo a la izquierda; crecen hacia abajo. */
export const PENSAMIENTOS = {
  get x() {
    return ajuste("pensamientos.x");
  },
  get y() {
    return ajuste("pensamientos.y");
  },
  get ancho() {
    return ajuste("pensamientos.ancho");
  },
  get alto() {
    return ajuste("pensamientos.alto");
  },
};

/**
 * Una segunda cámara, igual que la principal, para lo que no debe pasar por los filtros
 * del estilo (los pensamientos a boli). La principal pinta el mundo con filtros;
 * cada objeto se reparte con `repartir()`.
 */
export function camaraTinta(escena: Phaser.Scene) {
  const c = escena.cameras.add(0, 0, escena.scale.width, escena.scale.height);
  c.setZoom(ZOOM).centerOn(ANCHO / 2, ALTO / 2);
  return c;
}

/** Un objeto solo se ve en una de las dos cámaras: la del mundo (filtrada) o la de la tinta. */
export function repartir(escena: Phaser.Scene, tinta: Phaser.Cameras.Scene2D.Camera, ...objetos: { obj: Phaser.GameObjects.GameObject; en: "mundo" | "tinta" }[]) {
  for (const { obj, en } of objetos) obj.cameraFilter |= en === "tinta" ? escena.cameras.main.id : tinta.id;
}

/** Cada escena llama a esto en create(): coordenadas de 960×540 en un lienzo al doble. */
export function camara(escena: Phaser.Scene) {
  escena.cameras.main.setZoom(ZOOM).centerOn(ANCHO / 2, ALTO / 2);
}

export function texto(
  escena: Phaser.Scene,
  x: number,
  y: number,
  contenido: string,
  estilo: Phaser.Types.GameObjects.Text.TextStyle = {},
) {
  return escena.add.text(x, y, contenido, {
    fontFamily: LETRA,
    fontSize: "16px",
    color: COLOR.texto,
    resolution: ZOOM,
    ...estilo,
  });
}
