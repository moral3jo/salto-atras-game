// El panel de debug (F2): deslizadores para ajustar valores en vivo, botones de
// textos de prueba, copiar los valores y medir posiciones sobre el lienzo.
// Es HTML encima del juego, no parte del juego. Ver docs/DEBUG.md.

import "./panel.css";
import type * as Phaser from "phaser";
import { definiciones, exportar, haCambiado, poner, restaurar, valorDe, type Def } from "../motor/ajustes";
import { ambienteActual, cambiarAmbiente, nombresAmbientes } from "../motor/ambiente";
import { partida } from "../juego";
import { ESTILOS, alCambiarEstilo, esVariante, estiloActual, ponerEstilo } from "../motor/estilo";
import { MUESTRAS } from "./PruebaTextos";

const ANCHO_PANEL = 380;
const LIENZO = { ancho: 960, alto: 540 };
const CLAVE_CUADROS = "salto-atras/debug-cuadros";

interface Contexto {
  lugar: string;
  escenas: string[];
}

interface Cuadro {
  id: number;
  nota: string;
  rect: [number, number, number, number];
  lugar: string;
  escenas: string[];
}

let juego: Phaser.Game;
let contexto: () => Contexto;
let avisar: (texto: string) => void;
let panel: HTMLDivElement | undefined;
let capa: HTMLDivElement | undefined;
let observador: ResizeObserver | undefined;
let coordenadas: HTMLSpanElement | undefined;
let lista: HTMLDivElement | undefined;
let zonaAjustes: HTMLDivElement | undefined;
let zonaEstilo: HTMLDivElement | undefined;
let quitarOyenteEstilo: (() => void) | undefined;

let cuadros: Cuadro[] = [];
let siguienteId = 1;

// ---- Entrada ----

export function iniciarDebug(j: Phaser.Game, ctx: () => Contexto, lanzarAviso: (texto: string) => void) {
  juego = j;
  contexto = ctx;
  avisar = lanzarAviso;
  cuadros = cargarCuadros();
  siguienteId = Math.max(0, ...cuadros.map((c) => c.id)) + 1;
  window.addEventListener("keydown", (e) => {
    if (e.key === "F2") {
      e.preventDefault();
      alternar();
    }
  });
  // El menú de pausa lo abre sin conocer este módulo.
  window.addEventListener("debug:alternar", alternar);
}

function alternar() {
  if (panel) cerrar();
  else abrir();
}

// ---- Utilidades ----

type Props = Partial<Record<string, unknown>>;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...hijos: (Node | string)[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  Object.assign(e, props);
  e.append(...hijos);
  return e;
}

function boton(texto: string, alPulsar: (b: HTMLButtonElement) => void, titulo = ""): HTMLButtonElement {
  const b = el("button", { textContent: texto, title: titulo, type: "button" });
  b.addEventListener("click", () => alPulsar(b));
  return b;
}

/** Copia al portapapeles y avisa en el propio botón. */
async function copiar(texto: string, b: HTMLButtonElement) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const t = el("textarea", { value: texto });
    document.body.append(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
  const antes = b.textContent;
  b.textContent = "Copiado ✓";
  b.classList.add("ok");
  setTimeout(() => {
    b.textContent = antes;
    b.classList.remove("ok");
  }, 1300);
}

const redondear = (n: number) => Math.round(n);

// ---- Abrir y cerrar ----

function abrir() {
  panel = el("div", { id: "debug" });
  // Lo que se teclea aquí no llega al juego (el espacio, el Enter…).
  panel.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "F2") alternar();
  });
  panel.addEventListener("keyup", (e) => e.stopPropagation());

  coordenadas = el("span", { className: "coord", textContent: "x – · y –" });
  const cerrarBtn = boton("×", () => alternar(), "Cerrar (F2)");
  cerrarBtn.classList.add("cerrar");

  panel.append(
    el("header", {}, el("strong", { textContent: "Debug" }), coordenadas, cerrarBtn),
    barraCopiar(),
    pestanas(
      [
        "Estilo",
        (zonaEstilo = el("div", { className: "ajustes" })),
      ],
      [
        "General",
        el(
          "div",
          {},
          seccion("Textos de prueba", pruebas()),
          seccion("Avisos de prueba", pruebasAvisos()),
          seccion("Posiciones", posiciones()),
          (zonaAjustes = el("div", { className: "ajustes" })),
        ),
      ],
    ),
  );
  quitarOyenteEstilo = alCambiarEstilo(pintarEstilo);
  pintarAjustes();
  document.body.append(panel);

  capa = el("div", { id: "debug-capa" });
  document.body.append(capa);

  juego.canvas.addEventListener("mousemove", moverCoordenadas);
  observador = new ResizeObserver(posicionarCapa);
  observador.observe(juego.canvas);
  window.addEventListener("resize", posicionarCapa);

  hacerSitio(true);
  pintarCuadros();
}

