// Quién dice una línea de Ink. "Policía: texto" o "Policía (pose): texto" es
// alguien hablando solo si "Policía" es una de las voces de juego.yaml; todo lo
// demás ("Cobertura: ninguna.") es un pensamiento de Martínez.

import { partida } from "../juego";
import type { Aviso } from "./partida";

export interface Linea {
  /** Quién habla; sin quien, es un pensamiento. */
  quien?: string;
  pose?: string;
  texto: string;
  /** Habla el protagonista en voz alta. */
  protagonista: boolean;
}

let patron: RegExp | null = null;

export function leerLinea(linea: string): Linea {
  patron ??= new RegExp(
    `^(${partida.datos.voces.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})` +
      String.raw`(?:\s*\(([^)]+)\))?:\s+(.+)$`,
  );
  const m = linea.match(patron);
  if (!m) return { texto: linea, protagonista: false };
  return { quien: m[1], pose: m[2], texto: m[3], protagonista: m[1] === partida.datos.protagonista };
}

/** Lo que queda por enseñar de lo leído de Ink. Los avisos salen cuando se ha mostrado. */
export type Paso =
  | { linea: string; avisos?: Aviso[] }
  | { pensar: string[]; avisos?: Aviso[] }
  | { ver: string; pensamientos?: string[]; avisos?: Aviso[] };

/**
 * Reúne un bloque: la línea `primera` (que Ink acaba de dar, con sus avisos) y
 * los pensamientos que le siguen. Se escriben juntos, sin clics. Lo que venga
 * después (alguien hablando, otro papel) se devuelve en `resto`, cada cosa con
 * sus propios avisos. También vale tras ~ ver("x"): se escribe sobre el papel.
 */
export function leerBloque(
  primera: string,
  avisosDePrimera: Aviso[] = [],
): { pensamientos: string[]; resto: Paso[]; avisos: Aviso[] } {
  const h = partida.historia;
  const pensamientos: string[] = [];
  const resto: Paso[] = [];
  const avisos: Aviso[] = [];
  let linea = primera;
  let deLinea = avisosDePrimera;
  for (;;) {
    if (linea && leerLinea(linea).quien) {
      resto.push({ linea, avisos: deLinea });
      break;
    }
    if (linea) pensamientos.push(linea);
    avisos.push(...deLinea);
    if (!h.canContinue) {
      // Se acabó: lo que quedara suelto al final también es de este bloque.
      avisos.push(...partida.tomarAvisos());
      break;
    }
    linea = (h.Continue() ?? "").trim();
    const otro = partida.tomarVer();
    // Una línea vacía no tiene a quién atar sus avisos: esperan a la siguiente.
    deLinea = linea || otro ? partida.tomarAvisos() : [];
    if (otro) {
      resto.push({ ver: otro, avisos: deLinea });
      if (linea) resto.push({ linea });
      break;
    }
  }
  return { pensamientos, resto, avisos };
}
