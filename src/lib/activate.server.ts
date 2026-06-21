import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";
import { z } from "zod";

import type { Database } from "./database.types";
import { normalizeAccessCode } from "./activate";

// §Activar — Validación SERVER-ONLY del access_code. El cuerpo del .handler corre
// solo en el servidor (Vercel/Nitro): la SUPABASE_SERVICE_ROLE_KEY se lee con
// process.env por-request y NUNCA llega al cliente. Mismo patrón que
// checkout.server.ts: resultado discriminado + fallback honesto sin configurar.

// Discriminated result so the client can branch safely.
export type ValidateAccessResult =
  | { configured: false }
  | { ok: true; roomCode: string }
  | { ok: false };

export const validateAccessCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ code: z.string().min(1).max(32) }))
  .handler(async ({ data }): Promise<ValidateAccessResult> => {
    const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
    const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
    // Fallback honesto: sin service key (o sin URL) NO fingimos validez.
    if (!url || !svc) {
      return { configured: false };
    }

    const code = normalizeAccessCode(data.code);
    if (!code) return { ok: false };

    try {
      // Cliente ADMIN (service role): lee `orders` saltando RLS. Solo servidor.
      const admin = createClient<Database>(url, svc);
      const { data: order, error } = await admin
        .from("orders")
        .select("status")
        .eq("access_code", code)
        .eq("status", "pagado")
        .maybeSingle();
      if (error) {
        // Loguea el detalle en el servidor; al cliente solo "inválido" (no filtrar internals).
        console.error("[activar]", error);
        return { ok: false };
      }
      return order ? { ok: true, roomCode: code } : { ok: false };
    } catch (err) {
      console.error("[activar]", err);
      return { ok: false };
    }
  });