function cerrar() {
  juego.canvas.removeEventListener("mousemove", moverCoordenadas);
  window.removeEventListener("resize", posicionarCapa);
  observador?.disconnect();
  panel?.remove();
  capa?.remove();
  quitarOyenteEstilo?.();
  panel = capa = coordenadas = lista = zonaAjustes = zonaEstilo = undefined;
  hacerSitio(false);
}

/** El juego se encoge a la izquierda para que el panel no tape nada. */
function hacerSitio(abierto: boolean) {
  const contenedor = document.getElementById("juego");
  if (contenedor) contenedor.style.width = abierto ? `calc(100% - ${ANCHO_PANEL}px)` : "";
  // Phaser guarda el tamaño del contenedor: hay que pedirle que lo vuelva a medir.
  juego.scale.getParentBounds();
  juego.scale.refresh();
  setTimeout(posicionarCapa, 60);
}

function moverCoordenadas(e: MouseEvent) {
  if (!coordenadas) return;
  const r = juego.canvas.getBoundingClientRect();
  const x = redondear(((e.clientX - r.left) / r.width) * LIENZO.ancho);
  const y = redondear(((e.clientY - r.top) / r.height) * LIENZO.alto);
  coordenadas.textContent = `x ${x} · y ${y}`;
}

function seccion(titulo: string, contenido: HTMLElement): HTMLDetailsElement {
  return el("details", { open: true }, el("summary", { textContent: titulo }), contenido);
}

// ---- Copiar ----

function barraCopiar(): HTMLElement {
  return el(
    "div",
    { className: "barra" },
    boton("Copiar cambiados", (b) => copiar(textoValores(true), b), "Solo los valores que has tocado"),
    boton("Copiar todos", (b) => copiar(textoValores(false), b), "Todos los valores, con los que no has tocado"),
    boton("Restaurar todo", () => {
      if (!confirm("¿Volver todos los valores a los de fábrica?")) return;
      restaurar();
      pintarAjustes();
    }),
  );
}

function textoValores(soloCambiados: boolean): string {
  const valores = exportar(soloCambiados);
  const estilo = `ESTILO ELEGIDO: ${ESTILOS.find((e) => e.letra === estiloActual())?.nombre ?? "ninguno"}`;
  if (!Object.keys(valores).length) return `${estilo}\nAJUSTES: ninguno cambiado (todo está como de fábrica)`;
  return `${estilo}\nAJUSTES (${soloCambiados ? "solo los cambiados" : "todos"})\n${JSON.stringify(valores, null, 2)}`;
}

// ---- Pestañas ----

function pestanas(...paginas: [string, HTMLElement][]): HTMLElement {
  const barra = el("nav", { className: "pestanas" });
  const cuerpo = el("div", {});
  const botones = paginas.map(([nombre, pagina]) => {
    const b = boton(nombre, () => elegir(paginas.findIndex(([n]) => n === nombre)));
    barra.append(b);
    cuerpo.append(pagina);
    return b;
  });
  const elegir = (n: number) => {
    paginas.forEach(([, p], i) => {
      p.hidden = i !== n;
      botones[i].classList.toggle("activo", i === n);
    });
    try {
      localStorage.setItem("salto-atras/debug-pestana", String(n));
    } catch {
      // Sin almacenamiento, abre la primera.
    }
  };
  let ultima = 0;
  try {
    ultima = Number(localStorage.getItem("salto-atras/debug-pestana")) || 0;
  } catch {
    // Vale la primera.
  }
  elegir(Math.min(ultima, paginas.length - 1));
  return el("div", {}, barra, cuerpo);
}

// ---- Estilo del arte ----

/** Los ajustes que tocan los botones de partida: filtros del estilo y la película. */
const esDeTinta = (d: Def) => d.grupo.startsWith("Pensamientos · tinta");
const esDeEstilo = (d: Def) => d.grupo.startsWith("Estilo") || d.grupo.startsWith("Película");
/** Lo que tocan los looks de partida: el estilo y la película del juego, no la de los menús. */
const esDeLook = (d: Def) => esDeEstilo(d) && !d.id.startsWith("menu.");

