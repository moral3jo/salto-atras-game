// Tres filtros propios para probar estilos que Phaser no trae (ver docs/DEBUG.md →
// "Pruebas de color"). Cada uno es un controlador (los datos) y un nodo de render (el
// shader), como pide Phaser 4 (docs/phaser/Phaser 4 Shader Guide → Authoring Filters).
//
//   Bayer      tramado ordenado con una paleta fija de 4 colores (Obra Dinn, ámbar de terminal…)
//   Semitono   puntos de imprenta que crecen con la sombra (fanzine, cómic)
//   Contorno   líneas de tinta en todas las siluetas y cambios de luz (Sobel)
//
// Todos los tamaños se dan en píxeles de pantalla; `escala` dice cuántos píxeles de pantalla
// mide cada píxel del filtro (una imagen grande reducida, p. ej.), para que el punto o la
// línea salgan igual en el fondo y en las figuras.

import * as Phaser from "phaser";

type Rgb = [number, number, number];

export const aRgb = (hex: number): Rgb => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

const ENCABEZADO = ["#pragma phaserTemplate(shaderName)", "precision mediump float;", "uniform sampler2D uMainSampler;", "uniform vec2 resolution;", "varying vec2 outTexCoord;"];

const BAYER = [
  ...ENCABEZADO,
  "uniform float tam;",
  "uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3;",
  "uniform vec2 salto;",  // cuánto se corre toda la trama este fotograma (hervor)
  "uniform float color;", // cuánto del color original se conserva (0 = solo la paleta)
  "float d2 (vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }",
  "float bayer (vec2 a) { return d2(0.5 * a) * 0.25 + d2(a); }",
  "void main () {",
  "  vec4 col = texture2D(uMainSampler, outTexCoord);",
  "  if (col.a < 0.02) { gl_FragColor = vec4(0.0); return; }",
  "  vec3 rgb = col.rgb / col.a;",
  "  float lum = dot(rgb, vec3(0.299, 0.587, 0.114));",
  "  float t = bayer(floor(gl_FragCoord.xy / tam + salto)) - 0.47;",
  "  float idx = clamp(floor(lum * 3.0 + 0.5 + t), 0.0, 3.0);",
  "  vec3 o = idx < 0.5 ? c0 : (idx < 1.5 ? c1 : (idx < 2.5 ? c2 : c3));",
  // Con color: el color original, con la luz ya tramada (cuantizada), en vez del color de la paleta.
  "  vec3 propio = clamp(rgb * ((idx / 3.0) / max(lum, 0.05)), 0.0, 1.0);",
  "  o = mix(o, propio, color);",
  "  gl_FragColor = vec4(o * col.a, col.a);",
  "}",
].join("\n");

const SEMITONO = [
  ...ENCABEZADO,
  "uniform float tam;",
  "uniform float angulo;",
  "uniform vec3 c0; uniform vec3 c3;",
  "void main () {",
  "  vec4 col = texture2D(uMainSampler, outTexCoord);",
  "  if (col.a < 0.02) { gl_FragColor = vec4(0.0); return; }",
  "  float s = sin(angulo); float c = cos(angulo);",
  "  mat2 giro = mat2(c, -s, s, c);",
  "  vec2 p = giro * gl_FragCoord.xy;",
  "  vec2 celda = (floor(p / tam) + 0.5) * tam;",
  "  vec2 centro = celda * giro;",
  "  vec4 m = texture2D(uMainSampler, clamp(centro / resolution, 0.0, 1.0));",
  "  float lum = dot(m.a > 0.01 ? m.rgb / m.a : col.rgb / col.a, vec3(0.299, 0.587, 0.114));",
  "  float radio = sqrt(clamp(1.0 - lum, 0.0, 1.0)) * tam * 0.72;",
  "  float punto = 1.0 - smoothstep(radio - 0.7, radio + 0.7, length(p - celda));",
  "  vec3 o = mix(c3, c0, punto);",
  "  gl_FragColor = vec4(o * col.a, col.a);",
  "}",
].join("\n");

const CONTORNO = [
  ...ENCABEZADO,
  "uniform float grosor;",
  "uniform float umbral;",
  "uniform float fuerza;",
  "uniform vec3 tinta;",
  "float luz (vec2 o) {",
  "  vec4 c = texture2D(uMainSampler, outTexCoord + o / resolution * grosor);",
  "  return dot(c.rgb, vec3(0.299, 0.587, 0.114)) + c.a * 0.5;",
  "}",
  "void main () {",
  "  vec4 col = texture2D(uMainSampler, outTexCoord);",
  "  float tl = luz(vec2(-1.0, 1.0)); float t = luz(vec2(0.0, 1.0)); float tr = luz(vec2(1.0, 1.0));",
  "  float l = luz(vec2(-1.0, 0.0)); float r = luz(vec2(1.0, 0.0));",
  "  float bl = luz(vec2(-1.0, -1.0)); float b = luz(vec2(0.0, -1.0)); float br = luz(vec2(1.0, -1.0));",
  "  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;",
  "  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;",
  "  float borde = smoothstep(umbral, umbral + 0.15, length(vec2(gx, gy))) * fuerza;",
  "  float a = max(col.a, borde);",
  "  gl_FragColor = vec4(col.rgb * (1.0 - borde) + tinta * borde, a);",
  "}",
].join("\n");

// ---- Controladores (los datos que llegan al shader) ----

interface ConEscala {
  /** Píxeles de pantalla por píxel del filtro. */
  escala: () => number;
}

