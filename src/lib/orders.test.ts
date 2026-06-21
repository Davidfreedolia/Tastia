import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { generateAccessCode, orderInsertFromSession } from "./orders";

const ALLOWED = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]+$/;

describe("generateAccessCode", () => {
  it("returns an 8-character code", () => {
    expect(generateAccessCode()).toHaveLength(8);
  });

  it("uses only the non-ambiguous alphabet (no 0/O/1/I/L)", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode();
      expect(code, code).toMatch(ALLOWED);
    }
  });

  it("two calls produce different codes (no fixed value)", () => {
    expect(generateAccessCode()).not.toBe(generateAccessCode());
  });
});

// Helper: builds a minimal Checkout Session cast to the Stripe type.
// orderInsertFromSession only reads a handful of fields, so we feed a loose
// object literal and cast through unknown (no Stripe namespace access needed).
function session(overrides: Record<string, unknown>): Stripe.Checkout.Session {
  return overrides as unknown as Stripe.Checkout.Session;
}

describe("orderInsertFromSession", () => {
  it("maps amounts, email, status and stripe_session_id from the session", () => {
    const code = "ABCD2345";
    const result = orderInsertFromSession(
      session({
        id: "cs_test_123",
        customer_details: { email: "buyer@example.com" },
        customer_email: "should-not-win@example.com",
        amount_subtotal: 12000,
        amount_total: 12500,
        total_details: { amount_shipping: 500 },
      }),
      code,
    );

    expect(result).toEqual({
      email: "buyer@example.com",
      subtotal_cents: 12000,
      total_cents: 12500,
      shipping_cents: 500,
      status: "pagado",
      stripe_session_id: "cs_test_123",
      access_code: code,
    });
  });

  it("falls back to customer_email when customer_details has no email", () => {
    const result = orderInsertFromSession(
      session({
        id: "cs_test_456",
        customer_details: { email: null },
        customer_email: "fallback@example.com",
        amount_subtotal: 8000,
        amount_total: 8000,
      }),
      "EFGH6789",
    );

    expect(result.email).toBe("fallback@example.com");
  });

  it("uses an empty string when no email is present anywhere", () => {
    const result = orderInsertFromSession(
      session({
        id: "cs_test_789",
        amount_subtotal: 16000,
        amount_total: 16000,
      }),
      "JKMN2345",
    );

    expect(result.email).toBe("");
  });

  it("defaults missing amounts to 0", () => {
    const result = orderInsertFromSession(
      session({ id: "cs_test_000" }),
      "PQRS2345",
    );

    expect(result.subtotal_cents).toBe(0);
    expect(result.total_cents).toBe(0);
    expect(result.shipping_cents).toBe(0);
    expect(result.status).toBe("pagado");
    expect(result.stripe_session_id).toBe("cs_test_000");
  });
});