/** Todo apagado (la paleta, al máximo de mezcla; los fotogramas, a 12); cada botón nombra lo que enciende, con el id completo. */
const APAGADO: Record<string, number> = { "estilo.rampaMezcla": 1, "peli.fps": 12 };

const PELI_SUAVE = { "peli.grano": 0.4, "peli.parpadeo": 0.05, "peli.rayas": 0.4, "peli.polvo": 0.4, "peli.vineta": 0.4, "peli.respiracion": 0.5, "peli.balanceo": 0.4 };
const VIDA = { "vida.luz": 0.5, "vida.motas": 0.5, "vida.agua": 0.5, "vida.viento": 0.5 };

/** Combinaciones de partida: cada una pone todos los ajustes (los que no nombra, apagados). */
const PRESETS: { nombre: string; ayuda: string; valores: Record<string, number> }[] = [
  { nombre: "Todo apagado", ayuda: "La imagen tal cual, sin filtros ni vida", valores: {} },
  { nombre: "Película antigua", ayuda: "Grano vivo, parpadeo, rayas, motas, bordes que respiran, temblor y la vida por zonas", valores: { ...PELI_SUAVE, ...VIDA, "estilo.saturacion": -0.35, "estilo.contraste": 0.1 } },
  { nombre: "Cine mudo", ayuda: "Blanco y negro sucio, mucho grano y parpadeo", valores: { "estilo.saturacion": -1, "estilo.contraste": 0.3, "estilo.rampa": 3, "estilo.rampaMezcla": 0.85, "peli.grano": 0.8, "peli.fps": 10, "peli.parpadeo": 0.14, "peli.rayas": 0.9, "peli.polvo": 0.9, "peli.vineta": 0.7, "peli.respiracion": 0.7, "peli.balanceo": 1.2, ...VIDA } },
  { nombre: "Recuerdo sepia", ayuda: "Sepia suave, bordes que respiran, casi sin ruido: lo que se recuerda", valores: { "estilo.saturacion": -0.6, "estilo.rampa": 1, "estilo.rampaMezcla": 0.7, "peli.grano": 0.2, "peli.vineta": 0.6, "peli.respiracion": 0.8, "peli.balanceo": 0.2, ...VIDA } },
  { nombre: "Solo vida", ayuda: "Sin película: solo lo que se mueve por zonas (luz, polvo, agua, viento)", valores: { ...VIDA, "vida.luz": 0.6 } },
  { nombre: "Solo película", ayuda: "La capa de película sin lo de las zonas", valores: { ...PELI_SUAVE } },
  { nombre: "Grabado sepia", ayuda: "Foto → grabado: paleta sepia con tramado, viñeta y grano fijo", valores: { "estilo.saturacion": -0.7, "estilo.contraste": 0.2, "estilo.rampa": 1, "estilo.tramado": 1, "estilo.vineta": 0.35, "estilo.grano": 0.25 } },
  { nombre: "Tinta B/N", ayuda: "Muy Obra Dinn: tinta sobre papel, 3 pasos, tramado", valores: { "estilo.saturacion": -1, "estilo.contraste": 0.35, "estilo.rampa": 3, "estilo.pasos": 3, "estilo.tramado": 1, "estilo.grano": 0.2 } },
  { nombre: "Cartel 6 colores", ayuda: "Colores reducidos, sin tramado", valores: { "estilo.saturacion": 0.2, "estilo.contraste": 0.1, "estilo.pasos": 6 } },
  { nombre: "Píxel grande", ayuda: "Bloques de 4 px y 8 pasos con tramado", valores: { "estilo.pasos": 8, "estilo.tramado": 1, "estilo.bloques": 4 } },
];

/**
 * Pruebas de color: solo tocan los filtros de color (`estilo.*`) y dejan la película y la
 * vida como estén. Salen de las ideas de unificar gráficos dispares con una paleta cerrada.
 */
