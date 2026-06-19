---
title: Tastia — Cata gamificada (modo de juego en vivo)
client: Tastia (producto propio · equipo de 5; David representa la visión)
status: final
created: 2026-06-18
updated: 2026-06-19
---

# PRD: Tastia — Cata gamificada (modo de juego en vivo)

## 0. Propósito del documento
Para el equipo de Tastia y los agentes de implementación (vía `nch-spec`). Lo alimentan: la
descripción del modo de juego aportada por David (estructura de rondas y fases, temporizadores,
flujo del avatar, taxonomía de vinos) y el contexto ya construido (`README.md`,
`docs/ARCHITECTURE.md`, `docs/BACKEND.md`). Cada feature de §5 está pensada para convertirse en una
spec de implementación sin volver a hacer preguntas de producto.

## 1. Visión
La **Cata gamificada** convierte una cata a ciegas en un **concurso en vivo**. En la **Sala** (una
pantalla/TV) el **Avatar-sommelier** introduce cada fase; en ese momento se activa un **Quiz**
cronometrado en el móvil de cada **Jugador**; al agotarse el tiempo el Avatar **revela la solución
con explicación** y se reparten **Puntos** automáticamente. El recorrido es por vino: cada uno de
los 4 vinos pasa por las fases sensoriales (Vista, Olfato, Gusto) y una **Fase de gamificación**
(variedad, clasificación o precio).

Para el Jugador, resuelve la fricción de la cata tradicional: aprende y compite sin sentirse
juzgado, con feedback inmediato y un **Podio** que da chispa social. Para Tastia, es el núcleo
diferenciador del producto (el "porqué" de la experiencia) y lo que justifica el pack: la cata
física se vuelve un juego memorable.

## 2. Contexto del encargo
- **Tipo:** producto completo para lanzar (no un prototipo desechable).
- **Base existente:** se construye sobre lo ya desplegado — **Sala** (`/room/:code`) + **Companion**
  (`/play/:code`) sobre Supabase Realtime, backend con catálogo de vinos, notas de cata, packs y
  taxonomía, y panel `/admin`. La revelación + puntuación básicas ya existen (texto libre); este PRD
  las **reemplaza por el modo Quiz cronometrado**.
- **Quién provee el contenido:** el **Admin** (equipo Tastia) gestiona todo (vinos, taxonomía,
  banco de preguntas, tiempos, parámetros de puntuación). El **Jugador no toca la lógica del juego**.
- **Restricciones duras de fecha/presupuesto:** no declaradas.

## 3. Usuarios

### 3.1 Roles
> **Aclaración clave:** la partida en vivo es **entre clientes** (el anfitrión y sus invitados).
> **Tastia (la empresa) NO juega ni está en la sala**: solo prepara el contenido por adelantado
> (rol Admin). Tastia no es concursante.

- **Jugador (concursante)** — el cliente que compró el pack y sus invitados; juegan desde el
  Companion (móvil). Responden el Quiz dentro del tiempo. NO configuran nada.
- **Anfitrión** — el cliente que organiza la velada en su casa; abre la **Sala** en su TV/pantalla y
  conduce el avance de fases. Suele ser también Jugador. Es un **cliente**, no Tastia.
- **Avatar-sommelier** — presentador de IA que narra intros y Soluciones en la Sala (no es humano).
- **Admin (Tastia, la empresa)** — prepara el juego **antes de la partida** desde `/admin`
  (vinos+Taxonomía, Banco de preguntas, tiempos, parámetros de puntuación). **No participa en la
  sesión en vivo**: ni anfitrión ni concursante. Único rol que toca la lógica del juego.

### 3.2 Jobs To Be Done
- Jugador: "Quiero competir y aprender de vino con mis amigos sin sentirme examinado."
- Anfitrión: "Quiero conducir la cata sin pensar qué fase toca; que la pantalla lo guíe."
- Admin: "Quiero preparar las preguntas, tiempos y vinos de un pack sin tocar código."

### 3.3 User Journeys clave
- **UJ-1 — Conducir la sesión (Anfitrión).** El anfitrión abre la Sala con el código del pack,
  espera a que los Jugadores entren (lobby) y arranca. La Sala avanza vino a vino por las fases; él
  solo confirma "siguiente" cuando el grupo está listo.
