"use client";

import { GameState, PieceType } from "@/game/types";
import { coordKey, parseKey } from "@/game/rules";
import { InsectIcon } from "@/components/icons/InsectIcon";

type Props = {
  state: GameState;
  selectedPieceType: PieceType;
  onSelectPieceType: (piece: PieceType) => void;
  onPlace: (q: number, r: number) => void;
};

const PIECES: PieceType[] = ["queen", "ant", "spider", "beetle", "grasshopper"];

export function HiveBoard({ state, selectedPieceType, onSelectPieceType, onPlace }: Props) {
  const occupied = Object.keys(state.board).map(parseKey);
  const minQ = Math.min(-3, ...occupied.map((c) => c.q)) - 1;
  const maxQ = Math.max(3, ...occupied.map((c) => c.q)) + 1;
  const minR = Math.min(-3, ...occupied.map((c) => c.r)) - 1;
  const maxR = Math.max(3, ...occupied.map((c) => c.r)) + 1;
  const cells = [];
  for (let r = minR; r <= maxR; r += 1) {
    for (let q = minQ; q <= maxQ; q += 1) cells.push({ q, r });
  }
  return (
    <div className="boardWrap">
      <div className="tray">
        {PIECES.map((piece) => (
          <button key={piece} className={`trayBtn ${selectedPieceType === piece ? "active" : ""}`} onClick={() => onSelectPieceType(piece)}>
            <InsectIcon type={piece} className="icon" />
            <span>{piece}</span>
            <strong>{state.hands[state.turn][piece]}</strong>
          </button>
        ))}
      </div>
      <div className="grid">
        {cells.map((c) => {
          const stack = state.board[coordKey(c)] ?? [];
          const top = stack[stack.length - 1];
          return (
            <button key={coordKey(c)} className={`hex ${top ? "occupied" : ""}`} onClick={() => onPlace(c.q, c.r)}>
              {top ? <InsectIcon type={top.type} className="icon" /> : null}
              <small>{stack.length > 1 ? stack.length : ""}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
