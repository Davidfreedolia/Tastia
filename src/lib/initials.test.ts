// Tests del helper `initials(name)` (§5.11) — iniciales del avatar por defecto.
// Cubre: vacío, una palabra, varias palabras, espacios extra/al borde y mayúsculas.
import { describe, expect, it } from "vitest";
import { initials } from "./session";

describe("initials (§5.11)", () => {
  it("cadena vacía o solo espacios → ''", () => {
    expect(initials("")).toBe("");
    expect(initials("   ")).toBe("");
  });

  it("una sola palabra → su inicial en mayúscula", () => {
    expect(initials("ana")).toBe("A");
    expect(initials("Bruno")).toBe("B");
  });

  it("varias palabras → inicial de la primera y la última, en mayúsculas", () => {
    expect(initials("Ana García")).toBe("AG");
    expect(initials("juan pablo díaz")).toBe("JD"); // primera + última, ignora la del medio
  });

  it("ignora espacios extra al inicio, al final y entre palabras", () => {
    expect(initials("  Ana   García  ")).toBe("AG");
    expect(initials("\tlucía\n")).toBe("L");
  });

  it("devuelve 1–2 letras como máximo", () => {
    expect(initials("a b c d e").length).toBeLessThanOrEqual(2);
    expect(initials("solo").length).toBe(1);
  });

  it("nombre que empieza por emoji → glifo completo (no medio par subrogado)", () => {
    // 🍷 es astral (par subrogado UTF-16): `charAt(0)` lo partiría; debe salir entero.
    const grape = initials("🍷ana");
    expect(grape).toBe("🍷");
    expect(Array.from(grape)).toHaveLength(1); // un solo punto de código, no media mitad
    // Con varias palabras toma el primer punto de código de la primera y la última.
    expect(initials("🍷ana 🥇bruno")).toBe("🍷🥇");
  });
});
