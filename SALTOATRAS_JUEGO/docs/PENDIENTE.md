# Pendiente

Hito 1: el F1 jugable de principio a fin, en plano (`guionista.md` → N3 ·
*Decisiones técnicas*).

## Hecho

- Carga de `datos/` con comprobación de referencias.
- Lugares con cosas para mirar, hablar o ir; condiciones desde Ink.
- **Conversaciones por temas**: cuerpo grande con poses, bocadillo y bandeja de
  fichas (todas juntas; pestañas por tipo cuando no caben). Respuesta propia,
  genérica ("otro") o repetida ("Como ya le dije…" + lo de antes).
- **Pensar**: pregunta, respuesta (ficha u opción) y prueba; fallo sin castigo.
  Tutorial en la primera llamada a Elena (quién cerró el ayuntamiento).
- Panel con las conclusiones de lo resuelto; expediente e informe para ver.
- Guardado automático; portada (Continuar / Nueva partida) y pausa (Escape o ≡).
- Llegada de una partida nueva (cargando, "Medina de la Frontera", sonido si lo hay).
- Transiciones en todo (`src/ui/animar.ts`).
- F1 escrito hasta la entrada del bosque.

- Panel de debug (F2): ajustes en vivo, textos de prueba, copiar valores y medir
  cuadrados sobre el lienzo (`docs/DEBUG.md`).

## Siguiente

1. **El expediente visual**: fichas con su dibujo, bien ordenadas.
2. **La pared** (panel): fotos, notas e hilos, montada sola.
3. **Hipótesis** en Pensar: preguntas sin respuesta buena que eligen camino.
4. **El informe por teléfono**: Elena lee lo pensado; Ink decide ("dale una vuelta").
5. **El bosque**: los caminos de colores y la caravana.
6. **El mapa**: el folleto, sitios desbloqueados y anotaciones a mano.
7. Cerrar el F1: la llamada del fraude y la hipótesis.

## Para iterar

- Fichas nuevas marcadas como "nuevo" en la bandeja.
- Texto distinto la primera vez y las siguientes (ya se puede en Ink; ver
  `docs/FORMATO.md`).
- Despedidas propias de cada persona al pulsar Adiós.
- Fallos de Pensar que distingan "la respuesta va bien, la prueba no".
- La primera llamada a Elena tiene demasiadas líneas seguidas (regla de 4-5).

## Arte puesto, a medias

Puesto (todo provisional, para ver el juego): fondos de la plaza y el hostal, el coche, el policía
(con sus poses) y Carlos en la plaza y en las conversaciones, iconos de las fichas, la nota y la
multa de cerca, el corcho y los pósits del panel, el emblema de la portada y el volante de la
carga. Sin poner todavía: las piezas de interfaz (`ui-*`: marco, bocadillo, botones, flechas,
iconos de menú, piezas de panel), el `expediente.png`, `papel.png`, `cargando` y `cargando-reloj`
(otros loadings), `hostal-fuera`, `habitacion` y `martinez`/poses de Carlos (`carlos-muestra_libro`).

## Después

- Elegir el estilo de arte (A-D) y el look (la película antigua ya está, ver `docs/DEBUG.md`); pasar el elegido a las imágenes sin sufijo y quitar los otros. Decidir qué ambientes (`juego.yaml`) usa la historia y dónde (`~ ambiente("tenso")`; el guion es del usuario).
- Película y vida por zonas también en conversaciones y en los demás lugares (hoy: solo en el lugar, y la plaza es la única con `vida:`); más tipos de vida (humo, hojas, pájaros).
- El script de normalización del arte.
- Sonido ambiente, y el de la llegada: `SALTOATRAS_ARTE/sonido/llegada-coche.mp3` (coche que llega, para el motor, puerta).
- La letra definitiva.
