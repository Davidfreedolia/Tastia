-- Tastia · 0003 — Packs: tiers, componentes, ensamblado random de vinos, envíos

create table pack_tiers (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,           -- winelover / enology / deluxe
  band price_band not null,            -- basico / normal / premium
  name_es text not null, name_en text,
  tagline_es text, tagline_en text,
  bottle_price_min_cents integer,      -- rango de precio de botella para el pack random
  bottle_price_max_cents integer,
  pack_price_cents integer not null,
  wine_count integer not null default 4,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pack_tiers_updated before update on pack_tiers for each row execute function set_updated_at();

-- Accesorios incluidos por pack: bolsa de cata, copas, abridor, tarjetas de juego, sobre lacrado
create table pack_tier_components (
  id uuid primary key default gen_random_uuid(),
  pack_tier_id uuid not null references pack_tiers(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  qty integer not null default 1,
  first_order_only boolean not null default false   -- p. ej. abridor solo en el primer pedido
);
create index pack_tier_components_tier_idx on pack_tier_components (pack_tier_id);

-- Los 4 vinos random asignados a una orden (seleccionados por price_band del tier).
-- Sus notas de cata viajan solas vía wine_id (relación 1:1 con tasting_notes).
create table order_wines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  pack_tier_id uuid references pack_tiers(id) on delete set null,
  wine_id uuid not null references wines(id) on delete restrict,
  position integer not null,           -- 1..4 (orden de cata)
  created_at timestamptz not null default now()
);
create index order_wines_order_idx on order_wines (order_id);

-- Envíos (España península 24 h, etc.)
create table shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name_es text not null, name_en text,
  lead_time_hours integer,             -- 24 = península 24 h
  price_cents integer not null default 0,
  active boolean not null default true
);

-- RLS: pack_tiers + componentes + envíos son PÚBLICOS (la tienda los muestra). order_wines interno.
alter table pack_tiers enable row level security;
alter table pack_tier_components enable row level security;
alter table order_wines enable row level security;
alter table shipping_zones enable row level security;
create policy "public read pack_tiers" on pack_tiers for select using (active);
create policy "public read pack_components" on pack_tier_components for select using (true);
create policy "public read shipping" on shipping_zones for select using (active);

-- Seed: los 3 packs según la landing (precios en céntimos).
insert into pack_tiers (slug, band, name_es, name_en, tagline_es, tagline_en,
  bottle_price_min_cents, bottle_price_max_cents, pack_price_cents, sort_order) values
  ('winelover', 'basico', 'Winelover', 'Winelover', 'Para empezar a catar', 'To start tasting',
    1000, 2500, 8000, 1),
  ('enology', 'normal', 'Enology', 'Enology', 'Para subir de nivel', 'To level up',
    2500, 4000, 12000, 2),
  ('deluxe', 'premium', 'Deluxe', 'Deluxe', 'Para los que ya saben (o creen)', 'For those who know (or think they do)',
    4000, 100000, 16000, 3);

insert into shipping_zones (name_es, name_en, lead_time_hours, price_cents) values
  ('España península', 'Mainland Spain', 24, 0);
