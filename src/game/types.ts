export type PlayerColor = "white" | "black";
export type PieceType = "queen" | "ant" | "spider" | "beetle" | "grasshopper";

export type HexCoord = { q: number; r: number };

export type Piece = {
  id: string;
  owner: PlayerColor;
  type: PieceType;
};

export type Action =
  | { kind: "place"; pieceType: PieceType; to: HexCoord }
  | { kind: "move"; pieceId: string; to: HexCoord }
  | { kind: "pass" };

export type GameStatus = "active" | "white_won" | "black_won" | "draw";

export type GameState = {
  turn: PlayerColor;
  turnNumber: number;
  status: GameStatus;
  board: Record<string, Piece[]>;
  hands: Record<PlayerColor, Record<PieceType, number>>;
  movesByPlayer: Record<PlayerColor, number>;
};

export const BASE_HAND: Record<PieceType, number> = {
  queen: 1,
  ant: 3,
  spider: 2,
  beetle: 2,
  grasshopper: 3
};

export const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];
