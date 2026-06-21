// §5.8c — Tests de la lógica PURA de clasificación de vinos.
import { describe, expect, it } from "vitest";
import {
  classificationsFor,
  isPairingValid,
  WINE_CATEGORIES,
  type ClassificationOption,
} from "./wine-classification";

const CLASSIFICATIONS: ClassificationOption[] = [
  { id: "t1", category: "tinto", label_es: "Crianza", active: true },
  { id: "t2", category: "tinto", label_es: "Reserva", active: true },
  { id: "t3", category: "tinto", label_es: "Antigua (inactiva)", active: false },
  { id: "b1", category: "blanco", label_es: "Joven", active: true },
  { id: "e1", category: "espumoso", label_es: "Brut", active: true },
];

describe("WINE_CATEGORIES", () => {
  it("son las 5 categorías del enum wine_category", () => {
    expect(WINE_CATEGORIES).toEqual(["tinto", "blanco", "rosado", "espumoso", "cava"]);
  });
});

describe("classificationsFor", () => {
  it("filtra por categoría y descarta inactivas", () => {
    const result = classificationsFor(CLASSIFICATIONS, "tinto");
    expect(result.map((c) => c.id)).toEqual(["t1", "t2"]); // t3 inactiva fuera
  });

  it("devuelve las de otra categoría sin mezclar", () => {
    expect(classificationsFor(CLASSIFICATIONS, "blanco").map((c) => c.id)).toEqual(["b1"]);
    expect(classificationsFor(CLASSIFICATIONS, "espumoso").map((c) => c.id)).toEqual(["e1"]);
  });

  it("categoría sin clasificaciones → []", () => {
    expect(classificationsFor(CLASSIFICATIONS, "rosado")).toEqual([]);
    expect(classificationsFor(CLASSIFICATIONS, "cava")).toEqual([]);
  });

  it("categoría vacía o null → []", () => {
    expect(classificationsFor(CLASSIFICATIONS, "")).toEqual([]);
    expect(classificationsFor(CLASSIFICATIONS, null)).toEqual([]);
  });
});

describe("isPairingValid", () => {
  it("sin clasificar (null o '') → true", () => {
    expect(isPairingValid(CLASSIFICATIONS, "tinto", null)).toBe(true);
    expect(isPairingValid(CLASSIFICATIONS, "tinto", "")).toBe(true);
    expect(isPairingValid(CLASSIFICATIONS, "", "")).toBe(true);
  });

  it("id de la misma categoría → true (incluso si la clasificación está inactiva)", () => {
    expect(isPairingValid(CLASSIFICATIONS, "tinto", "t1")).toBe(true);
    expect(isPairingValid(CLASSIFICATIONS, "tinto", "t3")).toBe(true); // inactiva pero misma cat.
  });

  it("id de otra categoría → false", () => {
    expect(isPairingValid(CLASSIFICATIONS, "tinto", "b1")).toBe(false);
    expect(isPairingValid(CLASSIFICATIONS, "blanco", "t1")).toBe(false);
  });

  it("id inexistente → false", () => {
    expect(isPairingValid(CLASSIFICATIONS, "tinto", "zzz")).toBe(false);
  });

  it("clasificación con id pero sin categoría elegida → false", () => {
    expect(isPairingValid(CLASSIFICATIONS, "", "t1")).toBe(false);
    expect(isPairingValid(CLASSIFICATIONS, null, "t1")).toBe(false);
  });
});
