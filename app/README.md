# Guionista

Guiones de videojuego en una carpeta de Markdown. La carpeta se puede leer y
editar con Obsidian o con cualquier editor. Los datos son **tiempo** (fases,
capítulos) × **fichas** (personajes, lugares…) × **niveles** de detalle, y en
cada casilla, **dimensiones** (Guion, Pensamientos, Mapa…).

## Cómo se recorre

Se va de lejos a cerca, sin perder nunca lo de arriba:

1. **Fases**: el grafo de todo el juego, con las ramas. Cada fase, con su
   descripción breve.
2. **Una fase**: siempre a nivel 1. Qué pasa, sus dimensiones (Panel, Pasa a
   la siguiente…), el mapa de lugares con quién está en cada uno y las fichas
   que salen. Aquí no se baja de nivel.
3. **Una ficha**: se abre casi a pantalla completa encima de la fase. Arriba,
   su matriz en vivo: todos sus niveles y dimensiones a lo largo de la
   historia; clic en una casilla para ir allí. Debajo, tres paneles: lo de
   siempre de la ficha, la casilla en la que se escribe (con los niveles de
   arriba encima) y la misma ficha en la fase anterior y la siguiente. Moverse
   entre fases sin cerrar la ventana es lo que más se usa: Alt + ← →.

La **matriz** es la vista de repaso: todas las fases a la vez, a un nivel.
Las columnas tienen ancho fijo y la tabla se desplaza en horizontal: se prefiere
el scroll a apretar el texto. Un clic en el título de un grupo (Historia,
personajes…) lo cierra; un clic en el nombre de una fila la pliega a una línea.
Fijando una fila (◎) se ve solo esa, con lo de siempre y lo de cada fase, junto
a lo que pasa en cada una. Una ficha abierta desde la matriz no repite su
matriz arriba: la tienes detrás.

## Arrancar

Doble clic en `abrir.cmd`. Se abre en Chrome o Edge (Firefox no deja abrir
carpetas) en `http://localhost:5181`. "Abrir carpeta" y se elige la del
proyecto; la próxima vez solo pide confirmar el permiso.

Para desarrollar: `npm install`, `npm run dev`, `npm test`.

## Decisiones

- **Los `.md` son los únicos datos.** No hay base de datos ni JSON intermedio:
  si lo hubiera, lo escrito a mano en Obsidian acabaría pisado. La app lee la
  carpeta cada 2 s y, al guardar, vuelve a leer el fichero del disco y cambia
  solo las líneas de la casilla editada.
- **Un fichero por cosa, no por casilla.** Una ficha lleva todas sus fases y
  niveles dentro; así se lee de un tirón en Obsidian.
- **Web local sin servidor propio**: la File System Access API da "abrir
  carpeta" y escritura directa, también sobre Google Drive para escritorio.
- Lo que la app no entiende lo enseña como texto y no lo toca.

El formato está en [FORMATO.md](FORMATO.md).

## Atajos

| Tecla | Hace |
|---|---|
| Alt + ↑ / ↓ | menos / más detalle (en una ficha, o en la matriz); en la ficha también con N1 N2 N3 |
| Alt + 1…9 | ir a un nivel |
| Alt + ← / → | fase anterior / siguiente |
| Esc | cerrar la ficha; desde una fase, volver al grafo |
