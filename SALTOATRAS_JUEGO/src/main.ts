import * as Phaser from "phaser";
import "@fontsource/caveat/400.css";
import "@fontsource/caveat/600.css";
import { ALTO, ANCHO, ZOOM } from "./config";
import { cargarDatos } from "./motor/datos";
import { Partida } from "./motor/partida";
import { arranque, iniciarPartida } from "./juego";
import { Portada } from "./escenas/Portada";
import { Pausa } from "./escenas/Pausa";
import { Llegada } from "./escenas/Llegada";
import { Lugar } from "./escenas/Lugar";
import { Dialogo } from "./escenas/Dialogo";
import { Conversacion } from "./escenas/Conversacion";
import { Interfaz } from "./escenas/Interfaz";
import { Pensar } from "./escenas/Pensar";
import { DeCerca } from "./escenas/DeCerca";
import { Expediente } from "./escenas/Expediente";
import { Panel } from "./escenas/Panel";
import { Informe } from "./escenas/Informe";

const datos = cargarDatos();

// El panel de debug solo existe en desarrollo: no entra en el juego que se publique.
const debug = import.meta.env.DEV ? await import("./debug") : null;

if (datos.errores.length) {
  // Los errores de los datos se enseñan enteros: es lo que hay que arreglar.
  const pre = document.createElement("pre");
  pre.id = "errores";
  pre.textContent = "Hay errores en datos/:\n\n" + datos.errores.map((e) => "· " + e).join("\n");
  document.body.append(pre);
} else {
  // ?nuevo (para probar) se salta la portada con una partida nueva; se quita
  // de la URL para que recargar no vuelva a borrar.
  const url = new URL(location.href);
  arranque.nueva = url.searchParams.has("nuevo");
  if (arranque.nueva) {
    url.searchParams.delete("nuevo");
    history.replaceState(null, "", url);
  }
  const partida = new Partida(datos);
  iniciarPartida(partida);

  // Phaser pinta el texto en un canvas: la letra a mano tiene que estar cargada antes.
  await document.fonts.load('26px "Caveat"').catch(() => undefined);

  const juego = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "juego",
    backgroundColor: "#000000",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: ANCHO * ZOOM,
      height: ALTO * ZOOM,
    },
    // El orden es el de dibujo: lo de más abajo, encima.
    // La primera (la portada) es la que arranca.
    scene: [
      Portada, Llegada, Lugar, Dialogo, Conversacion, Interfaz, Pensar, Expediente, Panel, Informe, DeCerca, Pausa,
      ...(debug ? [debug.PruebaTextos] : []),
    ],
  });

  // Para mirar el estado desde la consola del navegador, y el panel de debug (F2).
  if (import.meta.env.DEV) Object.assign(window, { partida, juego });
  debug?.iniciarDebug(juego, () => ({
    lugar: partida.estado.lugar,
    escenas: juego.scene.getScenes(true).map((s) => s.scene.key),
  }), (texto) => partida.eventos.emit("aviso", texto));
}
