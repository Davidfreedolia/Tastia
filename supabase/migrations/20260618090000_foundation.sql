-- Tastia · 0001 — Fundación + Catálogo + CRM + Proveedores + Inventario
-- Bilingüe: campos traducibles con sufijos _es / _en.
-- Aplicar en Supabase (SQL Editor) o, con la CLI logada en la cuenta dueña del proyecto:
--   supabase db push
-- Dominio siguiente: 0002 finanzas, 0003 packs, 0004 gamificación, 0005 branding.

create extension if not exists pgcrypto;

-- updated_at automático
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- Enums ----------
create type product_kind as enum (
  'vino', 'caja', 'copa', 'abridor', 'bolsa_cata', 'tarjetas_juego', 'sobre_lacrado', 'otro'
);
create type price_band as enum ('basico', 'normal', 'premium'); -- Winelover / Enology / Deluxe

-- ========== CRM: clientes (captura completa de dirección + teléfono) ==========
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  address_line text,
  city text,
  postal_code text,
  province text,
  country text default 'España',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_clients_updated before update on clients
  for each row execute function set_updated_at();

-- ========== Proveedores (importables por CSV) ==========
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address_line text, city text, postal_code text, province text, country text default 'España',
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_suppliers_updated before update on suppliers
  for each row execute function set_updated_at();

-- ========== Catálogo: productos no-vino (cajas, copas, abridores, bolsas, tarjetas, sobres…) ==========
create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  kind product_kind not null,
  name_es text not null,
  name_en text,
  description_es text,
  description_en text,
  supplier_id uuid references suppliers(id) on delete set null,
  cost_cents integer,                 -- coste de compra
  image_url text,                     -- bucket Storage 'products'
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_products_updated before update on products
  for each row execute function set_updated_at();
create index products_kind_idx on products (kind);
create index products_supplier_idx on products (supplier_id);

-- ========== Vinos (catálogo específico, con banda de precio para packs random) ==========
create table wines (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  bodega text,
  region_es text,                     -- D.O.
  region_en text,
  grape text,                         -- variedad
  vintage integer,
  bottle_price_cents integer,         -- PVP botella
  price_band price_band,              -- básico/normal/premium → selección random del pack
  cost_cents integer,                 -- coste de compra
  supplier_id uuid references suppliers(id) on delete set null,
  image_url text,                     -- bucket Storage 'products'
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_wines_updated before update on wines
  for each row execute function set_updated_at();
create index wines_band_idx on wines (price_band) where active;
create index wines_supplier_idx on wines (supplier_id);

-- ========== Notas de cata (1:1 con el vino → viaja automática a la caja) ==========
-- Al meter un vino en un pack, su nota entra sola: la relación es por wine_id, no se copia.
create table tasting_notes (
  wine_id uuid primary key references wines(id) on delete cascade,
  vista_es text, vista_en text,
  nariz_es text, nariz_en text,
  boca_es text, boca_en text,
  maridaje_es text, maridaje_en text,
  curiosidad_es text, curiosidad_en text,
  pdf_url text,                       -- sobre lacrado (bucket Storage 'tasting-notes')
  updated_at timestamptz not null default now()
);
create trigger trg_tasting_notes_updated before update on tasting_notes
  for each row execute function set_updated_at();

-- ========== Inventario (stock de productos y vinos) ==========
create table inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  wine_id uuid references wines(id) on delete cascade,
  qty_on_hand integer not null default 0,
  location text,
  updated_at timestamptz not null default now(),
  constraint inventory_one_target check (num_nonnulls(product_id, wine_id) = 1)
);
create trigger trg_inventory_updated before update on inventory
  for each row execute function set_updated_at();

-- ========== RLS ==========
-- Todo dato interno: RLS activado SIN políticas públicas → solo el backend (service_role) o el
-- futuro panel de admin acceden. Las lecturas públicas para la tienda (p. ej. pack_tiers) se
-- añaden con su política en la migración de packs.
alter table clients       enable row level security;
alter table suppliers     enable row level security;
alter table products      enable row level security;
alter table wines         enable row level security;
alter table tasting_notes enable row level security;
alter table inventory     enable row level security;
