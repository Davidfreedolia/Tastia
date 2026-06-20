-- Tastia · 0010 — Taxonomía de vinos (§5.7 / FR-14)
--
-- Clasificación jerárquica para etiquetar cada vino y alimentar la Pregunta de
-- clasificación de la fase de gamificación. La Opción correcta sale de la taxonomía
-- del vino; los Distractores, de otras entradas de la MISMA categoría (FR-12).
--
-- Modelo: un catálogo público `wine_classifications` (category + slug + etiqueta
-- bilingüe) + un vínculo `wines.classification_id`. El catálogo se siembra con el
-- árbol del PRD §5.7. Nota: Cava mezcla dos ejes (crianza + dulzor) y Espumoso el
-- color; aquí se siembran como entradas de su categoría y el vino enlaza UNA
-- clasificación primaria (suficiente para la pregunta del MVP). Un segundo eje
-- (dulzor/color) se puede añadir como columna extra en el futuro sin romper esto.

create type wine_category as enum ('tinto', 'blanco', 'rosado', 'espumoso', 'cava');

create table wine_classifications (
  id uuid primary key default gen_random_uuid(),
  category wine_category not null,
  slug text not null,                       -- clave estable para pools de distractores
  label_es text not null,
  label_en text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category, slug)
);
create index wine_classifications_category_idx on wine_classifications (category) where active;

-- Catálogo de lectura pública (la tienda/landing y el juego lo consultan);
-- escritura solo admins.
alter table wine_classifications enable row level security;
create policy "wine_classifications public read" on wine_classifications
  for select using (true);
create policy "admin_all_wine_classifications" on wine_classifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Vincular cada vino con su categoría + clasificación.
alter table wines
  add column category wine_category,
  add column classification_id uuid references wine_classifications(id) on delete set null;
create index wines_category_idx on wines (category) where active;

-- ========== Seed del árbol del PRD §5.7 ==========
insert into wine_classifications (category, slug, label_es, label_en) values
  -- Tinto
  ('tinto', 'joven',                 'Joven',                 'Young'),
  ('tinto', 'cosecha',               'Cosecha',               'Vintage'),
  ('tinto', 'roble',                 'Roble',                 'Oak'),
  ('tinto', 'crianza',               'Crianza',               'Crianza'),
  ('tinto', 'reserva',               'Reserva',               'Reserva'),
  ('tinto', 'gran_reserva',          'Gran Reserva',          'Gran Reserva'),
  -- Blanco
  ('blanco', 'barrica_crianza',      'Barrica · Crianza',     'Barrel · Crianza'),
  ('blanco', 'barrica_reserva',      'Barrica · Reserva',     'Barrel · Reserva'),
  ('blanco', 'barrica_gran_reserva', 'Barrica · Gran Reserva','Barrel · Gran Reserva'),
  ('blanco', 'lias_con_battonage',   'Lías con battonage',    'Lees with bâtonnage'),
  ('blanco', 'lias_sin_battonage',   'Lías sin battonage',    'Lees without bâtonnage'),
  ('blanco', 'deposito_inerte',      'Depósito inerte',       'Inert tank'),
  ('blanco', 'velo_flor',            'Velo de flor',          'Flor veil'),
  -- Rosado
  ('rosado', 'joven',                'Joven',                 'Young'),
  ('rosado', 'roble',                'Roble',                 'Oak'),
  ('rosado', 'lias_con_battonage',   'Lías con battonage',    'Lees with bâtonnage'),
  ('rosado', 'lias_sin_battonage',   'Lías sin battonage',    'Lees without bâtonnage'),
  -- Espumoso (eje color)
  ('espumoso', 'color_blanco',       'Blanco',                'White'),
  ('espumoso', 'color_rosa',         'Rosa',                  'Rosé'),
  -- Cava (eje crianza)
  ('cava', 'crianza',                'Crianza',               'Crianza'),
  ('cava', 'reserva',                'Reserva',               'Reserva'),
  ('cava', 'gran_reserva',           'Gran Reserva',          'Gran Reserva'),
  ('cava', 'paraje_calificado',      'Paraje Calificado',     'Qualified Single Estate'),
  -- Cava (eje dulzor)
  ('cava', 'brut_nature',            'Brut Nature',           'Brut Nature'),
  ('cava', 'extra_brut',             'Extra Brut',            'Extra Brut'),
  ('cava', 'seco',                   'Seco',                  'Dry')
on conflict (category, slug) do nothing;
