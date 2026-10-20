# Cómo se escribe el juego

Todo lo que pasa en el juego está en `datos/`. El código (`src/`) es un motor
que no sabe nada de Medina. Cambiar la historia es cambiar `datos/`.

Al guardar un fichero, el juego se recarga solo y sigue donde estaba. Si algo
no cuadra (un nudo que no existe, una ficha mal escrita), sale una pantalla
roja con el fichero y la línea.

```
datos/
  juego.yaml          lo general: título, aviso, la llegada y dónde empieza
  lugares/plaza.yaml  un fichero por lugar: fondo y cosas que se pinchan
  expediente.yaml     las fichas: lo que sabe Martínez
  panel.yaml          los pósits
  historia/*.ink      lo que se dice y la lógica, en Ink
```

## Lo general (`datos/juego.yaml`)

```yaml
titulo: SALTO ATRÁS
aviso: No se recomienda a personas sensibles.   # abajo en la portada
inicio: plaza                                   # primer lugar

# La entrada de una partida nueva: fundido a negro, "cargando", el texto
# despacio en el centro y el sonido (SALTOATRAS_ARTE/sonido/llegada-coche.mp3).
# Sin el fichero de sonido, la entrada funciona igual en silencio.
llegada:
  texto: Medina de la Frontera
  sonido: llegada-coche
```

## La idea: todo es una ficha

Lo que Martínez **sabe** es una ficha: una persona, un sitio, una cosa o un
evento. Las fichas están en el expediente y son **los temas de conversación**:
al hablar con alguien, abajo salen todas (juntas mientras caben; con pestañas por tipo cuando ya no) y pinchar una es
preguntar por ella. Lo que no tiene respuesta propia recibe la genérica de esa
persona.

## Fichas (`datos/expediente.yaml`)

```yaml
multa:
  tipo: cosa              # persona | sitio | cosa | evento
  titulo: La multa
  icono: multa            # opcional: SALTOATRAS_ARTE/juego/multa.png
  panel: true             # opcional: va clavada en el panel al conseguirla
  texto: |
    Boletín de denuncia. Policía Local de Medina.
    Agente: Ortega (firmado a mano).
  de_cerca:               # opcional: cómo se ve de cerca con ~ ver("multa")
    imagen: multa         # el papel (si no está, se dibuja uno)
    letra: maquina        # mano (por defecto) | maquina
    texto: |
      POLICÍA LOCAL DE MEDINA
      Agente: [[Ortega]]    # lo que va entre [[ ]] sale a mano, como un impreso relleno a bolígrafo

policia:
  tipo: persona
  titulo: Policía
  cuerpo: policia         # cuerpo grande al hablar: policia.png, policia-borde.png…
                          # las poses se centran por el cuerpo (lo que pisa el suelo), no por la imagen:
                          # al cambiar de pose la persona no salta de lado
  texto: |
    Policía local. Borde.
```

Se ganan desde Ink con `~ ficha("multa")`. Una persona entra sola la primera
vez que se habla con ella. El id es el nombre del tema en Ink: en minúsculas,
sin tildes ni espacios.

## Ambientes (`datos/juego.yaml` → `ambientes:`)

Momentos de la historia en los que cambia cómo se ve el juego, para poner nervioso a
quien juega (o calmarlo). Cada ambiente solo cambia los ajustes que nombra: los mismos
ids del panel de debug F2 (`peli.*` la película, `vida.*` los efectos por zonas,
`estilo.*` los filtros). Lo que no nombra sigue como esté. Llega y se va poco a poco.

```yaml
ambientes:
  tenso:
    tiempo: 3              # segundos que tarda en llegar (2 si no se dice)
    valores:
      peli.grano: 0.35
      peli.balanceo: 1     # el proyector tiembla
      peli.parpadeo: 0.14
```

En Ink: `~ ambiente("tenso")` y, al pasar el momento, `~ ambiente("")`. Un nombre que
no existe vuelve a lo normal. Los ids se comprueban al arrancar (pantalla roja si no
valen). Para encontrar los valores: se prueban en el panel F2 (pestaña Estilo →
"Ambientes de la historia" para probarlos puestos) y se copian.

