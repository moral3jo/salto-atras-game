import { describe, expect, it } from "vitest";
import { escribirCelda, escribirRango, fijarFrontmatter, leerCeldas, leerDocumento, leerRango } from "./formato";

const orden = ["F1", "F2", "F3", "F4"];
const niveles = ["Esquema", "Detalle", "Producción"];
const opEnt = { esTiempo: false, nombresNivel: niveles, ordenTiempo: orden };
const opTie = { esTiempo: true, nombresNivel: niveles, ordenTiempo: orden };

const carlos = `---
tipo: personaje
aparece: F1-F3
---
# Carlos

## Transversal
### N1 · Esquema
El chico majo.

## F1 · Intro
Cuida a los chicos en el parque.

## F3
### N1
Aparece con uno de ellos.
### N2
Acompaña al caso cero.
#### Pensamientos
No quiere que Hugo vea a su hermano.

## Notas
libre
`;

describe("lectura", () => {
  it("lee celdas, N1 suelto y dimensiones", () => {
    const c = leerCeldas(leerDocumento(carlos), false);
    expect(c.get("T|1")?.texto).toBe("El chico majo.");
    expect(c.get("F1|1")?.texto).toBe("Cuida a los chicos en el parque.");
    expect(c.get("F3|2")?.texto).toBe("Acompaña al caso cero.");
    expect(c.get("F3|2")?.dims["Pensamientos"]).toBe("No quiere que Hugo vea a su hermano.");
    expect(leerDocumento(carlos).frontmatter.aparece).toBe("F1-F3");
  });

  it("ignora encabezados dentro de bloques de código", () => {
    const t = "# X\n\n## N1\n```\n## N2\n```\n";
    const c = leerCeldas(leerDocumento(t), true, "F1");
    expect(c.has("F1|2")).toBe(false);
    expect(c.get("F1|1")?.texto).toBe("```\n## N2\n```");
  });
});

describe("escritura", () => {
  it("sustituye solo la celda y deja el resto igual", () => {
    const r = escribirCelda(carlos, { tiempo: "F3", nivel: 2, dim: "" }, "Lo lleva al médico.", opEnt);
    expect(r).toBe(carlos.replace("Acompaña al caso cero.", "Lo lleva al médico."));
  });

  it("sustituye una dimensión", () => {
    const r = escribirCelda(carlos, { tiempo: "F3", nivel: 2, dim: "Pensamientos" }, "Otra cosa.", opEnt);
    expect(r).toBe(carlos.replace("No quiere que Hugo vea a su hermano.", "Otra cosa."));
  });

  it("edita el N1 suelto en su sitio", () => {
    const r = escribirCelda(carlos, { tiempo: "F1", nivel: 1, dim: "" }, "Nuevo.", opEnt);
    expect(r).toBe(carlos.replace("Cuida a los chicos en el parque.", "Nuevo."));
  });

  it("crea la sección de tiempo en orden, antes de las secciones libres", () => {
    const r = escribirCelda(carlos, { tiempo: "F2", nivel: 2, dim: "" }, "Escondido.", opEnt);
    const l = leerDocumento(r);
    expect(leerCeldas(l, false).get("F2|2")?.texto).toBe("Escondido.");
    expect(r.indexOf("## F2")).toBeGreaterThan(r.indexOf("## F1"));
    expect(r.indexOf("## F2")).toBeLessThan(r.indexOf("## F3"));
    expect(r).toContain("## F2\n\n### N2 · Detalle\n\nEscondido.\n\n## F3");
  });

  it("crea F4 detrás de F3 y antes de Notas", () => {
    const r = escribirCelda(carlos, { tiempo: "F4", nivel: 1, dim: "" }, "Final.", opEnt);
    expect(r.indexOf("## F4")).toBeGreaterThan(r.indexOf("## F3"));
    expect(r.indexOf("## F4")).toBeLessThan(r.indexOf("## Notas"));
    expect(r).toContain("## Notas\nlibre\n");
  });

  it("crea un nivel dentro de una sección existente, en orden", () => {
    const r = escribirCelda(carlos, { tiempo: "F3", nivel: 3, dim: "Guion" }, "Carlos: Hola.", opEnt);
    expect(r).toContain("#### Pensamientos\nNo quiere que Hugo vea a su hermano.\n\n### N3 · Producción\n\n#### Guion\n\nCarlos: Hola.\n\n## Notas");
  });

  it("escribe en un nodo de tiempo", () => {
    const t = "---\ntipo: tiempo\n---\n# Fase 1 — Intro\n\n## N1\n\nLlega al pueblo.\n";
    const r = escribirCelda(t, { tiempo: "F1", nivel: 2, dim: "Panel" }, "- Hay fraude", opTie);
    expect(r).toBe(t + "\n## N2 · Detalle\n\n### Panel\n\n- Hay fraude\n");
    const r2 = escribirCelda(r, { tiempo: "F1", nivel: 1, dim: "" }, "Llega tarde.", opTie);
    expect(r2).toBe(r.replace("Llega al pueblo.", "Llega tarde."));
  });

  it("conserva CRLF", () => {
    const t = carlos.replace(/\n/g, "\r\n");
    const r = escribirCelda(t, { tiempo: "F3", nivel: 2, dim: "" }, "X", opEnt);
    expect(r).toBe(t.replace("Acompaña al caso cero.", "X"));
  });

  it("vaciar una celda deja el encabezado", () => {
    const r = escribirCelda(carlos, { tiempo: "F3", nivel: 1, dim: "" }, "", opEnt);
    expect(r).toContain("### N1\n### N2");
  });
});

describe("frontmatter y rangos", () => {
  it("cambia, añade y quita claves", () => {
    expect(fijarFrontmatter(carlos, "aparece", "F2")).toContain("aparece: F2\n---");
    expect(fijarFrontmatter("# X", "aparece", "F1")).toBe("---\naparece: F1\n---\n# X");
    expect(fijarFrontmatter(carlos, "aparece", null)).not.toContain("aparece");
  });
  it("rangos", () => {
    expect([...leerRango("F1-F3", orden)]).toEqual(["F1", "F2", "F3"]);
    expect([...leerRango("F1, F4", orden)]).toEqual(["F1", "F4"]);
    expect(escribirRango(new Set(["F1", "F2", "F3"]), orden)).toBe("F1-F3");
    expect(escribirRango(new Set(["F1", "F2", "F4"]), orden)).toBe("F1, F2, F4");
  });
});
