# Formato de un proyecto

```
MiJuego/
  guionista.md          proyecto: niveles, orden de tipos y la premisa
  tiempo/               un fichero por punto del tiempo
    F1 Intro.md
    F2 Fraude.md
  personajes/           cada carpeta es un tipo de ficha
    Carlos.md
  lugares/
    Parque.md
  recursos/             imágenes (cualquier carpeta vale)
```

Los ficheros sueltos en la raíz (salvo `guionista.md`) y las carpetas que
empiezan por `.` se ignoran.

## guionista.md

```markdown
---
nombre: SALTO ATRÁS
niveles: Esquema, Detalle, Producción
tiempo: tiempo            # carpeta del eje del tiempo
tipos: personajes, lugares   # orden en la matriz; los demás, detrás
---
# SALTO ATRÁS

## N1 · Esquema
La premisa en dos líneas.

## N2 · Detalle
...
```

Su cuerpo es la historia en la columna **Transversal**.

## Puntos del tiempo (`tiempo/`)

El nombre del fichero empieza por el identificador (`F3 Fingen.md` → `F3`) o
lo dice `id:` en el frontmatter. El orden es el del nombre, con los números en
orden natural (`F2` antes que `F10`).

**Ramas:** `F3.1` y `F3.2` son caminos alternativos. La fase anterior lleva a
las dos y las dos llevan a la siguiente. Si una fase tiene que ir a otra que no
es la siguiente, lo dice `sigue: F5` (o `sigue: F5, F6`) en su frontmatter.

El primer párrafo del nivel 1 es la **descripción breve** (la del grafo y la
cabecera de la fase); lo que va detrás, la larga.

El **mapa** es una dimensión más: `### Mapa` bajo el `## N1` de
`guionista.md` es el mapa de siempre, y bajo el `## N1` de una fase, lo que
cambia en esa fase.

```markdown
# F3 — Fingen

## N1 · Esquema
Qué pasa, en corto.

### Panel
Una dimensión: cualquier encabezado por debajo de un nivel.

## N2 · Detalle
...
```

## Fichas

```markdown
---
aparece: F1-F3, F6
---
# Carlos

## Transversal
### N1 · Esquema
Lo que vale en todo el juego.
### N3 · Producción
![[carlos.png]]

## F3
### N1 · Esquema
Qué hace en esta fase.
### N3 · Producción
#### Guion
◆ Parque, tarde.
Carlos: ¿Otra vez tú?
```

- `## <id>` es un punto del tiempo; `## Transversal`, lo que vale siempre.
  Lo que va detrás del id en el encabezado es libre (`## F3 · Fingen`).
- `### N<n>` es el nivel; lo que va detrás también es libre.
- Un encabezado por debajo del nivel es una **dimensión** (Guion,
  Pensamientos, Poses…). La app las enseña como pestañas y como filas en la
  matriz.
- Texto directamente bajo `## F3`, sin `### N1`, cuenta como nivel 1.
- Cualquier otra sección (`## Notas`) se respeta y no se enseña.
- `aparece:` dice en qué puntos está la ficha. Sin él, está donde tenga texto.
  Texto en un punto donde dice que no aparece sale marcado en rojo.
- El primer párrafo de `## Transversal` / `### N1` es su **papel** ("alcalde
  del pueblo"), y la primera imagen de lo transversal, su **retrato**.
- `Dónde: [[Parque]], [[Plaza]]` en el nivel 1 de una fase dice dónde está en
  esa fase; el mapa le pone ahí.

## Lugares

La carpeta cuyo nombre empieza por `lugar` se dibuja como mapa. Cada lugar
guarda en su frontmatter dónde está en el mapa y con qué lugares se une; la app
los escribe al arrastrar:

```markdown
---
mapa: 320, 140
conecta: Parque, Plaza
---
```

## Dentro del texto

- `[[Carlos]]` enlaza a la ficha; `![[carlos.png]]` enseña la imagen.
- `#semilla/nombre` y `#pago/nombre` marcan dónde se planta una pista y dónde
  se cobra.
- Guion: `Hablante: frase` (si el hablante es una ficha o va en mayúsculas) y
  `◆ acotación`.
