// Del montón de ficheros al modelo: ejes de tiempo y nivel, entidades y celdas.
import type { FicheroLeido } from "./carpeta";
import { type Celda, leerCeldas, leerDocumento, leerRango, TRANSVERSAL } from "./formato";

export const FICHERO_PROYECTO = "guionista.md";

export interface NodoTiempo {
  id: string;
  titulo: string;
  ruta: string;
}

export interface Entidad {
  ruta: string;
  tipo: string; // carpeta
  nombre: string;
  esTiempo: boolean;
  idTiempo?: string;
  aparece: Set<string> | null; // null = no lo dice el fichero
  fm: Record<string, string>;
  celdas: Map<string, Celda>;
}

export interface Proyecto {
  nombre: string;
  niveles: string[];
  carpetaTiempo: string;
  tiempos: NodoTiempo[];
  orden: string[];
  tipos: string[];
  entidades: Entidad[];
  imagenes: Map<string, FicheroLeido>; // por nombre de fichero, en minúsculas
  ficheros: Map<string, FicheroLeido>;
  tieneConfig: boolean;
}

export const NIVELES_POR_DEFECTO = ["Esquema", "Detalle", "Producción"];

function lista(v: string | undefined): string[] {
  if (!v) return [];
  return v.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}

const colador = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export function construirProyecto(ficheros: Map<string, FicheroLeido>, nombreCarpeta: string): Proyecto {
  const cfg = ficheros.get(FICHERO_PROYECTO);
  const fm = cfg?.texto ? leerDocumento(cfg.texto).frontmatter : {};
  const niveles = lista(fm.niveles).length ? lista(fm.niveles) : NIVELES_POR_DEFECTO;
  const carpetaTiempo = fm.tiempo || "tiempo";
  const nombre = fm.nombre || nombreCarpeta;

  const imagenes = new Map<string, FicheroLeido>();
  const mds: FicheroLeido[] = [];
  for (const f of ficheros.values()) {
    if (f.texto == null) imagenes.set(base(f.ruta).toLowerCase(), f);
    else if (f.ruta.includes("/")) mds.push(f);
  }
  mds.sort((a, b) => colador.compare(a.ruta, b.ruta));

  const tiempos: NodoTiempo[] = [];
  for (const f of mds) {
    if (carpeta(f.ruta) !== carpetaTiempo) continue;
    const doc = leerDocumento(f.texto!);
    const nom = base(f.ruta).replace(/\.md$/i, "");
    const id = doc.frontmatter.id || nom.split(/\s+/)[0];
    const titulo = nom.slice(nom.split(/\s+/)[0].length).replace(/^[\s·—-]+/, "") || nom;
    tiempos.push({ id, titulo, ruta: f.ruta });
  }
  const orden = tiempos.map((t) => t.id);

  const entidades: Entidad[] = [];
  const tipos: string[] = [];
  for (const f of mds) {
    const tipo = carpeta(f.ruta);
    const doc = leerDocumento(f.texto!);
    const esTiempo = tipo === carpetaTiempo;
    const nombreEnt = base(f.ruta).replace(/\.md$/i, "");
    const t = esTiempo ? tiempos.find((x) => x.ruta === f.ruta) : undefined;
    if (!esTiempo && !tipos.includes(tipo)) tipos.push(tipo);
    entidades.push({
      ruta: f.ruta,
      tipo,
      nombre: nombreEnt,
      esTiempo,
      idTiempo: t?.id,
      aparece: !esTiempo && doc.frontmatter.aparece != null ? leerRango(doc.frontmatter.aparece, orden) : null,
      fm: doc.frontmatter,
      celdas: leerCeldas(doc, esTiempo, t?.id),
    });
  }
  // guionista.md es la historia en la columna transversal (la premisa, a cada nivel).
  if (cfg?.texto) {
    entidades.push({ ruta: FICHERO_PROYECTO, tipo: carpetaTiempo, nombre, esTiempo: true, idTiempo: TRANSVERSAL, aparece: null, fm, celdas: leerCeldas(leerDocumento(cfg.texto), true, TRANSVERSAL) });
  }
  const ordenTipos = lista(fm.tipos);
  tipos.sort((a, b) => rangoTipo(a, ordenTipos) - rangoTipo(b, ordenTipos) || colador.compare(a, b));

  return { nombre, niveles, carpetaTiempo, tiempos, orden, tipos, entidades, imagenes, ficheros, tieneConfig: !!cfg };
}

function rangoTipo(t: string, orden: string[]) {
  const i = orden.indexOf(t);
  return i < 0 ? 999 : i;
}

export function base(ruta: string) {
  return ruta.slice(ruta.lastIndexOf("/") + 1);
}
function carpeta(ruta: string) {
  return ruta.slice(0, ruta.indexOf("/"));
}

export const clave = (tiempo: string, nivel: number) => `${tiempo}|${nivel}`;

export type Presencia = "presente" | "ausente" | "conflicto" | "libre";

