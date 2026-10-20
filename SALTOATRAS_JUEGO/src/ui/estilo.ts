// Los filtros del estilo del arte, puestos a cada fondo y personaje. Todo sale de
// los ajustes `estilo.*` (se tocan con el panel F2, pestaña Estilo) y se repinta al
// cambiarlos. Un solo sitio: para cambiar el aspecto del juego se toca esto.
// Los pensamientos, los papeles y la interfaz no pasan por aquí.

import * as Phaser from "phaser";
import { ZOOM } from "../config";
import { ajuste, alCambiarAjuste } from "../motor/ajustes";
import { FiltroBayer, FiltroContorno, FiltroSemitono, aRgb, registrarFiltros } from "./filtros";

type Tipo = "fondo" | "personaje";
type Camara = Phaser.Cameras.Scene2D.Camera;
type Objeto = Phaser.GameObjects.Image | Camara;
const esCamara = (o: Objeto): o is Camara => "setZoom" in o;

/** Rampas de la paleta, de lo oscuro a lo claro. */
const RAMPAS: Record<number, number[]> = {
  1: [0x120e0a, 0x4a3524, 0xb48a58, 0xf3e6c8], // sepia
  2: [0x0b1018, 0x2a3a52, 0x8aa0b8, 0xe8eef2], // azul frío
  3: [0x0a0a0c, 0x2e2e36, 0xa8a49a, 0xf2eee2], // tinta sobre papel
  4: [0x0f140c, 0x39432a, 0x9a9a62, 0xece8c4], // oliva
  5: [0x1a0f12, 0x5a3430, 0xd0894e, 0xffe9b8], // tarde cálida
  6: [0x1f1405, 0x6b4210, 0xc98a1e, 0xffd97a], // ámbar de terminal
  7: [0x021006, 0x0b4a1a, 0x2fbd4e, 0xb8ffc4], // fósforo verde
  8: [0x070b3a, 0x7a1fa2, 0xf0359a, 0xf6f2ea], // térmica: azul marino, magenta y perla
  9: [0x0b0030, 0xb3123f, 0xff9a1f, 0xfff4b0], // infrarrojo
  10: [0x000000, 0xaa00aa, 0x00aaaa, 0xffffff], // CGA
  11: [0x141418, 0x4a4a52, 0xcfc8b8, 0xece6d6], // tinta y papel
};

/** Lo que cada imagen añade tras los filtros del estilo (p. ej. el temblor del agua). */
type Extra = (filtros: Phaser.GameObjects.Components.FilterList) => void;

const vivos = new Map<Objeto, { tipo: Tipo; extra?: Extra }>();
let escuchando = false;

/** Pone los filtros del estilo a una imagen y la mantiene al día mientras exista. */
/** Los filtros del estilo en una cámara entera: lo que pinte (papel y texto juntos) queda fundido. */
export function estilarCamara(camara: Camara, tipo: Tipo = "fondo") {
  registrar(camara, tipo);
  camara.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => vivos.delete(camara));
  return camara;
}

export function estilar<T extends Phaser.GameObjects.Image>(objeto: T, tipo: Tipo, extra?: Extra): T {
  registrar(objeto, tipo, extra);
  objeto.once(Phaser.GameObjects.Events.DESTROY, () => vivos.delete(objeto));
  return objeto;
}

function registrar(objeto: Objeto, tipo: Tipo, extra?: Extra) {
  if (!escuchando) {
    escuchando = true;
    alCambiarAjuste(() => vivos.forEach((v, o) => aplicar(o, v.tipo, v.extra)));
  }
  vivos.set(objeto, { tipo, extra });
  aplicar(objeto, tipo, extra);
}

function grano(escena: Phaser.Scene) {
  if (!escena.textures.exists("grano")) {
    const t = escena.textures.createCanvas("grano", 1024, 576)!;
    const d = t.context.createImageData(1024, 576);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    t.context.putImageData(d, 0, 0);
    t.refresh();
  }
  return "grano";
}

