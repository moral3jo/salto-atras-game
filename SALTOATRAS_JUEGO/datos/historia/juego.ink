// SALTO ATRÁS — fichero principal de la historia.
// Se puede abrir y jugar en Inky: el menú de abajo salta a cada conversación.
// El juego no pasa nunca por este menú. Ver docs/FORMATO.md.

INCLUDE motor.ink
INCLUDE f1_plaza.ink
INCLUDE f1_hostal.ink
INCLUDE f1_bosque.ink

VAR fase = 1

// Cuando alguien no tiene respuesta para una ficha ni un tema "otro".
=== sin_respuesta
No. Eso no se lo pregunto.
->->

// Lo que piensa Martínez cuando una conclusión no se sostiene.
=== pensar_fallo
{~No. Eso no se sostiene.|No me cuadra.|Me falta algo que lo pruebe.}
->->

// ---- Menú de pruebas (solo para Inky) ----
-> pruebas
=== pruebas
+ [Plaza: llegar] -> plaza_llegar ->
+ [Municipal: saludo] -> con_policia ->
+ [Municipal: ayuntamiento] -> con_policia.ayuntamiento ->
+ [Municipal: él mismo] -> con_policia.policia ->
+ [Municipal: la nota] -> con_policia.cartel ->
+ [Municipal: repetir] -> con_policia.repetir ->
+ [Chico: saludo] -> con_carlos ->
+ [Elena: llamada] -> con_elena ->
+ [Elena: la multa] -> con_elena.multa ->
+ [Elena: tutorial resuelto] -> con_elena._cerro_bien ->
+ [Señora: el alcalde] -> con_senora.alcalde ->
- -> pruebas
