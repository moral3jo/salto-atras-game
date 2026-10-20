import { useLayoutEffect, useRef, useState } from "react";
import { type Contexto, Markdown } from "./Markdown";
import { grafoDeTiempo, historiaDe, partirBreve, type Proyecto, sinImagenes, textoDe } from "./proyecto";
import { TRANSVERSAL } from "./formato";

/** Vista de pájaro: las fases en columnas, con flechas. Las ramas (F3.1, F3.2) comparten columna. */
export function Grafo({ p, ctx, abrirFase, crearTiempo }: { p: Proyecto; ctx: Contexto; abrirFase: (t: string) => void; crearTiempo: () => void }) {
  const { columnas, flechas } = grafoDeTiempo(p);
  const lienzo = useRef<HTMLDivElement>(null);
  const [lineas, setLineas] = useState<{ d: string; key: string }[]>([]);
  const premisa = partirBreve(sinImagenes(textoDe(historiaDe(p, TRANSVERSAL), TRANSVERSAL, 1))).breve;

  // Las flechas se dibujan midiendo dónde han quedado las cajas.
  useLayoutEffect(() => {
    const el = lienzo.current;
    if (!el) return;
    const medir = () => {
      const base = el.getBoundingClientRect();
      const caja = (id: string) => el.querySelector<HTMLElement>(`[data-fase="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      const res: { d: string; key: string }[] = [];
      for (const [a, b] of flechas) {
        const ra = caja(a), rb = caja(b);
        if (!ra || !rb) continue;
        const x1 = ra.right - base.left + el.scrollLeft, y1 = ra.top + ra.height / 2 - base.top + el.scrollTop;
        const x2 = rb.left - base.left + el.scrollLeft, y2 = rb.top + rb.height / 2 - base.top + el.scrollTop;
        const dx = Math.max(24, (x2 - x1) / 2);
        res.push({ key: a + ">" + b, d: x2 > x1 ? `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2 - 6},${y2}` : `M${x1},${y1} L${x2},${y2}` });
      }
      setLineas(res);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    el.querySelectorAll("[data-fase]").forEach((n) => ro.observe(n));
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p]);

  return (
    <div className="grafo-vista">
      {premisa && (
        <div className="premisa">
          <Markdown md={premisa} ctx={ctx} />
        </div>
      )}
      <div className="grafo" ref={lienzo}>
        <svg className="flechas" aria-hidden>
          <defs>
            <marker id="punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" />
            </marker>
          </defs>
          {lineas.map((l) => (
            <path key={l.key} d={l.d} markerEnd="url(#punta)" />
          ))}
        </svg>
        {columnas.map((col, i) => (
          <div key={i} className={"columna" + (col.length > 1 ? " ramas" : "")}>
            {col.map((t) => {
              const breve = partirBreve(sinImagenes(textoDe(historiaDe(p, t.id), t.id, 1))).breve;
              return (
                <button key={t.id} className="fase-caja" data-fase={t.id} onClick={() => abrirFase(t.id)}>
                  <div className="fase-id">{t.id}</div>
                  <div className="fase-titulo">{t.titulo}</div>
                  {breve ? <Markdown md={breve} ctx={ctx} className="fase-breve" /> : <p className="vacio">Sin escribir</p>}
                </button>
              );
            })}
          </div>
        ))}
        <div className="columna">
          <button className="fase-caja nueva" onClick={crearTiempo} title="Añadir una fase. Para una rama, usa un id con punto: F3.1, F3.2">
            + fase
          </button>
        </div>
      </div>
    </div>
  );
}
