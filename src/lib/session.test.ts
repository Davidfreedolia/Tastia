// Tests de la transición pura `advanceState()` (§5.1). Cubren la I/O & Edge-Case Matrix:
// lobby → (por vino: [vista,olfato,gusto,gamificacion] cada una {quiz→reveal} → wine_podium) ×4
//        → final_podium.
import { describe, expect, it } from "vitest";
import {
  advanceState,
  FASES,
  initialRoomState,
  WINE_COUNT,
  type Fase,
  type RoomState,
  type Stage,
  type Step,
} from "./session";

/** Construye un estado de juego concreto, conservando scores/updatedAt. */
function playing(wineIndex: number, fase: Fase, step: Step): RoomState {
  return { stage: "playing", wineIndex, fase, step, scores: {}, updatedAt: 0 };
}

describe("advanceState — I/O & Edge-Case Matrix (§5.1)", () => {
  it("Empezar: lobby → playing, vino 1/4, fase vista, step quiz", () => {
    const next = advanceState(initialRoomState());
    expect(next.stage).toBe<Stage>("playing");
    expect(next.wineIndex).toBe(0);
    expect(next.fase).toBe<Fase>("vista");
    expect(next.step).toBe<Step>("quiz");
  });

  it("Avanzar en quiz: quiz → reveal (misma fase)", () => {
    const next = advanceState(playing(0, "vista", "quiz"));
    expect(next.stage).toBe<Stage>("playing");
    expect(next.fase).toBe<Fase>("vista");
    expect(next.step).toBe<Step>("reveal");
  });

  it("Avanzar en reveal (fase < gamificación): → siguiente fase, step quiz", () => {
    expect(advanceState(playing(0, "vista", "reveal"))).toMatchObject({
      stage: "playing",
      fase: "olfato",
      step: "quiz",
    });
    expect(advanceState(playing(0, "olfato", "reveal"))).toMatchObject({
      stage: "playing",
      fase: "gusto",
      step: "quiz",
    });
    expect(advanceState(playing(0, "gusto", "reveal"))).toMatchObject({
      stage: "playing",
      fase: "gamificacion",
      step: "quiz",
    });
  });

  it("Avanzar en gamificación/reveal: → wine_podium (ranking parcial del vino N)", () => {
    const next = advanceState(playing(0, "gamificacion", "reveal"));
    expect(next.stage).toBe<Stage>("wine_podium");
    expect(next.wineIndex).toBe(0); // N se conserva para saber qué vino se cerró
  });

  it("Avanzar en wine_podium, N<4: → vino N+1, vista, quiz", () => {
    const next = advanceState({ ...playing(0, "gamificacion", "reveal"), stage: "wine_podium" });
    expect(next).toMatchObject({ stage: "playing", wineIndex: 1, fase: "vista", step: "quiz" });
  });

  it("Avanzar en wine_podium, N=4 (último): → final_podium", () => {
    const last = WINE_COUNT - 1;
    const next = advanceState({ ...playing(last, "gamificacion", "reveal"), stage: "wine_podium" });
    expect(next.stage).toBe<Stage>("final_podium");
  });

  it("final_podium es terminal: avanzar no cambia el estado", () => {
    const final: RoomState = { ...initialRoomState(), stage: "final_podium", wineIndex: WINE_COUNT - 1 };
    expect(advanceState(final)).toEqual(final);
  });

  it("es pura: no muta el estado de entrada", () => {
    const input = playing(0, "vista", "quiz");
    const snapshot = JSON.parse(JSON.stringify(input));
    advanceState(input);
    expect(input).toEqual(snapshot);
  });

  it("transporta scores sin tocarlos (contrato §5.5)", () => {
    const scores = { a: 30, b: 10 };
    const next = advanceState({ ...playing(0, "vista", "quiz"), scores });
    expect(next.scores).toEqual(scores);
  });

  it("recorrido completo: lobby → 4 vinos × 4 fases (quiz/reveal) + podio parcial → final_podium", () => {
    let s = initialRoomState();
    s = advanceState(s); // → playing, vino 0, vista/quiz
    for (let wine = 0; wine < WINE_COUNT; wine++) {
      for (const fase of FASES) {
        expect(s).toMatchObject({ stage: "playing", wineIndex: wine, fase, step: "quiz" });
        s = advanceState(s); // quiz → reveal
        expect(s).toMatchObject({ stage: "playing", wineIndex: wine, fase, step: "reveal" });
        s = advanceState(s); // reveal → siguiente fase o wine_podium
      }
      // Tras la gamificación/reveal del vino, estamos en el podio parcial.
      expect(s).toMatchObject({ stage: "wine_podium", wineIndex: wine });
      s = advanceState(s); // wine_podium → siguiente vino o final_podium
    }
    expect(s.stage).toBe<Stage>("final_podium");
  });
});
