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

- `bruto/`: aquí se suelta todo a lo bruto (salida del generador, pruebas, lo que sea).
  El juego no lo lee.
- `juego/`: **lo que usa el juego**, con el nombre final (`plaza.png`). Si se
  sobrescribe una imagen aquí, cambia en el juego: en desarrollo (`npx vite`) se
  recarga sola; para una versión empaquetada (`npm run build`) las imágenes
  se copian dentro, así que hay que volver a empaquetar.
- `descartes/`: las versiones viejas. Cuando una imagen mejora, la anterior se
  copia aquí y la nueva ocupa su sitio en `juego/`.
- `referencias/`: las imágenes que marcan luz, estilo y personajes.
  `referencias/provisional/` = copia de las imágenes provisionales del guion.
- `otros-estilos/`: pruebas de otros estilos.
- `prompts/`: el prompt de cada imagen, con el mismo nombre (`plaza.md` para
  `plaza.png`), para poder regenerarla.
- `sonido/`: sonidos (`.mp3`, `.ogg` o `.wav`), por su nombre (ver `datos/juego.yaml`).

## Flujo

1. Generar → `bruto/` y su prompt en `prompts/<nombre>.md`.
2. Lo que vale se copia a `juego/<nombre>.png` (nombre final, abajo).
3. El juego pone el estilo al dibujar (filtros de cámara: paleta, tramado y
   grano). Ese estilo se cambia en un solo sitio, en el juego, no en las imágenes:
   nunca se filtra una imagen ya filtrada.

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
