import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { carpetaGuardada, elegirCarpeta, escribirTexto, type FicheroLeido, leerCarpeta, leerTexto, olvidar, permiso, type Reciente, recientes, recordar, urlImagen } from "./carpeta";
import { Fase } from "./Fase";
import { Ficha } from "./Ficha";
import { Grafo } from "./Grafo";
import { escribirCelda, escribirRango, fijarFrontmatter, TRANSVERSAL, type Coordenada } from "./formato";
import type { Contexto } from "./Markdown";
import { leerLocal, guardarLocal } from "./local";
import { Matriz } from "./Matriz";
import { construirProyecto, type Entidad, FICHERO_PROYECTO, porNombre, type Proyecto } from "./proyecto";

/** La ficha abierta en la ventana de encima. */
interface Modal {
  ruta: string;
  tiempo: string; // id o TRANSVERSAL
  nivel: number;
  dim: string;
}

export interface Acciones {
  guardar: (e: Entidad, c: Coordenada, texto: string) => void;
  alternarPresencia: (e: Entidad, tiempo: string) => void;
  crearEntidad: (tipo: string) => void;
  crearTiempo: () => void;
  fijarFm: (e: Entidad, clave: string, valor: string | null) => void;
  irEnlace: (nombre: string) => void;
}

type Inicio = "cargando" | "elegir" | "listo";

