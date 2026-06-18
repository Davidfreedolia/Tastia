-- Tastia · 0005 — Branding: artes de impresión, logos, imagen de marca

create type brand_asset_type as enum ('logo', 'tarjeta_impresion', 'etiqueta', 'imagen', 'otro');

create table brand_assets (
  id uuid primary key default gen_random_uuid(),
  type brand_asset_type not null,
  name text not null,
  file_url text not null,         -- bucket Storage 'branding'
  language text,                  -- 'es' / 'en' / null
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_brand_assets_updated before update on brand_assets for each row execute function set_updated_at();

-- RLS interno (admin). Si algún arte debe ser público, se añade su política de select.
alter table brand_assets enable row level security;
