import { Action, GameState, PlayerColor } from "./types";
import { applyAction, availableMoves, canApply, initialState } from "./rules";

export class HiveEngine {
  private state: GameState;

  constructor(seedState?: GameState) {
    this.state = seedState ?? initialState();
  }

  snapshot(): GameState {
    return this.state;
  }

  play(player: PlayerColor, action: Action): { ok: true; state: GameState } | { ok: false; reason: string } {
    const valid = canApply(this.state, player, action);
    if (!valid.ok) return { ok: false, reason: valid.reason ?? "Invalid action." };
    this.state = applyAction(this.state, player, action);
    return { ok: true, state: this.state };
  }

  hasLegalMove(player: PlayerColor): boolean {
    return availableMoves(this.state, player).length > 0;
  }
}