const COLORES: { nombre: string; ayuda: string; valores: Record<string, number> }[] = [
  { nombre: "Sin color", ayuda: "Quita los filtros de color (deja la película)", valores: {} },
  { nombre: "Ámbar de terminal", ayuda: "Tramado Bayer, 4 colores: ámbar oscuro a oro pálido", valores: { "estilo.estampa": 1, "estilo.estampaPaleta": 6, "estilo.estampaTamano": 3 } },
  { nombre: "Fósforo verde", ayuda: "Tramado Bayer, 4 verdes de monitor antiguo", valores: { "estilo.estampa": 1, "estilo.estampaPaleta": 7, "estilo.estampaTamano": 3 } },
  { nombre: "CGA 4 colores", ayuda: "Tramado Bayer con negro, magenta, cian y blanco", valores: { "estilo.estampa": 1, "estilo.estampaPaleta": 10, "estilo.estampaTamano": 3 } },
  { nombre: "Tinta y papel (Bayer)", ayuda: "Tramado Bayer, 4 tonos de tinta sobre papel: lo más Obra Dinn", valores: { "estilo.estampa": 1, "estilo.estampaPaleta": 11, "estilo.estampaTamano": 2 } },
  { nombre: "Bayer con algo de color", ayuda: "El tramado Bayer conservando un tercio del color original: se engrisece menos", valores: { "estilo.estampa": 1, "estilo.estampaPaleta": 5, "estilo.estampaTamano": 3, "estilo.estampaColor": 0.35 } },
  { nombre: "Bayer con color", ayuda: "El tramado Bayer con casi todo el color original (solo la luz va tramada)", valores: { "estilo.estampa": 1, "estilo.estampaPaleta": 5, "estilo.estampaTamano": 3, "estilo.estampaColor": 0.8 } },
  { nombre: "Dúo térmico", ayuda: "Mapa de degradado sin tramado: azul marino, magenta y perla", valores: { "estilo.rampa": 8, "estilo.rampaMezcla": 1, "estilo.contraste": 0.15 } },
  { nombre: "Infrarrojo", ayuda: "Mapa de degradado: violeta, rojo, naranja y crema", valores: { "estilo.rampa": 9, "estilo.rampaMezcla": 1, "estilo.contraste": 0.1 } },
  { nombre: "Semitono fanzine", ayuda: "Puntos de imprenta, tinta oscura sobre papel", valores: { "estilo.estampa": 2, "estilo.estampaPaleta": 11, "estilo.estampaTamano": 3 } },
  { nombre: "Semitono ámbar", ayuda: "Puntos de imprenta con la paleta ámbar", valores: { "estilo.estampa": 2, "estilo.estampaPaleta": 6, "estilo.estampaTamano": 3 } },
  { nombre: "Contorno de tinta", ayuda: "Línea oscura en todas las siluetas (Sobel), colores intactos", valores: { "estilo.contorno": 0.9, "estilo.contornoGrosor": 2, "estilo.contornoUmbral": 0.7, "estilo.estampaPaleta": 11 } },
  { nombre: "Contorno + sepia", ayuda: "Contorno de tinta sobre la paleta sepia", valores: { "estilo.contorno": 0.9, "estilo.contornoGrosor": 2, "estilo.estampaPaleta": 11, "estilo.saturacion": -0.6, "estilo.rampa": 1, "estilo.rampaMezcla": 0.8 } },
  { nombre: "Semitono + contorno", ayuda: "Todo junto: puntos de imprenta y línea de tinta", valores: { "estilo.estampa": 2, "estilo.estampaPaleta": 11, "estilo.estampaTamano": 3, "estilo.contorno": 0.8, "estilo.contornoGrosor": 2 } },
];

/** Aplica una prueba de color: solo los `estilo.*`, los que no nombra a cero (la mezcla de la paleta, a 1). */
/**
 * Tramado vivo: el hervor de la trama (la trama salta de sitio a saltos de fotograma, a ritmo
 * fijo, y la imagen no cambia). Cada botón también pone el grano de la película. Probado y
 * descartado: puntos sueltos que cambian, ondular, deslizar y hacer respirar el brillo.
 */
const VIVOS: { nombre: string; ayuda: string; valores: Record<string, number> }[] = [
  { nombre: "A · Obra Dinn con grano", ayuda: "La trama quieta; el movimiento lo da el grano de la película a 0,25 (el de fábrica)", valores: { "peli.grano": 0.25, "peli.fps": 16 } },
  { nombre: "B · Obra Dinn quieto", ayuda: "Todo quieto: sin grano ni movimiento de la trama", valores: { "peli.grano": 0 } },
  { nombre: "C · Hervor estable", ayuda: "La trama salta de sitio en cada fotograma, a 8 fps y sin pausas. Sin grano", valores: { "peli.grano": 0, "estilo.vivoSalto": 0.5, "estilo.vivoFps": 8 } },
  { nombre: "D · Hervor suave", ayuda: "Saltos pequeños (2×2 sitios) a 5 fps. Sin grano", valores: { "peli.grano": 0, "estilo.vivoSalto": 0.3, "estilo.vivoFps": 5 } },
  { nombre: "E · Hervor muy suave", ayuda: "Saltos pequeños a 3 fps: casi como respirar. Sin grano", valores: { "peli.grano": 0, "estilo.vivoSalto": 0.3, "estilo.vivoFps": 3 } },
  { nombre: "F · Grano + hervor suave", ayuda: "El grano de fábrica con un hervor suave por debajo", valores: { "peli.grano": 0.25, "peli.fps": 16, "estilo.vivoSalto": 0.3, "estilo.vivoFps": 4 } },
];

