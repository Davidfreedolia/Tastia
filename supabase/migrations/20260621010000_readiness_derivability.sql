-- Tastia · 0013 — Readiness por DERIVABILIDAD (corrige la vista de 0011)
--
-- La vista 0011 contaba preguntas autoradas en `game_questions`, pero las preguntas
-- se DERIVAN en la edge function (game_questions está vacía) → mostraba todos los
-- vinos como "no listos". Se redefine para medir si cada vino tiene los DATOS para
-- derivar sus 4 preguntas (o ya tiene una autorada). MISMAS columnas
-- (wine_id, name, fases_cubiertas, ready) → el panel de admin (§5.8a) no cambia.
--
-- Una fase está "cubierta" si hay pregunta autorada O es derivable:
--   vista        → nota de cata de vista
--   olfato       → nota de cata de nariz
--   gusto        → nota de cata de boca
--   gamificacion → variedad (grape) Y clasificación presentes (la de precio
--                  siempre deriva, así que no se exige)

drop view if exists wines_question_readiness;

create view wines_question_readiness as
with authored as (
  select wine_id, array_agg(distinct fase::text) as fases
  from game_questions
  where active and wine_id is not null
  group by wine_id
),
calc as (
  select
    w.id   as wine_id,
    w.name as name,
    (
      (case when 'vista' = any(coalesce(a.fases, '{}'::text[]))
              or (t.vista_es is not null and btrim(t.vista_es) <> '') then 1 else 0 end)
    + (case when 'olfato' = any(coalesce(a.fases, '{}'::text[]))
              or (t.nariz_es is not null and btrim(t.nariz_es) <> '') then 1 else 0 end)
    + (case when 'gusto' = any(coalesce(a.fases, '{}'::text[]))
              or (t.boca_es is not null and btrim(t.boca_es) <> '') then 1 else 0 end)
    + (case when 'gamificacion' = any(coalesce(a.fases, '{}'::text[]))
              or (w.grape is not null and btrim(w.grape) <> '' and w.classification_id is not null)
            then 1 else 0 end)
    ) as fases_cubiertas
  from wines w
  left join tasting_notes t on t.wine_id = w.id
  left join authored a on a.wine_id = w.id
  where w.active
)
select wine_id, name, fases_cubiertas, (fases_cubiertas = 4) as ready
from calc;

grant select on wines_question_readiness to authenticated;
