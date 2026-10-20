# Filtros y shaders: lo que sabemos (Phaser 4.2)

> **Actualización:** ya está puesto en el juego (panel F2, pestaña Estilo; ver
> `SALTOATRAS_JUEGO/docs/DEBUG.md`). Además de los filtros de Phaser hay tres propios:
> tramado Bayer de paleta fija, semitono y contorno Sobel (`src/ui/filtros.ts`). Lo de abajo
> son las notas de partida de antes.

Notas para probar el estilo. Todo sale de la documentación de Phaser 4 que está en
`SALTOATRAS_JUEGO/docs/phaser/` (sobre todo *Pixel Art Guide* y *Shader Guide*),
del skill `phaser-filters-and-postfx` y del código de Phaser en
`SALTOATRAS_JUEGO/node_modules/phaser/src/filters/`. **Aún no hay nada de esto
puesto en el juego** (está en `docs/PENDIENTE.md`): son las piezas y una receta
para probar. Lo que no he comprobado ejecutándolo está marcado.

En Phaser 4 ya no existen los *pipelines* ni los *FX* de Phaser 3: ahora son
**filtros** (`Phaser.Filters.*`) y *render nodes*. Solo con WebGL.

## El plan del guion

"Shader de cámara en Phaser, al dibujar: paleta limitada (mapa de degradado o
color más cercano), tramado y grano. Da el estilo, funde personajes con fondo y
se cambia en un solo sitio."

## Piezas que Phaser trae (no hace falta escribir GLSL para empezar)

| Para qué | Filtro | Notas |
|---|---|---|
| **Paleta limitada por brillo** (grabado, tinta sobre papel, sepia) | `addGradientMap({ ramp, dither })` | Recolorea por brillo con una rampa de color. Es lo más cercano a "foto → grabado". `colorFactor` (por defecto `[0.3,0.6,0.1,0]`) decide cómo se calcula el brillo; `alpha` mezcla con el original. |
| **Reducir colores** + tramado | `addQuantize({ mode, steps, gamma, offset, dither })` | `mode:1` = HSVA (mejor para tonos); `steps` por canal. El `dither` usa ruido (*Interleaved Gradient Noise*), no un patrón Bayer. No lleva paleta fija. |
| **Blanco y negro duro** (Obra Dinn de verdad) | `addThreshold(edge1, edge2, invert)` | Umbral por canal; útil junto a un tramado. |
| **Píxel grande** | `addBlocky({ size })` / `addPixelate(n)` | Blocky conserva colores; Pixelate los mezcla. Pide `antialias` apagado. |
| **Ajuste de color** (calidez de tarde, contraste, saturación) | `addColorMatrix()` → `.colorMatrix` | Barato; va bien *antes* del mapa de degradado. |
| **Viñeta** (bordes oscuros, foco) | `addVignette(x, y, radius, strength, color, blendMode)` | |
| **Grano / textura de papel** | `addBlend(textura, modo, amount)` con una imagen de ruido o papel | O `addDisplacement` con un mapa para un temblor muy leve. Hay que crear la textura de grano. |
| **Luz cálida de tarde** | `addBlend` / `addVignette` con `ADD`/`MULTIPLY` y color naranja, o *Cone Lights* (`docs/phaser/Phaser 4 Cone Lights`) | La guía de luces de cono sirve si queremos un haz de sol dirigido. |
| **Transiciones** (hoy hechas con tweens en `animar.ts`) | `addWipe(...)` | Se anima `progress` con un tween. |
| Leer píxeles de pantalla | `addSampler` | Caro; solo para herramientas. |

Hay más (Bloom vía `ParallelFilters`, Glow, Shadow, Bokeh, TiltShift, Barrel…); la
lista completa está en el skill.

## Receta de partida (para probar, sin valores definitivos)

Orden aproximado, de la imagen al resultado:

1. `ColorMatrix`: bajar saturación un poco y subir contraste.
2. `GradientMap` con una rampa de 4-6 tonos (negro azulado → ocres → crema), con
   `dither: true` para el tramado.
3. `Vignette` suave.
4. Grano encima con `Blend` (textura de ruido, `amount` bajo).

