// Tests de la transición pura `advanceState()` (§5.1). Cubren la I/O & Edge-Case Matrix:
// lobby → (por vino: [vista,olfato,gusto,gamificacion] cada una {quiz→reveal} → wine_podium) ×4
//        → final_podium.
import { describe, expect, it } from "vitest";
import {
  advanceState,
  computeAwards,
  FASES,
  initialRoomState,
  WINE_COUNT,
  type Fase,
  type Question,
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

// Pregunta de juguete para el reparto (§5.5): la correcta es la opción 1.
const QUESTION: Question = {
  fase: "vista",
  prompt: "?",
  options: ["a", "b", "c", "d"],
  correctIndex: 1,
};

describe("computeAwards — reparto de puntos (§5.5)", () => {
  it("todos aciertan: base 100 + bonus por orden de llegada (seq asc) 50/40/30…", () => {
    const awards = computeAwards(
      {
        a: { optionIndex: 1, seq: 0 }, // 1.º correcto
        b: { optionIndex: 1, seq: 1 }, // 2.º correcto
        c: { optionIndex: 1, seq: 2 }, // 3.º correcto
      },
      QUESTION,
    );
    expect(awards).toEqual({ a: 150, b: 140, c: 130 });
  });

  it("el orden lo fija `seq` (no el orden de inserción del objeto)", () => {
    const awards = computeAwards(
      {
        late: { optionIndex: 1, seq: 5 },
        early: { optionIndex: 1, seq: 1 },
      },
      QUESTION,
    );
    expect(awards).toEqual({ early: 150, late: 140 });
  });

  it("nadie acierta: reparto vacío (todas incorrectas)", () => {
    const awards = computeAwards(
      {
        a: { optionIndex: 0, seq: 0 },
        b: { optionIndex: 3, seq: 1 },
      },
      QUESTION,
    );
    expect(awards).toEqual({});
  });

  it("sin respuestas: reparto vacío", () => {
    expect(computeAwards({}, QUESTION)).toEqual({});
  });

  it("un solo acertante: 100 + 50 = 150", () => {
    expect(computeAwards({ a: { optionIndex: 1, seq: 0 } }, QUESTION)).toEqual({ a: 150 });
  });

  it("el 6.º correcto en adelante: bonus topado a 0 (solo base 100)", () => {
    const map: Record<string, { optionIndex: number; seq: number }> = {};
    for (let i = 0; i < 7; i++) map[`p${i}`] = { optionIndex: 1, seq: i };
    const awards = computeAwards(map, QUESTION);
    expect(awards.p0).toBe(150); // 1.º: 100 + 50
    expect(awards.p4).toBe(110); // 5.º: 100 + 10
    expect(awards.p5).toBe(100); // 6.º: 100 + 0 (bonus topado)
    expect(awards.p6).toBe(100); // 7.º: sigue topado a 0
  });

  it("incorrecto → sin entrada; solo entran los correctos", () => {
    const awards = computeAwards(
      {
        ok1: { optionIndex: 1, seq: 0 }, // correcto
        bad: { optionIndex: 2, seq: 1 }, // incorrecto → sin entrada
        ok2: { optionIndex: 1, seq: 2 }, // correcto (2.º entre los correctos)
      },
      QUESTION,
    );
    expect(awards).toEqual({ ok1: 150, ok2: 140 });
    expect("bad" in awards).toBe(false);
  });

  it("el bonus depende del puesto ENTRE correctos, no del seq absoluto", () => {
    // bad llega antes (seq 0) pero falla; los correctos son 1.º y 2.º pese a seq 1 y 2.
    const awards = computeAwards(
      {
        bad: { optionIndex: 0, seq: 0 },
        ok1: { optionIndex: 1, seq: 1 },
        ok2: { optionIndex: 1, seq: 2 },
      },
      QUESTION,
    );
    expect(awards).toEqual({ ok1: 150, ok2: 140 });
  });
});
