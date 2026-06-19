# Preguntas / confirmaciones — Cata gamificada

> "Cliente" = la visión del equipo Tastia. Cada punto lleva un **default propuesto** ya aplicado en
> el PRD como `[ASSUMPTION]`. Confírmalos o corrígelos; el PRD funciona con los defaults mientras tanto.

## Por confirmar (defaults aplicados)
1. **Formato de pregunta** → default: **opción múltiple** (texto libre = notas no puntuadas). ¿OK?
2. **Nº de preguntas y duración** → default: **1 por fase sensorial + 1 de gamificación por vino**
   (~16/sesión, 4 vinos). ¿Duración objetivo total aceptable?
3. **Tiempo de la fase de gamificación** → default: **30"**. ¿OK? (Vista/Olfato 30", Gusto 45").
4. **Puntuación** → default: **100 base + hasta +50 bonus** de rapidez decreciente, configurable. ¿OK?
5. **Límite de jugadores** → default: **sin límite duro (~20)**. ¿Algún tope?
6. **Rotación de la pregunta de gamificación** → default: **automática** (variedad→clasificación→precio)
   con override del Admin. ¿OK?
7. **Caída de la Sala (host)** a mitad → default: **pausa + reanuda** al reconectar. ¿OK?
8. **Distractores** de variedad/D.O./precio → default: **del pool del catálogo**. ¿O lista fija curada?
9. **Trivia/curiosidad** → ¿quién la escribe (Admin a mano / IA)? ¿cuántas por pack?
10. **Ranking** → default: **mensual** (como la landing). ¿OK?

## Confirmadas (de discovery)
- Estructura **por vino (×4)**: Vista → Olfato → Gusto → fase de gamificación.
- Flujo: avatar intro de fase → quiz cronometrado → al acabar, avatar revela solución + explicación → puntos automáticos.
- Puntos a **todos** los que aciertan + bonus de rapidez.
- Preguntas **derivadas** de ficha+taxonomía pero **preconfiguradas/editables** por el Admin.
- **Solo el Admin** (equipo) toca la lógica del juego; el jugador solo juega.
- App = **PWA companion** pulida (sin app nativa).
- Edge cases: reconexión mantiene puntos; nadie responde → revela, 0 pts; unión tardía → 0; empate → misma posición.
