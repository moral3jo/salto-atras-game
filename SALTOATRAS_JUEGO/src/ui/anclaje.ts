// Dónde está el centro del cuerpo en una imagen de persona. Las poses tienen distinto
// ancho (brazos abiertos, una libreta…) y el cuerpo no está siempre en el centro de la
// imagen: si se centra la imagen, la persona "salta" al cambiar de pose. Se mide el centro
// de lo que pisa el suelo (la parte de abajo: piernas y pies), que no cambia con los brazos.

import type * as Phaser from "phaser";

const cache = new Map<string, number>();

/** El centro del cuerpo como fracción del ancho de la imagen (0,5 = en medio). */
export function centroDeCuerpo(escena: Phaser.Scene, clave: string): number {
  const hecho = cache.get(clave);
  if (hecho !== undefined) return hecho;
  let centro = 0.5;
  try {
    const fuente = escena.textures.get(clave).getSourceImage() as CanvasImageSource & { width: number; height: number };
    const w = 120;
    const h = Math.max(1, Math.round((w * fuente.height) / fuente.width));
    const lienzo = document.createElement("canvas");
    lienzo.width = w;
    lienzo.height = h;
    const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(fuente, 0, 0, w, h);
    const datos = ctx.getImageData(0, 0, w, h).data;
    let suma = 0;
    let n = 0;
    for (let y = Math.floor(h * 0.6); y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (datos[(y * w + x) * 4 + 3] > 40) {
          suma += x;
          n++;
        }
      }
    }
    if (n) centro = (suma / n + 0.5) / w;
  } catch {
    // Sin poder leer la imagen, se centra.
  }
  cache.set(clave, centro);
  return centro;
}
