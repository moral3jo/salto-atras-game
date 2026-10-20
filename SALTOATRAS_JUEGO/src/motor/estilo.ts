// Qué estilo de arte se ve. Las imágenes de cada estilo se llaman
// `<nombre>-<letra>-<estilo>.png` (p. ej. `plaza-a-grabado`, `policia-b-oleo`).
// Sin estilo elegido se usa la imagen sin sufijo (`plaza`), como siempre.
// Es para probar estilos; cuando se elija uno, se quedan las imágenes sin sufijo.

export const ESTILOS = [
  { letra: "a", nombre: "Grabado" },
  { letra: "b", nombre: "Óleo" },
  { letra: "c", nombre: "Plano" },
  { letra: "d", nombre: "Acuarela" },
] as const;

const CLAVE = "salto-atras/estilo";
const VARIANTE = /-([a-z])-[a-z]+$/;

// Por defecto, el primero; "ninguno" se guarda como "-".
let actual: string | null = ESTILOS[0].letra;
try {
  const g = localStorage.getItem(CLAVE);
  if (g === "-") actual = null;
  else if (g && ESTILOS.some((e) => e.letra === g)) actual = g;
} catch {
  // Sin almacenamiento: el de por defecto.
}

const oyentes = new Set<() => void>();

export const estiloActual = () => actual;

export function ponerEstilo(letra: string | null) {
  actual = letra;
  try {
    localStorage.setItem(CLAVE, letra ?? "-");
  } catch {
    // Dura lo que dure la página.
  }
  oyentes.forEach((f) => f());
}

export function alCambiarEstilo(fn: () => void) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

/** ¿Es una imagen de un estilo concreto (y no una imagen normal)? */
export const esVariante = (nombre: string) => VARIANTE.test(nombre);

/** La imagen que toca para `nombre` con el estilo elegido; si no hay, la normal. */
export function imagenDe(nombre: string, imagenes: Record<string, string>): string {
  if (!actual) return nombre;
  const prefijo = `${nombre}-${actual}-`;
  return Object.keys(imagenes).find((n) => n.startsWith(prefijo)) ?? nombre;
}
