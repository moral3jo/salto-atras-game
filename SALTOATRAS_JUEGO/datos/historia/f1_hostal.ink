// F1 · Hostal. Guion: tiempo/F1 Fraude.md → Recorrido, pasos 6-9.

VAR sabe_bosque = false

=== hostal_llegar
{ hostal_llegar == 1:
    El hostal. Huele a lejía y a guiso.
}
->->

=== hostal_llaves
Una llave en cada gancho. Soy el único huésped.
(Del hostal. Probablemente del pueblo.)
->->

// ---- Elena, por teléfono ----

=== con_elena
{
- not _primera_llamada:
    -> _primera_llamada ->
- not _segunda_llamada:
    -> _segunda_llamada ->
- resuelta("quien_cerro") && not _cerro_bien:
    -> _cerro_bien ->
- not resuelta("quien_cerro"):
    Elena: ¿Ya sabes quién ha dejado cerrado el ayuntamiento?
    ~ pensar("quien_cerro")
- else:
    Elena: ¿Qué pasa ahora, Martínez?
}
->->

= _primera_llamada
Tres tonos. Elena siempre deja sonar tres.
Elena: Martínez. ¿Ya estás en Medina?
Elena (gesto): Lo tuyo es confirmar si hay fraude. Sin que se note a qué has ido.
Elena: Para ellos, vas a preparar el centro nuevo.
Elena: ¿Te has mirado el expediente? Te lo di antes de salir.
~ activar("expediente")
~ ficha("solicitudes")
~ guiar("expediente")
->->

// Cuando ya ha abierto el expediente (la guía reabre la llamada).
= _segunda_llamada
Elena (inquieta): Tres solicitudes. En un pueblo de cuatrocientos.
~ activar("panel")
~ activar("informe")
~ posit("fraude")
~ posit("alcalde_ajo")
~ posit("donde_vive")
// Tutorial de pensar: pregunta, respuesta y prueba.
Elena: Y una cosa: lo que me cuentes, con pruebas. Si no, no me vale.
Elena: Empieza por algo fácil. El ayuntamiento cerrado: ¿quién lo ha dejado así?
~ activar("pensar")
~ pensar("quien_cerro")
->->

= _cerro_bien
Elena: El alcalde, claro. ¿Ves? Pregunta, respuesta y prueba. Así me gusta.
Elena: Lo que encuentres, me lo cuentas. ¿Algo raro al llegar?
->->

= ayuntamiento
Elena: ¿Cerrado un martes? Es una vergüenza que esté cerrado a estas horas.
->->

= multa
Elena: ¿Una multa? Ni se te ocurra pasármela a gastos.
->->

= alcalde
Elena: ¿El alcalde?
-> _donde_vive

= cartel
Elena: "Venid a verme a casa". Qué detalle.
-> _donde_vive

= _donde_vive
Elena: Sé que vive en el bosque. Busca allí.
~ ficha("bosque")
~ sabe_bosque = true
->->

= solicitudes
Elena: Más solicitudes que la capital. Por eso estás ahí.
->->

= policia
Elena: ¿Un municipal borde? Es un pueblo, Martínez. ¿Qué esperabas?
->->

= sin_cobertura
Elena: ¿Sin cobertura? Por eso me llamas desde el hostal. Funciona, ¿ves?
->->

= repetir
Elena: Ya te lo he dicho.
->->

= otro
Elena: Eso no me interesa. El fraude, Martínez.
->->
