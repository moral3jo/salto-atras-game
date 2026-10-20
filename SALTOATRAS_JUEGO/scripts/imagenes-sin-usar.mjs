// Lista las imágenes de SALTOATRAS_ARTE/juego que el juego no nombra en ningún sitio.
// Uso: npm run imagenes
//
// Es una búsqueda de texto, no una ejecución: una imagen cuenta como usada si su nombre
// (sin extensión y sin el sufijo de estilo -a-grabado…) sale como palabra entera en `src/`
// o en `datos/` (yaml e ink), o si es la pose de un cuerpo (`<cuerpo>-<pose>`) y esa pose
// sale en el Ink. Lo que se carga montando el nombre en el código (p. ej. `${x}-${y}`)
// puede salir como "sin usar" aunque se use: mira antes de borrar.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";

const juego = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arte = join(juego, "..", "SALTOATRAS_ARTE", "juego");

function recorrer(dir, ok) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === "node_modules" || n === "dist") continue;
    if (statSync(p).isDirectory()) out.push(...recorrer(p, ok));
    else if (ok(n)) out.push(p);
  }
  return out;
}

const imagenes = recorrer(arte, (n) => extname(n).toLowerCase() === ".png");
const textos = [
  ...recorrer(join(juego, "src"), (n) => n.endsWith(".ts")),
  ...recorrer(join(juego, "datos"), (n) => /\.(yaml|ink)$/.test(n)),
];
const codigo = textos.map((p) => readFileSync(p, "utf8")).join("\n");
const ink = textos.filter((p) => p.endsWith(".ink")).map((p) => readFileSync(p, "utf8")).join("\n");
const cuerpos = [...codigo.matchAll(/^\s*cuerpo:\s*([\w-]+)/gm)].map((m) => m[1]);

// Los nombres de imagen son minúsculas, números y guiones: no hace falta escapar nada.
const esta = (texto, palabra) => new RegExp(String.raw`(?<![\w-])` + palabra + String.raw`(?![\w-])`).test(texto);

const sinUsar = [];
const repetidas = new Map();
for (const p of imagenes) {
  const nombre = basename(p, extname(p));
  repetidas.set(nombre, [...(repetidas.get(nombre) ?? []), relative(arte, p)]);
  const base = nombre.replace(/-[a-z]-[a-z]+$/, "");
  let usada = esta(codigo, nombre) || esta(codigo, base);
  if (!usada) {
    const cuerpo = cuerpos.find((c) => base.startsWith(c + "-"));
    if (cuerpo && esta(ink, base.slice(cuerpo.length + 1))) usada = true;
  }
  if (!usada) sinUsar.push(relative(arte, p).replaceAll("\\", "/"));
}

for (const [n, rutas] of repetidas) if (rutas.length > 1) console.log(`REPETIDA ${n}: ${rutas.join(", ")}`);
console.log(`${imagenes.length} imágenes, ${sinUsar.length} sin usar:\n`);
for (const r of sinUsar.sort()) console.log("  " + r);
