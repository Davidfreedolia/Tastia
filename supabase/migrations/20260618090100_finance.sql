-- Tastia · 0002 — Finanzas: compras a proveedores, facturación, ventas (órdenes)

create type purchase_status as enum ('borrador', 'pedido', 'recibido', 'pagado');
create type invoice_status  as enum ('pendiente', 'pagada', 'vencida');
create type order_status    as enum ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado');

-- ===== Compras a proveedores (vinos, cajas, copas, abridores…) =====
create table purchases (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete restrict,
  purchase_date date not null default current_date,
  status purchase_status not null default 'borrador',
  invoice_number text,
  total_cents integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_purchases_updated before update on purchases for each row execute function set_updated_at();
create index purchases_supplier_idx on purchases (supplier_id);

create table purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  wine_id uuid references wines(id) on delete set null,
  description text,
  qty integer not null default 1,
  unit_cost_cents integer not null default 0,
  constraint purchase_items_target check (num_nonnulls(product_id, wine_id) <= 1)
);
create index purchase_items_purchase_idx on purchase_items (purchase_id);

-- ===== Facturación de proveedores =====
create table supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers(id) on delete restrict,
  number text,
  issue_date date,
  due_date date,
  amount_cents integer not null default 0,
  status invoice_status not null default 'pendiente',
  file_url text,                       -- factura PDF (Storage)
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_supplier_invoices_updated before update on supplier_invoices for each row execute function set_updated_at();
create index supplier_invoices_supplier_idx on supplier_invoices (supplier_id);

-- ===== Ventas: órdenes de clientes (compra directa, sin registro) =====
create table orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete set null,
  email text not null,
  phone text,
  -- dirección de envío (snapshot del pedido)
  ship_name text, ship_address_line text, ship_city text, ship_postal_code text,
  ship_province text, ship_country text default 'España',
  status order_status not null default 'pendiente',
  subtotal_cents integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents integer not null default 0,
  stripe_session_id text,
  access_code text unique,             -- código del QR de la sala de cata
  is_first_order boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_orders_updated before update on orders for each row execute function set_updated_at();
create index orders_client_idx on orders (client_id);
create index orders_status_idx on orders (status);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  pack_tier_id uuid,                   -- referencia suave al pack (tabla en 0003); el precio se congela abajo
  product_id uuid references products(id) on delete set null,
  description text not null,           -- snapshot de lo comprado (no cambia si luego cambia el catálogo)
  qty integer not null default 1,
  unit_price_cents integer not null default 0
);
create index order_items_order_idx on order_items (order_id);

-- RLS: finanzas nunca es público; las órdenes se gestionan vía service_role / edge functions.
alter table purchases enable row level security;
alter table purchase_items enable row level security;
alter table supplier_invoices enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