**Comodidad**: en la pausa, "Movimiento de la imagen: Normal / Suave / Quieto" (el
ajuste `peli.comodidad`) multiplica todo lo que se mueve (grano, parpadeo, rayas, motas,
temblor, agua, viento…). Manda también sobre los ambientes: con "Quieto", nada tiembla
ni en una escena tensa. Los pensamientos no se ven afectados.

## Lugares (`datos/lugares/<id>.yaml`)

El nombre del fichero es el id del lugar (`ir("bosque_entrada")`).

```yaml
nombre: Plaza                 # sale si no hay fondo
fondo: plaza                  # SALTOATRAS_ARTE/juego/plaza.png (si no está, uno provisional)
al_llegar: plaza_llegar       # nudo de Ink al entrar (opcional)

cosas:
  - id: cartel
    nombre: Nota en la puerta # lo que sale al pasar el ratón
    zona: [450, 250, 60, 50]  # x, y, ancho, alto, en una pantalla de 960×540
    nudo: plaza_cartel        # MIRAR: lee este nudo en la caja de abajo

  - id: policia
    nombre: Un municipal
    zona: [320, 330, 70, 150]
    imagen: policia           # opcional: se ve la figura (<imagen>.png), de pie sobre el borde de abajo de la zona, sin deformarse y con sombra
    sombra: false             # opcional, con imagen: sin sombra bajo la figura (p. ej. un papel en la pared)
    hablar: policia           # HABLAR: conversación (nudo con_policia)
    si: policia_en_plaza      # opcional: solo está si esta función o variable de Ink es verdad (!x para negar)

  - id: al_hostal
    nombre: Ir al hostal
    zona: [860, 250, 90, 120]
    ir: hostal                # IR: cambia de lugar
    si: sabe_hostal
```

**Vida del fondo** (opcional): efectos que solo ocurren en un trozo del fondo, para
que la imagen no esté muerta. Van aparte de las cosas y no se pinchan.

```yaml
vida:
  - tipo: luz          # una mancha cálida que respira (el sol bajo)
    zona: [0, 0, 600, 420]
  - tipo: polvo        # motas flotando despacio dentro de la zona
    zona: [0, 120, 640, 340]
  - tipo: agua         # esa parte de la imagen tiembla rápido (fuente, charco)
    zona: [715, 345, 225, 195]
  - tipo: viento       # esa parte se mece despacio (árboles, ropa)
    zona: [100, 140, 190, 270]
```

La zona es `[x, y, ancho, alto]` en la pantalla de 960×540. Si el tipo no existe, el
juego lo avisa al arrancar. La intensidad de cada tipo se ajusta en el panel F2
(`vida.*`). Sobre todo el lugar hay además una capa de "película antigua" (grano que
se mueve, parpadeo, rayas, motas, bordes que respiran, temblor) que no depende del
lugar: ver `docs/DEBUG.md`.

Cada cosa hace una de las tres: `nudo`, `hablar` o `ir`. Con `?debug` en la
URL se ven las zonas aunque haya arte.

## Historia (`datos/historia/*.ink`)

