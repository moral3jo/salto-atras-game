// Los "ambientes": momentos de la historia en los que cambia cómo se ve el juego
// (más grano, temblor, parpadeo…) para poner nervioso a quien juega, o calmarlo.
// Se declaran en datos/juego.yaml → ambientes: y la historia los pide con
// `~ ambiente("tenso")`; `ambiente("")` vuelve a lo normal. Ver docs/FORMATO.md.
//
// Un ambiente solo sobreescribe los ajustes que nombra (peli.*, vida.*, estilo.*);
// el resto queda como lo tenga el jugador o el panel de debug. La transición es
// gradual. `peli.comodidad` (la opción "Movimiento" de la pausa) sigue mandando:
// quien la ponga a "Quieto" no verá temblar nada, ni siquiera en un ambiente tenso.

import { ponerCapa, valorDe, valorEfectivo } from "./ajustes";

export interface Ambiente {
  /** Segundos que tarda en llegar a él (2 si no se dice). */
  tiempo?: number;
  valores: Record<string, number>;
}

let definidos: Record<string, Ambiente> = {};
let actual = "";
/** Lo que está puesto ahora por encima de lo normal (vacío = nada). */
let puesto: Record<string, number> = {};
let parar: (() => void) | undefined;

/** Los ambientes del juego (los carga la partida al arrancar). */
export function definirAmbientes(a: Record<string, Ambiente>) {
  definidos = a;
}

export const nombresAmbientes = () => Object.keys(definidos);
export const ambienteActual = () => actual;

/** Pasa al ambiente `nombre` (vacío o desconocido = lo normal). `instantaneo` salta la transición. */
export function cambiarAmbiente(nombre: string, instantaneo = false) {
  parar?.();
  const ambiente = definidos[nombre];
  actual = ambiente ? nombre : "";
  const destino = ambiente?.valores ?? {};

  // Desde lo que se ve ahora hasta lo que toca; lo que el destino no nombra vuelve a su valor normal.
  const ids = [...new Set([...Object.keys(destino), ...Object.keys(puesto)])];
  const desde: Record<string, number> = {};
  const hasta: Record<string, number> = {};
  for (const id of ids) {
    desde[id] = valorEfectivo(id);
    hasta[id] = destino[id] ?? valorDe(id);
  }
  const segundos = instantaneo ? 0 : (ambiente?.tiempo ?? 2);
  if (segundos <= 0 || !ids.length) return poner(ambiente ? hasta : {});

  const inicio = performance.now();
  let marco = 0;
  const paso = () => {
    const t = Math.min(1, (performance.now() - inicio) / (segundos * 1000));
    const suave = t * t * (3 - 2 * t);
    const ahora: Record<string, number> = {};
    for (const id of ids) ahora[id] = desde[id] + (hasta[id] - desde[id]) * suave;
    if (t < 1) {
      poner(ahora);
      marco = requestAnimationFrame(paso);
    } else {
      poner(ambiente ? hasta : {});
    }
  };
  parar = () => cancelAnimationFrame(marco);
  marco = requestAnimationFrame(paso);
}

function poner(valores: Record<string, number>) {
  puesto = valores;
  ponerCapa(Object.keys(valores).length ? valores : null);
}
