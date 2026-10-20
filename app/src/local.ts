import { useEffect, useState } from "react";

/** Preferencias de este navegador (fila fijada, nivel…). Si no hay almacenamiento, se usa el valor inicial. */
export function leerLocal(k: string) {
  try {
    return localStorage.getItem("guionista." + k);
  } catch {
    return null;
  }
}

export function guardarLocal(k: string, v: string) {
  try {
    localStorage.setItem("guionista." + k, v);
  } catch {
    /* sin almacenamiento */
  }
}

export function useLocal<T>(k: string, inicial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const g = leerLocal(k);
      return g == null ? inicial : (JSON.parse(g) as T);
    } catch {
      return inicial;
    }
  });
  useEffect(() => guardarLocal(k, JSON.stringify(v)), [k, v]);
  return [v, setV];
}
