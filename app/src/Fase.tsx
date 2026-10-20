import { useRef, useState } from "react";
import type { Acciones } from "./App";
import { TRANSVERSAL } from "./formato";
import { type Contexto, Markdown } from "./Markdown";
import { conectaDe, dondeDe, type Entidad, historiaDe, imagenDe, papelDe, partirBreve, porNombre, posicionDe, presencia, type Proyecto, sinImagenes, textoDe } from "./proyecto";

interface Props {
  p: Proyecto;
  t: string;
  ctx: Contexto;
  acciones: Acciones;
  abrirFicha: (ruta: string, tiempo: string, nivel: number, dim?: string) => void;
  irFase: (t: string) => void;
}

const TIPO_LUGARES = /^lugar/i;

/** Tablero de una fase, siempre a nivel 1: qué pasa, sus dimensiones, el mapa y quién sale. */
export function Fase({ p, t, ctx, acciones, abrirFicha, irFase }: Props) {
  const h = historiaDe(p, t);
  const nodo = p.tiempos.find((x) => x.id === t);
  const i = p.orden.indexOf(t);
  const { breve, larga } = partirBreve(sinImagenes(textoDe(h, t, 1)));
  const dimsFase = Object.entries(h?.celdas.get(`${t}|1`)?.dims ?? {});
  const premisa = historiaDe(p, TRANSVERSAL);
  const mapaBase = premisa?.celdas.get(`${TRANSVERSAL}|1`)?.dims["Mapa"];
  const enFase = (e: Entidad) => ["presente", "conflicto"].includes(presencia(e, t, p.niveles.length));
  const tipoLugares = p.tipos.find((x) => TIPO_LUGARES.test(x));
  const otrosTipos = p.tipos.filter((x) => x !== tipoLugares);

  return (
    <div className="fase-vista">
      <div className="fase-cabecera">
        <button className="fase-nav" disabled={i <= 0} onClick={() => irFase(p.orden[i - 1])} title="Alt + ←">
          ‹ {p.orden[i - 1] ?? ""}
        </button>
        <div className="fase-centro" onClick={() => h && abrirFicha(h.ruta, t, 2)} title="Abrir el detalle de la fase">
          <div className="fase-id">{t}</div>
          <h1>{nodo?.titulo}</h1>
          {breve ? <Markdown md={breve} ctx={ctx} className="fase-breve-grande" onEnlace={acciones.irEnlace} /> : <p className="vacio">Sin escribir: clic para empezar</p>}
          {larga && <Markdown md={larga} ctx={ctx} className="fase-larga" onEnlace={acciones.irEnlace} />}
        </div>
        <button className="fase-nav" disabled={i >= p.orden.length - 1} onClick={() => irFase(p.orden[i + 1])} title="Alt + →">
          {p.orden[i + 1] ?? ""} ›
        </button>
      </div>

      {dimsFase.length > 0 && (
        <div className="fase-dims">
          {dimsFase
            .filter(([d]) => d !== "Mapa")
            .map(([d, v]) => (
              <div key={d} className="fase-dim" onClick={() => h && abrirFicha(h.ruta, t, 1, d)}>
                <h3>{d}</h3>
                <Markdown md={v} ctx={ctx} className="recorte" onEnlace={acciones.irEnlace} />
              </div>
            ))}
        </div>
      )}

      {tipoLugares && (
        <section className="fase-seccion">
          <h2>{tipoLugares}</h2>
          <div className="mapa-y-notas">
            <MapaLugares p={p} t={t} tipo={tipoLugares} ctx={ctx} acciones={acciones} abrirFicha={abrirFicha} />
            {(
              <div className="mapa-notas">
                <div className="capa-titulo">∞ El mapa siempre</div>
                {mapaBase ? <Markdown md={mapaBase} ctx={ctx} onEnlace={acciones.irEnlace} /> : <p className="vacio">Nada escrito.</p>}
                <div className="capa-titulo">En {t}</div>
                {h?.celdas.get(`${t}|1`)?.dims["Mapa"] ? (
                  <div onClick={() => h && abrirFicha(h.ruta, t, 1, "Mapa")} className="clicable">
                    <Markdown md={h.celdas.get(`${t}|1`)!.dims["Mapa"]} ctx={ctx} onEnlace={acciones.irEnlace} />
                  </div>
                ) : (
                  <button className="capa-vacia" onClick={() => h && abrirFicha(h.ruta, t, 1, "Mapa")}>
                    + cambios del mapa en {t}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {otrosTipos.map((tipo) => {
        const ents = p.entidades.filter((e) => e.tipo === tipo && !e.esTiempo && enFase(e));
        const fuera = p.entidades.filter((e) => e.tipo === tipo && !e.esTiempo && !enFase(e));
        return (
          <section key={tipo} className="fase-seccion">
            <h2>
              {tipo}
              <button className="mas" onClick={() => acciones.crearEntidad(tipo)} title={`Nueva ficha en ${tipo}`}>
                +
              </button>
            </h2>
            <div className="tarjetas">
              {ents.map((e) => (
                <TarjetaFicha key={e.ruta} e={e} t={t} ctx={ctx} onClick={() => abrirFicha(e.ruta, t, 2)} />
              ))}
              {ents.length === 0 && <p className="vacio">Nadie en esta fase.</p>}
            </div>
            {fuera.length > 0 && (
              <div className="fuera">
                No salen:{" "}
                {fuera.map((e) => (
                  <button key={e.ruta} onClick={() => abrirFicha(e.ruta, t, 1)} title="Abrir y marcar si aparece">
                    {e.nombre}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Avatar({ e, ctx, pequeno }: { e: Entidad; ctx: Contexto; pequeno?: boolean }) {
  const img = imagenDe(e);
  const url = img ? ctx.imagen(img) : undefined;
  return url ? (
    <img className={"avatar" + (pequeno ? " pequeno" : "")} src={url} alt={e.nombre} title={e.nombre} />
  ) : (
    <span className={"avatar inicial" + (pequeno ? " pequeno" : "")} title={e.nombre}>
      {e.nombre[0]}
    </span>
  );
}

function TarjetaFicha({ e, t, ctx, onClick }: { e: Entidad; t: string; ctx: Contexto; onClick: () => void }) {
  const papel = papelDe(e);
  const donde = dondeDe(e, t);
  const aqui = partirBreve(sinImagenes(textoDe(e, t, 1))).breve;
  return (
    <button className="tarjeta-ficha" onClick={onClick}>
      <Avatar e={e} ctx={ctx} />
      <div className="tf-texto">
        <div className="tf-nombre">{e.nombre}</div>
        {papel && <div className="tf-papel">{sinMarkdown(papel)}</div>}
        {donde.length > 0 && <div className="tf-donde">📍 {donde.join(", ")}</div>}
        {aqui && <Markdown md={aqui} ctx={ctx} className="tf-aqui" />}
      </div>
    </button>
  );
}

function sinMarkdown(t: string) {
  return t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a).replace(/[*_`]/g, "");
}

// ---- Mapa de lugares -------------------------------------------------------

const ANCHO_NODO = 150;

/** El mapa sigue recibiendo el puntero aunque salga del lugar que se arrastra. */
function capturar(ev: React.PointerEvent) {
  try {
    (ev.currentTarget.closest(".mapa") as HTMLElement | null)?.setPointerCapture(ev.pointerId);
  } catch {
    /* sin captura: el arrastre funciona igual dentro del mapa */
  }
}

function MapaLugares({ p, t, tipo, ctx, acciones, abrirFicha }: { p: Proyecto; t: string; tipo: string; ctx: Contexto; acciones: Acciones; abrirFicha: Props["abrirFicha"] }) {
  const lugares = p.entidades.filter((e) => e.tipo === tipo && !e.esTiempo);
  const lienzo = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastre] = useState<{ ruta: string; dx: number; dy: number; x: number; y: number; movido: boolean } | null>(null);
  const [linea, setLinea] = useState<{ desde: string; x: number; y: number } | null>(null);

  // Sin posición guardada: en rejilla.
  const pos = new Map<string, { x: number; y: number }>();
  lugares.forEach((e, i) => pos.set(e.ruta, posicionDe(e) ?? { x: 20 + (i % 5) * (ANCHO_NODO + 30), y: 20 + Math.floor(i / 5) * 170 }));
  if (arrastre) pos.set(arrastre.ruta, { x: arrastre.x, y: arrastre.y });

  // Quién está en cada lugar en esta fase (línea "Dónde:").
  const gente = new Map<string, Entidad[]>();
  for (const e of p.entidades) {
    if (e.esTiempo || e.tipo === tipo) continue;
    for (const n of dondeDe(e, t)) {
      const l = porNombre(p, n);
      if (l) gente.set(l.ruta, [...(gente.get(l.ruta) ?? []), e]);
    }
  }

  const centro = (ruta: string) => {
    const q = pos.get(ruta)!;
    return { x: q.x + ANCHO_NODO / 2, y: q.y + 32 };
  };
  const conexiones: { a: Entidad; b: Entidad }[] = [];
  for (const a of lugares)
    for (const n of conectaDe(a)) {
      const b = porNombre(p, n);
      if (b && b.tipo === tipo) conexiones.push({ a, b });
    }
  const alto = Math.max(320, ...[...pos.values()].map((q) => q.y + 130));
  const ancho = Math.max(...[...pos.values()].map((q) => q.x + ANCHO_NODO + 20), 600);

  const puntoLienzo = (ev: React.PointerEvent) => {
    const r = lienzo.current!.getBoundingClientRect();
    return { x: ev.clientX - r.left + lienzo.current!.scrollLeft, y: ev.clientY - r.top + lienzo.current!.scrollTop };
  };

  return (
    <div
      className="mapa"
      ref={lienzo}
      onPointerMove={(ev) => {
        const q = puntoLienzo(ev);
        if (arrastre) setArrastre({ ...arrastre, x: Math.max(0, q.x - arrastre.dx), y: Math.max(0, q.y - arrastre.dy), movido: true });
        if (linea) setLinea({ ...linea, x: q.x, y: q.y });
      }}
      onPointerUp={(ev) => {
        if (arrastre) {
          const e = lugares.find((x) => x.ruta === arrastre.ruta)!;
          if (arrastre.movido) acciones.fijarFm(e, "mapa", `${Math.round(arrastre.x)}, ${Math.round(arrastre.y)}`);
          else abrirFicha(e.ruta, t, 2);
          setArrastre(null);
        }
        if (linea) {
          const destino = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-lugar]")?.dataset.lugar;
          const a = lugares.find((x) => x.ruta === linea.desde);
          const b = lugares.find((x) => x.ruta === destino);
          if (a && b && a !== b && !conectaDe(a).includes(b.nombre) && !conectaDe(b).includes(a.nombre)) acciones.fijarFm(a, "conecta", [...conectaDe(a), b.nombre].join(", "));
          setLinea(null);
        }
      }}
    >
      <div className="mapa-lienzo" style={{ width: ancho, height: alto }}>
        <svg className="mapa-lineas" width={ancho} height={alto}>
          {conexiones.map(({ a, b }) => {
            const ca = centro(a.ruta), cb = centro(b.ruta);
            return (
              <line
                key={a.ruta + b.ruta}
                x1={ca.x}
                y1={ca.y}
                x2={cb.x}
                y2={cb.y}
                onClick={() => {
                  if (window.confirm(`¿Quitar el camino entre ${a.nombre} y ${b.nombre}?`))
                    acciones.fijarFm(a, "conecta", conectaDe(a).filter((n) => n.toLowerCase() !== b.nombre.toLowerCase()).join(", ") || null);
                }}
              >
                <title>
                  {a.nombre} — {b.nombre} (clic para quitar)
                </title>
              </line>
            );
          })}
          {linea && <line className="provisional" x1={centro(linea.desde).x} y1={centro(linea.desde).y} x2={linea.x} y2={linea.y} />}
        </svg>
        {lugares.map((e) => {
          const q = pos.get(e.ruta)!;
          const activo = ["presente", "conflicto"].includes(presencia(e, t, p.niveles.length)) || gente.has(e.ruta);
          const img = imagenDe(e);
          const aqui = partirBreve(sinImagenes(textoDe(e, t, 1))).breve;
          return (
            <div
              key={e.ruta}
              data-lugar={e.ruta}
              className={"lugar" + (activo ? " activo" : "") + (arrastre?.ruta === e.ruta ? " arrastrando" : "")}
              style={{ left: q.x, top: q.y, width: ANCHO_NODO }}
              title={aqui || papelDe(e)}
              onPointerDown={(ev) => {
                if ((ev.target as HTMLElement).closest(".asa")) return;
                const m = puntoLienzo(ev);
                capturar(ev);
                setArrastre({ ruta: e.ruta, dx: m.x - q.x, dy: m.y - q.y, x: q.x, y: q.y, movido: false });
              }}
            >
              {img && ctx.imagen(img) && <img src={ctx.imagen(img)} alt="" draggable={false} />}
              <div className="lugar-nombre">{e.nombre}</div>
              {activo && aqui && <div className="lugar-aqui">{sinMarkdown(aqui)}</div>}
              {gente.has(e.ruta) && (
                <div className="lugar-gente">
                  {gente.get(e.ruta)!.map((x) => (
                    <Avatar key={x.ruta} e={x} ctx={ctx} pequeno />
                  ))}
                </div>
              )}
              <span
                className="asa"
                title="Arrastra hasta otro lugar para unirlos"
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  capturar(ev);
                  setLinea({ desde: e.ruta, ...puntoLienzo(ev) });
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
