// La bandeja de fichas: todo lo que sabe Martínez. Mientras caben, se ven
// todas juntas (personas, sitios, cosas, eventos, en ese orden); cuando ya no
// caben, aparecen las pestañas. La usan la conversación (pinchar = preguntar)
// y pensar (pinchar = poner en un hueco).

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, texto } from "../config";
import { partida } from "../juego";
import { TIPOS, type Ficha, type Tipo } from "../motor/datos";
import { elevar } from "./animar";

const CARTA = { ancho: 62, alto: 62, hueco: 6, porFila: 13, filas: 2 };
const POR_PAGINA = CARTA.porFila * CARTA.filas;

const PESTANAS: Record<Tipo, string> = { persona: "Personas", sitio: "Sitios", cosa: "Cosas", evento: "Eventos" };
export const COLOR_TIPO: Record<Tipo, number> = { persona: 0xc9a27a, sitio: 0x8fa58a, cosa: 0xd8c690, evento: 0xb07f7f };

/** Pestaña y página: se recuerdan entre conversaciones y pensamientos. */
const vista = { pestana: "persona" as Tipo, pagina: 0 };

export interface OpcionesBandeja {
  /** Altura a la que empieza; llega hasta abajo. */
  y: number;
  /** Si se puede pinchar; si no, se ve apagada. */
  activa: boolean;
  /** Fichas que se ven con ✓ (ya preguntadas, ya usadas…). */
  marcada?: (id: string) => boolean;
  elegir: (id: string) => void;
  /** Ficha que va siempre la primera (la persona con la que se habla). */
  primera?: string;
  /** Se llama al cambiar de pestaña o de página. */
  redibujar: () => void;
}

export function dibujarBandeja(escena: Phaser.Scene, contenedor: Phaser.GameObjects.Container, o: OpcionesBandeja) {
  const g = escena.add.graphics();
  g.fillStyle(0x1a1612, 0.96).fillRect(0, o.y, ANCHO, ALTO - o.y);
  g.lineStyle(1, 0xe0a95b, 0.4).lineBetween(0, o.y, ANCHO, o.y);
  contenedor.add(g);

  const fichas = partida.estado.fichas
    .map((id) => partida.datos.fichas[id])
    .sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo))
    .sort((a, b) => Number(b.id === o.primera) - Number(a.id === o.primera));
  const piezas: Phaser.GameObjects.GameObject[] = [];

  // Sin pestañas mientras todo quepa: el jugador aprende el sistema con pocas fichas.
  if (fichas.length <= POR_PAGINA) {
    fichas.forEach((f, i) => piezas.push(carta(escena, f, ...posicion(i, o.y + 46), o)));
    if (!fichas.length) piezas.push(texto(escena, 24, o.y + 56, "Nada todavía.", { fontSize: "14px", color: "#ffffff66", fontStyle: "italic" }));
    contenedor.add(escena.add.container(0, 0, piezas).setAlpha(o.activa ? 1 : 0.35));
    return;
  }

  let x = 20;
  for (const tipo of TIPOS) {
    const cuantas = fichas.filter((f) => f.tipo === tipo).length;
    const t = texto(escena, x, o.y + 10, `${PESTANAS[tipo]} ${cuantas}`, {
      fontSize: "14px",
      color: tipo === vista.pestana ? COLOR.tinta : COLOR.texto,
      backgroundColor: tipo === vista.pestana ? "#e0a95b" : "#00000000",
      padding: { x: 10, y: 4 },
    });
    if (o.activa) {
      t.setInteractive({ useHandCursor: true }).on("pointerup", () => {
        vista.pestana = tipo;
        vista.pagina = 0;
        o.redibujar();
      });
    }
    piezas.push(t);
    x += t.width + 6;
  }

  const deTipo = fichas.filter((f) => f.tipo === vista.pestana);
  const paginas = Math.max(1, Math.ceil(deTipo.length / POR_PAGINA));
  vista.pagina = Math.min(vista.pagina, paginas - 1);
  deTipo.slice(vista.pagina * POR_PAGINA, (vista.pagina + 1) * POR_PAGINA).forEach((f, i) => {
    piezas.push(carta(escena, f, ...posicion(i, o.y + 46), o));
  });
  if (!deTipo.length) {
    piezas.push(texto(escena, 24, o.y + 56, "Nada todavía.", { fontSize: "14px", color: "#ffffff66", fontStyle: "italic" }));
  }
  if (paginas > 1) {
    const pie = texto(escena, ANCHO - 20, ALTO - 22, `‹  ${vista.pagina + 1}/${paginas}  ›`, { fontSize: "14px", color: COLOR.texto }).setOrigin(1, 0);
    if (o.activa) {
      pie.setInteractive({ useHandCursor: true }).on("pointerup", (p: Phaser.Input.Pointer) => {
        const izquierda = p.worldX < pie.x - pie.width / 2;
        vista.pagina = (vista.pagina + (izquierda ? paginas - 1 : 1)) % paginas;
        o.redibujar();
      });
    }
    piezas.push(pie);
  }

  contenedor.add(escena.add.container(0, 0, piezas).setAlpha(o.activa ? 1 : 0.35));
}