- **UJ-2 — Jugar una fase cronometrada (Jugador).** Laura se une por QR desde el móvil. El Avatar
  dice "observad el color del vino 1"; aparece la Pregunta con Opciones y una **Cuenta atrás de
  30"**. Laura responde antes de que acabe. Al llegar a 0, el Avatar revela la Solución y Laura ve
  **al instante si acertó y cuántos Puntos** ha sumado (con Bonus si fue rápida).
- **UJ-3 — Fase de gamificación + revelación.** Tras Vista/Olfato/Gusto del vino, llega la Fase de
  gamificación (p. ej. "¿qué variedad es?"); mismo patrón cronometrado; el Avatar explica la
  respuesta y reparte Puntos.
- **UJ-4 — Cierre y Podio.** Tras los 4 vinos, el Avatar proclama el Podio; cada Jugador ve su
  posición y total. El resultado queda guardado para el ranking.
- **UJ-5 — Preparar el juego (Admin).** El equipo, en `/admin`, clasifica los vinos con la
  Taxonomía, revisa/edita las Preguntas derivadas y ajusta tiempos y puntuación de un pack.
  *Edge case:* si un vino no tiene Pregunta para una fase, el Admin la añade antes de publicar.

## 4. Glosario
*Términos usados verbatim en todo el PRD.*
- **Sesión (Partida)** — una cata gamificada de principio a fin para un grupo, identificada por el
  código del pack. Contiene 4 vinos.
- **Sala** — superficie de pantalla/TV (`/room/:code`) que proyecta el Avatar, el estado y el
  Marcador. Es la **autoridad** del juego (manda el reloj y el avance).
- **Companion** — superficie móvil del Jugador (`/play/:code`); muestra la Pregunta activa y recoge
  la respuesta.