function aplicarVivo(valores: Record<string, number>) {
  const defs = definiciones().filter((d) => d.id.startsWith("estilo.vivo"));
  const base: Record<string, number> = { "estilo.vivoFps": 6 };
  for (const [id, v] of Object.entries(valores)) if (!id.startsWith("estilo.vivo")) poner(id, v, false);
  defs.forEach((d, i) => poner(d.id, valores[d.id] ?? base[d.id] ?? 0, i === defs.length - 1));
  pintarEstilo();
}

function aplicarColor(valores: Record<string, number>) {
  // El movimiento del tramado (estilo.vivo*) no se toca aquí: es de los botones de "Tramado vivo".
  const defs = definiciones().filter((d) => d.id.startsWith("estilo.") && !d.id.startsWith("estilo.vivo"));
  const todo: Record<string, number> = { "estilo.rampaMezcla": 1, "estilo.contornoGrosor": 2, "estilo.contornoUmbral": 0.7, "estilo.estampaPaleta": 6, "estilo.estampaTamano": 3, ...valores };
  defs.forEach((d, i) => poner(d.id, todo[d.id] ?? 0, i === defs.length - 1));
  pintarEstilo();
}

function aplicarPreset(valores: Record<string, number>) {
  // La comodidad es de quien juega, no de un look: los botones no la tocan.
  const defs = definiciones().filter((d) => esDeLook(d) && d.id !== "peli.comodidad");
  const todo = { ...APAGADO, ...valores };
  defs.forEach((d, i) => poner(d.id, todo[d.id] ?? (d.id.startsWith("estilo.") || d.id.startsWith("peli.") || d.id.startsWith("vida.") ? 0 : d.valor), i === defs.length - 1));
  pintarEstilo();
}

/** Colores de partida para la tinta de los pensamientos (mismos ids que los deslizadores). */
const TINTAS: { nombre: string; ayuda: string; valores: Record<string, number> }[] = [
  { nombre: "Azul actual", ayuda: "El azul pálido de siempre, con contorno (el de fábrica)", valores: { "boli.tono": 218, "boli.saturacion": 100, "boli.luz": 83, "boli.contorno": 2.5, "boli.brillo": 0 } },
  { nombre: "Azul eléctrico", ayuda: "Más saturado y oscuro, con un brillo azul", valores: { "boli.tono": 214, "boli.saturacion": 100, "boli.luz": 62, "boli.contorno": 3, "boli.brillo": 8 } },
  { nombre: "Cian", ayuda: "Frío y muy lejos de los ocres del juego", valores: { "boli.tono": 190, "boli.saturacion": 100, "boli.luz": 55, "boli.contorno": 5, "boli.brillo": 5 } },
  { nombre: "Rojo corrección", ayuda: "Tinta roja de corregir", valores: { "boli.tono": 6, "boli.saturacion": 95, "boli.luz": 64, "boli.contorno": 3, "boli.brillo": 6 } },
  { nombre: "Magenta", ayuda: "Rosa fuerte: nada del juego se le parece", valores: { "boli.tono": 320, "boli.saturacion": 100, "boli.luz": 70, "boli.contorno": 3, "boli.brillo": 8 } },
  { nombre: "Verde subrayador", ayuda: "Fluorescente", valores: { "boli.tono": 100, "boli.saturacion": 100, "boli.luz": 62, "boli.contorno": 3, "boli.brillo": 8 } },
  { nombre: "Blanco tiza", ayuda: "Casi blanco con contorno oscuro", valores: { "boli.tono": 40, "boli.saturacion": 10, "boli.luz": 96, "boli.contorno": 3, "boli.brillo": 0 } },
];

function aplicarTinta(valores: Record<string, number>) {
  const ids = Object.keys(valores);
  ids.forEach((id, i) => poner(id, valores[id], i === ids.length - 1));
  pintarEstilo();
}

