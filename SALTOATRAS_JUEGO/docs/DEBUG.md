# El panel de debug

Solo existe en desarrollo (`npm run dev`): no entra en el juego que se publique.
Se abre con **F2** (también desde el menú de pausa → *Ajustes (debug)*) y se
cierra con F2 o la ×. El juego se encoge a la izquierda para que no tape nada.

Sirve para ajustar el juego **a tu gusto, sin tener que pasarme los números uno
por uno**: lo tocas en vivo, y cuando te gusta, copias y me lo pegas.

## Lo que hay

- **Copiar cambiados / Copiar todos / Restaurar todo** (arriba): los valores como
  texto listo para pegar. "Cambiados" solo lleva los que has tocado.
- **Textos de prueba**: lanzan un bloque de pensamientos de muestra (corto, medio,
  largo, con tachados y subrayados, cuatro seguidos, muchos) donde salen los de
  verdad y con las mismas reglas. Así no hace falta jugar hasta uno.
- **Avisos de prueba**: lanzan avisos como los de "+ La multa" (corto, largo, tres
  seguidos). Hay que estar dentro del juego, no en la portada.
- **Posiciones**: *Dibujar cuadrado*, y arrastras sobre el juego. Queda registrado
  en el lienzo de 960×540 como `[x, y, ancho, alto]`, con el lugar donde estabas y
  una nota tuya ("aquí el cartel"). *Copiar posiciones* lo deja listo para pegar.
  Arriba a la derecha de la cabecera se ve la coordenada bajo el ratón.
- **Ajustes**: un deslizador por valor, agrupados por tema. El número se puede
  escribir a mano (incluso fuera del rango del deslizador). Un valor cambiado se
  ve en azul; ↺ lo devuelve al de fábrica.

## Pestaña Estilo

Para probar el arte. Arriba, **elegir el estilo de las imágenes** (A Grabado, B Óleo,
C Plano, D Acuarela, o Ninguno): cambia al instante el fondo y la persona de la
escena que estés viendo. Las imágenes son `<nombre>-<letra>-<estilo>.png` en
`SALTOATRAS_ARTE/normalizado/` (`src/motor/estilo.ts`); sin sufijo se usa la de
siempre. Debajo, **botones de partida** de filtros (cada uno los pone todos de
golpe) y los **deslizadores** (`estilo.*` en `ajustes.ts`): saturación, contraste,
desenfoque, paleta (rampas de 4 tonos) con tramado, reducir colores, píxel grande,
viñeta y grano. Los filtros se ponen a cada fondo y persona (`src/ui/estilo.ts`);
los pensamientos y papeles no pasan por ellos. "Copiar cambiados" incluye el
estilo elegido.

**Película antigua y vida por zonas** (grupos "Película · …" de la misma pestaña):
una capa sobre el lugar (`src/ui/pelicula.ts`) con grano que se mueve a saltos de
fotograma, parpadeo de luz, rayas, motas y pelos, bordes oscuros que respiran y un
temblor de proyector; y los efectos por zonas del lugar (`src/ui/vida.ts`: luz,
polvo, agua, viento), que se declaran en `datos/lugares/*.yaml` → `vida:` (ver
`FORMATO.md`). Los "Looks de partida" ponen todo de golpe: *Película antigua*,
*Cine mudo*, *Recuerdo sepia*, *Solo vida*, *Solo película*, *Todo apagado*… La capa
va sobre el lugar, sobre la persona en una conversación y sobre el papel (con su texto
dentro) al verlo de cerca: todo lo que es "el mundo" se funde. Lo que es interfaz (bocadillo,
bandeja, avisos) y los pensamientos a boli (el mundo interior de Martínez) quedan limpios.
Con un papel, el papel y su texto se pintan juntos en una cámara con los filtros del estilo
y la tinta va en otra sin filtros (`camaraTinta` / `repartir` en `config.ts`, `estilarCamara`
en `ui/estilo.ts`): así el texto del papel se ensucia igual que el papel.

**Pruebas de color** (pestaña Estilo): botones para probar paletas cerradas que unifican gráficos
dispares, sin tocar la película ni la vida: *Ámbar de terminal*, *Fósforo verde*, *CGA 4 colores*,
*Tinta y papel (Bayer)*, *Dúo térmico* (azul marino, magenta y perla), *Infrarrojo*, *Semitono
fanzine*, *Semitono ámbar*, *Contorno de tinta*, *Contorno + sepia* y *Semitono + contorno*. Los
deslizadores de abajo (grupos "Estilo · paleta" y "Estilo · estampa") afinan cada una: número de
paleta (1-11), tamaño del punto, grosor y umbral del contorno. Tres son filtros propios, hechos
con el sistema de filtros de Phaser 4 (`src/ui/filtros.ts`): **tramado Bayer** de paleta fija
(4 colores por luminancia), **semitono** de imprenta y **contorno Sobel**. Los tamaños se dan en
píxeles de pantalla, así que el punto sale igual en el fondo y en las figuras. Funcionan sobre
fondos, figuras y papeles (de cerca). Probado: todas dan imagen sin errores.

