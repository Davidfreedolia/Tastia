# Deferred work — Cata gamificada

Hallazgos de la revisión adversarial de `spec-estructura-sesion-rondas.md` que NO son de este cambio
(preexistentes / arquitectónicos), para abordar más adelante.

## C — Estado de sesión efímero: recarga del host / dos hosts resetean la sala
- Si el host (Sala) recarga, o se abre una segunda pestaña `/room/:code`, su estado vuelve a `lobby`
  (estado solo en memoria) y, al difundirlo, puede arrastrar a toda la sala al lobby.
- Causa: el estado de la sesión es **efímero a propósito** (decisión *Ask-First* del spec: no persistir
  en BD salvo indicación). Arreglo real = **persistir la sesión** (tabla `tasting_sessions`, máquina de
  estados autoritativa en BD/Edge Function) + **identidad de jugador persistida** (localStorage) para
  conservar puntos en reconexión.
- Mitigación parcial ya aplicada en este cambio: guarda de `updatedAt` (los jugadores ignoran estados
  más antiguos que el ya adoptado).
- → Abordar en **Persistencia/ranking (§5.9)** o una feature de robustez de sesión.

## G — Evento `ready` del jugador inerte
- El Companion puede enviar `ready`, pero el host lo ignora (`void ev`). Hoy no tiene efecto.
- → Definir su uso (p. ej. "todos listos" habilita avanzar) en el **Motor de Quiz (§5.2)**.
