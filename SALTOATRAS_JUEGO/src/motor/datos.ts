// Carga todo lo que hay en datos/ y lo comprueba. El motor no sabe nada de
// Medina: lo que pasa en el juego sale de aquí. Ver docs/FORMATO.md.

import { parse } from "yaml";
import { Compiler, CompilerOptions, JsonFileHandler, Story } from "inkjs/full";
import { definiciones } from "./ajustes";
import type { Ambiente } from "./ambiente";

/** Algo que se pincha en un lugar. Hace una de tres cosas: mirar, hablar o ir. */
export interface Cosa {
  id: string;
  nombre: string;
  zona: [number, number, number, number];
  /** Nudo de Ink que se lee al mirarla. */
  nudo?: string;
  /** Persona con la que se habla: su conversación es el nudo con_<persona>. */
  hablar?: string;
  /** Lugar al que se va. */
  ir?: string;
  si?: string;
  imagen?: string;
  /** Con `imagen`: false quita la sombra bajo la figura (un papel en la pared no la lleva). */
  sombra?: boolean;
}

/** Un efecto que solo ocurre en un trozo del fondo (ver docs/FORMATO.md → vida). */
export interface VidaZona {
  tipo: "luz" | "polvo" | "agua" | "viento";
  zona: [number, number, number, number];
}

export const TIPOS_VIDA = ["luz", "polvo", "agua", "viento"] as const;

export interface Lugar {
  id: string;
  nombre: string;
  fondo?: string;
  al_llegar?: string;
  cosas: Cosa[];
  vida?: VidaZona[];
}

export const TIPOS = ["persona", "sitio", "cosa", "evento"] as const;
export type Tipo = (typeof TIPOS)[number];

/** Lo que Martínez sabe. Está en el expediente y es un tema de conversación. */
export interface Ficha {
  id: string;
  tipo: Tipo;
  titulo: string;
  texto: string;
  /** Dibujo de la ficha (SALTOATRAS_ARTE/juego/<icono>.png). */
  icono?: string;
  /** Solo personas: cuerpo grande en la conversación; las poses son <cuerpo>-<pose>.png. */
  cuerpo?: string;
  /** Si va clavada en el panel (la pared) al conseguirla. */
  panel?: boolean;
  /** Cómo se ve de cerca con ~ ver("id"): un papel con su texto. */
  de_cerca?: { texto: string; imagen?: string; letra?: "mano" | "maquina" };
}

/** Una pregunta del panel. Se resuelve pensando: una respuesta y una prueba. */
export interface Posit {
  id: string;
  pregunta: string;
  /** La respuesta buena: el id de una ficha o, si hay opciones, una de ellas. */
  respuesta?: string;
  /** Si la respuesta no es una ficha sino a elegir ("Sí", "No"). */
  opciones?: string[];
  /** Fichas que la sostienen: vale cualquiera de ellas. */
  pruebas?: string[];
  /** Lo que queda escrito en el panel al resolverla. */
  conclusion?: string;
  /** Nudo de Ink que se lee al resolverla si se está hablando con esa persona. */
  al_resolver?: string;
}

export interface Datos {
  inicio: string;
  titulo: string;
  /** Aviso de contenido de la portada. */
  aviso: string;
  /** Quién puede hablar: "Nombre: texto" con uno de estos es habla; lo demás, pensamiento. */
  voces: string[];
  /** La voz del protagonista (habla en voz alta, sin cuerpo). */
  protagonista: string;
  /** Cómo se ve el juego en momentos de la historia (ver motor/ambiente.ts). */
  ambientes: Record<string, Ambiente>;
  /** La entrada de una partida nueva: un texto en negro y, si hay, un sonido. */
  llegada?: { texto?: string; sonido?: string };
  lugares: Record<string, Lugar>;
  fichas: Record<string, Ficha>;
  posits: Record<string, Posit>;
  historia: Story;
  /** Nombre de imagen → URL, de SALTOATRAS_ARTE/juego. */
  imagenes: Record<string, string>;
  /** Nombre de sonido → URL, de SALTOATRAS_ARTE/sonido. */
  sonidos: Record<string, string>;
  /** Todos los nudos y temas de Ink ("policia", "policia.multa"). */
  rutas: Set<string>;
  errores: string[];
}

