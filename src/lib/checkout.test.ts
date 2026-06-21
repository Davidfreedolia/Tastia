import { describe, it, expect } from "vitest";
import { PACK_CATALOG, cartAmountCents } from "./checkout";

describe("PACK_CATALOG", () => {
  it("has the 3 real packs with coherent prices", () => {
    expect(PACK_CATALOG.winelover.amount_cents).toBe(8000); // 80€
    expect(PACK_CATALOG.enology.amount_cents).toBe(12000); // 120€
    expect(PACK_CATALOG.deluxe.amount_cents).toBe(16000); // 160€
    expect(Object.keys(PACK_CATALOG)).toHaveLength(3);
  });

  it("every entry has a name and a positive integer amount_cents", () => {
    for (const [id, entry] of Object.entries(PACK_CATALOG)) {
      expect(entry.name, id).toBeTruthy();
      expect(Number.isInteger(entry.amount_cents), id).toBe(true);
      expect(entry.amount_cents, id).toBeGreaterThan(0);
    }
  });
});

describe("cartAmountCents", () => {
  it("recomputes a single item total", () => {
    expect(cartAmountCents([{ id: "winelover", qty: 1 }])).toBe(8000);
  });

  it("recomputes total across several items and quantities", () => {
    const items = [
      { id: "winelover", qty: 2 }, // 16000
      { id: "enology", qty: 1 }, // 12000
      { id: "deluxe", qty: 3 }, // 48000
    ];
    expect(cartAmountCents(items)).toBe(16000 + 12000 + 48000);
  });

  it("IGNORES any price sent by the client (only id + qty are used)", () => {
    // Item carries a forged cheap price; server must still charge catalog price.
    const tampered = [
      { id: "deluxe", qty: 1, price: 1, amount_cents: 1, name: "free!" },
    ] as unknown as Parameters<typeof cartAmountCents>[0];
    expect(cartAmountCents(tampered)).toBe(16000);
  });

  it("throws on an unknown pack id (never charge an unknown id)", () => {
    expect(() => cartAmountCents([{ id: "ghost-pack", qty: 1 }])).toThrow(
      /Unknown pack id/,
    );
  });

  it("ignores items with qty <= 0", () => {
    expect(
      cartAmountCents([
        { id: "winelover", qty: 0 },
        { id: "enology", qty: -3 },
        { id: "deluxe", qty: 1 },
      ]),
    ).toBe(16000);
  });

  it("returns 0 for an empty cart", () => {
    expect(cartAmountCents([])).toBe(0);
  });
});
