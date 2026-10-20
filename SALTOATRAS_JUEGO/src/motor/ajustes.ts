// Los valores que se pueden ajustar en vivo desde el panel de debug (F2):
// tiempos, velocidades, posiciones, duraciones de animaciones…
//
// PARA AÑADIR UNO NUEVO: una línea en DEFS (nombre, grupo, etiqueta, valor por
// defecto, mínimo, máximo y paso) y, en el código, `ajuste("grupo.nombre")` en
// vez del número fijo. Léelo siempre en el momento de usarlo (no lo guardes en
// una constante al cargar el módulo): así el cambio se nota al instante.
//
// Los valores tocados se guardan en el navegador. Si luego se cambia el valor por
// defecto en este fichero, el valor guardado de ese ajuste se descarta solo.

export interface Def {
  id: string;
  grupo: string;
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  unidad?: string;
}

const DEFS = [
  // ---- Pensamientos (boli) ----
  { id: "boli.letrasPorSegundo", grupo: "Pensamientos · ritmo", etiqueta: "Velocidad de escritura", valor: 45, min: 10, max: 150, paso: 1, unidad: "letras/s" },
  { id: "boli.pausaEntreLineas", grupo: "Pensamientos · ritmo", etiqueta: "Pausa entre líneas", valor: 990, min: 0, max: 3000, paso: 10, unidad: "ms" },
  { id: "boli.pausaTachar", grupo: "Pensamientos · ritmo", etiqueta: "Pausa antes de tachar", valor: 940, min: 0, max: 3000, paso: 10, unidad: "ms" },
  { id: "boli.pausaSubrayar", grupo: "Pensamientos · ritmo", etiqueta: "Pausa tras subrayar", valor: 570, min: 0, max: 3000, paso: 10, unidad: "ms" },
  { id: "boli.vidaLinea", grupo: "Pensamientos · apagado", etiqueta: "Tiempo entera antes de apagarse", valor: 1500, min: 0, max: 10000, paso: 50, unidad: "ms" },
  { id: "boli.duracionApagado", grupo: "Pensamientos · apagado", etiqueta: "Duración del apagado", valor: 600, min: 0, max: 3000, paso: 10, unidad: "ms" },
  { id: "boli.opacidadApagado", grupo: "Pensamientos · apagado", etiqueta: "Opacidad al apagarse", valor: 0.55, min: 0, max: 1, paso: 0.01 },
  { id: "boli.parpadeoPunto", grupo: "Pensamientos · apagado", etiqueta: "Parpadeo del punto final", valor: 600, min: 100, max: 2000, paso: 10, unidad: "ms" },
  { id: "boli.tamanoNormal", grupo: "Pensamientos · letra", etiqueta: "Tamaño de la letra", valor: 24, min: 12, max: 60, paso: 1, unidad: "px" },
  { id: "boli.tamanoAparte", grupo: "Pensamientos · letra", etiqueta: "Tamaño de un aparte", valor: 18, min: 10, max: 48, paso: 1, unidad: "px" },
  { id: "boli.interlineado", grupo: "Pensamientos · letra", etiqueta: "Interlineado", valor: 0.9, min: 0.8, max: 2, paso: 0.01 },
  { id: "boli.inclinacion", grupo: "Pensamientos · letra", etiqueta: "Inclinación de la nota", valor: -1.2, min: -10, max: 10, paso: 0.1, unidad: "°" },

  // ---- Pensamientos: la tinta (color, contorno y brillo; el color se da como tono/saturación/luz) ----
  { id: "boli.tono", grupo: "Pensamientos · tinta", etiqueta: "Tono (0 rojo · 120 verde · 220 azul · 320 magenta)", valor: 218, min: 0, max: 360, paso: 1, unidad: "°" },
  { id: "boli.saturacion", grupo: "Pensamientos · tinta", etiqueta: "Saturación", valor: 100, min: 0, max: 100, paso: 1, unidad: "%" },
  { id: "boli.luz", grupo: "Pensamientos · tinta", etiqueta: "Luz (más alto = más claro)", valor: 83, min: 30, max: 100, paso: 1, unidad: "%" },
  { id: "boli.contorno", grupo: "Pensamientos · tinta", etiqueta: "Contorno oscuro", valor: 2.5, min: 0, max: 8, paso: 0.5, unidad: "px" },
  { id: "boli.brillo", grupo: "Pensamientos · tinta", etiqueta: "Brillo alrededor (como de tinta fluorescente)", valor: 0, min: 0, max: 24, paso: 1, unidad: "px" },

  // ---- Pensamientos: dónde salen ----
  { id: "pensamientos.x", grupo: "Pensamientos · posición", etiqueta: "x", valor: 59, min: 0, max: 960, paso: 1, unidad: "px" },
  { id: "pensamientos.y", grupo: "Pensamientos · posición", etiqueta: "y", valor: 317, min: 0, max: 540, paso: 1, unidad: "px" },
  { id: "pensamientos.ancho", grupo: "Pensamientos · posición", etiqueta: "Ancho máximo", valor: 679, min: 100, max: 960, paso: 1, unidad: "px" },
  { id: "pensamientos.alto", grupo: "Pensamientos · posición", etiqueta: "Alto de la zona (lo que cabe)", valor: 207, min: 20, max: 540, paso: 1, unidad: "px" },

  // ---- Texto hablado ----
  { id: "dialogo.letrasPorSegundo", grupo: "Texto hablado", etiqueta: "Velocidad de escritura", valor: 70, min: 10, max: 300, paso: 1, unidad: "letras/s" },

  // ---- Animaciones ----
  { id: "anim.rapida", grupo: "Animaciones", etiqueta: "Rápida (hover, cierres)", valor: 140, min: 0, max: 1500, paso: 10, unidad: "ms" },
  { id: "anim.normal", grupo: "Animaciones", etiqueta: "Normal (entrar/salir de capas)", valor: 240, min: 0, max: 2000, paso: 10, unidad: "ms" },
  { id: "anim.lenta", grupo: "Animaciones", etiqueta: "Lenta (aparecer personas, saltos)", valor: 700, min: 0, max: 4000, paso: 10, unidad: "ms" },

  // ---- Avisos ("+ La multa") ----
  { id: "aviso.x", grupo: "Avisos", etiqueta: "Posición x", valor: 16, min: 0, max: 960, paso: 1, unidad: "px" },
  { id: "aviso.y", grupo: "Avisos", etiqueta: "Posición y", valor: 16, min: 0, max: 540, paso: 1, unidad: "px" },
  { id: "aviso.tamano", grupo: "Avisos", etiqueta: "Tamaño de la letra", valor: 13, min: 8, max: 40, paso: 1, unidad: "px" },
  { id: "aviso.entra", grupo: "Avisos", etiqueta: "Tarda en aparecer", valor: 200, min: 0, max: 2000, paso: 10, unidad: "ms" },
  { id: "aviso.dura", grupo: "Avisos", etiqueta: "Se queda a la vista", valor: 1600, min: 200, max: 6000, paso: 50, unidad: "ms" },
  { id: "aviso.sale", grupo: "Avisos", etiqueta: "Tarda en irse", valor: 300, min: 0, max: 2000, paso: 10, unidad: "ms" },

  // ---- Llegada (partida nueva) ----
  { id: "llegada.cargaMinima", grupo: "Llegada", etiqueta: "\"Cargando\" como mínimo", valor: 500, min: 0, max: 5000, paso: 50, unidad: "ms" },
  { id: "llegada.apareceTexto", grupo: "Llegada", etiqueta: "El título tarda en aparecer", valor: 1400, min: 0, max: 5000, paso: 50, unidad: "ms" },
  { id: "llegada.textoMinimo", grupo: "Llegada", etiqueta: "El título se queda como mínimo", valor: 3800, min: 500, max: 12000, paso: 100, unidad: "ms" },
  // ---- Estilo del arte (filtros sobre fondos y personajes) ----
  { id: "estilo.saturacion", grupo: "Estilo · color", etiqueta: "Saturación", valor: 0, min: -1, max: 1, paso: 0.05 },
  { id: "estilo.contraste", grupo: "Estilo · color", etiqueta: "Contraste", valor: 0, min: -0.5, max: 1, paso: 0.05 },
  { id: "estilo.desenfoque", grupo: "Estilo · color", etiqueta: "Desenfoque", valor: 0, min: 0, max: 4, paso: 0.1 },
  { id: "estilo.rampa", grupo: "Estilo · paleta", etiqueta: "Paleta (0 ninguna · 1 sepia · 2 azul frío · 3 tinta B/N · 4 oliva · 5 tarde · 6 ámbar · 7 fósforo · 8 térmica · 9 infrarrojo · 10 CGA · 11 papel)", valor: 0, min: 0, max: 11, paso: 1 },
  { id: "estilo.rampaMezcla", grupo: "Estilo · paleta", etiqueta: "Cuánto se nota la paleta", valor: 1, min: 0, max: 1, paso: 0.05 },
  { id: "estilo.pasos", grupo: "Estilo · paleta", etiqueta: "Reducir colores (pasos por canal, 0 = no)", valor: 0, min: 0, max: 32, paso: 1 },
  { id: "estilo.tramado", grupo: "Estilo · paleta", etiqueta: "Tramado (0 no · 1 sí)", valor: 0, min: 0, max: 1, paso: 1 },
  { id: "estilo.estampa", grupo: "Estilo · estampa", etiqueta: "Estampa (0 ninguna · 1 tramado Bayer de paleta fija · 2 semitono de imprenta)", valor: 1, min: 0, max: 2, paso: 1 },
  { id: "estilo.estampaPaleta", grupo: "Estilo · estampa", etiqueta: "Paleta de la estampa (mismos números que la paleta de arriba)", valor: 5, min: 1, max: 11, paso: 1 },
  { id: "estilo.estampaColor", grupo: "Estilo · estampa", etiqueta: "Color: cuánto del color original se conserva en el tramado Bayer (0 = solo la paleta, que engrisece)", valor: 0.6, min: 0, max: 1, paso: 0.05 },
  { id: "estilo.estampaTamano", grupo: "Estilo · estampa", etiqueta: "Tamaño del punto o la celda", valor: 3, min: 1, max: 14, paso: 1, unidad: "px" },
  { id: "estilo.contorno", grupo: "Estilo · estampa", etiqueta: "Contorno de tinta en las siluetas (fuerza)", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "estilo.contornoGrosor", grupo: "Estilo · estampa", etiqueta: "Grosor del contorno", valor: 2, min: 1, max: 6, paso: 0.5, unidad: "px" },
  { id: "estilo.contornoUmbral", grupo: "Estilo · estampa", etiqueta: "Cuánto contraste hace falta para que haya línea", valor: 0.7, min: 0.05, max: 1.5, paso: 0.05 },
  { id: "estilo.vivoSalto", grupo: "Estilo · tramado vivo", etiqueta: "Hervor: la trama salta de sitio en cada fotograma, a ritmo fijo (0 = no · 0,3 suave · 0,5 medio · 1 fuerte)", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "estilo.vivoFps", grupo: "Estilo · tramado vivo", etiqueta: "Fotogramas por segundo del hervor (más bajo = más suave)", valor: 6, min: 2, max: 16, paso: 1, unidad: "fps" },
  { id: "estilo.bloques", grupo: "Estilo · textura", etiqueta: "Píxel grande (0 = no)", valor: 0, min: 0, max: 12, paso: 1, unidad: "px" },
  { id: "estilo.vineta", grupo: "Estilo · textura", etiqueta: "Viñeta (solo fondos)", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "estilo.grano", grupo: "Estilo · textura", etiqueta: "Grano", valor: 0, min: 0, max: 1, paso: 0.05 },

  // ---- Película antigua (capa viva sobre el lugar) ----
  { id: "peli.grano", grupo: "Película · capa", etiqueta: "Grano (se mueve)", valor: 0.25, min: 0, max: 1, paso: 0.05 },
  { id: "peli.fps", grupo: "Película · capa", etiqueta: "Fotogramas por segundo", valor: 16, min: 3, max: 30, paso: 1, unidad: "fps" },
  { id: "peli.parpadeo", grupo: "Película · capa", etiqueta: "Parpadeo de luz", valor: 0, min: 0, max: 0.3, paso: 0.01 },
  { id: "peli.rayas", grupo: "Película · capa", etiqueta: "Rayas de la cinta", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "peli.polvo", grupo: "Película · capa", etiqueta: "Motas y pelos", valor: 0.2, min: 0, max: 1, paso: 0.05 },
  { id: "peli.vineta", grupo: "Película · capa", etiqueta: "Bordes oscuros", valor: 0.1, min: 0, max: 1, paso: 0.05 },
  { id: "peli.respiracion", grupo: "Película · capa", etiqueta: "Los bordes respiran", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "peli.granoOscuro", grupo: "Película · capa", etiqueta: "Grano en conversaciones y papeles (multiplicador del grano de arriba)", valor: 0.5, min: 0, max: 1.5, paso: 0.05 },
  { id: "audio.musica", grupo: "Sonido", etiqueta: "Volumen de la música", valor: 0.5, min: 0, max: 1, paso: 0.05 },
  { id: "peli.comodidad", grupo: "Película · capa", etiqueta: "Comodidad: cuánto se mueve la imagen (1 normal · 0 quieta)", valor: 1, min: 0, max: 1, paso: 0.05 },
  { id: "peli.balanceo", grupo: "Película · capa", etiqueta: "Temblor del proyector", valor: 0, min: 0, max: 3, paso: 0.1, unidad: "px" },

  // ---- Película en los menús (portada y pausa): encima de todo, más fuerte que en el juego ----
  { id: "menu.grano", grupo: "Película · menús", etiqueta: "Grano", valor: 0.1, min: 0, max: 1, paso: 0.05 },
  { id: "menu.fps", grupo: "Película · menús", etiqueta: "Fotogramas por segundo", valor: 10, min: 3, max: 30, paso: 1, unidad: "fps" },
  { id: "menu.parpadeo", grupo: "Película · menús", etiqueta: "Parpadeo de luz", valor: 0.02, min: 0, max: 0.4, paso: 0.01 },
  { id: "menu.rayas", grupo: "Película · menús", etiqueta: "Rayas de la cinta", valor: 0.25, min: 0, max: 1, paso: 0.05 },
  { id: "menu.polvo", grupo: "Película · menús", etiqueta: "Motas y pelos", valor: 0.25, min: 0, max: 1, paso: 0.05 },
  { id: "menu.vineta", grupo: "Película · menús", etiqueta: "Bordes oscuros", valor: 0.5, min: 0, max: 1, paso: 0.05 },
  { id: "menu.respiracion", grupo: "Película · menús", etiqueta: "Los bordes respiran", valor: 0.15, min: 0, max: 1, paso: 0.05 },
  { id: "menu.balanceo", grupo: "Película · menús", etiqueta: "Temblor del proyector", valor: 0.6, min: 0, max: 3, paso: 0.1, unidad: "px" },

  // ---- Vida por zonas (se declaran en datos/lugares/*.yaml → vida:) ----
  { id: "vida.luz", grupo: "Película · zonas", etiqueta: "Luz cálida que respira", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "vida.motas", grupo: "Película · zonas", etiqueta: "Polvo flotando en la luz", valor: 0.35, min: 0, max: 1, paso: 0.05 },
  { id: "vida.agua", grupo: "Película · zonas", etiqueta: "Agua que tiembla", valor: 0, min: 0, max: 1, paso: 0.05 },
  { id: "vida.viento", grupo: "Película · zonas", etiqueta: "Viento en lo alto", valor: 0, min: 0, max: 1, paso: 0.05 },
] as const satisfies readonly Def[];

