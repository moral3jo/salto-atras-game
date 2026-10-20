import { markdown } from "@codemirror/lang-markdown";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Acciones } from "./App";
import { TRANSVERSAL, type Coordenada } from "./formato";
import { type Contexto, Markdown, textoPlano } from "./Markdown";
import { clave, type Entidad, historiaDe, imagenDe, papelDe, partirBreve, presencia, type Proyecto, sinImagenes, textoDe } from "./proyecto";

export interface Destino {
  ruta: string;
  tiempo: string;
  nivel: number;
  dim: string;
}

interface Props {
  p: Proyecto;
  e: Entidad;
  t: string; // punto del tiempo (TRANSVERSAL = lo de siempre)
  nivel: number;
  dim: string;
  ctx: Contexto;
  acciones: Acciones;
  ir: (d: Destino) => void;
  conMatriz: boolean; // desde la matriz no hace falta: está detrás
  cerrar: () => void;
}

/**
 * Ventana de una ficha encima de lo que estabas viendo.
 * Arriba, su matriz: todos sus niveles a lo largo de la historia, en vivo.
 * Abajo: lo de siempre | la casilla en la que escribes (con los niveles de
 * arriba encima) | la misma ficha en la fase anterior y la siguiente.
 */
export function Ficha({ p, e, t, nivel, dim, ctx, acciones, ir, conMatriz, cerrar }: Props) {
  const [editando, setEditando] = useState<Coordenada | null>(null);
  useEffect(() => setEditando(null), [e.ruta, t, nivel]);

  // En una fase, "la ficha" de cada columna es la historia de esa fase.
  const esHistoria = e.esTiempo;
  const fichaEn = (tt: string): Entidad | undefined => (esHistoria ? historiaDe(p, tt) : e);
  // ∞ va primero también en las fases: es la premisa.
  const columnas = [TRANSVERSAL, ...p.orden].filter((c) => c === t || fichaEn(c));
  const i = columnas.indexOf(t);
  const anterior = columnas[i - 1];
  const siguiente = columnas[i + 1];
  const irA = (tt: string, n = nivel, d = "") => {
    const f = fichaEn(tt);
    if (f) ir({ ruta: f.ruta, tiempo: tt, nivel: n, dim: d });
  };

  // Alt + ← → cambia de fase sin cerrar la ventana.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!ev.altKey || (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight")) return;
      ev.preventDefault();
      ev.stopPropagation();
      const destino = ev.key === "ArrowLeft" ? anterior : siguiente;
      if (destino) irA(destino);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  const img = esHistoria ? null : imagenDe(e);
  const papel = esHistoria ? "" : papelDe(e);
  const tituloDe = (tt: string) => (tt === TRANSVERSAL ? "Siempre" : `${tt} · ${p.tiempos.find((x) => x.id === tt)?.titulo ?? ""}`);
  const estado = presencia(e, t, p.niveles.length);
  const celdaActual = e.celdas.get(clave(t, nivel));
  const dims = dimsDeNivel(p, e, nivel);
  if (dim && !dims.includes(dim)) dims.push(dim);

  const bloque = (f: Entidad, c: Coordenada, titulo: string) => {
    const celda = f.celdas.get(clave(c.tiempo, c.nivel));
    const v = (c.dim ? celda?.dims[c.dim] : celda?.texto) ?? "";
    const activo = editando && editando.tiempo === c.tiempo && editando.nivel === c.nivel && editando.dim === c.dim;
    return (
      <div className={"capa" + (activo ? " editando" : "")} key={`${c.tiempo}|${c.nivel}|${c.dim}`}>
        <div className="capa-titulo">{titulo}</div>
        {activo ? (
          <Editor valor={v} onCambio={(nv) => acciones.guardar(f, c, nv)} onSalir={() => setEditando(null)} compacto />
        ) : v ? (
          <div onClick={() => setEditando(c)} className="capa-texto" title="Clic para editar">
            <Markdown md={v} ctx={ctx} onEnlace={acciones.irEnlace} />
          </div>
        ) : (
          <button className="capa-vacia" onClick={() => setEditando(c)}>
            + escribir
          </button>
        )}
      </div>
    );
  };

  const capasSiempre = () => {
    const res: React.ReactNode[] = [];
    for (let n = 1; n <= nivel; n++) {
      const c = e.celdas.get(clave(TRANSVERSAL, n));
      if (!(c && (c.texto || Object.keys(c.dims).length)) && n > 1) continue;
      res.push(bloque(e, { tiempo: TRANSVERSAL, nivel: n, dim: "" }, `N${n} · ${p.niveles[n - 1]}`));
      for (const d of Object.keys(c?.dims ?? {})) res.push(bloque(e, { tiempo: TRANSVERSAL, nivel: n, dim: d }, `N${n} · ${d}`));
    }
    return res;
  };

  const capasArriba = () => {
    const res: React.ReactNode[] = [];
    for (let n = 1; n < nivel; n++) {
      res.push(bloque(e, { tiempo: t, nivel: n, dim: "" }, `N${n} · ${p.niveles[n - 1]}`));
      for (const d of Object.keys(e.celdas.get(clave(t, n))?.dims ?? {})) res.push(bloque(e, { tiempo: t, nivel: n, dim: d }, `N${n} · ${d}`));
    }
    return res;
  };

  const verSiempre = !esHistoria && t !== TRANSVERSAL;

  return (
    <div className="velo" onMouseDown={(ev) => ev.target === ev.currentTarget && cerrar()}>
      <div className="ficha" role="dialog">
        <header className="ficha-cabecera">
          {img && ctx.imagen(img) && <img className="ficha-img" src={ctx.imagen(img)} alt="" />}
          <div className="ficha-nombre">
            <span className="tipo">{esHistoria ? "historia" : e.tipo}</span>
            <h2>{esHistoria ? "Lo que pasa" : e.nombre}</h2>
            {papel && <Markdown md={papel} ctx={ctx} className="papel" onEnlace={acciones.irEnlace} />}
          </div>
          <button className="cerrar-ficha" onClick={cerrar} title="Cerrar (Esc)">
            ×
          </button>
        </header>

        {conMatriz && <MatrizFicha p={p} e={e} columnas={columnas} fichaEn={fichaEn} t={t} nivel={nivel} dim={dim} ctx={ctx} ir={irA} tituloDe={tituloDe} />}

        <div className={"ficha-paneles" + (verSiempre ? "" : " sin-siempre")}>
          {verSiempre && (
            <section className="siempre panel-ficha">
              <h3>∞ Siempre</h3>
              {capasSiempre()}
            </section>
          )}

          <section className="aqui panel-ficha">
            <div className="aqui-cabecera">
              <button className="salto" disabled={!anterior} onClick={() => anterior && irA(anterior)} title="Alt + ←">
                ‹ {anterior === TRANSVERSAL ? "∞" : anterior}
              </button>
              <h3>{tituloDe(t)}</h3>
              <button className="salto" disabled={!siguiente} onClick={() => siguiente && irA(siguiente)} title="Alt + →">
                {siguiente} ›
              </button>
              <span className="hueco-flex" />
              <div className="niveles-salto" title="Alt + ↑ ↓">
                {p.niveles.map((nombre, k) => (
                  <button key={k} className={k + 1 === nivel ? "activo" : ""} onClick={() => irA(t, k + 1)} title={nombre}>
                    N{k + 1}
                  </button>
                ))}
              </div>
              {!esHistoria && t !== TRANSVERSAL && (
                <label className={`aparece ${estado}`}>
                  <input type="checkbox" checked={estado === "presente" || estado === "conflicto"} onChange={() => acciones.alternarPresencia(e, t)} />
                  {estado === "conflicto" ? "Tiene texto pero dice que no aparece" : "Aparece aquí"}
                </label>
              )}
            </div>
            {capasArriba()}
            <div className="capa actual">
              <div className="capa-titulo">
                N{nivel} · {p.niveles[nivel - 1]}
              </div>
              <div className="pestanas">
                <button className={dim === "" ? "activo" : ""} onClick={() => ir({ ruta: e.ruta, tiempo: t, nivel, dim: "" })}>
                  Texto
                </button>
                {dims.map((d) => (
                  <button key={d} className={dim === d ? "activo" : ""} onClick={() => ir({ ruta: e.ruta, tiempo: t, nivel, dim: d })}>
                    {d}
                    {!celdaActual?.dims[d] && <span className="vacia">·</span>}
                  </button>
                ))}
                <NuevaDimension onCrear={(d) => ir({ ruta: e.ruta, tiempo: t, nivel, dim: d })} />
              </div>
              <Editor
                key={`${e.ruta}|${t}|${nivel}|${dim}`}
                valor={(dim ? celdaActual?.dims[dim] : celdaActual?.texto) ?? ""}
                onCambio={(v) => acciones.guardar(e, { tiempo: t, nivel, dim }, v)}
                autoFoco={!editando}
              />
            </div>
          </section>

          <section className="vecinos panel-ficha">
            {[anterior, siguiente].map((tt, k) => {
              if (!tt || tt === TRANSVERSAL) return null;
              const f = fichaEn(tt);
              return (
                <div key={tt} className="vecino-ficha" onClick={() => irA(tt)} title={`Ir a ${tt}`}>
                  <h3>
                    {k === 0 ? "Antes" : "Después"} · {tituloDe(tt)}
                  </h3>
                  {f ? <Niveles f={f} tt={tt} hasta={nivel} p={p} ctx={ctx} /> : <p className="vacio">—</p>}
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </div>
  );
}

/** Los niveles 1..hasta de una ficha en un punto, solo lectura. */
function Niveles({ f, tt, hasta, p, ctx }: { f: Entidad; tt: string; hasta: number; p: Proyecto; ctx: Contexto }) {
  const est = presencia(f, tt, p.niveles.length);
  if (est === "ausente") return <p className="vacio">No aparece.</p>;
  const res: React.ReactNode[] = [];
  for (let n = 1; n <= hasta; n++) {
    const c = f.celdas.get(clave(tt, n));
    const partes = [c?.texto, ...Object.entries(c?.dims ?? {}).map(([d, v]) => `**${d}**\n${v}`)].filter(Boolean).join("\n\n");
    res.push(
      <div className="capa" key={n}>
        <div className="capa-titulo">N{n} · {p.niveles[n - 1]}</div>
        {partes ? <Markdown md={partes} ctx={ctx} /> : <p className="vacio">Nada escrito.</p>}
      </div>,
    );
  }
  return <>{res}</>;
}

function dimsDeNivel(p: Proyecto, e: Entidad, n: number): string[] {
  const res: string[] = [];
  // En las fases cuentan las dimensiones de las fases, no las de la premisa.
  const ents = e.esTiempo ? p.entidades.filter((x) => x.esTiempo && (e.idTiempo === TRANSVERSAL) === (x.idTiempo === TRANSVERSAL)) : [e];
  for (const f of ents)
    for (const [k, c] of f.celdas) if (k.endsWith(`|${n}`)) for (const d of Object.keys(c.dims)) if (!res.includes(d)) res.push(d);
  return res;
}

/** La matriz de la ficha: niveles (y sus dimensiones) × fases. Clic en una casilla = ir allí. */
function MatrizFicha(props: {
  p: Proyecto;
  e: Entidad;
  columnas: string[];
  fichaEn: (t: string) => Entidad | undefined;
  t: string;
  nivel: number;
  dim: string;
  ctx: Contexto;
  ir: (t: string, n?: number, d?: string) => void;
  tituloDe: (t: string) => string;
}) {
  const { p, e, columnas, fichaEn, t, nivel, dim, ctx, ir } = props;
  const caja = useRef<HTMLDivElement>(null);

  // Mantener a la vista la columna en la que estás.
  useLayoutEffect(() => {
    const el = caja.current?.querySelector<HTMLElement>(`th[data-col="${CSS.escape(t)}"]`);
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [t]);

  const filas: { n: number; d: string }[] = [];
  for (let n = 1; n <= p.niveles.length; n++) {
    filas.push({ n, d: "" });
    for (const d of dimsDeNivel(p, e, n)) filas.push({ n, d });
  }

  return (
    <div className="matriz-ficha" ref={caja}>
      <table>
        <thead>
          <tr>
            <th className="mf-esquina" />
            {columnas.map((c) => (
              <th key={c} data-col={c} className={(c === t ? "actual " : "") + (c === TRANSVERSAL ? "col-transversal" : "")} onClick={() => ir(c)}>
                {c === TRANSVERSAL ? (
                  "∞ Siempre"
                ) : (
                  <>
                    <b>{c}</b> {p.tiempos.find((x) => x.id === c)?.titulo}
                  </>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {!e.esTiempo && (
            <tr className="mf-historia">
              <th>Lo que pasa</th>
              {columnas.map((c) => (
                <td key={c} className={c === t ? "actual" : ""} onClick={() => ir(c)}>
                  {c === TRANSVERSAL ? null : <span>{textoPlano(partirBreve(sinImagenes(textoDe(historiaDe(p, c), c, 1))).breve)}</span>}
                </td>
              ))}
            </tr>
          )}
          {filas.map(({ n, d }) => (
            <tr key={n + d} className={(d ? "mf-dim" : "mf-nivel") + (n === nivel ? " nivel-actual" : "")}>
              <th onClick={() => ir(t, n, d)}>{d ? <span className="dim-nombre">{d}</span> : `N${n} · ${p.niveles[n - 1]}`}</th>
              {columnas.map((c) => {
                const f = fichaEn(c);
                const celda = f?.celdas.get(clave(c, n));
                const v = (d ? celda?.dims[d] : celda?.texto) ?? "";
                const est = f && !f.esTiempo ? presencia(f, c, p.niveles.length) : "presente";
                const aqui = c === t && n === nivel && d === dim;
                return (
                  <td key={c} className={`mf-celda ${est} ${c === TRANSVERSAL ? "col-transversal" : ""} ${c === t ? "col-actual" : ""} ${aqui ? "aqui" : ""}`} onClick={() => ir(c, n, d)}>
                    {v ? <Markdown md={v} ctx={ctx} className="recorte" /> : <span className="hueco">+</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NuevaDimension({ onCrear }: { onCrear: (d: string) => void }) {
  const [abierta, setAbierta] = useState(false);
  const [v, setV] = useState("");
  if (!abierta)
    return (
      <button className="mas" title="Nueva dimensión a este nivel (Guion, Pensamientos, Poses, Imágenes pendientes…)" onClick={() => setAbierta(true)}>
        +
      </button>
    );
  return (
    <form
      className="nueva-dim"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (v.trim()) onCrear(v.trim());
        setV("");
        setAbierta(false);
      }}
    >
      <input autoFocus value={v} placeholder="Guion, Pensamientos…" onChange={(ev) => setV(ev.target.value)} onBlur={() => !v && setAbierta(false)} onKeyDown={(ev) => ev.key === "Escape" && (ev.stopPropagation(), setAbierta(false))} />
    </form>
  );
}

const extensiones = [markdown(), EditorView.lineWrapping];

/** Editor de una casilla. Guarda al dejar de escribir; si el fichero cambia fuera y no estás escribiendo, se actualiza. */
export function Editor({ valor, onCambio, onSalir, compacto, autoFoco = true }: { valor: string; onCambio: (v: string) => void; onSalir?: () => void; compacto?: boolean; autoFoco?: boolean }) {
  const [local, setLocal] = useState(valor);
  const ultimoTecleo = useRef(0);
  const temporizador = useRef<number | undefined>(undefined);
  const pendiente = useRef<string | null>(null);
  const onCambioRef = useRef(onCambio);
  onCambioRef.current = onCambio;

  useEffect(() => {
    if (Date.now() - ultimoTecleo.current > 3000 && pendiente.current == null && valor !== local) setLocal(valor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  const vaciar = () => {
    if (pendiente.current != null) {
      onCambioRef.current(pendiente.current);
      pendiente.current = null;
    }
  };
  useEffect(
    () => () => {
      window.clearTimeout(temporizador.current);
      vaciar();
    },
    [],
  );

  return (
    <CodeMirror
      className={"editor" + (compacto ? " compacto" : "")}
      value={local}
      autoFocus={autoFoco}
      extensions={extensiones}
      basicSetup={{ lineNumbers: false, foldGutter: false, highlightActiveLine: false, highlightActiveLineGutter: false }}
      placeholder="Escribe aquí…"
      onChange={(v) => {
        setLocal(v);
        ultimoTecleo.current = Date.now();
        pendiente.current = v;
        window.clearTimeout(temporizador.current);
        temporizador.current = window.setTimeout(vaciar, 700);
      }}
      onBlur={() => {
        vaciar();
        onSalir?.();
      }}
    />
  );
}
