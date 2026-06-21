import process from "node:process";

// §Stripe-B2 — Construcción PURA del email de recibo. Sin I/O ni red:
// el webhook (src/routes/api/stripe-webhook.ts) genera el QR y hace el envío
// (Resend); aquí solo se construye el objeto del email de forma determinista
// y testeable. Los valores (importe/email/access_code/URLs) vienen de Stripe o
// de datos propios, no de input libre del cliente.

export type ReceiptEmail = {
  from: string;
  to: string;
  subject: string;
  html: string;
};

/**
 * Construye el email de recibo de una cata Tastia. PURO: no envía nada, solo
 * devuelve `{ from, to, subject, html }`.
 *
 * - `from` se lee de `RESEND_FROM` (server-only) con un default verificable.
 * - El HTML incluye el importe, el `access_code` destacado, el enlace de
 *   activación en texto (siempre funciona aunque el cliente bloquee imágenes)
 *   y el QR embebido como `<img>`.
 * - Si `livemode` es falso (pago de prueba), añade una nota honesta.
 */
export function buildReceiptEmail(args: {
  to: string;
  accessCode: string;
  totalCents: number;
  activationUrl: string;
  qrDataUrl: string;
  livemode: boolean;
}): ReceiptEmail {
  const { to, accessCode, totalCents, activationUrl, qrDataUrl, livemode } =
    args;

  const from = process.env.RESEND_FROM ?? "Tastia <onboarding@resend.dev>";
  const subject = "Tu cata Tastia — recibo y acceso";
  const amount = (totalCents / 100).toFixed(2);

  const testNote = livemode
    ? ""
    : `<p style="margin:16px 0;padding:12px 16px;background:#fff8e1;border:1px solid #f0d98a;border-radius:8px;color:#7a5b00;">
        ⚠️ Pago de PRUEBA — no se ha cobrado dinero real.
      </p>`;

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a;line-height:1.5;max-width:560px;margin:0 auto;padding:24px;">
    <h1 style="font-size:22px;margin:0 0 8px;">Gracias por tu compra</h1>
    <p style="margin:0 0 16px;color:#555;">Aquí tienes el recibo y el acceso a tu cata Tastia.</p>

    <p style="margin:0 0 4px;color:#555;">Importe pagado</p>
    <p style="font-size:20px;font-weight:600;margin:0 0 16px;">${amount} €</p>

    ${testNote}

    <p style="margin:0 0 4px;color:#555;">Tu código de acceso</p>
    <p style="font-size:28px;font-weight:700;letter-spacing:3px;margin:0 0 16px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;">${accessCode}</p>

    <p style="margin:0 0 8px;">Activa tu cata desde este enlace:</p>
    <p style="margin:0 0 16px;"><a href="${activationUrl}">${activationUrl}</a></p>

    <p style="margin:0 0 8px;color:#555;">O escanea este código QR:</p>
    <p style="margin:0 0 16px;"><img src="${qrDataUrl}" alt="QR de acceso" width="180" /></p>

    <p style="margin:24px 0 0;font-size:13px;color:#888;">Tastia — cata de vinos</p>
  </body>
</html>`;

  return { from, to, subject, html };
}