export type AjusteId = (typeof DEFS)[number]["id"];

const CLAVE = "salto-atras/ajustes";

const oyentes = new Set<() => void>();

const valores: Record<string, number> = Object.fromEntries(DEFS.map((d) => [d.id, d.valor]));

/** Recupera lo guardado: solo los valores cuyo defecto no ha cambiado desde que se guardaron. */
function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "{}") as Record<string, [number, number]>;
    for (const d of DEFS) {
      const g = guardado[d.id];
      if (g && g[1] === d.valor && Number.isFinite(g[0])) valores[d.id] = g[0];
    }
  } catch {
    // Sin almacenamiento o dañado: valen los de fábrica.
  }
}

function guardar() {
  try {
    const cambiados: Record<string, [number, number]> = {};
    for (const d of DEFS) if (valores[d.id] !== d.valor) cambiados[d.id] = [valores[d.id], d.valor];
    localStorage.setItem(CLAVE, JSON.stringify(cambiados));
  } catch {
    // Sin almacenamiento, los ajustes duran lo que dure la página.
  }
}

cargar();

/**
 * Lo que manda la historia por encima de lo guardado (un "ambiente", ver ambiente.ts):
 * mientras dura, estos valores se usan en vez de los del panel.
 */
const capa: Record<string, number> = {};

