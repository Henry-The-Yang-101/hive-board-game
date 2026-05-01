import { describe, expect, it } from "vitest";
import { joinLobby, newLobby } from "../lobbies";

describe("lobby constraints", () => {
  it("allows two players max", () => {
    const { lobby } = newLobby("sock-a");
    const join1 = joinLobby(lobby.id, "sock-b");
    const join2 = joinLobby(lobby.id, "sock-c");
    expect(join1.reason).toBeUndefined();
    expect(join1.color).toBe("black");
    expect(join2.reason).toBe("Lobby is full.");
  });

  it("does not add a second seat when the same socket joins again", () => {
    const { lobby } = newLobby("sock-a");
    const again = joinLobby(lobby.id, "sock-a");
    expect(again.reason).toBeUndefined();
    expect(again.color).toBe("white");
    expect(lobby.players).toHaveLength(1);
  });
});
