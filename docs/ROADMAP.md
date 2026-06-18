# Tastia · Roadmap

Equipo de 5 · decisiones por consenso. Estado a 2026-06-18.

## ✅ Hecho (desplegado en https://tastia-eight.vercel.app)
- Landing bilingüe ES/EN (packs, cómo funciona, ranking, legal, age-gate).
- Cata en vivo multijugador (Supabase Realtime): `/room/:code` + `/play/:code`.
- Revelación + puntuación + flujo guiado del host + podio final.

## 🔜 En curso — Backend (Supabase)
Diseño en `docs/BACKEND.md`. Migraciones por dominio:
- **0001 Fundación** ✅ — clientes, proveedores, catálogo (productos + vinos + notas de cata), inventario.
- **0002 Finanzas** — compras, facturación de proveedores, órdenes/ventas.
- **0003 Packs** — tiers (básico/normal/premium), componentes (bolsa, copas, abridor, tarjetas, sobre),
  ensamblado random de 4 vinos por banda de precio, envío (península 24 h).
- **0004 Gamificación** — avatar (proveedor + voz + persona), banco de preguntas.
- **0005 Branding** — artes de impresión, logos, imagen de marca (Storage).

## 🧩 Funcional / producto
- **Avatar del sommelier** (el "wow"): decidir proveedor (HeyGen / Anam / Tavus) + API key → iframe en la Sala.
- Sustituir los 4 vinos de muestra por reales.
- Panel de **admin** (crear productos, importar proveedores por CSV, subir imágenes, gestionar preguntas/branding).
- Checkout real con Stripe (ahora es stub) + recibo por email + generación de QR de la sala.
- Limpiar copy inventada de la landing (testimonios/ranking) → marcar lo no construido como "Próximamente".

## 🎯 Decisiones abiertas del equipo
- Nombres y rangos de precio definitivos de los packs.
- Proveedor de avatar + presupuesto (coste por minuto).
- Logística real (almacén, transportista, zonas de envío).
