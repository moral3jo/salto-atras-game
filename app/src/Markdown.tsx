import DOMPurify from "dompurify";
import { marked } from "marked";
import { useMemo } from "react";

marked.setOptions({ breaks: true, gfm: true });

export interface Contexto {
  imagen: (nombre: string) => string | undefined;
  existe: (nombre: string) => boolean;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Markdown de Obsidian a HTML: imágenes y enlaces [[ ]], etiquetas, y el guion (Hablante: / ◆). */
export function aHtml(md: string, ctx: Contexto): string {
  const lineas = md.split("\n").map((l) => {
    if (/^\s*◆/.test(l)) return `<span class="acotacion">${esc(l.trim())}</span>`;
    const m = /^([A-ZÁÉÍÓÚÑ][\wáéíóúñÁÉÍÓÚÑ .]{0,24}):\s+(.*)$/.exec(l);
    // Solo es una línea de guion si quien habla es una ficha o va en mayúsculas.
    if (m && (ctx.existe(m[1]) || /^[A-ZÁÉÍÓÚÑ .]+$/.test(m[1]))) return `<span class="hablante">${esc(m[1])}</span> ${m[2]}`;
    return l;
  });
  let t = lineas.join("\n");
  t = t.replace(/!\[\[([^\]|]+)(?:\|(\d+))?\]\]/g, (_, n: string, w?: string) => {
    const url = ctx.imagen(n.trim());
    return url ? `<img src="${url}" alt="${esc(n)}"${w ? ` width="${w}"` : ""}>` : `<span class="falta">🖼 ${esc(n)}</span>`;
  });
  t = t.replace(/\[\[([^\]]+)\]\]/g, (_, n: string) => {
    const [dest, alias] = n.split("|");
    const cls = ctx.existe(dest) ? "enlace" : "enlace roto";
    return `<a class="${cls}" data-ent="${esc(dest.trim())}">${esc((alias ?? dest).trim())}</a>`;
  });
  t = t.replace(/(^|\s)#([a-záéíóúñ_][\w/\-áéíóúñ]*)/gi, (_, a: string, tag: string) => `${a}<span class="tag tag-${esc(tag.split("/")[0])}">#${esc(tag)}</span>`);
  return DOMPurify.sanitize(marked.parse(t, { async: false }) as string, { ADD_ATTR: ["data-ent"], ALLOWED_URI_REGEXP: /^(blob:|https?:|#)/i });
}

export function Markdown({ md, ctx, className, onEnlace }: { md: string; ctx: Contexto; className?: string; onEnlace?: (nombre: string) => void }) {
  const html = useMemo(() => aHtml(md, ctx), [md, ctx]);
  return (
    <div
      className={"md " + (className ?? "")}
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={(ev) => {
        const a = (ev.target as HTMLElement).closest("a[data-ent]");
        if (a && onEnlace) {
          ev.stopPropagation();
          onEnlace(a.getAttribute("data-ent")!);
        }
      }}
    />
  );
}

/** Texto sin marcas, en una línea: para resúmenes y filas plegadas. */
export function textoPlano(t: string) {
  return t
    .replace(/!\[\[[^\]]*\]\]/g, "")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a)
    .replace(/[*_`#|>]|-{3,}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
