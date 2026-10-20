// Lectura y escritura del formato .md de Guionista (ver FORMATO.md).
// Todo es puro: recibe texto y devuelve texto. Al escribir una celda solo se
// tocan las líneas de esa celda; el resto del fichero se queda como estaba.

export interface Seccion {
  nivel: number; // número de '#'
  titulo: string;
  linea: number; // línea del encabezado
  fin: number; // primera línea que ya no es de la sección (siguiente encabezado de nivel <= o EOF)
  finPropio: number; // primera línea del primer subencabezado (o fin)
  hijos: Seccion[];
}

export interface Documento {
  lineas: string[];
  inicioCuerpo: number; // primera línea tras el frontmatter
  frontmatter: Record<string, string>;
  raiz: Seccion; // nivel 0, abarca todo el cuerpo
}

const RE_ENCABEZADO = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const RE_VALLA = /^\s*(```|~~~)/;

export function partirLineas(texto: string): string[] {
  return texto.replace(/\r\n?/g, "\n").split("\n");
}

export function leerDocumento(texto: string): Documento {
  const lineas = partirLineas(texto);
  let inicioCuerpo = 0;
  const frontmatter: Record<string, string> = {};
  if (lineas[0] === "---") {
    const cierre = lineas.indexOf("---", 1);
    if (cierre > 0) {
      for (const l of lineas.slice(1, cierre)) {
        const m = /^([\w\-áéíóúñ]+)\s*:\s*(.*)$/i.exec(l);
        if (m) frontmatter[m[1].toLowerCase()] = m[2].trim();
      }
      inicioCuerpo = cierre + 1;
    }
  }

  const raiz: Seccion = { nivel: 0, titulo: "", linea: inicioCuerpo - 1, fin: lineas.length, finPropio: lineas.length, hijos: [] };
  const pila: Seccion[] = [raiz];
  let enValla = false;
  for (let i = inicioCuerpo; i < lineas.length; i++) {
    if (RE_VALLA.test(lineas[i])) enValla = !enValla;
    if (enValla) continue;
    const m = RE_ENCABEZADO.exec(lineas[i]);
    if (!m) continue;
    const nivel = m[1].length;
    while (pila.length > 1 && pila[pila.length - 1].nivel >= nivel) pila.pop()!.fin = i;
    const padre = pila[pila.length - 1];
    if (padre.hijos.length === 0) padre.finPropio = i;
    const s: Seccion = { nivel, titulo: m[2], linea: i, fin: lineas.length, finPropio: lineas.length, hijos: [] };
    padre.hijos.push(s);
    pila.push(s);
  }
  for (const s of pila) s.fin = lineas.length;
  cerrarFinPropio(raiz);
  return { lineas, inicioCuerpo, frontmatter, raiz };
}

function cerrarFinPropio(s: Seccion) {
  if (s.hijos.length === 0) s.finPropio = s.fin;
  s.hijos.forEach(cerrarFinPropio);
}

/** Texto propio de una sección (sin subsecciones), sin líneas vacías al borde. */
export function textoPropio(doc: Documento, s: Seccion): string {
  return recortar(doc.lineas.slice(s.linea + 1, s.finPropio)).join("\n");
}

function recortar(ls: string[]): string[] {
  let a = 0, b = ls.length;
  while (a < b && ls[a].trim() === "") a++;
  while (b > a && ls[b - 1].trim() === "") b--;
  return ls.slice(a, b);
}

// ---- Coordenadas ----------------------------------------------------------

/** Una celda: en qué punto del tiempo ('T' = transversal), a qué nivel y en qué dimensión ('' = texto principal). */
export interface Coordenada {
  tiempo: string;
  nivel: number; // 1..n
  dim: string;
}

export const TRANSVERSAL = "T";

/** Primera palabra de un encabezado: "F3 · Fingen" -> "F3". */
export function claveEncabezado(titulo: string): string {
  return titulo.split(/[\s·—:-]+/)[0] ?? "";
}

export function nivelDeTitulo(titulo: string): number | null {
  const m = /^N(\d+)\b/i.exec(titulo.trim());
  return m ? Number(m[1]) : null;
}

export function tiempoDeTitulo(titulo: string): string {
  const k = claveEncabezado(titulo);
  return /^transversal$/i.test(k) ? TRANSVERSAL : k;
}

/**
 * Ruta de encabezados de una celda. En un nodo de tiempo el tiempo va implícito
 * (fichero = coordenada) y la ruta empieza en el nivel.
 */
type Paso = { coincide: (titulo: string) => boolean; titulo: string };

function rutaDe(c: Coordenada, esTiempo: boolean, nombresNivel: string[]): Paso[] {
  const pasos: Paso[] = [];
  if (!esTiempo) {
    pasos.push({
      coincide: (t) => tiempoDeTitulo(t) === c.tiempo,
      titulo: c.tiempo === TRANSVERSAL ? "Transversal" : c.tiempo,
    });
  }
  const nombre = nombresNivel[c.nivel - 1];
  pasos.push({ coincide: (t) => nivelDeTitulo(t) === c.nivel, titulo: nombre ? `N${c.nivel} · ${nombre}` : `N${c.nivel}` });
  if (c.dim) pasos.push({ coincide: (t) => t.trim().toLowerCase() === c.dim.toLowerCase(), titulo: c.dim });
  return pasos;
}

function buscar(raiz: Seccion, pasos: Paso[]): Seccion[] {
  const camino: Seccion[] = [];
  let actual = raiz;
  for (const p of pasos) {
    const s = actual.hijos.find((h) => p.coincide(h.titulo));
    if (!s) break;
    camino.push(s);
    actual = s;
  }
  return camino;
}

// ---- Lectura del modelo de un fichero ------------------------------------

export interface Celda {
  texto: string;
  dims: Record<string, string>;
}

/** Todas las celdas de un fichero, por clave "tiempo|nivel". */
export function leerCeldas(doc: Documento, esTiempo: boolean, idTiempo?: string): Map<string, Celda> {
  const res = new Map<string, Celda>();
  const leerNiveles = (padre: Seccion, tiempo: string) => {
    let n1Suelto = esTiempo ? "" : textoPropio(doc, padre);
    for (const s of padre.hijos) {
      const n = nivelDeTitulo(s.titulo);
      if (n == null) continue;
      const dims: Record<string, string> = {};
      for (const d of s.hijos) dims[d.titulo.trim()] = textoPropio(doc, d) + subtexto(doc, d);
      res.set(`${tiempo}|${n}`, { texto: textoPropio(doc, s), dims });
      if (n === 1) n1Suelto = "";
    }
    if (n1Suelto) res.set(`${tiempo}|1`, { texto: n1Suelto, dims: {} });
  };
  if (esTiempo) leerNiveles(doc.raiz.hijos.find((h) => h.nivel === 1) ?? doc.raiz, idTiempo!);
  else {
    const base = doc.raiz.hijos.find((h) => h.nivel === 1) ?? doc.raiz;
    for (const s of base.hijos) leerNiveles(s, tiempoDeTitulo(s.titulo));
  }
  return res;
}

function subtexto(doc: Documento, s: Seccion): string {
  if (s.hijos.length === 0) return "";
  return "\n\n" + recortar(doc.lineas.slice(s.finPropio, s.fin)).join("\n");
}

// ---- Escritura -----------------------------------------------------------

export interface OpcionesEscritura {
  esTiempo: boolean;
  nombresNivel: string[];
  ordenTiempo: string[]; // ids en orden, para insertar '## F3' en su sitio
}

/** Devuelve el fichero con el texto de esa celda sustituido (creando encabezados si faltan). */
export function escribirCelda(texto: string, c: Coordenada, nuevo: string, op: OpcionesEscritura): string {
  const doc = leerDocumento(texto);
  const lineas = [...doc.lineas];
  const base = doc.raiz.hijos.find((h) => h.nivel === 1) ?? doc.raiz;
  const pasos = rutaDe(c, op.esTiempo, op.nombresNivel);
  const camino = buscar(base, pasos);
  const cuerpo = recortar(partirLineas(nuevo));

  if (camino.length === pasos.length) {
    const s = camino[camino.length - 1];
    // En una dimensión el texto incluye sus subsecciones; en un nivel, solo el texto propio.
    const fin = c.dim ? s.fin : s.finPropio;
    reemplazarRegion(lineas, s.linea + 1, fin, cuerpo);
    return unir(lineas, texto);
  }

  // Caso N1 suelto: texto directamente bajo '## F3' sin '### N1'.
  if (!op.esTiempo && c.nivel === 1 && !c.dim && camino.length === 1) {
    const padre = camino[0];
    if (textoPropio(doc, padre)) {
      reemplazarRegion(lineas, padre.linea + 1, padre.finPropio, cuerpo);
      return unir(lineas, texto);
    }
  }

  if (cuerpo.length === 0) return texto; // nada que crear

  // Crear lo que falta debajo del último encabezado encontrado.
  const padre = camino.length ? camino[camino.length - 1] : base;
  const nivelHeading = (padre.nivel || 1) + 1;
  const faltan = pasos.slice(camino.length);
  const nuevas: string[] = [];
  faltan.forEach((p, i) => {
    nuevas.push("#".repeat(nivelHeading + i) + " " + p.titulo, "");
  });
  nuevas.push(...cuerpo, "");

  let pos = padre.fin;
  if (camino.length === 0 && !op.esTiempo) {
    // Insertar '## F3' en orden: Transversal primero, luego por orden de tiempo.
    // Las secciones que no son de tiempo ('## Notas') no cuentan para el orden.
    const rango = (t: string) => (t === TRANSVERSAL ? -1 : op.ordenTiempo.indexOf(t) >= 0 ? op.ordenTiempo.indexOf(t) : null);
    const mio = rango(c.tiempo) ?? op.ordenTiempo.length;
    const conRango = base.hijos.filter((h) => rango(tiempoDeTitulo(h.titulo)) != null);
    const sig = conRango.find((h) => rango(tiempoDeTitulo(h.titulo))! > mio);
    const ant = conRango.filter((h) => rango(tiempoDeTitulo(h.titulo))! < mio).pop();
    if (sig) pos = sig.linea;
    else if (ant) pos = ant.fin;
  } else if (faltan[0] && nivelDeTitulo(faltan[0].titulo) != null) {
    const sig = padre.hijos.find((h) => (nivelDeTitulo(h.titulo) ?? 0) > c.nivel);
    if (sig) pos = sig.linea;
  }
  // Separación con lo anterior
  if (pos > 0 && lineas[pos - 1]?.trim() !== "") nuevas.unshift("");
  if (pos >= lineas.length) {
    while (lineas.length && lineas[lineas.length - 1].trim() === "") lineas.pop();
    lineas.push(...(lineas.length ? [""] : []), ...trimFin(nuevas));
    return unir(lineas, texto) + "\n";
  }
  lineas.splice(pos, 0, ...nuevas);
  return unir(lineas, texto);
}

function trimFin(ls: string[]): string[] {
  const r = [...ls];
  while (r.length && r[r.length - 1] === "") r.pop();
  while (r.length && r[0] === "") r.shift();
  return r;
}

/** Sustituye el contenido no vacío de [a, b) respetando las líneas en blanco que ya hubiera alrededor. */
function reemplazarRegion(lineas: string[], a: number, b: number, cuerpo: string[]) {
  let i = a, j = b;
  while (i < j && lineas[i].trim() === "") i++;
  while (j > i && lineas[j - 1].trim() === "") j--;
  if (i < j) {
    lineas.splice(i, j - i, ...cuerpo);
    return;
  }
  // Región vacía: se mete con una línea en blanco delante y, si hay algo detrás, otra detrás.
  if (cuerpo.length === 0) return;
  const hayDetras = b < lineas.length;
  const enBlanco = b - a;
  const nuevo = ["", ...cuerpo, ...(hayDetras ? [""] : [])];
  lineas.splice(a, enBlanco, ...nuevo);
}

function unir(lineas: string[], original: string): string {
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  return lineas.join(eol);
}

// ---- Frontmatter ---------------------------------------------------------

/** Cambia (o añade, o quita con valor null) una clave del frontmatter sin tocar el resto. */
export function fijarFrontmatter(texto: string, clave: string, valor: string | null): string {
  const lineas = partirLineas(texto);
  const re = new RegExp(`^${clave}\\s*:`, "i");
  if (lineas[0] === "---") {
    const cierre = lineas.indexOf("---", 1);
    if (cierre > 0) {
      const i = lineas.slice(1, cierre).findIndex((l) => re.test(l));
      if (i >= 0) {
        if (valor == null) lineas.splice(i + 1, 1);
        else lineas[i + 1] = `${clave}: ${valor}`;
      } else if (valor != null) lineas.splice(cierre, 0, `${clave}: ${valor}`);
      return unir(lineas, texto);
    }
  }
  if (valor == null) return texto;
  return unir(["---", `${clave}: ${valor}`, "---", ...lineas], texto);
}

/** "F1-F3, F6" -> ids, usando el orden del tiempo para los rangos. */
export function leerRango(valor: string, orden: string[]): Set<string> {
  const res = new Set<string>();
  for (const trozo of valor.replace(/^\[|\]$/g, "").split(",").map((t) => t.trim()).filter(Boolean)) {
    const [a, b] = trozo.split(/\s*\.\.\s*|\s+-\s+|(?<=\w)-(?=[A-Za-z])/).map((t) => t.trim());
    const ia = orden.indexOf(a), ib = b ? orden.indexOf(b) : ia;
    if (ia >= 0 && ib >= 0) for (let i = Math.min(ia, ib); i <= Math.max(ia, ib); i++) res.add(orden[i]);
    else if (a) res.add(a);
  }
  return res;
}

/** Ids -> "F1-F3, F6", comprimiendo tramos seguidos. */
export function escribirRango(ids: Set<string>, orden: string[]): string {
  const partes: string[] = [];
  let i = 0;
  while (i < orden.length) {
    if (!ids.has(orden[i])) { i++; continue; }
    let j = i;
    while (j + 1 < orden.length && ids.has(orden[j + 1])) j++;
    partes.push(j - i >= 2 ? `${orden[i]}-${orden[j]}` : orden.slice(i, j + 1).join(", "));
    i = j + 1;
  }
  return partes.join(", ");
}