/** Lo que se mueve en la imagen: lo apaga o suaviza `peli.comodidad` (accesibilidad del jugador). */
const MOVIMIENTO = new Set(["estilo.vivoSalto", "menu.grano", "menu.parpadeo", "menu.rayas", "menu.polvo", "menu.respiracion", "menu.balanceo", "peli.grano", "peli.parpadeo", "peli.rayas", "peli.polvo", "peli.respiracion", "peli.balanceo", "vida.luz", "vida.motas", "vida.agua", "vida.viento"]);

/** El valor sin la comodidad: el del panel o, si hay un ambiente, el suyo. */
export function valorEfectivo(id: string): number {
  return capa[id] ?? valores[id];
}

/** El valor de un ajuste. Léelo en el momento de usarlo, no al cargar el módulo. */
export function ajuste(id: AjusteId): number {
  const v = valorEfectivo(id);
  return MOVIMIENTO.has(id) ? v * valores["peli.comodidad"] : v;
}

/** Cambia el ambiente (o lo quita con null). Avisa a quien repinte con los ajustes. */
export function ponerCapa(nueva: Record<string, number> | null, avisar = true) {
  for (const k of Object.keys(capa)) delete capa[k];
  Object.assign(capa, nueva ?? {});
  if (avisar) oyentes.forEach((f) => f());
}

export function definiciones(): readonly Def[] {
  return DEFS;
}

export function valorDe(id: string): number {
  return valores[id];
}

/** Avisa cada vez que cambia un ajuste (lo usa, p. ej., el estilo del arte para repintarse). */
export function alCambiarAjuste(fn: () => void) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

export function poner(id: string, valor: number, avisar = true) {
  if (!(id in valores) || !Number.isFinite(valor)) return;
  valores[id] = valor;
  guardar();
  if (avisar) oyentes.forEach((f) => f());
}

/** Un ajuste (o todos) vuelve a su valor de fábrica. */
export function restaurar(id?: string) {
  for (const d of DEFS) if (!id || d.id === id) valores[d.id] = d.valor;
  guardar();
  oyentes.forEach((f) => f());
}

export function haCambiado(d: Def) {
  return valores[d.id] !== d.valor;
}

/** Los valores como objeto, para copiar: todos o solo los que difieren del defecto. */
export function exportar(soloCambiados: boolean): Record<string, number> {
  const fuera: Record<string, number> = {};
  for (const d of DEFS) if (!soloCambiados || valores[d.id] !== d.valor) fuera[d.id] = valores[d.id];
  return fuera;
}