function pintarEstilo() {
  if (!zonaEstilo) return;
  zonaEstilo.replaceChildren();
  const actual = estiloActual();

  const estilos = el("div", { className: "botones" });
  const ninguno = boton("Ninguno", () => ponerEstilo(null), "Sin imágenes de estilo: lo de siempre");
  ninguno.classList.toggle("activo", actual === null);
  estilos.append(ninguno);
  for (const e of ESTILOS) {
    const b = boton(`${e.letra.toUpperCase()} · ${e.nombre}`, () => ponerEstilo(e.letra));
    b.classList.toggle("activo", actual === e.letra);
    estilos.append(b);
  }
  const colores = el("div", { className: "botones" }, ...COLORES.map((p) => boton(p.nombre, () => aplicarColor(p.valores), p.ayuda)));
  const vivos = el("div", { className: "botones" }, ...VIVOS.map((p) => boton(p.nombre, () => aplicarVivo(p.valores), p.ayuda)));
  const presets = el("div", { className: "botones" }, ...PRESETS.map((p) => boton(p.nombre, () => aplicarPreset(p.valores), p.ayuda)));

  const ambientes = el("div", { className: "botones" });
  for (const n of ["", ...nombresAmbientes()]) {
    const b = boton(n || "Normal", () => {
      cambiarAmbiente(n);
      pintarEstilo();
    });
    b.classList.toggle("activo", ambienteActual() === n);
    ambientes.append(b);
  }

  zonaEstilo.append(
    ...(Object.keys(partida.datos.imagenes).some(esVariante) ? [seccion("Imágenes (estilo)", el("div", {}, estilos, el("p", { className: "nota", textContent: "Cambia al instante el fondo y la persona de la escena que estés viendo (plaza y policía tienen los 4)." })))] : []),
    seccion("Ambientes de la historia", el("div", {}, ambientes, el("p", { className: "nota", textContent: "Los que declara juego.yaml (ambientes:); la historia los pide con ambiente(\"nombre\"). Mientras uno está puesto, manda sobre los deslizadores de abajo (que enseñan el valor normal)." }))),
    seccion("Pruebas de color", el("div", {}, colores, el("p", { className: "nota", textContent: "Solo cambian los filtros de color: la película y la vida se quedan como estén. Tramado Bayer, semitono y contorno son filtros propios (src/ui/filtros.ts)." }))),
    seccion("Tramado vivo", el("div", {}, vivos, el("p", { className: "nota", textContent: "Mueven la trama del tramado Bayer (hace falta Estampa 1) sin cambiar la imagen. Cada botón también pone el grano de la película. Con \"Movimiento: Quieto\" no se mueven." }))),
    seccion("Looks de partida", el("div", {}, presets, el("p", { className: "nota", textContent: "Cada botón pone todo de golpe (filtros, película y vida por zonas). Luego afina con los deslizadores." }))),
  );
  const tintas = el("div", { className: "botones" }, ...TINTAS.map((t) => boton(t.nombre, () => aplicarTinta(t.valores), t.ayuda)));
  tintas.append(boton("▶ Probar (tachados)", () => lanzarPrueba(MUESTRAS.marcas.lineas), "Escribe un bloque de prueba con la tinta de ahora"));
  zonaEstilo.append(
    seccion("Tinta de los pensamientos", el("div", {},
      tintas,
      el("p", { className: "nota", textContent: "Solo cambia lo que se escriba a partir de ahora: pulsa Probar. Tiene que verse muy distinta del resto del juego (ocres, cremas)." }),
      ...definiciones().filter(esDeTinta).map(fila),
    )),
  );
  const grupos = new Map<string, Def[]>();
  for (const d of definiciones()) if (esDeEstilo(d)) grupos.set(d.grupo, [...(grupos.get(d.grupo) ?? []), d]);
  for (const [nombre, defs] of grupos) zonaEstilo.append(seccion(nombre, el("div", {}, ...defs.map(fila))));
}

// ---- Textos de prueba ----

function pruebas(): HTMLElement {
  const botones = Object.values(MUESTRAS).map((m) => boton(m.nombre, () => lanzarPrueba(m.lineas)));
  return el(
    "div",
    { className: "botones" },
    ...botones,
    el("p", { className: "nota", textContent: "Salen donde salen los pensamientos. Se cierran con un clic cuando acaban." }),
  );
}

