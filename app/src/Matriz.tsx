import type { Acciones } from "./App";
import { TRANSVERSAL } from "./formato";
import { useLocal } from "./local";
import { type Contexto, Markdown, textoPlano } from "./Markdown";
import { clave, type Entidad, presencia, type Proyecto } from "./proyecto";

interface Props {
  p: Proyecto;
  nivel: number;
  ctx: Contexto;
  acciones: Acciones;
  abrir: (ruta: string, tiempo: string, dim: string) => void;
  solo: string[]; // filas fijadas; vacío = todas
  setSolo: (s: string[]) => void;
}

/**
 * Tiempo en columnas, fichas en filas, al nivel elegido. Las columnas tienen
 * ancho fijo y la tabla se desplaza en horizontal. Cada grupo (Historia,
 * personajes…) se cierra con un clic en su título y cada fila se pliega a una
 * línea con un clic en su nombre. La fila de lo que pasa se ve siempre; el
 * resto se puede reducir a las filas fijadas (◎).
 */
export function Matriz({ p, nivel, ctx, acciones, abrir, solo, setSolo }: Props) {
  const [cerrados, setCerrados] = useLocal<string[]>("grupos-cerrados", []);
  const [plegadas, setPlegadas] = useLocal<string[]>("filas-plegadas", []);
  const columnas = [TRANSVERSAL, ...p.orden];
  const historia = (t: string) => p.entidades.find((e) => e.esTiempo && e.idTiempo === t);
  const dimsHistoria = unionDims(p.entidades.filter((e) => e.esTiempo), nivel);
  const ver = (k: string) => solo.length === 0 || solo.includes(k);
  const alternar = (lista: string[], set: (v: string[]) => void, k: string) => set(lista.includes(k) ? lista.filter((x) => x !== k) : [...lista, k]);
  const fijar = (k: string) => alternar(solo, setSolo, k);
  const plegar = (k: string) => alternar(plegadas, setPlegadas, k);
  const nombreFila = (k: string) => {
    const [r, d] = k.split("|");
    const base = r === "h" ? "Historia" : (p.entidades.find((e) => e.ruta === r)?.nombre ?? r);
    return d ? `${base} · ${d}` : base;
  };
  const comunes = { columnas, ctx, acciones, fijar, solo, plegar, plegadas };
  const ancho = columnas.length + 2;

  const Grupo = ({ id, nombre, n, mas }: { id: string; nombre: string; n: number; mas?: React.ReactNode }) => {
    const cerrado = cerrados.includes(id);
    return (
      <tr className={"grupo" + (cerrado ? " cerrado" : "")}>
        <td colSpan={ancho}>
          <button className="grupo-titulo" onClick={() => alternar(cerrados, setCerrados, id)} title={cerrado ? "Abrir" : "Cerrar"}>
            <span className="flecha">{cerrado ? "▸" : "▾"}</span> {nombre}
            {cerrado && <span className="cuenta"> · {n}</span>}
          </button>
          {mas}
        </td>
      </tr>
    );
  };

  return (
    <div className="matriz-scroll">
      {solo.length > 0 && (
        <div className="solo-barra">
          Viendo solo:
          {solo.map((k) => (
            <button key={k} className="chip" onClick={() => fijar(k)}>
              {nombreFila(k)} ×
            </button>
          ))}
          <button className="secundario" onClick={() => setSolo([])}>
            ver todo
          </button>
        </div>
      )}
      <table className="matriz">
        <thead>
          <tr>
            <th className="esquina">
              Nivel {nivel} · {p.niveles[nivel - 1]}
            </th>
            {columnas.map((t) => (
              <th key={t} className={t === TRANSVERSAL ? "col-transversal" : ""}>
                {t === TRANSVERSAL ? (
                  <>
                    <span className="id">∞</span> Siempre
                  </>
                ) : (
                  <>
                    <span className="id">{t}</span> {p.tiempos.find((x) => x.id === t)?.titulo}
                  </>
                )}
              </th>
            ))}
            <th className="col-mas">
              <button onClick={acciones.crearTiempo} title="Añadir una fase">
                +
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <Grupo id="historia" nombre="Historia" n={1 + dimsHistoria.length} />
          {!cerrados.includes("historia") && (
            <>
              <Fila
                {...comunes}
                k="h"
                nombre="Lo que pasa"
                siempreVisible
                celda={(t) => {
                  const e = historia(t);
                  return e ? { e, texto: e.celdas.get(clave(t, nivel))?.texto ?? "", estado: "presente" } : null;
                }}
                abrir={(e, t) => abrir(e.ruta, t, "")}
              />
              {dimsHistoria
                .filter((d) => ver("h|" + d))
                .map((d) => (
                  <Fila
                    {...comunes}
                    key={d}
                    k={"h|" + d}
                    dim
                    nombre={d}
                    celda={(t) => {
                      const e = historia(t);
                      return e ? { e, texto: e.celdas.get(clave(t, nivel))?.dims[d] ?? "", estado: "presente" } : null;
                    }}
                    abrir={(e, t) => abrir(e.ruta, t, d)}
                  />
                ))}
            </>
          )}

          {p.tipos.map((tipo) => {
            const ents = p.entidades.filter((e) => e.tipo === tipo && !e.esTiempo);
            const filas = ents.flatMap((e) => {
              const dims = unionDims([e], nivel);
              const res = [];
              if (ver(e.ruta) || dims.some((d) => ver(e.ruta + "|" + d)))
                res.push(
                  <Fila
                    {...comunes}
                    key={e.ruta}
                    k={e.ruta}
                    nombre={e.nombre}
                    celda={(t) => ({ e, texto: e.celdas.get(clave(t, nivel))?.texto ?? "", estado: presencia(e, t, p.niveles.length) })}
                    abrir={(e, t) => abrir(e.ruta, t, "")}
                  />,
                );
              for (const d of dims)
                if (ver(e.ruta + "|" + d) || (solo.length > 0 && solo.includes(e.ruta)))
                  res.push(
                    <Fila
                      {...comunes}
                      key={e.ruta + d}
                      k={e.ruta + "|" + d}
                      dim
                      nombre={d}
                      celda={(t) => ({ e, texto: e.celdas.get(clave(t, nivel))?.dims[d] ?? "", estado: presencia(e, t, p.niveles.length) })}
                      abrir={(e, t) => abrir(e.ruta, t, d)}
                    />,
                  );
              return res;
            });
            if (solo.length > 0 && filas.length === 0) return null;
            return [
              <Grupo
                key={"g" + tipo}
                id={tipo}
                nombre={tipo}
                n={ents.length}
                mas={
                  <button className="mas" onClick={() => acciones.crearEntidad(tipo)} title={`Nueva ficha en ${tipo}`}>
                    +
                  </button>
                }
              />,
              ...(cerrados.includes(tipo) ? [] : filas),
            ];
          })}
          {solo.length === 0 && (
            <tr className="grupo nuevo-tipo">
              <td colSpan={ancho}>
                <button
                  onClick={() => {
                    const t = window.prompt("Nuevo tipo de ficha (personajes, objetos, lugares…): será una carpeta")?.trim();
                    if (t) acciones.crearEntidad(t.replace(/[\\/:*?"<>|]/g, ""));
                  }}
                >
                  + tipo de ficha
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

type DatoCelda = { e: Entidad; texto: string; estado: string } | null;

function Fila(props: {
  k: string;
  nombre: string;
  dim?: boolean;
  siempreVisible?: boolean;
  columnas: string[];
  celda: (t: string) => DatoCelda;
  ctx: Contexto;
  acciones: Acciones;
  abrir: (e: Entidad, t: string) => void;
  fijar: (k: string) => void;
  solo: string[];
  plegar: (k: string) => void;
  plegadas: string[];
}) {
  const fijada = props.solo.includes(props.k);
  const plegada = props.plegadas.includes(props.k);
  return (
    <tr className={(props.dim ? "fila-dim" : "fila") + (plegada ? " plegada" : "")}>
      <th className="nombre">
        <button className="plegar" onClick={() => props.plegar(props.k)} title={plegada ? "Ver la fila entera" : "Plegar a una línea"}>
          <span className="flecha">{plegada ? "▸" : "▾"}</span>
          {props.dim ? <span className="dim-nombre">{props.nombre}</span> : props.nombre}
        </button>
        {!props.siempreVisible && (
          <button className={"fijar" + (fijada ? " fijada" : "")} title={fijada ? "Dejar de fijar" : "Ver solo esta fila (con la historia)"} onClick={() => props.fijar(props.k)}>
            ◎
          </button>
        )}
      </th>
      {props.columnas.map((t) => {
        const c = props.celda(t);
        if (!c) return <td key={t} className="celda vacia-hueco" />;
        const puedeAusentarse = !c.e.esTiempo && t !== TRANSVERSAL && !props.dim;
        return (
          <td key={t} className={`celda ${c.estado} ${t === TRANSVERSAL ? "col-transversal" : ""}`} onClick={() => props.abrir(c.e, t)}>
            {!c.texto ? (
              <span className="hueco">{c.estado === "ausente" ? "" : "+"}</span>
            ) : plegada ? (
              <span className="linea">{textoPlano(c.texto)}</span>
            ) : (
              <Markdown md={c.texto} ctx={props.ctx} />
            )}
            {puedeAusentarse && (
              <button
                className="presencia"
                title={c.estado === "ausente" ? "Aparece aquí" : "No aparece aquí"}
                onClick={(ev) => {
                  ev.stopPropagation();
                  props.acciones.alternarPresencia(c.e, t);
                }}
              >
                {c.estado === "ausente" ? "○" : "●"}
              </button>
            )}
          </td>
        );
      })}
      <td />
    </tr>
  );
}

function unionDims(ents: Entidad[], nivel: number): string[] {
  const res: string[] = [];
  for (const e of ents)
    for (const [k, c] of e.celdas) if (k.endsWith(`|${nivel}`)) for (const d of Object.keys(c.dims)) if (!res.includes(d)) res.push(d);
  return res;
}
