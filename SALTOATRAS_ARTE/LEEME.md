# Arte de SALTO ATRÁS

Todo el arte se genera con IA. No se pelea para que salga igual: se genera
"suficientemente parecido" y se homogeneiza con un filtro encima, como
*Return of the Obra Dinn*. Las reglas vienen de `SALTOATRAS_GUIONISTA/guionista.md`
→ N3 · *Arte*.

## Qué leer

- `ESTILO.md`: el estilo decidido, reglas al generar y lo que falta por decidir.
- `FILTROS.md`: filtros y shaders de Phaser 4 para el estilo, receta de partida y
  cómo engancharlos al juego.

## Carpetas

- `originales/`: lo que sale del generador. **No se tocan nunca.**
- `referencias/`: las imágenes que marcan luz, estilo y personajes. La de
  normalizar está aquí. `referencias/provisional/` = copia de las imágenes
  provisionales del guion, para probar filtros.
- `prompts/`: el prompt de cada imagen, con el mismo nombre (`plaza.md` para
  `plaza.png`), para poder regenerarla.
- `normalizado/`: la salida del script. Es lo único que usa el juego.
- `sonido/`: sonidos (`.mp3`, `.ogg` o `.wav`), por su nombre. El juego los
  busca aquí: p. ej. `llegada-coche.mp3` para la entrada (ver `datos/juego.yaml`).

## Flujo

1. Generar → `originales/<nombre>.png` y su prompt en `prompts/<nombre>.md`.
2. Normalizar (script por hacer): brillo y contraste **hacia la imagen de
   referencia**, no por cantidad, siempre desde el original. Así es idempotente:
   una imagen que ya está bien no cambia. Nunca se filtra una imagen ya filtrada.
3. El juego carga `normalizado/` y pone el estilo al dibujar (shader de cámara:
   paleta limitada, tramado y grano). Ese estilo se cambia en un solo sitio, en
   el juego, no aquí.

## Al generar

- **Una sola luz**: tarde, sol bajo, siempre del mismo lado.
- La misma cámara y lente; la misma referencia de estilo y de personaje.
- **Nada de texto** en las imágenes: carteles, multa, informe y placas van como
  interfaz.
- Personajes sobre fondo liso, para recortarlos.
- Cuanto más estilizado, mejor: realista pasado por paleta, tramado y grano, a
  medio camino entre foto y grabado.

## Nombres y tamaños

- Nombres en minúsculas, sin tildes ni espacios: `plaza.png`,
  `casa-de-los-ortega.png`. El juego los busca por ese nombre.
- Fondos: **960×540** (16:9), la resolución base del juego.
- Capas separadas: fondo, personajes y objetos, para poder animar después.

Referencias de juegos: *Strange Horticulture*, *Papers, Please*, *The Excavation
of Hob's Barrow*, *Pentiment*, *Kentucky Route Zero*, *The Roottrees are Dead*.