/** Si la entidad está en ese punto del tiempo. 'conflicto' = tiene contenido donde dice que no aparece. */
export function presencia(e: Entidad, tiempo: string, niveles: number): Presencia {
  if (e.esTiempo || tiempo === TRANSVERSAL) return "presente";
  let tiene = false;
  for (let n = 1; n <= niveles; n++) {
    const c = e.celdas.get(clave(tiempo, n));
    if (c && (c.texto || Object.values(c.dims).some(Boolean))) tiene = true;
  }
  if (e.aparece == null) return tiene ? "presente" : "libre";
  if (e.aparece.has(tiempo)) return "presente";
  return tiene ? "conflicto" : "ausente";
}

/** Dimensiones que existen a ese nivel en cualquier entidad del mismo tipo (o en esa entidad). */
export function dimensiones(p: Proyecto, e: Entidad, nivel: number): string[] {
  const res = new Set<string>();
  const mismas = p.entidades.filter((x) => x === e || (x.tipo === e.tipo && x.esTiempo === e.esTiempo));
  for (const x of mismas)
    for (const [k, c] of x.celdas) if (k.endsWith(`|${nivel}`)) Object.keys(c.dims).forEach((d) => res.add(d));
  return [...res];
}

/** Busca una entidad por el texto de un [[enlace]]. */
export function porNombre(p: Proyecto, nombre: string): Entidad | undefined {
  const n = nombre.split("|")[0].split("#")[0].trim().toLowerCase();
  return p.entidades.find((e) => e.nombre.toLowerCase() === n || e.ruta.toLowerCase() === n + ".md");
}

// ---- Lecturas para las vistas ----------------------------------------------

/** Primer párrafo (la descripción breve) y el resto (la larga). */
export function partirBreve(texto: string): { breve: string; larga: string } {
  const t = texto.trim();
  const i = t.search(/\n\s*\n/);
  if (i < 0) return { breve: t, larga: "" };
  return { breve: t.slice(0, i).trim(), larga: t.slice(i).trim() };
}

export const historiaDe = (p: Proyecto, t: string) => p.entidades.find((e) => e.esTiempo && e.idTiempo === t);
export const textoDe = (e: Entidad | undefined, t: string, n: number) => e?.celdas.get(clave(t, n))?.texto ?? "";

/** Primera imagen ![[...]] de lo transversal de la ficha (cualquier nivel). */
export function imagenDe(e: Entidad): string | null {
  for (const [k, c] of e.celdas) {
    if (!k.startsWith(TRANSVERSAL + "|")) continue;
    for (const v of [c.texto, ...Object.values(c.dims)]) {
      const m = /!\[\[([^\]|]+)/.exec(v);
      if (m) return m[1].trim();
    }
  }
  return null;
}

/** Quita imágenes y la línea "Dónde:" para enseñar solo el texto. */
export function sinImagenes(t: string) {
  return t.replace(/!\[\[[^\]]+\]\]/g, "").replace(/^\s*D[oó]nde:.*$/gim, "").trim();
}

/** Papel de la ficha: primer párrafo de su transversal de nivel 1. */
export function papelDe(e: Entidad): string {
  return partirBreve(sinImagenes(textoDe(e, TRANSVERSAL, 1))).breve;
}

/** Lugares de la línea "Dónde: [[Parque]], [[Plaza]]" del nivel 1 de esa fase. */
export function dondeDe(e: Entidad, t: string): string[] {
  const m = /^\s*D[oó]nde:\s*(.+)$/im.exec(textoDe(e, t, 1));
  if (!m) return [];
  const enlaces = [...m[1].matchAll(/\[\[([^\]|]+)/g)].map((x) => x[1].trim());
  return enlaces.length ? enlaces : m[1].split(",").map((x) => x.trim()).filter(Boolean);
}

export function posicionDe(e: Entidad): { x: number; y: number } | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(e.fm.mapa ?? "");
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

export function conectaDe(e: Entidad): string[] {
  return (e.fm.conecta ?? "").replace(/^\[|\]$/g, "").replace(/\[\[|\]\]|"/g, "").split(",").map((x) => x.trim()).filter(Boolean);
}

/** Grafo de fases: columnas (F3.1 y F3.2 van juntas, son ramas) y flechas. `sigue:` manda sobre el orden. */
export function grafoDeTiempo(p: Proyecto): { columnas: NodoTiempo[][]; flechas: [string, string][] } {
  const columnas: NodoTiempo[][] = [];
  const raizDe = (id: string) => {
    const m = /^(.*)\.\d+$/.exec(id);
    return m && p.tiempos.some((t) => t.id !== id && t.id.startsWith(m[1] + ".")) ? m[1] : id;
  };
  const indice = new Map<string, number>();
  for (const t of p.tiempos) {
    const r = raizDe(t.id);
    if (!indice.has(r)) {
      indice.set(r, columnas.length);
      columnas.push([]);
    }
    columnas[indice.get(r)!].push(t);
  }
  const flechas: [string, string][] = [];
  columnas.forEach((col, i) => {
    for (const t of col) {
      const e = historiaDe(p, t.id);
      const sigue = (e?.fm.sigue ?? "").split(",").map((x) => x.trim()).filter(Boolean);
      const destinos = sigue.length ? sigue : (columnas[i + 1] ?? []).map((x) => x.id);
      for (const d of destinos) flechas.push([t.id, d]);
    }
  });
  return { columnas, flechas };
}