**Tramado vivo** (pestaña Estilo): lo que se probó con el tramado Bayer y se descartó: puntos sueltos
que cambian por zonas (parecen pájaros locos), ondular y deslizar la trama (se nota que mueve
píxeles), hacer respirar el brillo (no se ve) y una estática con azar de `sin()` (dibuja patrones
como un imán en una tele). Lo que queda: el **hervor** (`vivoSalto`, `vivoFps`): la trama salta de
sitio en cada fotograma, a ritmo fijo y sin pausas (con 0,3 y 3-5 fps es suave). Botones: **A · Obra
Dinn con grano** (trama quieta, el movimiento es el grano de la película a 0,25: **el de fábrica**,
el elegido), B quieto, C/D/E hervor medio/suave/muy suave y F grano + hervor suave. Se apagan con
"Movimiento: Quieto".

**Color del tramado**: el Bayer cambia todo el color por los 4 de la paleta y engrisece. `estilo.
estampaColor` (0-1) conserva parte del color original (solo la luz va tramada); botones "Bayer con
algo de color" y "Bayer con color" en Pruebas de color. Por defecto 0.

**Oscurecer antes de los filtros**: una capa que se abre sobre el lugar (conversación, papeles de
cerca, expediente/panel/informe) ya no pone un rectángulo negro encima (que oscurecía *después* del
tramado y lo borraba: quedaba negro con grano). Su velo (`ui/velo.ts`) es invisible y le pide al
lugar que baje su propio brillo antes de los filtros, así que el fondo sigue tramado, con los puntos
claros sobre oscuro. El grano de la película en esas capas se multiplica por `peli.granoOscuro`
(0,5 por defecto). Pausa y Pensar siguen con su rectángulo negro.

**Tinta de los pensamientos** (pestaña Estilo): el color del boli sale de tono, saturación y
luz (`boli.tono/saturacion/luz`), con un contorno oscuro del mismo tono (`boli.contorno`) y un
brillo opcional (`boli.brillo`). Botones de partida: Azul actual (el de fábrica), Azul eléctrico, Cian, Rojo corrección, Magenta, Verde subrayador y Blanco tiza; "▶ Probar" escribe un bloque
con la tinta de ahora (solo cambia lo que se escriba a partir de ese momento). Tiene que verse
muy distinta del resto del juego, que es de ocres y cremas.

**Película en la portada**: lleva la misma capa por encima de todo (letras incluidas) y más
fuerte que en el juego, con sus propios ajustes (`menu.*`, grupo "Película · menús"). Los
botones de look no los tocan. "Movimiento de la imagen" de la pausa también los suaviza.
La pausa no lleva película.
La portada y la pantalla del título del pueblo pasan enteras (emblema, textos y película) por los filtros del estilo (`estilarCamara` sobre su cámara), así que llevan el mismo tramado y color que el juego.
Al empezar una partida nueva la película no salta: la portada tiene la de menú, la pantalla del
título del pueblo la mantiene y, mientras el título está en pantalla y los primeros segundos del
lugar, evoluciona poco a poco hasta la del juego (`peliculaMezcla` en `ui/pelicula.ts`; con
Continuar, la evolución dura 3 s desde que entra el lugar).

**Ambientes de la historia**: botones para probar los de `juego.yaml` (tenso,
pesadilla…) y volver a Normal, con su transición. Mientras uno está puesto manda sobre
los deslizadores de esos grupos (que siguen enseñando el valor normal). Ver `FORMATO.md`.

Un fondo de al menos el doble de ancho (p. ej. 2304×1296) se toma como "960×540 a ×2
con margen": se centra a escala 0,5 y el margen queda fuera de la vista.

## Qué se guarda

Los ajustes y los cuadrados se guardan en el navegador entre recargas. Si yo
cambio luego el valor por defecto de un ajuste en el código, el valor que tenías
guardado de ese ajuste se descarta solo (así no queda un valor viejo tapando el
nuevo).

## Cómo pasarme lo que te gusta

1. Ajusta hasta que te guste.
2. *Copiar cambiados* y pégamelo. Yo lo paso a los valores por defecto del código.
3. Para posiciones: dibuja el cuadrado, escribe la nota y *Copiar posiciones*.

## Para añadir un ajuste nuevo (para quien programe)

Todo lo ajustable se declara en `src/motor/ajustes.ts`, en la lista `DEFS`: una línea
con `id` (`grupo.nombre`), `grupo`, `etiqueta`, `valor` por defecto, `min`, `max`,
`paso` y `unidad`. El panel se construye solo a partir de esa lista.

En el código, se lee con `ajuste("grupo.nombre")` **en el momento de usarlo**, no en
una constante al cargar el módulo; si no, el cambio no se nota hasta recargar. Los
ids están tipados: un nombre mal escrito no compila.

Ya están conectados: el ritmo, el apagado, la letra y la posición (zona) de los
pensamientos; la posición y el tamaño de los avisos; la velocidad del texto hablado; las tres duraciones de animación
(`DURACION` lee los ajustes); los avisos; y la llegada. Lo que falte (duraciones de
cosas concretas, tamaños, posiciones de la interfaz…) se añade igual.

## Para añadir un texto de prueba

En `src/debug/PruebaTextos.ts`, en `MUESTRAS`. Son textos de prueba, no de la
historia.
