# Tastia · Roadmap

Equipo de 5 · decisiones por consenso. Estado a 2026-06-23.

> Foto de estado completa y maestra: **`docs/ESTADO-COMPLETO-Tastia.md`** (roadmap detallado en §6).
> Este archivo es el resumen de secuencia.

## ✅ Hecho
- **Bucle de negocio de punta a punta** (comprar → pedido → recibo con QR → activar sala → jugar → podio),
  con Stripe en modo **TEST/demo** (sin claves LIVE, sin cobro real).
- **Juego desde la BD (§5.6b):** 3 edge functions `quiz-bootstrap`/`quiz-close`/`session-finish`
  **desplegadas y verificadas en prod** (23-jun). Preguntas coherentes (derivación FR-12 con distractores
  del **mismo atributo**); anti-spoiler (las respuestas viven solo en `quiz-close`).
- **Admin del juego** (ajustes · banco de preguntas · clasificación de vinos) en `/admin`.
- **Esquema + RLS del juego + migración `0013`** aplicados/verificados en prod.
- **Landing pública** (en `dev`): retirado el gate "en construcción"; `/admin` sigue protegido.
- i18n ES/CA/EN/FR.

## ⏳ Siguiente (vía crítica)
1. **Validación end-to-end** con datos reales (Ignacio): compra → activar → sala → juego desde BD → podio,
   multijugador, admin.
2. **Publicar `dev → main`** para que la landing pública (y el resto del carril) lleguen a tastia.org.

## ⛔ Bloqueado a propósito (no son olvidos)
- **§5.9 estado de sesión en vivo / reloj en servidor** — espera la **pregunta de cliente #6**
  (¿la sesión pausa+reanuda al recaer el host?). Specs congeladas: estado en vivo efímero (presence+broadcast).
- **Ficha de cata server-side para el avatar** — espera el contrato/consumidor del avatar (Andrés).

## 🎯 Decisiones abiertas / negocio (David)
- **Stripe:** se queda en **TEST/demo** (sin LIVE, sin cobro real).
- **Email §B2:** causa raíz arreglada en código; falta dominio verificado en Resend + `RESEND_FROM` en Vercel.
- **Avatar-sommelier** (Andrés): proveedor (HeyGen / Anam / Tavus) + voz ElevenLabs + coste por minuto.
- Datos legales (dirección real, autónomo vs S.L.), pricing y logística definitivos.