[Ink](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
es un lenguaje para escribir diálogos con condiciones. `juego.ink` es el
principal; los demás entran con `INCLUDE`.

### Las líneas

```ink
Policía: Ahí no se puede aparcar.      // habla alguien (una de las voces de juego.yaml)
Policía (borde): ¿Y a mí qué?          // con pose: policia-borde.png
Mi coche. Multado.                     // cualquier otra cosa: lo que piensa Martínez
```

Habla alguien solo si la línea empieza por una de las **voces** de
`juego.yaml` (`voces: [Policía, Chico, Elena, Señora]`). Todo lo demás es
pensamiento, aunque lleve dos puntos: «Cobertura: ninguna.» es un pensamiento.
Una voz nueva hay que añadirla a la lista; si no, sus líneas salen como
pensamientos. Si el nombre coincide con una ficha de persona del expediente, el juego
lo avisa al arrancar (pantalla roja, con fichero y línea) para que no pase en silencio. El nombre puede ser cualquiera: `Chico:` hasta que Martínez sepa
que es Carlos.

**Martínez no habla.** El jugador pincha un tema y la otra persona sigue. Si
hace falta una réplica, la respuesta da una ficha nueva y pinchar esa ficha es
la réplica.

### Los pensamientos (a boli)

Lo que piensa Martínez se escribe a mano, en tinta azul, sobre la escena, y
**siempre en la misma zona** (abajo a la izquierda; se ajusta en el panel de
debug). Es la misma al mirar el lugar, en una conversación y con un papel abierto:
la zona no se mueve.

- **Mirando el lugar:** la zona, tal cual.
- **Con un papel abierto:** el papel no se mueve y se ve primero **solo**, para leerlo.
  Los pensamientos salen con el primer clic, escritos encima (con un borde oscuro fino
  para que se lean sobre el papel claro); con todo escrito, el siguiente clic cierra
  el papel y los pensamientos a la vez.
- **En una conversación:** la zona es algo más estrecha para no pisar a la persona, y
  la bandeja de temas espera a que cierres los pensamientos con el clic.

Los pensamientos seguidos se apilan como renglones de libreta.

**No se narra: es un juego, no un libro.** Nada de «arranca la hoja y me la
tiende» ni «se da la vuelta y se va»: eso se ve (o se anima). Un pensamiento es
su cabeza: lo que observa y cómo lo comenta, seco e irónico. Observa, no
concluye (ver `guionista.md` → *Principios de diseño*).

Si el pensamiento es sobre un papel que se está viendo, se escribe justo después
de `~ ver(...)`: no se ve a la vez que el papel, para no tener dos textos que leer.
Primero el papel; con el primer clic salen los pensamientos encima; el siguiente clic
cierra las dos cosas. Si lo que sigue es alguien hablando, esa línea ya sale al cerrarlo.

```ink
~ ver("cartel")
A casa. ¿A qué casa?                   // sale con el primer clic, sobre la nota
```

**Los pensamientos seguidos son un bloque y se escriben solos**, uno tras otro y
casi sin pausa, como una sola tirada. Se quedan en pantalla hasta que se pincha.
Las señales son siempre las mismas:

- **Escribiéndose**: el cursor es un boli. **No se puede saltar**: un clic no hace nada
  hasta que acaba. Los tachados y subrayados son parte del juego y se ven siempre enteros.
- **Terminado**: el cursor vuelve a ser normal y **parpadea un punto de tinta** tras la
  última línea. Un clic lo cierra (y sigue lo que haya detrás).
- **Cada renglón tiene su vida**: solo empieza a apagarse cuando lleva ~1,5 s
  entero a la vista y ya hay otro más nuevo; el último nunca se apaga. Nada se ve
  apagado sin haberse visto antes con claridad.
- En una conversación, tras el bloque se espera un clic para lo siguiente, como
  con cualquier frase.

Los pensamientos que van seguidos en el `.ink` forman un bloque; una frase de
alguien hablando en medio lo corta en dos.

Marcas para darle personalidad:

```ink
Cobertura: ~~poca~~ ninguna.           // se escribe, se tacha, y sigue
Cerrado. Un martes. _Servicio público._   // subrayado ondulado
(Ni media, en realidad.)               // empieza por "(": un aparte, más pequeño
```

Ojo: una línea de Ink no puede empezar por `~` (es código), así que el tachado
no va al principio de la línea.

### Una conversación

La conversación con alguien es el nudo `con_<persona>`. Lo de arriba se dice
al empezar a hablar; cada tema es una subsección con el **id de la ficha**.
Cada parte acaba en `->->` ("vuelve a la lista de temas").

```ink
=== con_policia
{ con_policia == 1:
    Policía (borde): ¿Qué quiere?
- else:
    Policía (borde): ¿Más?
}
->->

= ayuntamiento                          // al pinchar la ficha "ayuntamiento"
Policía (borde): El ayuntamiento está cerrado porque está cerrado.
->->

= cartel
Policía (borde): ¿Que dónde vive el alcalde? En su casa. ¿Tengo cara de páginas amarillas?
->->

= repetir                               // va delante de la respuesta si ya se preguntó
Policía (borde): Como ya le he dicho...
->->

= otro                                  // cualquier ficha sin tema propio
Policía (borde): ¿Y a mí qué me cuenta?
->->
```

- **La pregunta no se escribe.** La carta pinchada sale junto al bocadillo
  mientras contestan: es la pregunta. La respuesta se escribe para que se
  entienda sola, a menudo con un eco ("¿Que dónde vive el alcalde? En su
  casa.").
- **El otro tira para adelante.** Lo que haría falta contestar lo resuelve él
  ("¿Es suyo? Pues mejor.") o lo deja en una ficha nueva por la que preguntar:

  ```ink
  = policia
  Policía: ¿Que qué hago? Multar a un coche mal aparcado.
  Lo dice mirando mi coche.
  Policía (borde): ¿Es suyo? Pues mejor. Así se la doy en mano.
  ~ ver("multa")             // la multa, de cerca; queda en el panel y es un tema más
  ->->
  ```
- **Nombres reservados**: `repetir` y `otro`. Las subsecciones que empiezan por
  `_` son libres (para ayudarse: `-> _donde_vive`). Cualquier otra tiene que ser
  una ficha; si no, sale un error (seguramente está mal escrita).
- Si la persona no tiene ni el tema ni `otro`, se lee `sin_respuesta` (en `juego.ink`).
- **Primera vez y siguientes**: `repetir` es lo barato ("Como ya le he dicho…"
  y vuelve a decir lo mismo). Si el tema es largo o pasa algo en él (da una
  ficha, se va alguien), se escribe `= <ficha>_otra_vez`: a partir de la segunda
  vez se lee eso en su lugar, sin `repetir` delante.

  ```ink
  = policia
  Policía: ¿Que qué hago? Multar a un coche mal aparcado.
  …
  ~ ver("multa")
  ->->

  = policia_otra_vez
  Policía (borde): Ya tiene su multa. No me haga ponerle otra.
  ->->
  ```
- **Momentos clave**: dentro de un tema se pueden usar opciones de Ink
  (`* [Sí]` / `* [No]`). Salen en la bandeja en vez de las fichas.
- Ink no deja que un tema se llame como un nudo: por eso las conversaciones
  llevan `con_` delante, y ningún otro nudo debe llamarse como una ficha.

### Órdenes al juego

Están en `motor.ink`:

| Orden | Qué hace |
|---|---|
| `~ ficha("multa")` | Añade la ficha al expediente: un tema más |
| `~ ver("cartel")` | Enseña de cerca el papel de la ficha (su `de_cerca`) y la añade. Los pensamientos que van justo detrás salen con el primer clic, escritos a boli sobre el papel; con todo escrito, otro clic cierra las dos cosas; lo demás, al cerrarlo |
| `~ ir("hostal")` | Al acabar lo que se está diciendo, cambia de lugar |
| `~ terminar()` | Al acabar lo que se está diciendo, cierra la conversación |
| `~ posit("fraude")` | Pone la pregunta en el panel (`panel.yaml`) |
| `~ pensar("quien_cerro")` | Pone la pregunta en el panel y, al acabar lo que se está diciendo, abre Pensar con ella |
| `~ ambiente("tenso")` | Cambia cómo se ve el juego (grano, temblor, parpadeo…) con un ambiente de `juego.yaml`. `~ ambiente("")` vuelve a lo normal. Se guarda con la partida |
| `resuelta("quien_cerro")` | En una condición: ¿está resuelta esa pregunta? (en Inky, siempre no) |
| `~ activar("expediente")` | Enseña un objeto de la interfaz: `expediente`, `panel`, `pensar`, `informe`, `mapa` |

### Los avisos ("+ La multa")

Cuando algo se añade (`ficha`, `posit`, `activar`…), el aviso **sale cuando el
jugador se entera**, no cuando Ink lo ejecuta (Ink va por delante de lo que se
ve). Sale junto a la línea que viene detrás, al leerse el bloque de pensamientos
o al cerrarse el papel de cerca que lo provoca. El aviso dice solo lo que se
añade ("La multa"), sin decir a dónde va.

### Quién está y qué toca

La lógica vive en Ink: variables (`VAR fase = 1`), cuántas veces se ha visto un
nudo (`{ plaza_llegar == 1: ... }`) y funciones para el `si:` de los lugares:

```ink
=== function carlos_en_plaza
~ return policia_se_fue && fase == 1
```

### Probar en Inky

Abre `datos/historia/juego.ink` en Inky. Arranca en un menú de pruebas que
salta a cada conversación y a algunos temas (se añaden a mano). Las órdenes al
juego salen entre corchetes (`[ficha: multa]`). Inky no ve los lugares ni la
bandeja de fichas: para eso, el juego.

## Pensar y el panel (`datos/panel.yaml`)

Pensar es el cuaderno de Martínez: una **pregunta**, una **respuesta** (una
ficha) y una **prueba** (otra ficha) que la sostiene. Las dos se eligen de la
misma bandeja de fichas que en las conversaciones. Si se sostiene, la pregunta
queda resuelta y su conclusión pasa al panel, que se monta solo. Si no, Martínez
lo dice (nudo `pensar_fallo` de `juego.ink`) y se puede volver a probar.

```yaml
quien_cerro:
  pregunta: ¿Quién ha dejado cerrado el ayuntamiento?
  respuesta: alcalde          # el id de una ficha
  pruebas: [cartel]           # fichas que la sostienen; vale cualquiera
  conclusion: "El alcalde. Su propia nota lo dice: atiende en su casa."
  al_resolver: con_elena._cerro_bien   # opcional: se lee si se está hablando con esa persona

fraude:
  pregunta: ¿Fraude?
  opciones: [Sí, No]          # la respuesta se elige entre estas, no es una ficha
  respuesta: "No"
  pruebas: [...]
```

Una pregunta sin `pruebas` no se puede resolver todavía. Si la conclusión lleva
dos puntos, va entre comillas (es YAML).

Para que alguien reaccione a una pregunta resuelta fuera de su conversación,
se mira en Ink: `{ resuelta("quien_cerro") && not _cerro_bien: -> _cerro_bien -> }`.


## Guiar al jugador a una parte de la interfaz

`~ guiar("expediente")` (motor.ink) cierra la conversación y obliga a abrir esa parte: un dedo
la señala y nada más se puede tocar. Al cerrarla, la conversación se reabre con la misma persona
(así que la parte siguiente del nudo debe poder distinguirse, p. ej. con un `not _segunda_llamada`).
Una ficha con `de_cerca` tiene en el expediente un botón "Ver el papel".


## Música

Las pistas son ficheros de `SALTOATRAS_ARTE/sonido/` (mp3, ogg o wav, en cualquier subcarpeta; se
nombran sin extensión). Una sola suena a la vez, en bucle y con fundido al cambiar.

- `musica:` en `juego.yaml`: `portada` (el menú) y `juego` (por defecto en todos los lugares).
- `musica:` en un lugar: otra pista solo ahí.
- `~ musica("pista")` en Ink la cambia en cualquier momento; `~ musica("")` la calla.

Con varias pistas (una lista en yaml, o `"a,b"` en Ink) se turnan: la siguiente entra mientras la actual acaba y, tras la última, vuelve la primera.
Pedir lo que ya suena no lo reinicia. El volumen está en la Pausa (Normal / Baja / Apagada)
y en F2 (`audio.musica`). Sin el fichero, silencio.

**Normalizar:** las pistas se dejan a −20 LUFS (volumen medio) con `ffmpeg … loudnorm=I=-20:TP=-1.5`, para
que ninguna suene más fuerte que otra. Los originales se guardan en `SALTOATRAS_ARTE/bruto/`.
