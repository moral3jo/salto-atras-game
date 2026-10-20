# Estilo visual de SALTO ATRÁS

Recopilado de `SALTOATRAS_GUIONISTA/guionista.md` (N3 · *Arte*), del `LEEME.md`
de esta carpeta, de `SALTOATRAS_JUEGO/docs/PENDIENTE.md` y de las decisiones
tomadas al montar el juego. Lo que está aquí es **lo decidido**; lo que falta
por decidir va al final.

## Idea

Todo el arte se genera con IA y **no se pelea para que salga igual**: se genera
"suficientemente parecido" y un filtro común, puesto al dibujar en el juego, lo
homogeneiza (como *Return of the Obra Dinn*). Objetivo: **a medio camino entre
foto y grabado**. Cuanto más estilizado, mejor; el hiperrealismo es lo que peor
sale con este método.

Referencias de juegos: *Strange Horticulture*, *Papers, Please*, *The Excavation
of Hob's Barrow*, *Pentiment*, *Kentucky Route Zero*, *The Roottrees are Dead*.

## Reglas al generar

- **Una sola luz**: tarde, sol bajo, siempre del mismo lado. (En la historia
  siempre es por la tarde.)
- La misma cámara y lente; la misma referencia de estilo y de personaje.
- **Nada de texto** en las imágenes: carteles, multa, informe y placas van como
  interfaz (el juego pone el texto encima, ver `de_cerca` en `docs/FORMATO.md`).
- Personajes sobre **fondo liso**, para recortarlos.
- **Capas separadas** desde el principio: fondo, personajes y objetos, para
  poder animar después sin rehacer.
- Fondos **2304×1296**: el 960×540 de la pantalla a ×2 más un 10 % de margen por
  cada lado (1152×648 en coordenadas del juego), para que en pantallas de
  proporción rara no salgan bordes negros. Lo importante va en el centro; el
  margen es escenario tranquilo. El juego pone a escala 0,5 todo fondo de 1920
  de ancho o más.
- Nombres en minúsculas, sin tildes ni espacios (`plaza.png`,
  `casa-de-los-ortega.png`). Un personaje con pose: `carlos-muestra_libro.png`
  (la pose es la que se escribe entre paréntesis en el diálogo).
- Cada imagen con su prompt en `prompts/<mismo nombre>.md`.

## Estilo elegido: grabado

Elegido entre grabado, óleo, plano y acuarela; los otros tres están en
`otros-estilos/`. Se genera con el workflow `GameAssets/Fondos (Klein 4B)` de
ComfyUI, con el prompt partido en ESTILO + CÁMARA + ESCENA. El ESTILO es siempre
el mismo (copiarlo de cualquier `prompts/*.md`, p. ej. `plaza.md`); la CÁMARA,
según sea fondo, personaje, icono o interfaz.

- **Personajes con varias poses** (o su icono): con el bloque *Boceto* del
  workflow activado y la imagen del personaje como referencia (`referencias/`),
  diciendo que conserve cara, ropa y estilo y cambie solo la pose. Así sale
  siempre la misma persona.
- **Iconos de ficha**: medallón redondo grabado con doble aro.
- **Lugares en icono**: con el recorte del fondo como referencia, para que se
  parezcan al sitio real.
- **Texto**: el modelo escribe mal ("SALTÓ ATRÁAS"); el título y cualquier
  texto los pone el juego.
- Gestos finos de mano (el pulgar señalando atrás) no salen con este modelo.

## Lo que mira el juego (nombres que ya busca)

Lugares: el `fondo:` de cada `datos/lugares/*.yaml` (p. ej. `plaza`). Personas:
`<persona>.png` y `<persona>-<pose>.png`. Iconos de ficha: `icono:` de la ficha.
Papeles de cerca (nota, multa): `de_cerca.imagen`. Sin imagen, el juego dibuja un
provisional, así que se puede ir sustituyendo de uno en uno.

## Tres capas de "mundo" que ya existen y no deben pelearse

1. **La escena** (lo que genera la IA + el filtro de `FILTROS.md`).
2. **El mundo interior de Martínez**: bolígrafo azul a mano (fuente Caveat),
   tachado y subrayado. Es interfaz: **no debe pasar por el filtro** de la escena
   (ver `FILTROS.md`, "Dónde se pone").
3. **Los papeles** (expediente, panel de pared, informe): tinta y papel.

## Provisionales

`referencias/provisional/` guarda una copia de las imágenes que había en
`SALTOATRAS_GUIONISTA/recursos/` (alcalde, ayuntamiento, caravana, carlos,
centro-médico, colegio, martínez, médica, policía-local, policía, profesora).
Son las del guion, "provisionales" según él. Sirven para probar el filtro con
algo real, no como arte final. La carpeta del guion no se ha tocado.

## Por decidir

- La **paleta** concreta (cuántos tonos, cálida de tarde). Se saca probando
  el filtro sobre las provisionales.
- Si el **tramado** es el de ruido que trae Phaser o uno de patrón (Bayer, líneas)
  hecho con un shader propio.
- Qué generador de IA y qué prompt base; la **imagen de referencia** de
  normalización (`referencias/`) todavía no existe.
- El **script de normalización** (brillo/contraste hacia la referencia). Pendiente.
- Vida barata, de más a menos rentable (guion): sonido ambiente, pequeños bucles
  (hojas, humo), respiración de personajes, una capa de luz cálida. Animación
  de verdad, al final.
