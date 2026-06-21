-- Tastia · 0011 — Banco de preguntas por fases (§5.6 / FR-12, FR-13)
--
-- §5.2 dejó `game_questions` modelando solo la fase de gamificación
-- (variedad/denominacion/precio/añada/trivia). El PRD necesita UNA pregunta por
-- fase sensorial (vista/olfato/gusto) + 1 de gamificación por vino (~16/Sesión),
-- preconfiguradas y editables por el Admin (FR-13).
--
-- Cambios:
--   1. enum `question_fase` (vista/olfato/gusto/gamificacion).
--   2. `game_questions.fase` (qué fase responde la pregunta).
--   3. `type` pasa a ser opcional: solo aplica a la fase de gamificación
--      (el subtipo variedad/clasificacion/precio/...). Se añade 'clasificacion'
--      al enum para la pregunta de taxonomía (§5.7).
--   4. Vista `wines_question_readiness`: un pack/vino no está listo si le falta
--      una pregunta para alguna fase (FR-13).
--
-- NOTA: la respuesta correcta y los distractores siguen en `correct_answer`/`options`
-- (jsonb); las preguntas se sirven al cliente SIN `correct_answer` vía edge function.

-- 'clasificacion' = pregunta de gamificación basada en la taxonomía (§5.7).
-- ADD VALUE no se usa en esta misma migración (seguro en transacción). Si Supabase
-- Studio se queja, ejecuta esta línea suelta y luego el resto.
alter type question_type add value if not exists 'clasificacion';

create type question_fase as enum ('vista', 'olfato', 'gusto', 'gamificacion');

alter table game_questions
  add column fase question_fase;

-- Backfill: las preguntas existentes (todas con subtipo) son de gamificación.
update game_questions set fase = 'gamificacion' where fase is null;

alter table game_questions
  alter column fase set not null,
  alter column type drop not null;

-- El subtipo (variedad/clasificacion/precio/añada/trivia) existe EXACTAMENTE
-- cuando la fase es de gamificación; las fases sensoriales no llevan subtipo.
alter table game_questions
  add constraint game_questions_type_only_gamificacion
  check ((fase = 'gamificacion') = (type is not null));

create index game_questions_wine_fase_idx on game_questions (wine_id, fase) where active;

-- ========== Preparación de packs: ¿cada vino tiene sus 4 fases cubiertas? ==========
-- FR-13: si falta una pregunta para una fase de un vino, el pack no está listo.
-- Herramienta de admin (lectura para el equipo logueado); no se expone a anon.
create view wines_question_readiness as
  select
    w.id as wine_id,
    w.name,
    count(distinct q.fase) as fases_cubiertas,
    (count(distinct q.fase) = 4) as ready
  from wines w
  left join game_questions q on q.wine_id = w.id and q.active
  where w.active
  group by w.id, w.name;

grant select on wines_question_readiness to authenticated;