/**
 * Hervor: la trama del tramado salta de sitio a saltos de fotograma, con un ritmo fijo, y la
 * imagen no cambia (docs/DEBUG.md → tramado vivo). Probado y descartado: mover puntos sueltos,
 * ondular la trama, deslizarla o hacer respirar el brillo.
 */
export interface VidaTramado {
  /** Cuánto salta: 0 = no; hasta 0,33 cae en 2×2 sitios, hasta 0,66 en 3×3 y arriba en 4×4. */
  salto: number;
  fps: number;
}

export class FiltroBayer extends Phaser.Filters.Controller implements ConEscala {
  tam = 3;
  /** Cuánto del color original se conserva (0 = solo los 4 colores de la paleta). */
  color = 0;
  vida: VidaTramado = { salto: 0, fps: 6 };
  paleta: Rgb[] = [[0, 0, 0], [0.3, 0.3, 0.3], [0.7, 0.7, 0.7], [1, 1, 1]];
  escala = () => 1;
  constructor(camara: Phaser.Cameras.Scene2D.Camera) {
    super(camara, "FilterEstampaBayer");
  }
}

export class FiltroSemitono extends Phaser.Filters.Controller implements ConEscala {
  tam = 6;
  angulo = Math.PI / 4;
  tinta: Rgb = [0.08, 0.08, 0.1];
  papel: Rgb = [0.92, 0.9, 0.84];
  escala = () => 1;
  constructor(camara: Phaser.Cameras.Scene2D.Camera) {
    super(camara, "FilterEstampaSemitono");
  }
}

export class FiltroContorno extends Phaser.Filters.Controller implements ConEscala {
  grosor = 1.5;
  umbral = 0.35;
  fuerza = 1;
  tinta: Rgb = [0.05, 0.04, 0.03];
  escala = () => 1;
  constructor(camara: Phaser.Cameras.Scene2D.Camera) {
    super(camara, "FilterEstampaContorno");
  }
}

// ---- Nodos de render (el shader y sus uniformes) ----

type Nodo = new (manager: unknown) => unknown;
const Base = (Phaser.Renderer.WebGL.RenderNodes as unknown as { BaseFilterShader: new (...a: unknown[]) => { programManager: { setUniform(n: string, v: unknown): void } } }).BaseFilterShader;

class NodoBayer extends Base {
  constructor(manager: unknown) {
    super("FilterEstampaBayer", manager, null, BAYER);
  }
  setupUniforms(c: FiltroBayer, ctx: { width: number; height: number }) {
    const p = this.programManager;
    p.setUniform("resolution", [ctx.width, ctx.height]);
    p.setUniform("tam", Math.max(1, c.tam / c.escala()));
    c.paleta.forEach((color, i) => p.setUniform(`c${i}`, color));

    // Hervor con ritmo fijo: en cada fotograma la trama cae en un sitio distinto del anterior
    // (nunca repite), así no hay pausas. Todo sale del reloj, sin estado.
    const v = c.vida;
    const paso = Math.floor((performance.now() / 1000) * Math.max(1, v.fps));
    const k = 1 + Math.min(2, Math.floor(v.salto * 3));
    const azar = (n: number, m: number) => {
      const x = Math.sin(n * 12.9898 + m * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const sitio = (n: number): [number, number] => [Math.floor(azar(n, 1) * (k + 1)), Math.floor(azar(n, 2) * (k + 1))];
    let desplazamiento: [number, number] = [0, 0];
    if (v.salto > 0) {
      desplazamiento = sitio(paso);
      const antes = sitio(paso - 1);
      if (desplazamiento[0] === antes[0] && desplazamiento[1] === antes[1]) desplazamiento = [(desplazamiento[0] + 1) % (k + 1), desplazamiento[1]];
    }
    p.setUniform("salto", desplazamiento);
    p.setUniform("color", c.color);
  }
}

class NodoSemitono extends Base {
  constructor(manager: unknown) {
    super("FilterEstampaSemitono", manager, null, SEMITONO);
  }
  setupUniforms(c: FiltroSemitono, ctx: { width: number; height: number }) {
    const p = this.programManager;
    p.setUniform("resolution", [ctx.width, ctx.height]);
    p.setUniform("tam", Math.max(2, c.tam / c.escala()));
    p.setUniform("angulo", c.angulo);
    p.setUniform("c0", c.tinta);
    p.setUniform("c3", c.papel);
  }
}

class NodoContorno extends Base {
  constructor(manager: unknown) {
    super("FilterEstampaContorno", manager, null, CONTORNO);
  }
  setupUniforms(c: FiltroContorno, ctx: { width: number; height: number }) {
    const p = this.programManager;
    p.setUniform("resolution", [ctx.width, ctx.height]);
    p.setUniform("grosor", Math.max(0.5, c.grosor / c.escala()));
    p.setUniform("umbral", c.umbral);
    p.setUniform("fuerza", c.fuerza);
    p.setUniform("tinta", c.tinta);
  }
}

/** Da de alta los shaders en el renderizador (una sola vez; hace falta WebGL). */
export function registrarFiltros(escena: Phaser.Scene) {
  const nodos = (escena.renderer as unknown as { renderNodes?: { hasNode(n: string): boolean; addNodeConstructor(n: string, c: Nodo): void } }).renderNodes;
  if (!nodos) return false;
  const altas: [string, Nodo][] = [
    ["FilterEstampaBayer", NodoBayer as unknown as Nodo],
    ["FilterEstampaSemitono", NodoSemitono as unknown as Nodo],
    ["FilterEstampaContorno", NodoContorno as unknown as Nodo],
  ];
  for (const [nombre, clase] of altas) if (!nodos.hasNode(nombre)) nodos.addNodeConstructor(nombre, clase);
  return true;
}
