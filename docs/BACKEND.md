# Tastia · Backend (Supabase) — diseño

Objetivo: un backend **muy separado por dominios**, **bilingüe** (ES/EN), claro para un equipo de 5,
e **importable** (CSV) y administrable desde Supabase Studio mientras no haya panel propio.

## Principios

- **Un solo schema `public`** con **nombres por dominio** (sin prefijos crípticos): `clients`,
  `suppliers`, `products`, `wines`, `tasting_notes`, `inventory`, `purchases`, `orders`,
  `pack_tiers`, `game_questions`, `brand_assets`, … Cada dominio en su migración.
- **Bilingüe = columnas `_es` / `_en`** en los campos traducibles (simple, claro, fácil de importar
  por CSV). Campos no traducibles (precios, SKU, fechas) van sin sufijo.
- **Dinero en `*_cents` (integer)** para evitar errores de coma flotante.
- **RLS siempre activado.** Datos internos = sin política pública (solo `service_role` / admin).
  Lecturas públicas para la tienda (p. ej. `pack_tiers`) llevan su política `select` explícita.
- **Storage (buckets):** `products` (imágenes de vinos/productos), `branding` (logos, artes de
  impresión de tarjetas), `tasting-notes` (PDF del sobre lacrado). Privados salvo lo que deba ser público.
- **Import:** tablas planas y claras → Supabase Studio permite importar CSV directamente
  (proveedores, productos, vinos). Las imágenes se suben a Storage y se guarda su URL.

## Dominios y tablas

### 1. CRM — `clients` ✅ (migración 0001)
Captura completa: `full_name, email, phone, address_line, city, postal_code, province, country, notes`.

### 2. Proveedores — `suppliers` ✅ (0001)
Datos de contacto + dirección. Importable por CSV. `products.supplier_id` y `wines.supplier_id` apuntan aquí.

### 3. Catálogo — `products`, `wines`, `tasting_notes`, `inventory` ✅ (0001)
- `products`: todo lo que no es vino (cajas, copas, abridores, **bolsas de cata**, **tarjetas de
  juego**, **sobres lacrados**) con `kind`, `cost_cents`, `image_url`, bilingüe.
- `wines`: vino con `bottle_price_cents` y **`price_band`** (básico/normal/premium) para el pack random.
- `tasting_notes`: **1:1 con el vino**. Al meter un vino en una caja, su nota entra sola (relación por
  `wine_id`, no se copia). Incluye `pdf_url` del sobre lacrado.
- `inventory`: stock por producto o vino.

### 4. Finanzas — migración **0002** (siguiente)
- `purchases` + `purchase_items` — compras a proveedores (vinos, cajas, copas…).
- `supplier_invoices` — facturación de proveedores (`number, date, amount_cents, file_url, status`).
- `orders` + `order_items` — ventas a clientes (enlaza `clients`, dirección de envío, `stripe_session_id`,
  `status`, `total_cents`). Es la base de "compra y ventas".
- Vista/saldo financiero = compras (gasto) vs órdenes (ingreso). Informes a partir de ahí.

### 5. Packs — migración **0003**
- `pack_tiers` — definición de cada pack: `tier` (basico/normal/premium), `name_es/en`
  (Winelover/Enology/Deluxe), `bottle_price_min/max_cents`, `pack_price_cents`, `wine_count` (4),
  `active`. **Lectura pública** (la tienda los muestra).
- `pack_tier_components` — accesorios incluidos por pack (bolsa de cata, copas, abridor *solo 1er
  pedido*, tarjetas de juego, sobre lacrado) → `product_id` + `qty` + `first_order_only`.
- `order_wines` — los **4 vinos random** asignados a una orden (selección por `price_band` del tier).
  Guarda qué vinos se enviaron → sus notas de cata viajan solas vía `wine_id`.
- Envío: `shipping_zones` (España península / Baleares / …) con `lead_time` (24 h península) y disponibilidad.

### 6. Gamificación — migración **0004**
- `avatars` — config del sommelier: `name`, `provider` (heygen/anam/tavus), `voice_id`,
  `persona_prompt_es/en`, `active`.
- `game_questions` — `wine_id?`, `type` (variedad/D.O./precio/añada/trivia), `text_es/en`,
  `options` (jsonb), `correct`, `points`. Gestionable desde admin.
- (Persistencia de sesiones de cata — opcional — cuando se quiera histórico/ranking real.)

### 7. Branding — migración **0005**
- `brand_assets` — `type` (logo/tarjeta_impresion/etiqueta/imagen), `name`, `file_url` (bucket
  `branding`), `language?`, `notes`. Carpeta de marca ordenada y guardada.

## Cómo aplicar las migraciones
1. **Opción rápida (recomendada ahora):** Supabase Studio → **SQL Editor** → pegar el contenido del
   archivo `supabase/migrations/*.sql` en orden y ejecutar.
2. **Opción CLI** (cuando la CLI esté logada en la cuenta dueña del proyecto `tyuehzsqvjpjysxdihsh`):
   `supabase link --project-ref tyuehzsqvjpjysxdihsh` y luego `supabase db push`.

## Pendiente / decisiones
- Panel de **admin** (auth + rol) para crear productos, importar proveedores, subir imágenes, gestionar
  preguntas y branding. De momento se opera desde Supabase Studio.
- Confirmar nombres de packs (básico/normal/premium ↔ Winelover/Enology/Deluxe) y rangos de precio.