- **Ronda** — el recorrido de **un vino** por sus fases. Una Sesión tiene 4 Rondas (una por vino).
- **Fase** — etapa dentro de una Ronda: **Vista** (30"), **Olfato** (30"), **Gusto** (45") y
  **Fase de gamificación**.
- **Fase de gamificación** — fase final de cada Ronda; su Pregunta es de tipo variedad,
  clasificación o precio.
- **Pregunta** — ítem de Quiz con enunciado, varias **Opciones** (una correcta + **Distractores**) y
  un tiempo. Asociada a un vino y a una Fase.
- **Distractor** — Opción incorrecta de una Pregunta.
- **Quiz** — la Pregunta activa cronometrada que responden los Jugadores.
- **Temporizador / Cuenta atrás** — cuenta regresiva de la Fase, controlada por la Sala.
- **Solución** — respuesta correcta + explicación que da el Avatar al cerrarse el Temporizador.
- **Punto** — unidad de puntuación. **Bonus de rapidez** — extra decreciente según lo rápido que se
  acertó.
- **Marcador** — puntuación acumulada en vivo. **Podio** — ranking final de la Sesión.
- **Taxonomía** — clasificación de vinos (Tinto/Blanco/Rosado/Espumoso/Cava + subcategorías) usada
  para etiquetar el catálogo y generar Opciones/Distractores de la Pregunta de clasificación.
- **Banco de preguntas** — conjunto de Preguntas (derivadas de la ficha del vino + Taxonomía,
  preconfiguradas/editables por el Admin).
- **Avatar (sommelier)** — presentador de IA que narra intros y Soluciones en la Sala.

## 5. Features

### 5.1 Estructura de Sesión y Rondas
**Descripción:** una Sesión recorre 4 vinos; cada vino es una Ronda con fases en orden fijo: Vista →
Olfato → Gusto → Fase de gamificación. La Sala es una máquina de estados:
`lobby → (por vino: intro_vino → vista → olfato → gusto → gamificación → revelación_ronda) ×4 →
podio`. Realiza UJ-1. `[ASSUMPTION: 1 Pregunta por fase sensorial + 1 Pregunta de gamificación por
vino → ~16 Preguntas por Sesión]`.

**Functional Requirements:**

#### FR-1: Recorrido por vino
La Sala recorre los 4 vinos, cada uno por sus 4 fases en orden fijo. Realiza UJ-1.
**Consecuencias:**
- El estado actual identifica siempre (vino N de 4, fase actual).
- No se puede saltar a un vino posterior sin pasar por las fases del actual (salvo acción de Admin/host de "saltar").

#### FR-2: Avance controlado por el Anfitrión
El Anfitrión avanza de fase/vino con una acción única "siguiente"; el sistema nunca avanza solo de **vino** sin confirmación. Realiza UJ-1.
**Consecuencias:**
- Dentro de una Fase, el paso a la Solución sí es automático al agotarse el Temporizador (ver FR-7).
- El paso al siguiente vino requiere confirmación del Anfitrión.

### 5.2 Motor de Quiz cronometrado
**Descripción:** al entrar en una Fase, la Sala activa la Pregunta con sus Opciones y arranca la
Cuenta atrás (Vista 30", Olfato 30", Gusto 45", gamificación `[ASSUMPTION: 30"]`). El Companion
muestra la Pregunta y recoge la respuesta. Formato `[ASSUMPTION: opción múltiple]`. Realiza UJ-2.

**Functional Requirements:**

#### FR-3: Presentación de la Pregunta activa
Cuando la Sala entra en una Fase, cada Companion conectado muestra la Pregunta y sus Opciones. Realiza UJ-2.
**Consecuencias:**
- Todos los Companions ven la misma Pregunta y Opciones a la vez.
- El Jugador puede seleccionar exactamente una Opción.

#### FR-4: Una respuesta por Jugador y Fase
El Jugador puede enviar su respuesta una vez por Pregunta; puede cambiarla mientras el Temporizador corre; la última cuenta. Realiza UJ-2.
**Consecuencias:**
- Tras cerrarse el Temporizador, el Companion bloquea la respuesta.
- Una respuesta enviada después del cierre no cuenta (ver FR-7).

#### FR-5: Captura del instante de respuesta
El sistema registra cuándo respondió cada Jugador (para el Bonus de rapidez). Realiza UJ-2.
**Consecuencias:**
- El orden/tiempo de acierto queda disponible para el cálculo de Puntos (FR-10).

### 5.3 Temporizador autoritativo y sincronización
**Descripción:** la Sala (host) es la autoridad del reloj: arranca la Cuenta atrás y la difunde; los
Companions la reflejan sincronizada. Al llegar a 0 cierra automáticamente. Realiza UJ-1, UJ-2.

**Functional Requirements:**

#### FR-6: Reloj autoritativo en la Sala
La Cuenta atrás la controla y difunde la Sala; los Companions muestran el mismo tiempo restante. Realiza UJ-2.
**Consecuencias:**
- Si dos móviles miran a la vez, ven el mismo tiempo (±margen de red).
- Ningún Companion puede extender su propio tiempo.

#### FR-7: Cierre automático al agotarse el tiempo
Al llegar a 0, la Fase se cierra: se dejan de aceptar respuestas y se pasa a la Solución. Realiza UJ-2.
**Consecuencias:**
- Respuestas que llegan tras el 0 se descartan (no puntúan).
- La transición a Solución ocurre aunque falten Jugadores por responder.

#### FR-8: Reconexión sin pérdida
Un Jugador que se desconecta y vuelve recupera su estado (Puntos y fase actual). Realiza UJ-2.
**Consecuencias:**
- Reconectar no reinicia sus Puntos.
- Un Jugador que se une tarde entra en el estado actual con 0 Puntos `[ASSUMPTION]`.

### 5.4 Flujo del Avatar
**Descripción:** el Avatar hace una intro corta al entrar en cada Fase y, al cerrarse el
Temporizador, da la Solución con explicación. Realiza UJ-2, UJ-3.

**Functional Requirements:**

#### FR-9: Intro de fase y Solución por Pregunta
El Avatar presenta cada Fase y, tras el cierre, revela la Solución con explicación. Realiza UJ-3.
**Consecuencias:**
- La Solución se muestra después del cierre, nunca antes (anti-spoiler).
- El Anfitrión puede **saltar** la narración del Avatar y seguir.

### 5.5 Puntuación, Marcador y Podio
**Descripción:** al cerrarse cada Pregunta se reparten Puntos automáticamente a **todos** los que
acertaron, con **Bonus de rapidez** decreciente. El Marcador se actualiza en vivo; al final se
muestra el Podio. Realiza UJ-3, UJ-4.

**Functional Requirements:**

#### FR-10: Reparto automático de Puntos
Al cerrarse una Pregunta, cada Jugador que acertó recibe Puntos = base + Bonus de rapidez. Realiza UJ-3.
**Consecuencias:**
- Acierto = `[ASSUMPTION: 100]` base; Bonus decreciente por rapidez `[ASSUMPTION: hasta +50 el más rápido → 0]`, configurable por Admin.
- Quien falla o no responde suma 0 en esa Pregunta.
- El reparto es automático (sin intervención del Anfitrión).

#### FR-11: Marcador en vivo y Podio final
El Marcador acumulado es visible en la Sala durante la Sesión; al terminar se muestra el Podio ordenado. Realiza UJ-4.
**Consecuencias:**
- El ganador es quien más Puntos acumula.
- En caso de empate, los Jugadores comparten posición.
- El Companion muestra a cada Jugador su posición y total al final.

### 5.6 Banco de preguntas y derivación
**Descripción:** las Preguntas se **derivan automáticamente** de la ficha del vino y la Taxonomía
(variedad, D.O., precio, clasificación) pero quedan **preconfiguradas/editables** por el Admin antes
de jugar. Las de trivia/curiosidad se escriben/ajustan a mano `[ASSUMPTION]`. Realiza UJ-5.

**Functional Requirements:**

#### FR-12: Derivación de Preguntas desde ficha + Taxonomía
El sistema propone Preguntas (enunciado, Opción correcta, Distractores) a partir de los datos del vino y la Taxonomía. Realiza UJ-5.
**Consecuencias:**
- La Pregunta de clasificación toma su Opción correcta de la Taxonomía del vino y sus Distractores de la misma Taxonomía.
- Las de variedad/precio/D.O. toman la respuesta de la ficha del vino.
- Los Distractores de variedad/D.O./precio se toman de un pool de valores plausibles del catálogo (otras variedades/D.O./rangos reales). `[ASSUMPTION]`

#### FR-13: Preconfiguración y edición por el Admin
El Admin revisa, edita o sustituye cualquier Pregunta/Opción de un pack antes de publicarlo. Realiza UJ-5.
**Consecuencias:**
- Ninguna Pregunta se genera "en vivo" durante la Sesión; todas existen antes.
- Si falta una Pregunta para una Fase de un vino, el pack no se considera listo.

### 5.7 Taxonomía de vinos
**Descripción:** clasificación jerárquica (Tinto/Blanco/Rosado/Espumoso/Cava + subcategorías) para
etiquetar cada vino del catálogo y alimentar la Pregunta de clasificación. Realiza UJ-5.

**Functional Requirements:**

#### FR-14: Etiquetado de vinos con la Taxonomía
El Admin asigna a cada vino su clasificación según la Taxonomía. Realiza UJ-5.
**Consecuencias:**
- Estructura soportada (resumen): **Tinto** (joven/cosecha/roble/crianza/reserva/gran_reserva);
  **Blanco** (barrica{crianza/reserva/gran_reserva}/lías{con/sin battonage}/depósito_inerte/velo_flor);
  **Rosado** (joven/roble/lías{con/sin battonage}); **Espumoso** (color: blanco/rosa);
  **Cava** (crianza{crianza/reserva/gran_reserva/paraje_calificado} + dulzor{brut_nature/extra_brut/seco}).
- Un vino sin clasificación no puede usarse en la Pregunta de clasificación.

### 5.8 Admin del juego
**Descripción:** desde `/admin`, el equipo gestiona toda la lógica: tiempos por fase, Banco de
preguntas, parámetros de puntuación y Taxonomía. El Jugador no accede a nada de esto. Realiza UJ-5.

**Functional Requirements:**

#### FR-15: Configuración de tiempos y puntuación
El Admin define los tiempos por Fase (default 30"/30"/45") y los parámetros de Puntuación (base, Bonus). Realiza UJ-5.
**Consecuencias:**
- Los tiempos por defecto son 30"/30"/45"; el Admin puede cambiarlos.
- Solo roles Admin (equipo Tastia) pueden cambiar la lógica; el Jugador, nunca.

### 5.9 Persistencia y ranking
**Descripción:** cada Sesión guarda sus resultados (Jugadores, Puntos, vino, aciertos) para alimentar
un ranking histórico/mensual (como el de la landing). Realiza UJ-4.

**Functional Requirements:**

#### FR-16: Registro de resultados de la Partida
Al terminar una Sesión, sus resultados quedan guardados. Realiza UJ-4.
**Consecuencias:**
- Cada Partida registra al menos: fecha, pack, Jugadores y sus Puntos.
- Los resultados alimentan un ranking consultable `[ASSUMPTION: mensual]`.

### 5.10 Companion (app móvil) pulido
**Descripción:** la PWA del Jugador (`/play/:code`) afinada para el Quiz: unirse, ver la Pregunta
activa con Cuenta atrás, responder, ver feedback inmediato y estado entre fases. Realiza UJ-2.

**Functional Requirements:**

#### FR-17: Experiencia de juego en el Companion
El Jugador juega toda la Sesión desde el móvil sin instalar nada. Realiza UJ-2.
**Consecuencias:**
- Estados claros: esperando, Pregunta activa (con Cuenta atrás), respuesta enviada, Solución/Puntos, entre fases, Podio.
- Funciona como PWA (sin app nativa).

### 5.11 Registro de participante (foto) y panel de participantes en la Sala
**Descripción:** al unirse, el Jugador indica su **nombre** y, opcionalmente, se hace una **foto** con
la cámara del dispositivo. Su foto + nombre + Puntos aparecen siempre en la Sala, junto al Avatar.
Durante una Pregunta activa, cada participante muestra un **estado de respuesta visual**: halo verde
si ya respondió, rojo/opaco si aún no. Realiza UJ-2, UJ-3.
`[ASSUMPTION: foto opcional; sin foto, inicial/avatar por defecto.]`

**Functional Requirements:**

#### FR-18: Registro con nombre y foto opcional
El Jugador, al unirse, indica su nombre y puede capturar una foto con la cámara. Realiza UJ-2.
**Consecuencias:**
- La foto es **opcional**; sin foto se usa una inicial/avatar por defecto.
- La foto se guarda en **Supabase Storage** (no se incrusta en el estado ni en presence). `[ASSUMPTION]`
- La foto se **elimina al terminar la Sesión** (privacidad). `[ASSUMPTION]`

#### FR-19: Panel de participantes en la Sala
La Sala muestra, junto al Avatar, una tesela por participante con su foto, nombre y Puntos acumulados. Realiza UJ-3.
**Consecuencias:**
- Las teselas reflejan los Puntos en vivo (se reordenan/actualizan al repartir Puntos).
- Un participante sin foto muestra su inicial/avatar.

#### FR-20: Estado de respuesta visual durante el Quiz
Durante una Pregunta activa, cada tesela refleja si su Jugador ya respondió: halo verde = respondió; rojo/opaco = aún no. Realiza UJ-2.
**Consecuencias:**
- Al pasar a la siguiente Pregunta, el estado vuelve a neutro.
- Requiere la señal de "respondido" del Motor de Quiz. `[NOTA PM: depende de §5.2; el halo se implementa con o después de §5.2.]`

## 6. Non-Goals (explícitos)
- **No** es app nativa (iOS/Android) — solo PWA.
- El Jugador **no** configura ni ve la lógica del juego (tiempos, respuestas, Banco de preguntas).
- **No** hay generación de Preguntas "en vivo" durante la Sesión (todas preconfiguradas).
- **No** se define aquí el proveedor del Avatar (HeyGen/Anam/Tavus) ni su implementación — rama aparte.
- **No** se rehace el flujo de compra/checkout ni la logística (otra rama del producto).

## 7. Alcance del MVP

### 7.1 Dentro
- 5.1 Estructura de Sesión y Rondas · 5.2 Motor de Quiz cronometrado · 5.3 Temporizador autoritativo
  + sincronización · 5.4 Flujo del Avatar · 5.5 Puntuación/Marcador/Podio · 5.6 Banco de preguntas y
  derivación · 5.7 Taxonomía · 5.8 Admin del juego · 5.9 Persistencia y ranking · 5.10 Companion pulido ·
  5.11 Registro con foto + panel de participantes en la Sala.

### 7.2 Fuera del MVP
- Modalidad de pregunta de **texto libre** puntuada → solo "notas" no puntuadas, o v2. *Razón: el Quiz cronometrado usa opción múltiple.*
- Tipos de Pregunta avanzados (ordenar, emparejar, imagen) → v2. *Razón: empezar con opción múltiple.*
- Rankings con ligas/temporadas complejas → v2. *Razón: empezar con ranking simple.* `[NOTA PM]`.
- App nativa → "Próximamente".

## 8. Métricas de éxito
- **SM-1**: una Sesión completa de 4 vinos se juega de principio a fin con ≥3 Jugadores en
  móvil sin que se rompa la sincronía. Valida FR-1, FR-6, FR-7.
- **SM-2**: latencia percibida de "Pregunta aparece" y "Solución/Puntos" < 1,5 s en la Sala y los
  Companions. Valida FR-3, FR-10.
- **SM-3**: el Admin prepara las Preguntas+tiempos de un pack sin tocar código. Valida FR-13, FR-15.
- **SM-4** (counter-metric): ningún Jugador puede ver la Solución antes del cierre (anti-spoiler/
  anti-trampa). Valida FR-7, FR-9.

## 9. Preguntas abiertas
1. Formato de Pregunta = opción múltiple (asumido) — confirmar que NO se quiere texto libre puntuado. (`client-questions.md`)
2. Nº exacto de Preguntas por vino y duración objetivo total de la Sesión (~16 Preguntas asumido). (`client-questions.md`)
3. Origen de la trivia/curiosidad (¿manual del Admin, IA?) y cuántas por pack.
4. Límite de Jugadores por Sala y rotación de la Pregunta de gamificación (auto vs fijada por Admin).
5. Valores por defecto de puntuación (100 base, +50 bonus) — confirmar.
6. Caída de la **Sala (host)** a mitad de Sesión: ¿la Sesión se pausa y se reanuda al reconectar el host? *(default propuesto: pausa + reanuda; el reloj se detiene mientras tanto).*
7. Pool de Distractores para variedad/D.O./precio (¿del catálogo, lista fija curada?).

## 10. Índice de Assumptions
- **A1** [equipo]: Formato de Pregunta = **opción múltiple**; texto libre = notas no puntuadas.
- **A2** [equipo]: **1 Pregunta por fase sensorial + 1 de gamificación por vino** (~16/Sesión).
- **A3** [equipo]: tiempo de la Fase de gamificación = **30"**.
- **A4** [equipo]: Puntuación = **100 base + hasta +50 Bonus** de rapidez decreciente (configurable).
- **A5** [equipo]: Jugador que se une tarde arranca con **0 Puntos**.
- **A6** [equipo]: **sin límite duro** de Jugadores (~20 razonable); **rotación automática** de la
  Pregunta de gamificación (variedad→clasificación→precio) con override del Admin.
- **A7** [equipo]: ranking **mensual**; trivia/curiosidad escrita/ajustada a mano por el Admin.
- **A8** [equipo]: foto del Jugador = **opcional** (inicial/avatar si no hay); se guarda en **Supabase
  Storage** (no en presence) y se **elimina al terminar la Sesión**.
- **A9** [equipo]: el **halo de respuesta** (FR-20) depende de la señal de "respondido" del Motor de
  Quiz (§5.2); se implementa con/después de §5.2.

---

## Roles y permisos (matriz)
> El **Anfitrión** y el **Jugador** son **clientes** (en la velada). El **Admin = Tastia (empresa)**
> actúa **antes** de la partida; **no está en la sesión en vivo**.

| Capacidad | Jugador (cliente) | Anfitrión (cliente) | Admin (Tastia) |
|---|---|---|---|
| Unirse y responder el Quiz | ✅ | ✅ (suele jugar) | — |
| Abrir la Sala y conducir fases/vinos | — | ✅ | — |
| Ver/editar Preguntas, tiempos, puntuación, Taxonomía (pre-partida) | ❌ | ❌ | ✅ |

## Datos y contenido
- **Provee el equipo (Admin):** vinos + fichas + Taxonomía + Banco de preguntas + tiempos + parámetros de puntuación.
- **Genera el producto:** resultados de cada Partida (Puntos, aciertos) → ranking.
- Las Preguntas se derivan de datos ya en la BD (catálogo de vinos + Taxonomía); el Admin las revisa.

## Operación post-entrega
- El equipo opera todo desde `/admin` sin tocar código: clasificar vinos, preparar Preguntas, ajustar
  tiempos/puntuación, publicar un pack como "listo para jugar".
