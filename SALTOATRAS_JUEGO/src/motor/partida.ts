// El estado de una partida: dónde está Martínez, qué tiene y qué lleva la
// historia. La lógica (quién está, qué toca en cada fase) vive en Ink; aquí
// solo se guarda lo que el motor necesita para dibujar.

import * as Phaser from "phaser";
import type { Datos } from "./datos";
import { OTRA_VEZ, SIN_RESPUESTA, conversacion, puerta } from "./datos";
import { cambiarAmbiente, definirAmbientes } from "./ambiente";

const CLAVE = "salto-atras/partida";

/** Algo que se ha añadido y de lo que hay que avisar al jugador cuando se entere. */
export interface Aviso {
  evento: string;
  id: string;
}

interface Estado {
  lugar: string;
  fichas: string[];
  posits: string[];
  activos: string[];
  /** Persona → fichas por las que ya se le ha preguntado. */
  preguntado: Record<string, string[]>;
  /** Pregunta del panel → con qué se resolvió. */
  resueltas: Record<string, { respuesta: string; prueba: string }>;
  /** Cómo se ve ahora el juego (un ambiente de juego.yaml; "" = normal). */
  ambiente: string;
}

export class Partida {
  readonly eventos = new Phaser.Events.EventEmitter();
  estado: Estado;
  /** Lugar al que ir cuando acabe la conversación (lo pide Ink con ir()). */
  private destino: string | null = null;
  /** Ink ha pedido cortar la conversación (terminar()). */
  private cortar = false;
  /** Pregunta que Ink ha pedido pensar (pensar()). */
  private porPensar: string | null = null;
  /** Ficha que Ink ha pedido ver de cerca (ver()). */
  private porVer: string | null = null;
  /** Parte de la interfaz que Ink ha pedido abrir (guiar()). */
  private porGuiar: string | null = null;
  /** Mientras dura la guía: qué parte hay que abrir y con quién se sigue hablando después. */
  guia: { parte: string; persona: string } | null = null;

  constructor(readonly datos: Datos) {
    definirAmbientes(datos.ambientes);
    this.estado = this.estadoInicial();
    const h = datos.historia;
    h.BindExternalFunction("ir", (lugar: string) => { this.destino = lugar; }, false);
    h.BindExternalFunction("ficha", (id: string) => this.anadir("fichas", id, "ficha"), false);
    h.BindExternalFunction("posit", (id: string) => this.anadir("posits", id, "posit"), false);
    h.BindExternalFunction("activar", (que: string) => this.anadir("activos", que, "activar"), false);
    h.BindExternalFunction("guiar", (parte: string) => {
      this.porGuiar = parte;
      this.cortar = true;
    }, false);
    h.BindExternalFunction("terminar", () => { this.cortar = true; }, false);
    h.BindExternalFunction("pensar", (id: string) => {
      this.anadir("posits", id, "posit");
      if (!this.estado.resueltas[id]) this.porPensar = id;
    }, false);
    h.BindExternalFunction("ver", (id: string) => {
      this.anadir("fichas", id, "ficha");
      this.porVer = id;
    }, false);
    h.BindExternalFunction("ambiente", (nombre: string) => {
      this.estado.ambiente = this.datos.ambientes[nombre] ? nombre : "";
      cambiarAmbiente(this.estado.ambiente);
    }, false);
    h.BindExternalFunction("resuelta", (id: string) => !!this.estado.resueltas[id], true);
  }

  private estadoInicial(): Estado {
    return { lugar: this.datos.inicio, fichas: [], posits: [], activos: [], preguntado: {}, resueltas: {}, ambiente: "" };
  }

  /** Partida nueva: todo a cero, también lo que Ink tuviera pendiente. */
  reiniciar() {
    this.historia.ResetState();
    this.estado = this.estadoInicial();
    this.olvidarPendientes();
    cambiarAmbiente("", true);
    this.guardar();
  }

  /** Lo que Ink había pedido y aún no se ha hecho (ir, pensar, ver…). */
  private olvidarPendientes() {
    this.destino = null;
    this.cortar = false;
    this.porPensar = null;
    this.porVer = null;
    this.porGuiar = null;
    this.guia = null;
    this.avisos = [];
  }

  static hayGuardada(): boolean {
    try {
      return localStorage.getItem(CLAVE) !== null;
    } catch {
      return false;
    }
  }

  get historia() {
    return this.datos.historia;
  }

  get lugar() {
    return this.datos.lugares[this.estado.lugar];
  }

  /** Avisos que Ink ha provocado y aún no se han enseñado. */
  private avisos: Aviso[] = [];

  private anadir(lista: "fichas" | "posits" | "activos", id: string, evento: string) {
    if (this.estado[lista].includes(id)) return;
    this.estado[lista].push(id);
    // El estado cambia ya, pero el aviso espera: Ink va por delante de lo que ve
    // el jugador. Sale cuando la línea, el bloque o el papel que lo provoca se ha mostrado.
    this.avisos.push({ evento, id });
  }

  /** Recoge los avisos pendientes para atarlos a lo que se va a mostrar. */
  tomarAvisos(): Aviso[] {
    const a = this.avisos;
    this.avisos = [];
    return a;
  }

  /** El jugador ya se ha enterado: salen los avisos. */
  soltarAvisos(avisos: Aviso[] = []) {
    for (const a of avisos) this.eventos.emit(a.evento, a.id);
  }

  activo(parte: string) {
    return this.estado.activos.includes(parte);
  }

