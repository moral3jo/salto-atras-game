// Órdenes que la historia da al motor del juego.
// En el juego las ejecuta el motor; en Inky se usa la versión de aquí abajo,
// que solo lo enseña entre corchetes para poder probar sin el juego.

// Mientras sea cierta, no se puede acabar la conversación (ni "Adiós" ni Escape):
// para los tutoriales que obligan a seguir hablando. ~ retener = true
VAR retener = false

// Al acabar lo que se está diciendo, cambia de lugar. ir("hostal")
EXTERNAL ir(lugar)
=== function ir(lugar)
[→ {lugar}]

// Añade una ficha al expediente (datos/expediente.yaml). ficha("multa")
EXTERNAL ficha(id)
=== function ficha(id)
[ficha: {id}]

// Pone un pósit en el panel (datos/panel.yaml). posit("fraude")
EXTERNAL posit(id)
=== function posit(id)
[pósit: {id}]

// Activa una parte de la interfaz: expediente, panel, informe, mapa.
EXTERNAL activar(que)
=== function activar(que)
[activa: {que}]

// Cambia cómo se ve el juego (grano, temblor…): un ambiente de juego.yaml → ambientes.
// ambiente("tenso") lo pone, ambiente("") vuelve a lo normal.
EXTERNAL ambiente(nombre)
=== function ambiente(nombre)
[ambiente: {nombre}]

// Al acabar lo que se está diciendo, cierra la conversación.
EXTERNAL terminar()
=== function terminar()
[fin de la conversación]

// Desde ahora esa ficha se llama así en todas partes (etiquetas, cartas, expediente,
// quien habla). Hasta entonces se llama como dice su `titulo` (p. ej. "El chico del libro").
// nombrar("carlos", "Carlos")
EXTERNAL nombrar(id, nombre)
=== function nombrar(id, nombre)
[{id} se llama {nombre}]

// Cierra la conversación y obliga a abrir esa parte de la interfaz (un dedo la señala y
// nada más se puede tocar). Al cerrarla, la conversación se reabre con la misma persona.
// guiar("expediente")
EXTERNAL guiar(parte)
=== function guiar(parte)
[guía: {parte}]

// Enseña de cerca el papel de una ficha (su de_cerca) y la añade al expediente.
EXTERNAL ver(id)
=== function ver(id)
[de cerca: {id}]

// Pone una pregunta en el panel y abre Pensar con ella al acabar lo que se está diciendo.
EXTERNAL pensar(id)
=== function pensar(id)
[pensar: {id}]

// ¿Está resuelta esa pregunta del panel? En Inky siempre dice que no.
EXTERNAL resuelta(id)
=== function resuelta(id)
~ return false
