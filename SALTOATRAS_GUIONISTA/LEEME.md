# Cómo está organizada esta carpeta

Es un proyecto de **Guionista**. Se puede leer y editar con Obsidian o con cualquier editor; la app solo enseña lo mismo en forma de matriz.

- `guionista.md`: el proyecto (niveles, orden de los tipos) y la premisa.
- `tiempo/`: un fichero por punto del tiempo (fase, capítulo…). El nombre empieza por su identificador: `F3 Quién se lo hizo.md`.
- `personajes/`, `lugares/`…: un fichero por ficha. Cada carpeta es un tipo.
- `recursos/`: imágenes, enlazadas con `![[nombre.png]]`.

Dentro de una ficha, cada punto del tiempo es un `## F3`, y dentro van los niveles (`### N1`, `### N2`…). `## Transversal` es lo que vale para todo el juego. Un encabezado más por debajo del nivel es una dimensión (`#### Guion`, `#### Pensamientos`…).

En los ficheros de `tiempo/` el punto ya lo da el fichero, así que empiezan directamente en `## N1`.

`aparece: F1-F3, F6` en el frontmatter dice en qué puntos está una ficha.
