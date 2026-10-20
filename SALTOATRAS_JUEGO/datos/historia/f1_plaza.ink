// F1 · Plaza. Guion: tiempo/F1 Fraude.md → Recorrido, pasos 1-5.
//
// Las líneas sin nombre son lo que piensa Martínez (salen a boli). Nada de
// narrar: lo que pasa se ve; aquí solo va su cabeza. Ver docs/FORMATO.md.

VAR policia_se_fue = false
VAR sabe_hostal = false

// El municipal llega cuando Martínez ha leído la nota del alcalde.
=== function policia_en_plaza
~ return plaza_cartel and not policia_se_fue

// El chico llega cuando ya se ha ido el municipal y Martínez ha leído la nota
// y mirado el ayuntamiento: así tiene esas fichas para preguntarle.
=== function carlos_en_plaza
~ return policia_se_fue and fase == 1 and plaza_ayuntamiento and plaza_cartel

// ---- Mirar ----

=== plaza_llegar
{ plaza_llegar == 1:
    Medina, bonito pueblo
    Cobertura de movil ~~poca~~ ninguna
    ~ ficha("sin_cobertura")
}
->->

=== plaza_ayuntamiento
El ayuntamiento parece cerrado, _funcionarios_
~ ficha("ayuntamiento")
->->

=== plaza_cartel
~ ver("cartel")
A casa. ¿A qué casa?
(Un detalle sin importancia, por lo visto)
~ ficha("alcalde")
->->

=== plaza_coche
{ policia_se_fue:
    Multado por aparcar en una plaza _vacía_
- else:
    Bonito coche
    (El dueño tiene buen gusto)
}
->->

// ---- El municipal ----
// Lo del ayuntamiento, la nota o el alcalde es relleno: se le pregunte o no,
// en cuanto da la multa se va, borde, y la conversación se corta.

=== con_policia
{ con_policia == 1:
    // Está a lo suyo: ni levanta la vista. Espera a que le digan algo.
    Policía (escribiendo): ...
- else:
    Policía (borde): ¿Si?
}
->->

= policia
Policía (escribiendo): ¿Que qué hago? Multar a un coche mal aparcado.
Mal aparcado ~~un coche~~ _Mi_ coche.
Policía (borde): Aqui tiene, buenas tardes
~ ver("multa")
Si, muy buenas
Policía (borde): Adios
~ policia_se_fue = true
~ terminar()
->->

= ayuntamiento
Policía (borde): ¿Cerrado? hable con el alcalde
Gracias...
->->

= cartel
Policía (borde): Ese cartel lo puso el alcalde, hable con él
Ojala saber donde está
->->

= alcalde
Policía: Estará en su casa
Es ustede de mucha ayuda
->->

= sin_cobertura
Policía: ¿Cobertura? Esas cosas en la ciudad
Donde debí quedarme yo
->->

= repetir
Policía (borde): Como ya le he dicho...
->->

= otro
Policía (borde): ¿Y a mí qué me cuenta?
->->

// ---- El chico del libro ----

=== con_carlos
{ con_carlos == 1:
    Carlos: Hola soy Carlos
    Un chaval con un libro, tal vez el pueda ayudarme.
- else:
    Carlos: ¿Sí?
}
->->

= carlos
Carlos (muestra_libro): Es un libro de matematicas, se me dan muy bien
Matemáticas claro
->->

= policia
Carlos: Solo hace su trabajo
Ojalá todos hicieran lo mismo
como por ejemplo el alcalde
->->

= multa
Carlos: Parece que no le caen bien los que vienen de la ciudad
Y tanto que duele...
->->

= sin_cobertura
Carlos: Este pueblo está olvidado y no tenemos antenas
Carlos: Puedes llamar desde el telefono del hostal, esta al final de la calle que tengo detrás
~ ficha("hostal")
Calle de la derecha hostal
(apuntado)
~ sabe_hostal = true
->->

= cartel
Carlos: El alcalde, últimamente no sale mucho de casa
Tal vez deberia presentarme a las elecciones en este pueblo
->->

= ayuntamiento
Carlos: Es el edificio que tienes delante
Ya suponia
->->

= alcalde
Carlos: El alcalde suele venir a primera hora al ayuntamiento mañana lo podrás encontrar aquí
Encima me tocará madrugar
->->

= repetir
Carlos: Ya te lo he dicho.
->->

= otro
Carlos: Ni idea.
->->
