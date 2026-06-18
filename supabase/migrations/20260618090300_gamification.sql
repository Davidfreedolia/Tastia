-- Tastia · 0004 — Gamificación: avatar del sommelier + banco de preguntas

-- Config del sommelier-avatar (proveedor + voz + persona). Gestionable desde admin.
create table avatars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text,                  -- heygen / anam / tavus
  external_avatar_id text,        -- id del avatar en el proveedor
  voice_id text,                  -- voz (ElevenLabs / proveedor)
  persona_prompt_es text,
  persona_prompt_en text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_avatars_updated before update on avatars for each row execute function set_updated_at();

create type question_type as enum ('variedad', 'denominacion', 'precio', 'anada', 'trivia');

create table game_questions (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid references wines(id) on delete set null,
  type question_type not null,
  text_es text not null, text_en text,
  options jsonb,                  -- opciones de respuesta (si aplica)
  correct_answer text,            -- respuesta correcta — NO exponer al cliente
  points integer not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_game_questions_updated before update on game_questions for each row execute function set_updated_at();
create index game_questions_wine_idx on game_questions (wine_id);

-- RLS interno: las preguntas llevan la respuesta correcta → nunca públicas.
-- Se sirven al cliente vía edge function (sin la respuesta) y la puntuación se calcula en el backend.
alter table avatars enable row level security;
alter table game_questions enable row level security;
