// Animaciones comunes: las mismas duraciones y curvas en todo el juego, para
// que todo se mueva igual. Nada aparece ni desaparece de golpe.
//
//   entrar(escena)        la capa entera aparece (fundido de su cámara)
//   salir(escena)         la capa entera se va y luego se para
//   aparecer(escena, o)   un objeto aparece (fundido y un poco de movimiento)
//   desaparecer(...)      un objeto se va y se destruye
//   elevar(escena, o, y)  al pasar el ratón, sube un poco; al salir, vuelve

import * as Phaser from "phaser";
import { ajuste } from "../motor/ajustes";

/** Duraciones de las animaciones: se leen cada vez, así se pueden ajustar en vivo (debug). */
export const DURACION = {
  get rapida() {
    return ajuste("anim.rapida");
  },
  get normal() {
    return ajuste("anim.normal");
  },
  get lenta() {
    return ajuste("anim.lenta");
  },
};
export const CURVA = "Cubic.Out";
const CURVA_SALIDA = "Cubic.In";

/** Cualquier cosa con posición y transparencia: imágenes, textos, contenedores… */
type Objeto = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.AlphaSingle & Phaser.GameObjects.Components.Transform;

/** La capa entera aparece: la cámara de la escena pasa de transparente a opaca. */
export function entrar(escena: Phaser.Scene, duracion = DURACION.normal) {
  const camaras = escena.cameras.cameras;
  camaras.forEach((c) => c.setAlpha(0));
  escena.tweens.add({ targets: camaras, alpha: 1, duration: duracion, ease: CURVA });
}

/** La capa entera se va y, al acabar, se para la escena. Pide salir dos veces no hace nada. */
export function salir(escena: Phaser.Scene, luego?: () => void, duracion = DURACION.rapida) {
  if (escena.data.get("saliendo")) return;
  escena.data.set("saliendo", true);
  // Si la escena se reinicia a mitad de salida (la vuelven a abrir enseguida), el aviso
  // se olvida: si no, la nueva quedaría abierta sin poder cerrarse nunca.
  escena.events.once(Phaser.Scenes.Events.SHUTDOWN, () => escena.data.set("saliendo", false));
  escena.input.enabled = false;
  escena.tweens.add({
    targets: escena.cameras.cameras,
    alpha: 0,
    duration: duracion,
    ease: CURVA_SALIDA,
    onComplete: () => {
      escena.data.set("saliendo", false);
      escena.input.enabled = true;
      escena.scene.stop();
      luego?.();
    },
  });
}

export interface Movimiento {
  /** Desde dónde llega, relativo a donde está (p. ej. { y: 12 } sube 12 px). */
  desde?: { x?: number; y?: number };
  /** Escala inicial (0.96 hace un "pop" suave). */
  escala?: number;
  duracion?: number;
  retraso?: number;
}

export function aparecer(escena: Phaser.Scene, objeto: Objeto, m: Movimiento = {}) {
  escena.tweens.killTweensOf(objeto);
  const { x, y, scaleX, scaleY } = objeto;
  const alpha = objeto.alpha;
  objeto.setAlpha(0);
  if (m.desde?.x) objeto.x = x + m.desde.x;
  if (m.desde?.y) objeto.y = y + m.desde.y;
  if (m.escala) objeto.setScale(scaleX * m.escala, scaleY * m.escala);
  escena.tweens.add({
    targets: objeto,
    alpha,
    x,
    y,
    scaleX,
    scaleY,
    duration: m.duracion ?? DURACION.normal,
    delay: m.retraso ?? 0,
    ease: CURVA,
  });
}

export function desaparecer(escena: Phaser.Scene, objeto: Objeto, m: Movimiento = {}, luego?: () => void) {
  escena.tweens.add({
    targets: objeto,
    alpha: 0,
    x: objeto.x + (m.desde?.x ?? 0),
    y: objeto.y + (m.desde?.y ?? 0),
    duration: m.duracion ?? DURACION.normal,
    delay: m.retraso ?? 0,
    ease: CURVA_SALIDA,
    onComplete: () => {
      objeto.destroy();
      luego?.();
    },
  });
}

/** Al pasar el ratón el objeto sube `alto` px; al salir, vuelve a su sitio. */
export function elevar(escena: Phaser.Scene, objeto: Objeto, zona: Phaser.GameObjects.GameObject, alto = 4) {
  const y = objeto.y;
  const mover = (destino: number) => {
    escena.tweens.killTweensOf(objeto);
    escena.tweens.add({ targets: objeto, y: destino, duration: DURACION.rapida, ease: CURVA });
  };
  zona.on("pointerover", () => mover(y - alto)).on("pointerout", () => mover(y));
}
