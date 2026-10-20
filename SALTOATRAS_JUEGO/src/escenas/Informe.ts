// El informe: el impreso del ministerio con una casilla por pósit.
// Por ahora solo se ve; se rellenará y se mandará desde el teléfono del hostal.

import { COLOR, MAQUINA, texto } from "../config";
import { partida } from "../juego";
import { HOJA, Papel } from "./Papel";

export class Informe extends Papel {
  constructor() {
    super("informe");
  }

  protected dibujar() {
    const g = this.add.graphics();
    g.fillStyle(0xf4f1e8).fillRect(HOJA.x, HOJA.y, HOJA.ancho, HOJA.alto);
    g.lineStyle(1, 0x1d1a16, 0.6).strokeRect(HOJA.x + 16, HOJA.y + 16, HOJA.ancho - 32, HOJA.alto - 32);

    const estilo = { fontFamily: MAQUINA, color: COLOR.tinta };
    texto(this, HOJA.x + 40, HOJA.y + 34, "MINISTERIO · INFORME DE INSPECCIÓN", { ...estilo, fontSize: "16px", fontStyle: "bold" });
    texto(this, HOJA.x + 40, HOJA.y + 58, "Expediente: Medina. Inspector: J. Martínez", { ...estilo, fontSize: "13px" });

    let y = HOJA.y + 100;
    for (const id of partida.estado.posits) {
      const p = partida.datos.posits[id];
      const casillas = (p.opciones ?? []).map((r) => `☐ ${r}`).join("   ");
      texto(this, HOJA.x + 40, y, `${p.pregunta}   ${casillas}`, { ...estilo, fontSize: "15px" });
      texto(this, HOJA.x + 60, y + 22, "Fundamento: ______________________________", { ...estilo, fontSize: "13px", padding: { bottom: 4 } });
      y += 56;
    }
  }
}