/** Temas de una persona que no son fichas. Los que empiezan por _ también son libres. */
export const TEMAS_ESPECIALES = ["otro", "repetir"];
/** <ficha>_otra_vez: lo que se dice a partir de la segunda vez, en vez de repetir. */
export const OTRA_VEZ = "_otra_vez";
/** Nudo al que se va si la persona no tiene ni el tema ni "otro". */
export const SIN_RESPUESTA = "sin_respuesta";
/** El nudo de la conversación con una persona. Ink no deja que un tema se llame
 *  como un nudo, así que la conversación con "policia" es "con_policia". */
export const conversacion = (persona: string) => `con_${persona}`;

const yamls = import.meta.glob("../../datos/**/*.yaml", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

const inks = import.meta.glob("../../datos/historia/**/*.ink", {
  query: "?raw", import: "default", eager: true,
}) as Record<string, string>;

const pngs = import.meta.glob("../../../SALTOATRAS_ARTE/juego/*.png", {
  query: "?url", import: "default", eager: true,
}) as Record<string, string>;

const audios = import.meta.glob("../../../SALTOATRAS_ARTE/sonido/*.{mp3,ogg,wav}", {
  query: "?url", import: "default", eager: true,
}) as Record<string, string>;

const nombreDe = (ruta: string) => ruta.split("/").pop()!.replace(/\.\w+$/, "");

const PARTES = ["expediente", "panel", "pensar", "informe", "mapa"];

export const puerta = (ruta: string) => `__entrar_${ruta.replace(/\./g, "__")}`;

export function cargarDatos(): Datos {
  const errores: string[] = [];

  const leer = <T>(ruta: string): T => {
    const clave = Object.keys(yamls).find((k) => k.endsWith(ruta));
    if (!clave) {
      errores.push(`Falta datos/${ruta}`);
      return {} as T;
    }
    try {
      return (parse(yamls[clave]) ?? {}) as T;
    } catch (e) {
      errores.push(`datos/${ruta}: ${(e as Error).message}`);
      return {} as T;
    }
  };

  const juego = leer<{
    inicio: string; titulo?: string; aviso?: string; llegada?: Datos["llegada"]; voces?: string[]; protagonista?: string; ambientes?: Record<string, Ambiente>;
  }>("juego.yaml");
  if (!juego.voces?.length) errores.push("juego.yaml: falta la lista de voces (quién puede hablar)");

  const lugares: Record<string, Lugar> = {};
  for (const ruta of Object.keys(yamls).filter((k) => k.includes("/lugares/"))) {
    const id = nombreDe(ruta);
    const lugar = leer<Omit<Lugar, "id">>(`lugares/${id}.yaml`);
    lugares[id] = { id, ...lugar, cosas: lugar.cosas ?? [] };
  }

  const fichas: Record<string, Ficha> = {};
  for (const [id, f] of Object.entries(leer<Record<string, Omit<Ficha, "id">>>("expediente.yaml"))) {
    fichas[id] = { id, ...f, texto: (f.texto ?? "").trim() };
  }

  const posits: Record<string, Posit> = {};
  for (const [id, p] of Object.entries(leer<Record<string, Omit<Posit, "id">>>("panel.yaml"))) {
    posits[id] = { id, ...p };
  }

  const ficheros: Record<string, string> = {};
  for (const [ruta, texto] of Object.entries(inks)) ficheros[nombreDe(ruta) + ".ink"] = texto;
  const principal = ficheros["juego.ink"];
  if (!principal) errores.push("Falta datos/historia/juego.ink");

  // Cada nudo y cada tema llevan una puerta de entrada que los llama como
  // túnel: así acaban en ->-> y se pueden probar igual en Inky.
  const rutas = rutasDeInk(ficheros);
  const puertas = rutas.map((r) => `=== ${puerta(r)} ===\n-> ${r} ->\n-> DONE`).join("\n");

  let historia = null as unknown as Story;
  if (principal) {
    const compilador = new Compiler(
      principal + "\n" + puertas,
      new CompilerOptions(null, [], true, null, new JsonFileHandler(ficheros)),
    );
    try {
      historia = compilador.Compile();
    } catch (e) {
      if (!compilador.errors.length) errores.push(`Ink: ${(e as Error).message}`);
    }
    for (const e of compilador.errors) errores.push(`Ink: ${e}`);
  }

  if (historia && !errores.length) {
    comprobar({ juego: { ...juego, ambientes: juego.ambientes ?? {} }, lugares, fichas, posits, historia, ficheros, rutas }, errores);
  }

  const imagenes: Record<string, string> = {};
  for (const [ruta, url] of Object.entries(pngs)) imagenes[nombreDe(ruta)] = url;
  const sonidos: Record<string, string> = {};
  for (const [ruta, url] of Object.entries(audios)) sonidos[nombreDe(ruta)] = url;

  return { inicio: juego.inicio, titulo: juego.titulo ?? "", aviso: (juego.aviso ?? "").trim(), llegada: juego.llegada,
    voces: [...new Set([...(juego.voces ?? []), ...(juego.protagonista ? [juego.protagonista] : [])])],
    protagonista: juego.protagonista ?? "", ambientes: juego.ambientes ?? {}, lugares, fichas, posits, historia, imagenes, sonidos, rutas: new Set(rutas), errores };
}

/** "nudo" y "nudo.tema" de todos los ficheros de Ink, sin funciones. */
function rutasDeInk(ficheros: Record<string, string>): string[] {
  const rutas: string[] = [];
  for (const texto of Object.values(ficheros)) {
    let nudo: string | null = null;
    for (const linea of texto.split("\n")) {
      const n = linea.match(/^\s*={2,}\s*(function\s+)?(\w+)/);
      if (n) {
        nudo = n[1] ? null : n[2];
        if (nudo) rutas.push(nudo);
        continue;
      }
      const s = linea.match(/^\s*=\s*(\w+)/);
      if (s && nudo) rutas.push(`${nudo}.${s[1]}`);
    }
  }
  return rutas;
}

/** Que todo lo que se nombra en un sitio exista en el otro. */
function comprobar(
  d: {
    juego: { inicio: string; voces?: string[]; protagonista?: string; ambientes: Record<string, Ambiente> };
    lugares: Record<string, Lugar>;
    fichas: Record<string, Ficha>;
    posits: Record<string, Posit>;
    historia: Story;
    ficheros: Record<string, string>;
    rutas: string[];
  },
  errores: string[],
) {
  const hay = (nudo: string) => d.rutas.includes(nudo);
  const tocables = new Set(definiciones().map((a) => a.id).filter((id) => /^(peli|vida|estilo)\./.test(id)));
  for (const [nombre, a] of Object.entries(d.juego.ambientes)) {
    if (!a || typeof a.valores !== "object") errores.push(`juego.yaml → ambientes → ${nombre}: le falta "valores:"`);
    for (const [id, v] of Object.entries(a?.valores ?? {})) {
      if (!tocables.has(id) || id === "peli.comodidad") errores.push(`juego.yaml → ambientes → ${nombre}: "${id}" no se puede cambiar desde la historia (vale peli.*, vida.* y estilo.*, menos peli.comodidad)`);
      else if (typeof v !== "number") errores.push(`juego.yaml → ambientes → ${nombre}: "${id}" tiene que ser un número`);
    }
  }
  if (!d.lugares[d.juego.inicio]) errores.push(`juego.yaml: el inicio "${d.juego.inicio}" no es un lugar`);
  if (!hay(SIN_RESPUESTA)) errores.push(`historia: falta el nudo "${SIN_RESPUESTA}" (lo que pasa si alguien no tiene respuesta)`);

  for (const f of Object.values(d.fichas)) {
    if (!TIPOS.includes(f.tipo)) errores.push(`expediente.yaml → ${f.id}: tipo debe ser ${TIPOS.join(", ")}`);
    if (!f.titulo) errores.push(`expediente.yaml → ${f.id}: le falta el título`);
  }

  for (const p of Object.values(d.posits)) {
    const donde = `panel.yaml → ${p.id}`;
    if (!p.pregunta) errores.push(`${donde}: le falta la pregunta`);
    if (p.respuesta && !(p.opciones ? p.opciones.includes(p.respuesta) : d.fichas[p.respuesta])) {
      errores.push(`${donde}: la respuesta "${p.respuesta}" no es ${p.opciones ? "una de las opciones" : "una ficha"}`);
    }
    for (const prueba of p.pruebas ?? []) {
      if (!d.fichas[prueba]) errores.push(`${donde}: la prueba "${prueba}" no es una ficha`);
    }
    if (p.al_resolver && !hay(p.al_resolver)) errores.push(`${donde}: al_resolver "${p.al_resolver}" no existe en Ink`);
  }

  const personas = new Set<string>();
  for (const l of Object.values(d.lugares)) {
    if (l.al_llegar && !hay(l.al_llegar)) errores.push(`lugares/${l.id}.yaml: al_llegar "${l.al_llegar}" no es un nudo de Ink`);
    for (const v of l.vida ?? []) {
      const donde = `lugares/${l.id}.yaml → vida`;
      if (!(TIPOS_VIDA as readonly string[]).includes(v.tipo)) errores.push(`${donde}: el tipo "${v.tipo}" no existe (${TIPOS_VIDA.join(", ")})`);
      if (!Array.isArray(v.zona) || v.zona.length !== 4) errores.push(`${donde}: zona debe ser [x, y, ancho, alto]`);
    }
    for (const c of l.cosas) {
      const donde = `lugares/${l.id}.yaml → ${c.id ?? "?"}`;
      if (!c.id || !c.nombre) errores.push(`${donde}: le falta id o nombre`);
      if (!Array.isArray(c.zona) || c.zona.length !== 4) errores.push(`${donde}: zona debe ser [x, y, ancho, alto]`);
      const acciones = [c.nudo, c.hablar, c.ir].filter(Boolean).length;
      if (acciones !== 1) errores.push(`${donde}: tiene que tener una (y solo una) de nudo, hablar o ir`);
      if (c.nudo && !hay(c.nudo)) errores.push(`${donde}: el nudo "${c.nudo}" no existe en Ink`);
      if (c.ir && !d.lugares[c.ir]) errores.push(`${donde}: ir "${c.ir}" no es un lugar`);
      if (c.hablar) {
        if (!hay(conversacion(c.hablar))) errores.push(`${donde}: hablar "${c.hablar}" necesita un nudo "${conversacion(c.hablar)}" en Ink`);
        personas.add(conversacion(c.hablar));
      }
      if (c.si) {
        const nombre = c.si.replace(/^!/, "");
        if (!d.historia.HasFunction(nombre) && !d.historia.variablesState.GlobalVariableExistsWithName(nombre)) {
          errores.push(`${donde}: "si: ${c.si}" no es una función ni una variable de Ink`);
        }
      }
    }
  }

  // Cada tema de una persona tiene que ser una ficha: si no, nunca se podría preguntar.
  for (const nudo of personas) {
    const temas = d.rutas.filter((r) => r.startsWith(nudo + ".")).map((r) => r.slice(nudo.length + 1));
    for (const tema of temas) {
      if (d.fichas[tema] || TEMAS_ESPECIALES.includes(tema) || tema.startsWith("_")) continue;
      if (tema.endsWith(OTRA_VEZ) && d.fichas[tema.slice(0, -OTRA_VEZ.length)]) continue;
      errores.push(`historia: "${nudo}.${tema}" no es una ficha del expediente (¿mal escrito? los temas libres empiezan por _)`);
    }
  }

  const valido: Record<string, (x: string) => boolean> = {
    ir: (x) => !!d.lugares[x],
    ficha: (x) => !!d.fichas[x],
    posit: (x) => !!d.posits[x],
    pensar: (x) => !!d.posits[x],
    resuelta: (x) => !!d.posits[x],
    activar: (x) => PARTES.includes(x),
    ver: (x) => !!d.fichas[x]?.de_cerca,
  };
  // Una línea "Nombre: texto" solo es alguien hablando si Nombre está en las voces de
  // juego.yaml. Si no, sale como pensamiento. Si ese nombre es el de una persona del
  // expediente, casi seguro es un despiste: se avisa en vez de fallar en silencio.
  const sinAcentos = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const voces = new Set([...(d.juego.voces ?? []), ...(d.juego.protagonista ? [d.juego.protagonista] : [])]);
  const fichasDePersona = new Set(Object.values(d.fichas).filter((f) => f.tipo === "persona").map((f) => sinAcentos(f.id)));
  const habla = /^\s*([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ ]{0,24}?)(?:\s*\([^)]+\))?:\s+\S/;
  const avisadas = new Set<string>();

  for (const [fichero, texto] of Object.entries(d.ficheros)) {
    texto.split("\n").forEach((linea, i) => {
      const nombre = linea.match(habla)?.[1];
      if (nombre && !voces.has(nombre) && fichasDePersona.has(sinAcentos(nombre)) && !avisadas.has(nombre)) {
        avisadas.add(nombre);
        errores.push(
          `historia/${fichero}:${i + 1}: "${nombre}:" parece alguien hablando (hay una ficha de persona "${sinAcentos(nombre)}") ` +
            `pero "${nombre}" no está en las voces de juego.yaml, así que saldría como pensamiento de Martínez. Añádelo a "voces".`,
        );
      }
      for (const m of linea.matchAll(/\b(\w+)\(\s*"([^"]*)"\s*\)/g)) {
        const [, orden, arg] = m;
        if (orden in valido && !valido[orden](arg)) {
          errores.push(`historia/${fichero}:${i + 1}: ${orden}("${arg}") no existe`);
        }
      }
    });
  }
}
