// Acceso a la carpeta del proyecto con la File System Access API (Chrome/Edge).
import { get, set } from "idb-keyval";

export interface FicheroLeido {
  ruta: string; // relativa, con '/'
  modificado: number;
  texto?: string; // solo .md
  handle: FileSystemFileHandle;
}

const CLAVE = "carpeta";
const IGNORAR = /^\./; // .obsidian, .git, .trash…

export async function elegirCarpeta(): Promise<FileSystemDirectoryHandle> {
  const dir = await window.showDirectoryPicker({ mode: "readwrite", id: "guionista" });
  await recordar(dir);
  return dir;
}

// ---- Recientes ----
// El navegador no da la ruta completa de una carpeta, solo su nombre y un "handle"
// que se puede guardar y volver a abrir (pidiendo permiso otra vez).

export interface Reciente {
  nombre: string;
  handle: FileSystemDirectoryHandle;
  abierta: number;
}

const CLAVE_RECIENTES = "recientes";

export async function recientes(): Promise<Reciente[]> {
  try {
    return (await get<Reciente[]>(CLAVE_RECIENTES)) ?? [];
  } catch {
    return [];
  }
}

/** Pone la carpeta la primera de recientes y la deja como la de la última vez. */
export async function recordar(dir: FileSystemDirectoryHandle): Promise<void> {
  const lista = await recientes();
  const resto: Reciente[] = [];
  for (const r of lista) if (!(await r.handle.isSameEntry(dir))) resto.push(r);
  await set(CLAVE_RECIENTES, [{ nombre: dir.name, handle: dir, abierta: Date.now() }, ...resto].slice(0, 12));
  await set(CLAVE, dir);
}

/** Quita una carpeta de recientes (no borra nada del disco). */
export async function olvidar(dir: FileSystemDirectoryHandle): Promise<void> {
  const lista = await recientes();
  const resto: Reciente[] = [];
  for (const r of lista) if (!(await r.handle.isSameEntry(dir))) resto.push(r);
  await set(CLAVE_RECIENTES, resto);
  const ultima = await carpetaGuardada();
  if (ultima && (await ultima.isSameEntry(dir))) await set(CLAVE, undefined);
}

/** La carpeta de la última vez, si el navegador aún la tiene. */
export async function carpetaGuardada(): Promise<FileSystemDirectoryHandle | undefined> {
  try {
    return await get<FileSystemDirectoryHandle>(CLAVE);
  } catch {
    return undefined;
  }
}

/** true si ya hay permiso; si no, lo pide (necesita un clic del usuario). */
export async function permiso(dir: FileSystemDirectoryHandle, pedir: boolean): Promise<boolean> {
  const op = { mode: "readwrite" as const };
  if ((await dir.queryPermission(op)) === "granted") return true;
  if (!pedir) return false;
  return (await dir.requestPermission(op)) === "granted";
}

/** Recorre la carpeta. Reutiliza el texto de los .md que no han cambiado. */
export async function leerCarpeta(dir: FileSystemDirectoryHandle, previo?: Map<string, FicheroLeido>): Promise<Map<string, FicheroLeido>> {
  const res = new Map<string, FicheroLeido>();
  async function recorrer(d: FileSystemDirectoryHandle, prefijo: string) {
    for await (const [nombre, h] of d.entries()) {
      if (IGNORAR.test(nombre)) continue;
      const ruta = prefijo + nombre;
      if (h.kind === "directory") await recorrer(h as FileSystemDirectoryHandle, ruta + "/");
      else {
        const fh = h as FileSystemFileHandle;
        const esMd = nombre.toLowerCase().endsWith(".md");
        if (!esMd && !esImagen(nombre)) continue;
        const f = await fh.getFile();
        const ant = previo?.get(ruta);
        if (ant && ant.modificado === f.lastModified) res.set(ruta, ant);
        else res.set(ruta, { ruta, modificado: f.lastModified, handle: fh, texto: esMd ? await f.text() : undefined });
      }
    }
  }
  await recorrer(dir, "");
  return res;
}

export function esImagen(nombre: string) {
  return /\.(png|jpe?g|gif|webp|avif|svg)$/i.test(nombre);
}

export async function leerTexto(dir: FileSystemDirectoryHandle, ruta: string): Promise<string | null> {
  try {
    const fh = await handleFichero(dir, ruta, false);
    return await (await fh.getFile()).text();
  } catch {
    return null;
  }
}

export async function escribirTexto(dir: FileSystemDirectoryHandle, ruta: string, texto: string): Promise<void> {
  const fh = await handleFichero(dir, ruta, true);
  const w = await fh.createWritable();
  await w.write(texto);
  await w.close();
}

async function handleFichero(dir: FileSystemDirectoryHandle, ruta: string, crear: boolean): Promise<FileSystemFileHandle> {
  const partes = ruta.split("/");
  let d = dir;
  for (const p of partes.slice(0, -1)) d = await d.getDirectoryHandle(p, { create: crear });
  return d.getFileHandle(partes[partes.length - 1], { create: crear });
}

const urls = new Map<string, { modificado: number; url: string }>();
export async function urlImagen(f: FicheroLeido): Promise<string> {
  const c = urls.get(f.ruta);
  if (c && c.modificado === f.modificado) return c.url;
  if (c) URL.revokeObjectURL(c.url);
  const url = URL.createObjectURL(await f.handle.getFile());
  urls.set(f.ruta, { modificado: f.modificado, url });
  return url;
}
