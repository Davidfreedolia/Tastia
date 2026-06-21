import { describe, expect, it } from "vitest";

import { normalizeAccessCode } from "./activate";

describe("normalizeAccessCode", () => {
  it("recorta espacios externos", () => {
    expect(normalizeAccessCode("  ABC123  ")).toBe("ABC123");
  });

  it("pasa a mayúsculas", () => {
    expect(normalizeAccessCode("abc123")).toBe("ABC123");
  });

  it("elimina espacios internos", () => {
    expect(normalizeAccessCode("AB C1 23")).toBe("ABC123");
  });

  it("combina trim + mayúsculas + colapso de espacios", () => {
    expect(normalizeAccessCode("  ab c1\t23 ")).toBe("ABC123");
  });

  it("es idempotente: f(f(x)) === f(x)", () => {
    const once = normalizeAccessCode("  ab c1 23 ");
    expect(normalizeAccessCode(once)).toBe(once);
  });

  it("cadena vacía → \"\"", () => {
    expect(normalizeAccessCode("")).toBe("");
  });

  it("solo espacios → \"\"", () => {
    expect(normalizeAccessCode("   \t  ")).toBe("");
  });
});