/** Dónde va la carta i-ésima de la rejilla que empieza en y. */
function posicion(i: number, y: number): [number, number] {
  return [
    20 + (i % CARTA.porFila) * (CARTA.ancho + CARTA.hueco),
    y + Math.floor(i / CARTA.porFila) * (CARTA.alto + CARTA.hueco),
  ];
}

/** Una ficha dibujada como carta: su icono o su título sobre el color de su tipo. */
export function carta(
  escena: Phaser.Scene,
  f: Ficha,
  x: number,
  y: number,
  o: { activa: boolean; marcada?: (id: string) => boolean; elegir?: (id: string) => void; primera?: string },
) {
  const c = escena.add.container(x, y);
  const fondo = escena.add.rectangle(0, 0, CARTA.ancho, CARTA.alto, COLOR_TIPO[f.tipo]).setOrigin(0);
  c.add(fondo);
  // La persona con la que se habla va la primera y sin nombre: ya se sabe quién es.
  const sinNombre = o.primera === f.id;
  // Con dibujo, el nombre solo sale al pasar el ratón.
  let rotulo: Phaser.GameObjects.Text | undefined;
  const cuerpo = f.cuerpo && escena.textures.exists(f.cuerpo) ? f.cuerpo : null;
  if (f.icono && escena.textures.exists(f.icono)) {
    const img = escena.add.image(CARTA.ancho / 2, CARTA.alto / 2, f.icono);
    img.setScale(Math.min(CARTA.ancho / img.width, CARTA.alto / img.height));
    c.add(img);
    if (!sinNombre) rotulo = cartaConTitulo(escena, c, partida.nombre(f.id));
  } else if (f.tipo === "persona" && cuerpo) {
    // Una persona sin icono: la cabeza y los hombros de su cuerpo, recortados en cuadrado.
    const img = escena.add.image(0, 0, cuerpo).setOrigin(0);
    const lado = img.width * 0.93;
    const s = CARTA.ancho / lado;
    img.setCrop((img.width - lado) / 2, 0, lado, lado * (CARTA.alto / CARTA.ancho));
    img.setScale(s).setPosition(-((img.width - lado) / 2) * s, 0);
    c.add(img);
    if (!sinNombre) rotulo = cartaConTitulo(escena, c, partida.nombre(f.id));
  } else {
    c.add(texto(escena, 5, 5, partida.nombre(f.id), { fontSize: "11px", color: COLOR.tinta, wordWrap: { width: CARTA.ancho - 10 } }));
  }
  if (o.marcada?.(f.id)) {
    c.setAlpha(0.7);
    // Una chapa oscura arriba a la derecha, para que el ✓ no se pierda con el dibujo ni el título.
    c.add(escena.add.circle(CARTA.ancho - 10, 10, 9, 0x1d1a16, 0.92).setStrokeStyle(1, 0xe0c27a, 0.9));
    c.add(texto(escena, CARTA.ancho - 10, 10, "✓", { fontSize: "12px", color: "#f0d98a" }).setOrigin(0.5));
  }
  if (o.activa && o.elegir) {
    const elegir = o.elegir;
    fondo.setInteractive({ useHandCursor: true })
      .on("pointerover", () => { fondo.setStrokeStyle(2, 0xffffff); rotulo?.setAlpha(1); })
      .on("pointerout", () => { fondo.setStrokeStyle(); rotulo?.setAlpha(0); })
      .on("pointerup", () => elegir(f.id));
    elevar(escena, c, fondo);
  }
  return c;
}

/** El título en una banda oscura abajo (hasta tres renglones: las cartas son estrechas). */
function cartaConTitulo(escena: Phaser.Scene, c: Phaser.GameObjects.Container, titulo: string) {
  const t = (
    texto(escena, CARTA.ancho / 2, CARTA.alto, titulo, {
      fontSize: "9px", color: COLOR.texto, backgroundColor: "#000000bb", align: "center",
      padding: { x: 2, y: 1 }, wordWrap: { width: CARTA.ancho - 6 },
    }).setOrigin(0.5, 1)
  ).setAlpha(0);
  c.add(t);
  return t;
}

export const MEDIDAS_CARTA = CARTA;
