// F1 · Entrada del bosque. Guion: tiempo/F1 Fraude.md → Recorrido, pasos 10-11.
// El puzle de los caminos y la caravana: por hacer.

=== bosque_llegar
{ bosque_llegar == 1:
    El bosque empieza donde acaba el asfalto.
}
->->

=== bosque_entrar
(El puzle de los caminos está por hacer: aquí acaba el esqueleto.)
->->

// ---- La señora ----

=== con_senora
{ con_senora == 1:
    Señora (aviso): Si entra usted ahí, se pierde.
- else:
    Señora: ¿Todavía por aquí?
}
->->

= alcalde
Señora: ¿La caravana del alcalde? Su chico baja todas las tardes con un ramo de flores azules.
Señora: Siempre azules.
~ ficha("flores_azules")
->->

= bosque
Señora: Ahí dentro todos los caminos se parecen. Menos uno.
->->

= repetir
Señora: Que ya se lo he dicho, hijo.
->->

= otro
Señora: Yo de eso no sé.
->->