function aplicar(o: Objeto, tipo: Tipo, extra?: Extra) {
  if (!o.scene || (!esCamara(o) && !o.active)) return;
  const sat = ajuste("estilo.saturacion");
  const con = ajuste("estilo.contraste");
  const desenfoque = ajuste("estilo.desenfoque");
  const rampa = RAMPAS[ajuste("estilo.rampa")];
  const mezcla = ajuste("estilo.rampaMezcla");
  const pasos = Math.round(ajuste("estilo.pasos"));
  const tramado = ajuste("estilo.tramado") >= 1;
  const bloques = Math.round(ajuste("estilo.bloques"));
  const vineta = tipo === "fondo" ? ajuste("estilo.vineta") : 0;
  const cantidadGrano = ajuste("estilo.grano");

  const estampa = Math.round(ajuste("estilo.estampa"));
  const contorno = ajuste("estilo.contorno");
  const hay = !!extra || estampa > 0 || contorno > 0 || sat || con || desenfoque > 0.05 || (rampa && mezcla) || pasos >= 2 || bloques >= 2 || vineta || cantidadGrano;
  if (!o.filters) {
    if (!hay || esCamara(o)) return;
    o.enableFilters();
  }
  const f = o.filters!.internal;
  f.clear();
  if (!hay) return;

  if (sat || con) f.addColorMatrix().colorMatrix.saturate(sat).contrast(con, true);
  if (desenfoque > 0.05) f.addBlur(1, desenfoque, desenfoque, 1);
  if (pasos >= 2) f.addQuantize({ steps: [pasos, pasos, pasos, 1], dither: tramado });
  if (rampa && mezcla) {
    f.addGradientMap({
      ramp: rampa.slice(1).map((fin, i) => ({ colorStart: rampa[i], colorEnd: fin, start: i / 3, end: (i + 1) / 3 })),
      dither: tramado,
      alpha: mezcla,
    });
  }
  if (estampa > 0 || contorno > 0) estampar(o, f, estampa, contorno);
  if (bloques >= 2) f.addBlocky({ size: bloques });
  if (vineta) f.addVignette(0.5, 0.5, 0.75, vineta);
  if (cantidadGrano) f.addBlend(grano(o.scene), Phaser.BlendModes.OVERLAY, cantidadGrano);
  extra?.(f);
}

/** Los filtros propios (tramado Bayer, semitono, contorno), con la paleta elegida. */
function estampar(o: Objeto, f: Phaser.GameObjects.Components.FilterList, estampa: number, contorno: number) {
  if (!registrarFiltros(o.scene)) return;
  const camara = esCamara(o) ? o : o.filterCamera;
  if (!camara) return;
  // Píxeles de pantalla por píxel del filtro: una imagen reducida se ve más pequeña de lo que mide.
  const escala = () => (esCamara(o) ? 1 : Math.abs(o.scaleX) * ZOOM);
  const paleta = RAMPAS[Math.round(ajuste("estilo.estampaPaleta"))] ?? RAMPAS[6];
  const tam = ajuste("estilo.estampaTamano");

  if (estampa === 1) {
    const b = new FiltroBayer(camara);
    b.tam = tam;
    b.paleta = paleta.map(aRgb);
    b.escala = escala;
    b.color = ajuste("estilo.estampaColor");
    b.vida = { salto: ajuste("estilo.vivoSalto"), fps: ajuste("estilo.vivoFps") };
    f.add(b);
  } else if (estampa === 2) {
    const s = new FiltroSemitono(camara);
    s.tam = tam * 2;
    s.tinta = aRgb(paleta[0]);
    s.papel = aRgb(paleta[3]);
    s.escala = escala;
    f.add(s);
  }
  if (contorno > 0) {
    const c = new FiltroContorno(camara);
    c.fuerza = contorno;
    c.grosor = ajuste("estilo.contornoGrosor");
    c.umbral = ajuste("estilo.contornoUmbral");
    c.tinta = aRgb(paleta[0]);
    c.escala = escala;
    c.setPaddingOverride(6, 6, 6, 6);
    f.add(c);
  }
}
