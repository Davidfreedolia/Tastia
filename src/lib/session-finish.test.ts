// §5.6b-B — Tests de la lógica PURA `buildFinishPayload`: orden por puntos + position,
// foto SOLO del ganador, demo → null, sin jugadores → null, empate (orden estable),
// host excluido. Sin React ni red (entorno node).
import { describe, expect, it } from "vitest";
import { buildFinishPayload } from "./session-finish";

type P = { id: string; name: string; isHost: boolean; photo?: string };

const host: P = { id: "host", name: "Sala", isHost: true };

describe("buildFinishPayload", () => {
  it("ordena por puntos DESC y asigna position 1-based; excluye al host", () => {
    const participants: P[] = [
      host,
      { id: "a", name: "Ana", isHost: false },
      { id: "b", name: "Bea", isHost: false },
      { id: "c", name: "Carlos", isHost: false },
    ];
    const scores = { a: 100, b: 300, c: 200 };

    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores,
      source: "bd",
    });

    expect(payload).not.toBeNull();
    expect(payload!.code).toBe("ABCD");
    expect(payload!.host_name).toBe("Sala");
    expect(payload!.pack_tier).toBeNull();

    // Ordenados: Bea(300) > Carlos(200) > Ana(100). El host NO aparece.
    expect(payload!.players.map((p) => p.playerId)).toEqual(["b", "c", "a"]);
    expect(payload!.players.map((p) => p.position)).toEqual([1, 2, 3]);
    expect(payload!.players.map((p) => p.points)).toEqual([300, 200, 100]);
    expect(payload!.players.some((p) => p.playerId === "host")).toBe(false);
  });

  it("añade foto SOLO al ganador (position 1), aunque otros la tengan en presence", () => {
    const participants: P[] = [
      host,
      { id: "a", name: "Ana", isHost: false, photo: "data:image/jpeg;base64,AAA" },
      { id: "b", name: "Bea", isHost: false, photo: "data:image/jpeg;base64,BBB" },
    ];
    const scores = { a: 50, b: 999 };

    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores,
      source: "bd",
    });

    const winner = payload!.players.find((p) => p.position === 1)!;
    const rest = payload!.players.filter((p) => p.position !== 1);

    expect(winner.playerId).toBe("b");
    expect(winner.photo).toBe("data:image/jpeg;base64,BBB");
    // El resto NO lleva foto aunque la tenga en presence.
    expect(rest.every((p) => p.photo === undefined)).toBe(true);
  });

  it("no incluye foto del ganador si el ganador no tiene foto en presence", () => {
    const participants: P[] = [
      host,
      { id: "a", name: "Ana", isHost: false }, // ganador sin foto
      { id: "b", name: "Bea", isHost: false, photo: "data:image/jpeg;base64,BBB" },
    ];
    const scores = { a: 200, b: 100 };

    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores,
      source: "bd",
    });

    const winner = payload!.players.find((p) => p.position === 1)!;
    expect(winner.playerId).toBe("a");
    expect(winner.photo).toBeUndefined();
    expect("photo" in winner).toBe(false);
  });

  it("source 'demo' → null (no persiste en demo)", () => {
    const participants: P[] = [host, { id: "a", name: "Ana", isHost: false }];
    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores: { a: 100 },
      source: "demo",
    });
    expect(payload).toBeNull();
  });

  it("sin jugadores (solo host) → null", () => {
    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants: [host],
      scores: {},
      source: "bd",
    });
    expect(payload).toBeNull();
  });

  it("empate de puntos → orden ESTABLE (orden original de participants)", () => {
    const participants: P[] = [
      host,
      { id: "a", name: "Ana", isHost: false },
      { id: "b", name: "Bea", isHost: false },
      { id: "c", name: "Carlos", isHost: false },
    ];
    // Todos empatan a 100: el orden debe respetar el orden original (a, b, c).
    const scores = { a: 100, b: 100, c: 100 };

    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores,
      source: "bd",
    });

    expect(payload!.players.map((p) => p.playerId)).toEqual(["a", "b", "c"]);
    expect(payload!.players.map((p) => p.position)).toEqual([1, 2, 3]);
    // El ganador por desempate estable es 'a' (primero en orden original).
    expect(payload!.players[0]!.position).toBe(1);
  });

  it("jugadores sin entrada en scores cuentan como 0 puntos", () => {
    const participants: P[] = [
      host,
      { id: "a", name: "Ana", isHost: false },
      { id: "b", name: "Bea", isHost: false },
    ];
    const scores = { a: 50 }; // 'b' sin entrada → 0

    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores,
      source: "bd",
    });

    expect(payload!.players.map((p) => p.playerId)).toEqual(["a", "b"]);
    expect(payload!.players.map((p) => p.points)).toEqual([50, 0]);
  });

  it("todos a 0 puntos → persiste pero el ganador NO lleva foto (alineado con la UI 'sin ganador')", () => {
    const participants: P[] = [
      host,
      { id: "a", name: "Ana", isHost: false, photo: "data:image/jpeg;base64,AAA" },
      { id: "b", name: "Bea", isHost: false },
    ];
    const scores = {}; // nadie puntuó

    const payload = buildFinishPayload({
      code: "ABCD",
      hostName: "Sala",
      participants,
      scores,
      source: "bd",
    });

    expect(payload).not.toBeNull();
    const winner = payload!.players.find((p) => p.position === 1)!;
    expect(winner.points).toBe(0);
    expect(winner.photo).toBeUndefined(); // sin puntos no hay foto de ganador
  });
});