  /** Evalúa el "si:" de una cosa: una función o variable de Ink, con ! delante para negar. */
  cumple(si?: string): boolean {
    if (!si) return true;
    const negar = si.startsWith("!");
    const nombre = si.replace(/^!/, "");
    const h = this.historia;
    const valor = h.HasFunction(nombre) ? h.EvaluateFunction(nombre) : h.variablesState.$(nombre);
    return negar ? !valor : !!valor;
  }

  /** Coloca la historia al principio de un nudo o tema; el diálogo la va leyendo. */
  entrarEn(ruta: string) {
    this.historia.ChoosePathString(puerta(ruta));
  }

  /** Lee de golpe un nudo corto (como "persona.repetir") y devuelve sus líneas. */
  lineasDe(ruta: string): string[] {
    this.entrarEn(ruta);
    const lineas: string[] = [];
    while (this.historia.canContinue) {
      const l = (this.historia.Continue() ?? "").trim();
      if (l) lineas.push(l);
    }
    return lineas;
  }

  existe(ruta: string) {
    return this.datos.rutas.has(ruta);
  }

  /** Qué contesta una persona a una ficha: su tema (o su "otra vez"), su "otro" o el genérico. */
  respuesta(persona: string, ficha: string): string {
    const nudo = conversacion(persona);
    const otraVez = `${nudo}.${ficha}${OTRA_VEZ}`;
    if (this.yaPreguntado(persona, ficha) && this.existe(otraVez)) return otraVez;
    if (this.existe(`${nudo}.${ficha}`)) return `${nudo}.${ficha}`;
    if (this.existe(`${nudo}.otro`)) return `${nudo}.otro`;
    return SIN_RESPUESTA;
  }

  yaPreguntado(persona: string, ficha: string) {
    return this.estado.preguntado[persona]?.includes(ficha) ?? false;
  }

  marcarPreguntado(persona: string, ficha: string) {
    (this.estado.preguntado[persona] ??= []).push(ficha);
  }

  /**
   * Para la bandeja: ¿ya se ha sacado esta ficha con esta persona, aunque fuera una respuesta
   * estándar? Esas se guardan aparte (con "~") para que, si luego la persona tiene respuesta
   * propia, no cuente como repetición.
   */
  tocada(persona: string, ficha: string) {
    return this.yaPreguntado(persona, ficha) || this.yaPreguntado(persona, `~${ficha}`);
  }

  /** Si Ink ha pedido acabar la conversación (terminar() o ir()), lo dice y lo olvida. */
  tomarCorte(): boolean {
    const c = this.cortar || this.destino !== null;
    this.cortar = false;
    return c;
  }

  /** Si Ink ha pedido algo que obliga a esperar al jugador: pensar, cortar o irse. */
  hayPendiente(): boolean {
    return this.porPensar !== null || this.cortar || this.destino !== null;
  }

  /** Si Ink ha pedido guiar al jugador a una parte de la interfaz, la devuelve y la olvida. */
  tomarGuia(): string | null {
    const g = this.porGuiar;
    this.porGuiar = null;
    return g;
  }

  /** Si Ink ha pedido ver algo de cerca, lo devuelve y lo olvida. */
  tomarVer(): string | null {
    const v = this.porVer;
    this.porVer = null;
    return v;
  }

  /** Si Ink ha pedido pensar una pregunta, la devuelve y la olvida. */
  tomarPensar(): string | null {
    const p = this.porPensar;
    this.porPensar = null;
    return p;
  }

  /** Comprueba una conclusión. Si la respuesta y la prueba se sostienen, queda resuelta. */
  concluir(id: string, respuesta: string, prueba: string): boolean {
    const p = this.datos.posits[id];
    const bien = p.respuesta === respuesta && (p.pruebas ?? []).includes(prueba);
    if (bien) {
      this.estado.resueltas[id] = { respuesta, prueba };
      this.eventos.emit("resuelta", id);
      this.guardar();
    }
    return bien;
  }

  /** Ficha de una persona al hablar con ella, si existe en el expediente. */
  conocer(id: string) {
    if (this.datos.fichas[id]) this.anadir("fichas", id, "ficha");
  }

  /** Si la última conversación pidió cambiar de lugar, lo devuelve y lo olvida. */
  tomarDestino(): string | null {
    const d = this.destino;
    this.destino = null;
    return d;
  }

  irA(lugar: string) {
    this.estado.lugar = lugar;
    this.guardar();
  }

  guardar() {
    try {
      localStorage.setItem(CLAVE, JSON.stringify({ ...this.estado, ink: this.historia.state.ToJson() }));
    } catch {
      // Sin almacenamiento la partida sigue; solo no se recuerda.
    }
  }

  /** Recupera la partida guardada. Si no cuadra con los datos de ahora, empieza de cero. */
  cargar(): boolean {
    try {
      const texto = localStorage.getItem(CLAVE);
      if (!texto) return false;
      const { ink, ...estado } = JSON.parse(texto);
      if (!this.datos.lugares[estado.lugar]) return false;
      this.historia.state.LoadJson(ink);
      // Fichas o pósits que ya no existen en los datos se olvidan.
      estado.fichas = estado.fichas.filter((id: string) => this.datos.fichas[id]);
      estado.posits = estado.posits.filter((id: string) => this.datos.posits[id]);
      this.estado = { ...this.estadoInicial(), ...estado };
      this.olvidarPendientes();
      cambiarAmbiente(this.estado.ambiente, true);
      return true;
    } catch (e) {
      console.warn("No se pudo cargar la partida; empieza de cero.", e);
      this.historia.ResetState();
      return false;
    }
  }

  static borrar() {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      // nada que borrar
    }
  }
}