function pruebasAvisos(): HTMLElement {
  return el(
    "div",
    { className: "botones" },
    boton("Aviso corto", () => avisar("La multa")),
    boton("Aviso largo", () => avisar("¿Quién ha dejado cerrado el ayuntamiento?")),
    boton("Tres seguidos", () => ["La multa", "El municipal", "La nota del alcalde"].forEach(avisar)),
    el("p", { className: "nota", textContent: "Salen como los de verdad (arriba a la izquierda). Hay que estar dentro del juego, no en la portada." }),
  );
}

function lanzarPrueba(lineas: string[]) {
  juego.scene.stop("pruebatextos");
  juego.scene.start("pruebatextos", { lineas });
}

// ---- Ajustes ----

function pintarAjustes() {
  if (!zonaAjustes) return;
  zonaAjustes.replaceChildren();
  pintarEstilo();
  const grupos = new Map<string, Def[]>();
  for (const d of definiciones()) if (!esDeEstilo(d) && !esDeTinta(d)) grupos.set(d.grupo, [...(grupos.get(d.grupo) ?? []), d]);
  for (const [nombre, defs] of grupos) {
    zonaAjustes.append(seccion(nombre, el("div", {}, ...defs.map(fila))));
  }
}

function fila(d: Def): HTMLElement {
  const rango = el("input", { type: "range", min: d.min, max: d.max, step: d.paso, value: valorDe(d.id) });
  const numero = el("input", { type: "number", step: d.paso, value: valorDe(d.id), className: "numero" });
  const f = el("div", { className: "fila" });
  const marcar = () => f.classList.toggle("cambiado", haCambiado(d));

  const poner_ = (v: number) => {
    if (!Number.isFinite(v)) return;
    poner(d.id, v);
    rango.value = String(v);
    numero.value = String(v);
    marcar();
  };
  rango.addEventListener("input", () => poner_(Number(rango.value)));
  numero.addEventListener("input", () => poner_(Number(numero.value)));

  f.append(
    el("label", {}, d.etiqueta, el("small", { textContent: d.id })),
    el(
      "div",
      { className: "mando" },
      rango,
      numero,
      el("span", { className: "unidad", textContent: d.unidad ?? "" }),
      boton("↺", () => {
        restaurar(d.id);
        poner_(d.valor);
      }, `Valor de fábrica: ${d.valor}`),
    ),
  );
  marcar();
  return f;
}

// ---- Posiciones: cuadrados sobre el lienzo ----

function posiciones(): HTMLElement {
  lista = el("div", { className: "cuadros" });
  return el(
    "div",
    {},
    el(
      "div",
      { className: "botones" },
      boton("▭ Dibujar cuadrado", (b) => dibujarCuadrado(b), "Arrastra sobre el juego"),
      boton("Copiar posiciones", (b) => copiar(textoPosiciones(), b)),
      boton("Borrar todos", () => {
        cuadros = [];
        guardarCuadros();
        pintarCuadros();
      }),
    ),
    el("p", { className: "nota", textContent: "Pulsa y arrastra sobre el juego. Coordenadas en el lienzo de 960×540, con el lugar donde estabas." }),
    lista,
  );
}

function textoPosiciones(): string {
  if (!cuadros.length) return "POSICIONES: ninguna";
  const lineas = cuadros.map(
    (c) => `#${c.id} [${c.lugar} · ${c.escenas.join(",")}] ${c.nota || "(sin nota)"} → zona: [${c.rect.join(", ")}]`,
  );
  return `POSICIONES (lienzo ${LIENZO.ancho}×${LIENZO.alto}; zona = [x, y, ancho, alto])\n${lineas.join("\n")}`;
}

