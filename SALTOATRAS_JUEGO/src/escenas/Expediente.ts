// El expediente: a la izquierda las fichas por tipo, a la derecha la elegida.

import * as Phaser from "phaser";
import { COLOR, MAQUINA, texto } from "../config";
import { partida } from "../juego";
import { verDeCerca } from "./DeCerca";
import { HOJA, Papel } from "./Papel";

const TIPOS = [
  { tipo: "persona", titulo: "PERSONAS" },
  { tipo: "sitio", titulo: "SITIOS" },
  { tipo: "cosa", titulo: "COSAS" },
  { tipo: "evento", titulo: "EVENTOS" },
] as const;

export class Expediente extends Papel {
  private elegida?: string;

  constructor() {
    super("expediente");
  }

  protected dibujar() {
    const g = this.add.graphics();
    g.fillStyle(COLOR.papel).fillRect(HOJA.x, HOJA.y, HOJA.ancho, HOJA.alto);
    g.fillStyle(COLOR.papelOscuro).fillRect(HOJA.x, HOJA.y, 240, HOJA.alto);

    const fichas = partida.estado.fichas.map((id) => partida.datos.fichas[id]);
    this.elegida ??= fichas.at(-1)?.id;

    const titulo = texto(this, HOJA.x + 270, HOJA.y + 24, "", { fontSize: "20px", color: COLOR.tinta, fontStyle: "bold", wordWrap: { width: HOJA.ancho - 300 } });
    const cuerpo = texto(this, HOJA.x + 270, HOJA.y + 64, "", {
      fontFamily: MAQUINA,
      fontSize: "15px",
      color: COLOR.tinta,
      lineSpacing: 4,
      wordWrap: { width: HOJA.ancho - 300 },
    });
    let deCerca: Phaser.GameObjects.Text | undefined;
    const ver = (id: string) => {
      const f = partida.datos.fichas[id];
      this.elegida = id;
      titulo.setText(partida.nombre(id));
      cuerpo.setText(f.texto);
      deCerca?.destroy();
      deCerca = undefined;
      // Las fichas que son un papel se pueden ver de cerca.
      if (f.de_cerca) {
        deCerca = texto(this, HOJA.x + HOJA.ancho - 30, HOJA.y + HOJA.alto - 24, "Ver el papel", {
          fontSize: "14px", color: COLOR.tinta, backgroundColor: "#d9cdb0", padding: { x: 10, y: 5 },
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).on("pointerup", () => verDeCerca(this, id, () => {}));
      }
    };

    if (!fichas.length) {
      titulo.setText("El expediente está vacío.");
      return;
    }

    let y = HOJA.y + 20;
    for (const { tipo, titulo: cabecera } of TIPOS) {
      const deTipo = fichas.filter((f) => f.tipo === tipo);
      if (!deTipo.length) continue;
      texto(this, HOJA.x + 20, y, cabecera, { fontSize: "11px", color: "#6b5f4c", fontStyle: "bold" });
      y += 20;
      for (const f of deTipo) {
        const t = texto(this, HOJA.x + 28, y, partida.nombre(f.id), { fontSize: "14px", color: COLOR.tinta, wordWrap: { width: 200 } })
          .setInteractive({ useHandCursor: true })
          .on("pointerup", () => ver(f.id));
        y += t.height + 8;
      }
      y += 10;
    }
    ver(this.elegida!);
  }
}
