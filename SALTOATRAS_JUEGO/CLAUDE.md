# SALTO ATRÁS — el juego

Aventura de investigación en primera persona, con pantallas fijas. Phaser 4 +
TypeScript + Vite, con diálogos en Ink (inkjs). Para arrancarlo: `abrir.cmd` o
`npx vite` (puerto 5182). Arranca en la portada (Continuar / Nueva partida);
Escape o el botón ≡ abren la pausa. `?nuevo` se salta la portada con una partida
nueva; `?debug` enseña las zonas.

## Antes de tocar nada

- El guion está en `../SALTOATRAS_GUIONISTA/`. Lo que manda está en `guionista.md`
  → N3 (mecánicas, principios de diseño, el informe, decisiones técnicas) y en
  `tiempo/F<n>.md`. Usar su glosario: **expediente**, **panel**, **informe**, **mapa**.
- Se juega plano primero: todo el juego mínimo de principio a fin. Las mejoras
  y los minijuegos se apuntan; no se hacen ya.

## La idea del juego

Investigar es **preguntar por cosas**. Todo lo que sabe Martínez es una ficha
(persona, sitio, cosa, evento): está en el expediente y es un tema de
conversación. Al hablar, abajo salen las fichas (todas juntas; con pestañas cuando ya no caben) y pinchar una es
preguntar por ella. Los cuerpos salen en grande y cambian de pose (tipo
*Detective Grimoire*). En **Pensar** se responde una pregunta con una ficha y
se sostiene con otra (la prueba); lo resuelto pasa al panel (la pared), que se
monta solo.

## La regla

**El motor no sabe nada de la historia.** Lo que pasa está en `datos/`
(lugares en YAML, historia en Ink, expediente y panel en YAML); el formato está
en `docs/FORMATO.md`. Si una mecánica nueva necesita datos, se amplía el formato
y su comprobación en `src/motor/datos.ts`, y se documenta en `docs/FORMATO.md`.
Ningún texto ni nombre de la historia va en `src/`.

## Código

- `src/motor/datos.ts`: carga `datos/` y compila Ink en el navegador. Comprueba que
  lo que se nombra en un sitio exista en el otro; los errores salen en pantalla.
- `src/motor/partida.ts`: el estado (lugar, fichas, pósits, partes activas), las
  órdenes de Ink (`ir`, `ficha`, `ver`, `posit`, `pensar`, `resuelta`, `activar`, `terminar`), lo preguntado a cada uno y el guardado en localStorage.
- `src/juego.ts`: la partida compartida y los saltos `jugar()` / `irAPortada()`, que
  paran todas las escenas antes de arrancar la siguiente. Un oyente de
  `partida.eventos` se quita siempre al parar su escena (SHUTDOWN).
- `src/ui/animar.ts`: **todas** las transiciones (entrar/salir de una capa,
  aparecer/desaparecer, elevar al pasar el ratón) con las mismas duraciones y
  curvas. Nada aparece ni desaparece de golpe; una capa se cierra con `salir()`,
  no con `scene.stop()`.
- `src/escenas/`: `Portada`, `Llegada` (la entrada de una partida nueva), `Pausa`, `Lugar` (fondo y cosas: mirar, hablar o ir), `Dialogo` (caja
  de abajo para mirar), `Conversacion` (cuerpo, bocadillo y bandeja de fichas),
  `Pensar` (pregunta, respuesta y prueba), `DeCerca` (un papel en primer plano),
  `Interfaz` (objetos arriba y avisos),
  y las hojas `Expediente`, `Panel` e
  `Informe` (base `Papel`). El orden de `scene: [...]` en `main.ts` es el de dibujo.
- `src/motor/lineas.ts`: quién dice una línea (las voces de `juego.yaml`); sin voz, es pensamiento.
- `src/ui/Boli.ts`: los pensamientos de Martínez a mano, en bloques que se escriben solos (`bloque()`; no se puede saltar con un clic, a propósito: los tachados y subrayados son parte del juego; el cursor es un boli mientras se escribe y, al acabar, una marca de tinta parpadea; cada renglón se apaga por su cuenta) (Caveat, incluida con
  `@fontsource/caveat`), con tachado, subrayado y apartes.
- `src/ui/Bandeja.ts`: la bandeja de fichas (pestañas solo si no caben en una página), común a conversar y pensar.
- Ink: la conversación con X es el nudo `con_X`; cada tema, `= <id de ficha>`.
  El motor llama a todo como túnel a través de "puertas" generadas, así que
  cada parte acaba en `->->`.
- **Resolución**: todo se coloca en 960×540 y el lienzo es de 1920×1080 con la
  cámara a zoom 2 (`camara()` en `config.ts`), para que el texto salga nítido.
  Crear texto siempre con `texto()`.
- El arte sale de `../SALTOATRAS_ARTE/juego/` (ver su `LEEME.md`). Sin
  imagen, se dibuja un fondo provisional.
- En desarrollo, `window.partida` y `window.juego` sirven para mirar el estado.

## Debug y ajustes

**F2** abre el panel de debug (solo en desarrollo): deslizadores para ajustar
tiempos y posiciones en vivo, textos de prueba, copiar valores y medir cuadrados
sobre el lienzo. Todo valor ajustable (tiempos, velocidades, posiciones,
animaciones) se declara en `src/motor/ajustes.ts` y se lee con `ajuste("id")` en el
momento de usarlo; **no pongas números sueltos de tiempo en el código**. Ver
`docs/DEBUG.md`. Cuando el usuario pase valores copiados del panel, se pasan a los
`valor` por defecto de `DEFS`.

## Phaser 4

Hay skills de Phaser 4 en `.claude/skills/phaser-*` (vienen del paquete npm
4.2.1) y guías en `docs/phaser/`. Consultarlas antes de usar una API: mucho de
Phaser 3 ya no existe (pipelines → render nodes, FX → filters, Point → Vector2).

## Pendiente

Ver `docs/PENDIENTE.md`.
