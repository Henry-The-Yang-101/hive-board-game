"use client";

import { useMemo, useRef, useState } from "react";
import { GameState, PieceType, PlayerColor } from "@/game/types";
import { axialDisk, coordFromPixelPointyTop, coordKey, legalMoveTargets, legalPlacementTargets, parseKey } from "@/game/rules";
import { InsectIcon } from "@/components/icons/InsectIcon";

type Props = {
  state: GameState;
  myColor: PlayerColor | null;
  interactionMode: "place" | "move";
  selectedPieceType: PieceType;
  selectedPieceId: string | null;
  onSelectPieceType: (piece: PieceType) => void;
  onSelectPieceId: (pieceId: string | null) => void;
  onPlace: (q: number, r: number) => void;
  onMove: (pieceId: string, q: number, r: number) => void;
};

const PIECES: PieceType[] = ["queen", "ant", "spider", "beetle", "grasshopper"];

/** Pointy-top hex: distance from center to each vertex (px). */
const HEX_R = 28;

function axialToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_R * Math.sqrt(3) * (q + r / 2);
  const y = HEX_R * (3 / 2) * r;
  return { x, y };
}

export function HiveBoard({
  state,
  myColor,
  interactionMode,
  selectedPieceType,
  selectedPieceId,
  onSelectPieceType,
  onSelectPieceId,
  onPlace,
  onMove
}: Props) {
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const drag = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const occupiedCells = useMemo(() => Object.keys(state.board).map(parseKey), [state.board]);
  const legalPlacements = useMemo(() => {
    if (!myColor) return new Set<string>();
    if (state.turn !== myColor) return new Set<string>();
    if (interactionMode !== "place") return new Set<string>();
    return legalPlacementTargets(state, myColor);
  }, [interactionMode, myColor, state]);

  const legalMovesForSelected = useMemo(() => {
    if (!myColor) return new Set<string>();
    if (state.turn !== myColor) return new Set<string>();
    if (interactionMode !== "move") return new Set<string>();
    if (!selectedPieceId) return new Set<string>();
    return legalMoveTargets(state, selectedPieceId);
  }, [interactionMode, myColor, selectedPieceId, state]);

  const cameraCenter = useMemo(() => coordFromPixelPointyTop(-pan.x, -pan.y, HEX_R), [pan.x, pan.y]);
  const windowCells = useMemo(() => axialDisk(cameraCenter, 7), [cameraCenter]);

  const renderCells = useMemo(() => {
    const keys = new Set<string>();
    for (const c of windowCells) keys.add(coordKey(c));
    for (const c of occupiedCells) keys.add(coordKey(c));
    for (const k of legalPlacements) keys.add(k);
    for (const k of legalMovesForSelected) keys.add(k);
    return Array.from(keys).map(parseKey);
  }, [legalMovesForSelected, legalPlacements, occupiedCells, windowCells]);

  const pad = HEX_R * 6;
  const width = 900;
  const height = 650;
  const originX = width / 2 + pan.x;
  const originY = height / 2 + pan.y;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onCellClick = (q: number, r: number, cellKey: string) => {
    if (!myColor) return;
    if (state.turn !== myColor) return;
    if (interactionMode === "move") {
      if (!selectedPieceId) return;
      if (legalMovesForSelected.has(cellKey)) onMove(selectedPieceId, q, r);
      return;
    }
    if (legalPlacements.has(cellKey)) onPlace(q, r);
  };

  const onPieceClick = (pieceId: string) => {
    if (!myColor) return;
    if (state.turn !== myColor) return;
    if (interactionMode !== "move") return;
    onSelectPieceId(pieceId);
  };

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
      <div
        ref={fieldRef}
        className="hexField"
        style={{ width, height, padding: pad }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {renderCells.map((c) => {
          const key = coordKey(c);
          const stack = state.board[key] ?? [];
          const top = stack[stack.length - 1];
          const { x, y } = axialToPixel(c.q, c.r);
          const left = originX + x;
          const topPx = originY + y;
          const isLegal = legalPlacements.has(key) || legalMovesForSelected.has(key);
          const isSelected = !!selectedPieceId && top?.id === selectedPieceId;
          return (
            <button
              key={key}
              type="button"
              className={`hexCell ${top ? "occupied" : ""} ${isLegal ? "legal" : ""} ${isSelected ? "selected" : ""}`}
              style={{
                left,
                top: topPx,
                width: HEX_R * Math.sqrt(3),
                height: HEX_R * 2,
                transform: "translate(-50%, -50%)"
              }}
              onClick={() => onCellClick(c.q, c.r, key)}
            >
              {top ? (
                <span className="token" data-owner={top.owner} onClick={(e) => { e.stopPropagation(); onPieceClick(top.id); }}>
                  <InsectIcon type={top.type} className="icon" />
                </span>
              ) : null}
              {stack.length > 1 ? <span className="stackCount">{stack.length}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