/** Un solo cuadrado: pulsa y arrastra sobre el juego. Volver a pulsar el botón cancela. */
function dibujarCuadrado(b: HTMLButtonElement) {
  if (!capa) return;
  if (capa.classList.contains("dibujando")) return terminar();

  const lienzo = capa;
  lienzo.classList.add("dibujando");
  b.classList.add("activo");
  const banda = el("div", { className: "banda" });
  lienzo.append(banda);
  let inicio: { x: number; y: number } | null = null;

  const aLienzo = (e: PointerEvent) => {
    const r = lienzo.getBoundingClientRect();
    const limitar = (n: number, max: number) => Math.min(max, Math.max(0, n));
    return {
      x: limitar(((e.clientX - r.left) / r.width) * LIENZO.ancho, LIENZO.ancho),
      y: limitar(((e.clientY - r.top) / r.height) * LIENZO.alto, LIENZO.alto),
    };
  };
  const rectDe = (a: { x: number; y: number }, c: { x: number; y: number }) => ({
    x: Math.min(a.x, c.x),
    y: Math.min(a.y, c.y),
    w: Math.abs(a.x - c.x),
    h: Math.abs(a.y - c.y),
  });
  const pintar = (r: { x: number; y: number; w: number; h: number }) => {
    banda.style.left = `${(r.x / LIENZO.ancho) * 100}%`;
    banda.style.top = `${(r.y / LIENZO.alto) * 100}%`;
    banda.style.width = `${(r.w / LIENZO.ancho) * 100}%`;
    banda.style.height = `${(r.h / LIENZO.alto) * 100}%`;
  };

  const abajo = (e: PointerEvent) => {
    inicio = aLienzo(e);
    try {
      lienzo.setPointerCapture(e.pointerId);
    } catch {
      // Sin captura, el arrastre sigue funcionando mientras el puntero esté sobre el lienzo.
    }
    pintar({ ...inicio, w: 0, h: 0 });
  };
  const mover = (e: PointerEvent) => {
    if (inicio) pintar(rectDe(inicio, aLienzo(e)));
  };
  const arriba = (e: PointerEvent) => {
    if (!inicio) return;
    const r = rectDe(inicio, aLienzo(e));
    terminar();
    if (r.w < 4 || r.h < 4) return;
    const c = contexto();
    cuadros.push({
      id: siguienteId++,
      nota: "",
      rect: [redondear(r.x), redondear(r.y), redondear(r.w), redondear(r.h)],
      lugar: c.lugar,
      escenas: c.escenas,
    });
    guardarCuadros();
    pintarCuadros();
    lista?.querySelector<HTMLInputElement>(".cuadro:last-child input")?.focus();
  };
  function terminar() {
    lienzo.removeEventListener("pointerdown", abajo);
    lienzo.removeEventListener("pointermove", mover);
    lienzo.removeEventListener("pointerup", arriba);
    lienzo.classList.remove("dibujando");
    b.classList.remove("activo");
    banda.remove();
  }
  lienzo.addEventListener("pointerdown", abajo);
  lienzo.addEventListener("pointermove", mover);
  lienzo.addEventListener("pointerup", arriba);
}

/** La capa de los cuadrados mide lo mismo que el lienzo del juego. */
function posicionarCapa() {
  if (!capa) return;
  const r = juego.canvas.getBoundingClientRect();
  Object.assign(capa.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
}

function pintarCuadros() {
  posicionarCapa();
  if (capa) {
    capa.querySelectorAll(".cuadro-lienzo").forEach((e) => e.remove());
    for (const c of cuadros) {
      const [x, y, w, h] = c.rect;
      const caja = el("div", { className: "cuadro-lienzo", textContent: `#${c.id}${c.nota ? " " + c.nota : ""}` });
      Object.assign(caja.style, {
        left: `${(x / LIENZO.ancho) * 100}%`,
        top: `${(y / LIENZO.alto) * 100}%`,
        width: `${(w / LIENZO.ancho) * 100}%`,
        height: `${(h / LIENZO.alto) * 100}%`,
      });
      capa.append(caja);
    }
  }
  if (!lista) return;
  lista.replaceChildren();
  for (const c of cuadros) {
    const nota = el("input", { type: "text", placeholder: "qué es / qué va aquí…", value: c.nota });
    nota.addEventListener("input", () => {
      c.nota = nota.value;
      guardarCuadros();
      capa?.querySelectorAll<HTMLElement>(".cuadro-lienzo")[cuadros.indexOf(c)]?.replaceChildren(`#${c.id}${c.nota ? " " + c.nota : ""}`);
    });
    lista.append(
      el(
        "div",
        { className: "cuadro" },
        el("b", { textContent: `#${c.id}` }),
        nota,
        el("code", { textContent: `[${c.rect.join(", ")}]` }),
        el("em", { textContent: c.lugar }),
        boton("×", () => {
          cuadros = cuadros.filter((o) => o !== c);
          guardarCuadros();
          pintarCuadros();
        }, "Borrar"),
      ),
    );
  }
}

function cargarCuadros(): Cuadro[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVE_CUADROS) ?? "[]") as Cuadro[];
  } catch {
    return [];
  }
}

function guardarCuadros() {
  try {
    localStorage.setItem(CLAVE_CUADROS, JSON.stringify(cuadros));
  } catch {
    // Sin almacenamiento, duran lo que dure la página.
  }
}
