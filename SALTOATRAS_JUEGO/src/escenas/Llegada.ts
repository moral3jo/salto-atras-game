// La entrada de una partida nueva: en negro, "cargando" abajo a la derecha
// (como mínimo medio segundo, mientras se precarga el primer lugar), luego el
// texto de llegada despacio en el centro y, si hay, el sonido (el coche que
// llega). Después, fundido al primer lugar. Todo sale de juego.yaml → llegada.

import * as Phaser from "phaser";
import { ALTO, ANCHO, COLOR, camara, texto } from "../config";
import { partida } from "../juego";
import { ajuste } from "../motor/ajustes";
import { DURACION } from "../ui/animar";
import { estilarCamara } from "../ui/estilo";
import { Pelicula, evolucionarPelicula } from "../ui/pelicula";

export class Llegada extends Phaser.Scene {
  private inicio = 0;

  constructor() {
    super("llegada");
  }

  preload() {
    this.inicio = performance.now();
    camara(this);
    this.cargando();
    // El volante del coche da vueltas junto al "Cargando" en cuanto llega su imagen.
    const volante = partida.datos.imagenes["cargando-volante"];
    if (volante) {
      this.load.image("cargando-volante", volante);
      this.load.once("filecomplete-image-cargando-volante", () => {
        const img = this.add.image(ANCHO - 120, ALTO - 31, "cargando-volante").setAlpha(0.8);
        img.setScale(30 / img.height);
        this.tweens.add({ targets: img, angle: 360, duration: 1800, repeat: -1 });
        (this.data.get("cargando") as Phaser.GameObjects.GameObject[]).push(img);
      });
    }

    // De paso, el arte del primer lugar y el sonido quedan en caché.
    const { datos } = partida;
    const lugar = datos.lugares[datos.inicio];
    for (const n of [lugar.fondo, ...lugar.cosas.map((c) => c.imagen)]) {
      if (n && datos.imagenes[n] && !this.textures.exists(n)) this.load.image(n, datos.imagenes[n]);
    }
    const sonido = datos.llegada?.sonido;
    if (sonido && datos.sonidos[sonido] && !this.cache.audio.exists(sonido)) this.load.audio(sonido, datos.sonidos[sonido]);
  }

  /** "Cargando" con tres puntos que laten, abajo a la derecha. */
  private cargando() {
    const t = texto(this, ANCHO - 24, ALTO - 24, "Cargando", { fontSize: "13px", color: "#ffffff88" }).setOrigin(1, 1);
    const puntos = texto(this, ANCHO - 24, ALTO - 24, "", { fontSize: "13px", color: "#ffffff88" }).setOrigin(0, 1);
    t.x -= 18;
    puntos.x = t.x + 2;
    let n = 0;
    this.time.addEvent({ delay: 220, loop: true, callback: () => puntos.setText(".".repeat((n = (n + 1) % 4))) });
    this.data.set("cargando", [t, puntos]);
  }

  create() {
    // La película de la portada sigue aquí y, mientras sale el título, evoluciona hacia la del juego.
    // Fondo negro opaco (no transparente): pasa por el mismo tramado que el de la portada y el cambio no se nota.
    this.cameras.main.setBackgroundColor("#000000");
    new Pelicula(this, 1000);
    estilarCamara(this.cameras.main);
    const espera = Math.max(0, ajuste("llegada.cargaMinima") - (performance.now() - this.inicio));
    this.time.delayedCall(espera, () => this.titulo());
  }

  private titulo() {
    const cargando = this.data.get("cargando") as Phaser.GameObjects.Text[];
    this.tweens.add({ targets: cargando, alpha: 0, duration: DURACION.normal });

    const { llegada } = partida.datos;
    const t = texto(this, ANCHO / 2, ALTO / 2, llegada?.texto ?? "", {
      fontSize: "30px", color: COLOR.texto, letterSpacing: 3,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: ajuste("llegada.apareceTexto"), ease: "Sine.InOut", delay: 300 });

    // El sonido manda: el texto se queda hasta que acaba (o lo mínimo, si no hay).
    const clave = llegada?.sonido;
    let dura = ajuste("llegada.textoMinimo");
    if (clave && this.cache.audio.exists(clave)) {
      const s = this.sound.add(clave);
      s.play();
      dura = Math.max(dura, s.duration * 1000);
    }
    evolucionarPelicula(dura / 1000 + (DURACION.lenta + 2500) / 1000);
    this.time.delayedCall(dura, () => {
      this.tweens.add({
        targets: t,
        alpha: 0,
        duration: DURACION.lenta,
        ease: "Sine.InOut",
        onComplete: () => this.scene.start("lugar", { entrada: "lenta" }),
      });
    });
  }
}