export default function App() {
  const [dir, setDir] = useState<FileSystemDirectoryHandle | null>(null);
  const [inicio, setInicio] = useState<Inicio>("cargando");
  const [ficheros, setFicheros] = useState<Map<string, FicheroLeido>>(new Map());
  const [urls, setUrls] = useState<Map<string, string>>(new Map());
  const [nivel, setNivel] = useState(() => Number(leerLocal("nivel")) || 1);
  const [vista, setVista] = useState<"grafo" | "fase" | "matriz">("grafo");
  const [fase, setFase] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal | null>(null);
  const [solo, setSolo] = useState<string[]>(() => {
    try {
      return JSON.parse(leerLocal("solo") ?? "[]");
    } catch {
      return [];
    }
  });
  const [aviso, setAviso] = useState<string | null>(null);
  const ficherosRef = useRef(ficheros);
  ficherosRef.current = ficheros;

  // ---- Carpeta ----
  useEffect(() => {
    (async () => {
      if (!("showDirectoryPicker" in window)) return setInicio("elegir");
      // La carpeta de la última vez se abre sola si el navegador aún tiene el permiso.
      const d = await carpetaGuardada();
      if (d) await recordar(d);
      if (d && (await permiso(d, false))) {
        setDir(d);
        return setInicio("listo");
      }
      setInicio("elegir");
    })();
  }, []);

  const abrir = useCallback(async (d: FileSystemDirectoryHandle) => {
    await recordar(d);
    setDir(d);
    setFicheros(new Map());
    setModal(null);
    setFase(null);
    setVista("grafo");
    setAviso(null);
    setInicio("listo");
  }, []);

  // Solo en desarrollo: para probar sin el selector de carpetas (que no se puede automatizar).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__usarCarpeta = abrir;
  }, [abrir]);

  const recargar = useCallback(async () => {
    if (!dir) return;
    try {
      const nuevo = await leerCarpeta(dir, ficherosRef.current);
      const antes = ficherosRef.current;
      const cambia = nuevo.size !== antes.size || [...nuevo].some(([k, f]) => antes.get(k) !== f);
      if (cambia) setFicheros(nuevo);
    } catch (e) {
      setAviso("No puedo leer la carpeta: " + (e as Error).message);
    }
  }, [dir]);

  useEffect(() => {
    if (inicio !== "listo") return;
    recargar();
    const t = setInterval(recargar, 2000);
    return () => clearInterval(t);
  }, [inicio, recargar]);

  const proyecto = useMemo<Proyecto | null>(() => (inicio === "listo" && dir ? construirProyecto(ficheros, dir.name) : null), [ficheros, inicio, dir]);

  // Imágenes enlazadas con ![[ ]]: se cargan como blob cuando aparecen en algún .md.
  useEffect(() => {
    if (!proyecto) return;
    const usadas = new Set<string>();
    for (const f of proyecto.ficheros.values())
      if (f.texto) for (const m of f.texto.matchAll(/!\[\[([^\]|]+)/g)) usadas.add(baseNombre(m[1]).toLowerCase());
    (async () => {
      const res = new Map<string, string>();
      for (const n of usadas) {
        const f = proyecto.imagenes.get(n);
        if (f) res.set(n, await urlImagen(f));
      }
      setUrls(res);
    })();
  }, [proyecto]);

  const ctx = useMemo<Contexto>(
    () => ({
      imagen: (n) => urls.get(baseNombre(n).toLowerCase()),
      existe: (n) => (proyecto ? !!porNombre(proyecto, n) : false),
    }),
    [urls, proyecto],
  );

  // ---- Escritura ----
  const colas = useRef(new Map<string, Promise<void>>());
  const enCola = useCallback(
    (ruta: string, cambio: (texto: string) => string) => {
      if (!dir) return;
      const previa = colas.current.get(ruta) ?? Promise.resolve();
      const p = previa.then(async () => {
        try {
          const actual = (await leerTexto(dir, ruta)) ?? "";
          const nuevo = cambio(actual);
          if (nuevo === actual) return;
          await escribirTexto(dir, ruta, nuevo);
          await recargar();
        } catch (e) {
          setAviso(`No he podido guardar ${ruta}: ${(e as Error).message}`);
        }
      });
      colas.current.set(ruta, p);
    },
    [dir, recargar],
  );

  const acciones = useMemo<Acciones | null>(() => {
    if (!proyecto) return null;
    const p = proyecto;
    return {
      guardar: (e, c, texto) =>
        enCola(e.ruta, (actual) => escribirCelda(actual, c, texto, { esTiempo: e.esTiempo, nombresNivel: p.niveles, ordenTiempo: p.orden })),
      alternarPresencia: (e, tiempo) => {
        const base = e.aparece ?? new Set(p.orden.filter((t) => [...e.celdas.keys()].some((k) => k.startsWith(t + "|"))));
        const nuevo = new Set(base);
        if (nuevo.has(tiempo)) nuevo.delete(tiempo);
        else nuevo.add(tiempo);
        enCola(e.ruta, (actual) => fijarFrontmatter(actual, "aparece", escribirRango(nuevo, p.orden) || "ninguna"));
      },
      fijarFm: (e, k, v) => enCola(e.ruta, (actual) => fijarFrontmatter(actual, k, v)),
      crearEntidad: (tipo) => {
        const nombre = window.prompt(`Nombre (se guarda en ${tipo}/):`)?.trim();
        if (!nombre) return;
        const ruta = `${tipo}/${nombre.replace(/[\\/:*?"<>|]/g, "")}.md`;
        if (!p.ficheros.has(ruta)) enCola(ruta, (actual) => actual || `---\ntipo: ${tipo}\n---\n# ${nombre}\n`);
        setModal({ ruta, tiempo: TRANSVERSAL, nivel: 1, dim: "" });
      },
      crearTiempo: () => {
        const sig = `F${p.tiempos.length + 1}`;
        const txt = window.prompt("Nueva fase: identificador y título (para una rama, F3.1, F3.2…)", `${sig} `)?.trim();
        if (!txt) return;
        const [id, ...resto] = txt.split(/\s+/);
        const ruta = `${p.carpetaTiempo}/${txt.replace(/[\\/:*?"<>|]/g, "")}.md`;
        enCola(ruta, (actual) => actual || `# ${id} — ${resto.join(" ") || id}\n`);
        setFase(id);
        setVista("fase");
      },
      irEnlace: (nombre) => {
        const e = porNombre(p, nombre);
        if (!e) return setAviso(`No hay ninguna ficha que se llame "${nombre}"`);
        if (e.esTiempo && e.idTiempo !== TRANSVERSAL) {
          setModal(null);
          setFase(e.idTiempo!);
          return setVista("fase");
        }
        setModal((m) => ({ ruta: e.ruta, tiempo: m?.tiempo ?? (vista === "fase" && fase ? fase : TRANSVERSAL), nivel: m?.nivel ?? 2, dim: "" }));
      },
    };
  }, [proyecto, enCola, vista, fase]);

  useEffect(() => guardarLocal("nivel", String(nivel)), [nivel]);
  useEffect(() => guardarLocal("solo", JSON.stringify(solo)), [solo]);

  const entidadModal = modal && proyecto ? proyecto.entidades.find((x) => x.ruta === modal.ruta) : undefined;
  const faseValida = proyecto && fase && proyecto.orden.includes(fase) ? fase : null;

  // ---- Teclado ----
  useEffect(() => {
    if (!proyecto) return;
    const n = proyecto.niveles.length;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        if (modal) return setModal(null);
        if (vista === "fase") return setVista("grafo");
        return;
      }
      if (!ev.altKey) return;
      const cambiarNivel = (f: (x: number) => number) => {
        ev.preventDefault();
        if (modal) setModal({ ...modal, nivel: Math.max(1, Math.min(n, f(modal.nivel))), dim: "" });
        else setNivel((x) => Math.max(1, Math.min(n, f(x))));
      };
      if (ev.key === "ArrowUp") cambiarNivel((x) => x - 1);
      else if (ev.key === "ArrowDown") cambiarNivel((x) => x + 1);
      else if (/^[1-9]$/.test(ev.key)) cambiarNivel(() => Number(ev.key));
      else if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && !modal && vista === "fase" && faseValida) {
        ev.preventDefault();
        const i = proyecto.orden.indexOf(faseValida) + (ev.key === "ArrowLeft" ? -1 : 1);
        if (proyecto.orden[i]) setFase(proyecto.orden[i]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- Pantallas ----
  if (inicio === "cargando") return <div className="portada" />;
  if (inicio !== "listo" || !proyecto || !acciones)
    return (
      <Portada
        onElegir={async () => {
          try {
            await abrir(await elegirCarpeta());
          } catch {
            /* cancelado */
          }
        }}
        onReciente={async (r) => {
          if (await permiso(r.handle, true)) await abrir(r.handle);
        }}
      />
    );

  const abrirFicha = (ruta: string, tiempo: string, n: number, dim = "") => setModal({ ruta, tiempo, nivel: n, dim });
  const vacio = !proyecto.tieneConfig && proyecto.entidades.length === 0;

  return (
    <div className="app">
      <header className="cabecera">
        <button className="carpetas" title="Volver a la lista de proyectos" onClick={() => (setInicio("elegir"), setDir(null))}>
          ‹ Proyectos
        </button>
        <button className="titulo" onClick={() => setVista("grafo")} title="Ver todas las fases">
          {proyecto.nombre}
        </button>
        {vista === "fase" && faseValida && (
          <span className="miga-fase">
            › {faseValida} {proyecto.tiempos.find((x) => x.id === faseValida)?.titulo}
          </span>
        )}
        <nav className="vistas">
          <button className={vista !== "matriz" ? "activo" : ""} onClick={() => setVista(faseValida && vista === "matriz" ? "fase" : "grafo")}>
            Fases
          </button>
          <button className={vista === "matriz" ? "activo" : ""} onClick={() => setVista("matriz")}>
            Matriz
          </button>
        </nav>
        {vista === "matriz" && (
          <nav className="niveles" title="Alt + ↑ ↓">
            {proyecto.niveles.map((nombre, i) => (
              <button key={nombre} className={nivel === i + 1 ? "activo" : ""} onClick={() => setNivel(i + 1)}>
                <b>{i + 1}</b> {nombre}
              </button>
            ))}
          </nav>
        )}
      </header>
      {aviso && (
        <div className="aviso" onClick={() => setAviso(null)}>
          {aviso} <span className="cerrar">×</span>
        </div>
      )}
      {vacio ? (
        <Vacio onCrear={() => enCola(FICHERO_PROYECTO, (a) => a || plantillaProyecto(dir!.name))} />
      ) : vista === "matriz" ? (
        <Matriz p={proyecto} nivel={nivel} ctx={ctx} acciones={acciones} abrir={(ruta, tiempo, dim) => abrirFicha(ruta, tiempo, nivel, dim)} solo={solo} setSolo={setSolo} />
      ) : vista === "fase" && faseValida ? (
        <Fase p={proyecto} t={faseValida} ctx={ctx} acciones={acciones} abrirFicha={abrirFicha} irFase={setFase} />
      ) : (
        <Grafo
          p={proyecto}
          ctx={ctx}
          crearTiempo={acciones.crearTiempo}
          abrirFase={(t) => {
            setFase(t);
            setVista("fase");
          }}
        />
      )}
      {modal && entidadModal && (
        <Ficha
          p={proyecto}
          e={entidadModal}
          t={entidadModal.esTiempo ? entidadModal.idTiempo! : modal.tiempo}
          nivel={modal.nivel}
          dim={modal.dim}
          ctx={ctx}
          acciones={acciones}
          ir={setModal}
          conMatriz={vista !== "matriz"}
          cerrar={() => setModal(null)}
        />
      )}
    </div>
  );
}

function Portada({ onElegir, onReciente }: { onElegir: () => void; onReciente: (r: Reciente) => void }) {
  const soportado = "showDirectoryPicker" in window;
  const [lista, setLista] = useState<Reciente[] | null>(null);
  useEffect(() => {
    recientes().then(setLista);
  }, []);
  return (
    <div className="portada">
      <h1>Guionista</h1>
      <p>Guiones de juego en una carpeta de Markdown.</p>
      {!soportado ? (
        <p className="aviso">Este navegador no deja abrir carpetas. Ábrelo en Chrome o Edge.</p>
      ) : (
        <>
          {lista && lista.length > 0 && (
            <ul className="recientes">
              {lista.map((r) => (
                <li key={r.abierta + r.nombre}>
                  <button className="reciente" onClick={() => onReciente(r)}>
                    <span className="reciente-nombre">{r.nombre}</span>
                    <span className="reciente-fecha">{fecha(r.abierta)}</span>
                  </button>
                  <button
                    className="quitar"
                    title="Quitar de la lista (no borra la carpeta)"
                    onClick={async () => {
                      await olvidar(r.handle);
                      setLista(await recientes());
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button className={lista && lista.length > 0 ? "secundario" : "grande"} onClick={onElegir}>
            Abrir otra carpeta…
          </button>
        </>
      )}
    </div>
  );
}

function fecha(ms: number) {
  const d = new Date(ms);
  const hoy = new Date();
  if (d.toDateString() === hoy.toDateString()) return "hoy, " + d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("es", { day: "numeric", month: "short", year: d.getFullYear() === hoy.getFullYear() ? undefined : "numeric" });
}

function Vacio({ onCrear }: { onCrear: () => void }) {
  return (
    <div className="portada">
      <p>Esta carpeta todavía no es un proyecto de Guionista.</p>
      <button className="grande" onClick={onCrear}>
        Crear guionista.md aquí
      </button>
    </div>
  );
}

function plantillaProyecto(nombre: string) {
  return `---\nnombre: ${nombre}\nniveles: Esquema, Detalle, Producción\ntiempo: tiempo\n---\n# ${nombre}\n\n## N1 · Esquema\n\n`;
}

function baseNombre(n: string) {
  return n.trim().slice(n.trim().lastIndexOf("/") + 1);
}