```ts
const f = camara.filters.internal; // internos: solo la región de la cámara, más baratos
f.addColorMatrix().colorMatrix.saturate(-0.4).contrast(0.15);
f.addGradientMap({
  ramp: [
    { colorStart: 0x14110f, colorEnd: 0x3a2c22, end: 0.3 },
    { colorStart: 0x3a2c22, colorEnd: 0xb08a5a, end: 0.7 },
    { colorStart: 0xb08a5a, colorEnd: 0xf1e3c4 },
  ],
  dither: true,
});
f.addVignette(0.5, 0.5, 0.85, 0.35);
```

**Sin comprobar**: los nombres de los métodos de `colorMatrix` y la forma exacta de
las bandas de la rampa (`colorStart`, `colorEnd`, `start`/`end`/`size`, `middle`) se
verifican al probar; están en `node_modules/phaser/src/display/ColorMatrix.js`,
`ColorBand.js` y `ColorRamp.js`.

## Dónde se pone (importante en este juego)

- El juego usa **escenas superpuestas** (Lugar, Dialogo, Conversacion, Interfaz,
  DeCerca…) y una cámara con zoom ×2 (`camara()` en `src/config.ts`).
- El filtro debe afectar a la **escena de fondo y a los personajes**, no al boli
  azul ni a la interfaz. Por tanto: ponerlo en la cámara de la escena `Lugar`
  (y en el cuerpo de `Conversacion`), no global. Los pensamientos son otra escena
  (o texto aparte), así que quedan limpios.
- **Cambiarlo en un solo sitio**: una función `estilo(camara)` en `src/ui/` que
  añada los filtros, llamada desde las escenas con arte. Sus números deberían
  entrar en `src/motor/ajustes.ts` para ajustarlos con el panel F2 y copiar los
  valores (ya funciona así para el boli).
- **La cámara tiene zoom ×2**: tramado, grano y bloques se verán al doble de
  tamaño que a ×1. Hay que decidir si el grano va a resolución del lienzo
  (960×540) o a la de pantalla.
- Filtros **internos** si se puede (más baratos); externos solo si el efecto debe
  ser en espacio de pantalla (el grano suele querer serlo).

## Cuidado con

- `dither` es frágil si después hay más transformaciones (escalado): se nota si la
  cámara se mueve o escala. La propia guía de Phaser lo recomienda sobre todo al
  preparar assets, no en tiempo de ejecución. **Por eso el script de normalización
  previo (ver `LEEME.md`) puede hacer parte del trabajo si el tramado en vivo se
  ve mal.**
- Quantize **no tiene paleta fija**; para una paleta exacta, GradientMap con
  bandas o un shader propio (abajo).
- Equipos flojos: los filtros de pantalla completa cuestan; medir.
- Sin WebGL no hay filtros: decidir el aspecto de reserva (imagen sin filtro).
- La IA no genera bien arte "de píxeles" (la guía de Phaser lo dice): aquí no
  buscamos píxel, sino foto-grabado, que es lo que mejor sale.

## Si hace falta un shader propio

Phaser 4 permite escribir filtros en GLSL (*Shader Guide*, sección 3 "Sample
Filter, Step By Step", en `docs/phaser/Phaser 4 Shader Guide/`). Casos que lo
justificarían:

- Tramado **Bayer / de líneas** (más "grabado" que el ruido de Phaser).
- **Paleta fija** de N colores por color más cercano (lo que dice el guion).
- Un solo paso que haga paleta + tramado + grano + viñeta.

Mientras los filtros que trae basten, mejor no escribirlo.

## Qué probar primero (propuesta)

1. Una escena de pruebas (solo en DEV, como `PruebaTextos`) con las imágenes de
   `referencias/provisional/` y el panel F2 con deslizadores: saturación, pasos de
   la rampa, tramado, viñeta, grano, tamaño de bloque.
2. Mirar si el resultado "funde" fondo y personaje y se parece a foto-grabado.
3. Apuntar los valores buenos en `ESTILO.md` y pasarlos a `ajustes.ts`.
