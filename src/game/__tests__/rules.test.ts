import { describe, expect, it } from "vitest";
import { applyAction, canApply, initialState } from "../rules";

describe("hive rules", () => {
  it("forces queen placement by fourth move", () => {
    let s = initialState();
    s = applyAction(s, "white", { kind: "place", pieceType: "ant", to: { q: 0, r: 0 } });
    s = applyAction(s, "black", { kind: "place", pieceType: "ant", to: { q: 1, r: 0 } });
    s = applyAction(s, "white", { kind: "place", pieceType: "spider", to: { q: -1, r: 0 } });
    s = applyAction(s, "black", { kind: "place", pieceType: "spider", to: { q: 2, r: 0 } });
    s = applyAction(s, "white", { kind: "place", pieceType: "beetle", to: { q: -2, r: 0 } });
    s = applyAction(s, "black", { kind: "place", pieceType: "beetle", to: { q: 3, r: 0 } });
    const result = canApply(s, "white", { kind: "place", pieceType: "ant", to: { q: -3, r: 0 } });
    expect(result.ok).toBe(false);
  });

  it("prevents moving before queen is placed", () => {
    let s = initialState();
    s = applyAction(s, "white", { kind: "place", pieceType: "ant", to: { q: 0, r: 0 } });
    s = applyAction(s, "black", { kind: "place", pieceType: "ant", to: { q: 1, r: 0 } });
    const antId = s.board["0,0"][0].id;
    const result = canApply(s, "white", { kind: "move", pieceId: antId, to: { q: -1, r: 0 } });
    expect(result.ok).toBe(false);
  });

  it("allows passing only when no legal move exists", () => {
    let s = initialState();
    const pass1 = canApply(s, "white", { kind: "pass" });
    expect(pass1.ok).toBe(false);
  });
});
