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

/** Pointy-top hex: distance from center to each vertex (px). */
const HEX_R = 28;

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_R * Math.sqrt(3) * (q + r / 2);
  const y = HEX_R * (3 / 2) * r;
  return { x, y };
}

export function HiveBoard({ state, selectedPieceType, onSelectPieceType, onPlace }: Props) {
  const occupied = Object.keys(state.board).map(parseKey);
  const minQ = Math.min(-2, ...occupied.map((c) => c.q)) - 1;
  const maxQ = Math.max(2, ...occupied.map((c) => c.q)) + 1;
  const minR = Math.min(-2, ...occupied.map((c) => c.r)) - 1;
  const maxR = Math.max(2, ...occupied.map((c) => c.r)) + 1;
  const cells: { q: number; r: number }[] = [];
  for (let r = minR; r <= maxR; r += 1) {
    for (let q = minQ; q <= maxQ; q += 1) cells.push({ q, r });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const c of cells) {
    const { x, y } = axialToPixel(c.q, c.r);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const pad = HEX_R * 2;
  const width = maxX - minX + pad * 2;
  const height = maxY - minY + pad * 2;
  const originX = -minX + pad;
  const originY = -minY + pad;

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
      <div className="hexField" style={{ width, height }}>
        {cells.map((c) => {
          const stack = state.board[coordKey(c)] ?? [];
          const top = stack[stack.length - 1];
          const { x, y } = axialToPixel(c.q, c.r);
          const left = originX + x;
          const topPx = originY + y;
          return (
            <button
              key={coordKey(c)}
              type="button"
              className={`hexCell ${top ? "occupied" : ""}`}
              style={{
                left,
                top: topPx,
                width: HEX_R * Math.sqrt(3),
                height: HEX_R * 2,
                transform: "translate(-50%, -50%)"
              }}
              onClick={() => onPlace(c.q, c.r)}
            >
              {top ? <InsectIcon type={top.type} className="icon" /> : null}
              {stack.length > 1 ? <span className="stackCount">{stack.length}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
