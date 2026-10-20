// El panel: el corcho con los papeles clavados (fichas con panel: true) y los
// pósits con las preguntas. Se monta solo: los resueltos llevan su conclusión.
// Se resuelven en Pensar.

import { COLOR, texto } from "../config";
import { partida } from "../juego";
import { HOJA, Papel } from "./Papel";

const POSIT = { ancho: 160, alto: 120, hueco: 24 };

export class Panel extends Papel {
  constructor() {
    super("panel");
  }

  preload() {
    for (const n of ["panel-corcho", "posit"]) {
      const url = partida.datos.imagenes[n];
      if (url && !this.textures.exists(n)) this.load.image(n, url);
    }
  }

  protected dibujar() {
    if (this.textures.exists("panel-corcho")) {
      this.add.image(HOJA.x, HOJA.y, "panel-corcho").setOrigin(0).setDisplaySize(HOJA.ancho, HOJA.alto);
    } else {
      const g = this.add.graphics();
      g.fillStyle(COLOR.corcho).fillRect(HOJA.x, HOJA.y, HOJA.ancho, HOJA.alto);
      g.lineStyle(10, 0x5a3f27).strokeRect(HOJA.x, HOJA.y, HOJA.ancho, HOJA.alto);
    }

    // Primero los papeles clavados (pruebas), luego las preguntas.
    const papeles = partida.estado.fichas.filter((id) => partida.datos.fichas[id].panel);
    const piezas = [...papeles.map((id) => ({ papel: id })), ...partida.estado.posits.map((id) => ({ posit: id }))];
    const porFila = Math.floor((HOJA.ancho - POSIT.hueco) / (POSIT.ancho + POSIT.hueco));
    piezas.forEach((pieza, i) => {
      const x = HOJA.x + POSIT.hueco + (i % porFila) * (POSIT.ancho + POSIT.hueco);
      const y = HOJA.y + POSIT.hueco + Math.floor(i / porFila) * (POSIT.alto + POSIT.hueco);
      const giro = ((i * 37) % 7) - 3;
      if ("papel" in pieza) return this.papel(pieza.papel!, x, y, giro);
      const id = pieza.posit!;
      const p = partida.datos.posits[id];
      const nota = this.textures.exists("posit")
        ? this.add.image(x, y, "posit").setOrigin(0).setDisplaySize(POSIT.ancho, POSIT.alto).setAngle(giro)
        : this.add.rectangle(x, y, POSIT.ancho, POSIT.alto, COLOR.posit).setOrigin(0).setAngle(giro);
      const resuelta = partida.estado.resueltas[id];
      const contenido = resuelta ? `${p.pregunta}

${p.conclusion ?? ""}` : p.pregunta;
      texto(this, x + 12, y + 12, contenido, { fontSize: resuelta ? "12px" : "16px", color: COLOR.tinta, wordWrap: { width: POSIT.ancho - 24 } })
        .setAngle(giro);
      if ("setStrokeStyle" in nota) nota.setStrokeStyle(1, 0x000000, 0.15);
    });

    if (!piezas.length) {
      texto(this, HOJA.x + 30, HOJA.y + 30, "Nada en la pared todavía.", { color: "#f3ead8" });
    }
  }

  /** Un papel clavado con chincheta. Si se puede ver de cerca, se pincha. */
  private papel(id: string, x: number, y: number, giro: number) {
    const f = partida.datos.fichas[id];
    const hoja = this.add.rectangle(x, y, POSIT.ancho, POSIT.alto, 0xf4efe0).setOrigin(0).setAngle(giro).setStrokeStyle(1, 0x000000, 0.2);
    texto(this, x + 12, y + 16, f.titulo, { fontSize: "15px", color: COLOR.tinta, fontStyle: "bold", wordWrap: { width: POSIT.ancho - 24 } }).setAngle(giro);
    this.add.circle(x + POSIT.ancho / 2, y + 6, 5, 0xb03a2e);
    if (f.de_cerca) {
      hoja.setInteractive({ useHandCursor: true }).on("pointerup", () => this.scene.launch("decerca", { ficha: id }));
    }
  }
}
