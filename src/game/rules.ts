import {
  Action,
  BASE_HAND,
  DIRECTIONS,
  GameState,
  HexCoord,
  Piece,
  PieceType,
  PlayerColor
} from "./types";

export const coordKey = (c: HexCoord) => `${c.q},${c.r}`;
export const parseKey = (key: string): HexCoord => {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
};

const other = (p: PlayerColor): PlayerColor => (p === "white" ? "black" : "white");
const add = (a: HexCoord, b: HexCoord): HexCoord => ({ q: a.q + b.q, r: a.r + b.r });

export function initialState(): GameState {
  return {
    turn: "white",
    turnNumber: 1,
    status: "active",
    board: {},
    hands: { white: { ...BASE_HAND }, black: { ...BASE_HAND } },
    movesByPlayer: { white: 0, black: 0 }
  };
}

export function topPiece(board: GameState["board"], cell: HexCoord): Piece | null {
  const stack = board[coordKey(cell)];
  return stack && stack.length > 0 ? stack[stack.length - 1] : null;
}

function occupied(board: GameState["board"], c: HexCoord): boolean {
  return (board[coordKey(c)]?.length ?? 0) > 0;
}

function neighbors(c: HexCoord): HexCoord[] {
  return DIRECTIONS.map((d) => add(c, d));
}

function hasOwnQueenPlaced(state: GameState, player: PlayerColor): boolean {
  return state.hands[player].queen === 0;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    board: Object.fromEntries(Object.entries(state.board).map(([k, v]) => [k, [...v]])),
    hands: { white: { ...state.hands.white }, black: { ...state.hands.black } },
    movesByPlayer: { ...state.movesByPlayer }
  };
}

function boardNodes(board: GameState["board"]): string[] {
  return Object.keys(board).filter((k) => (board[k]?.length ?? 0) > 0);
}

function connected(board: GameState["board"]): boolean {
  const nodes = boardNodes(board);
  if (nodes.length <= 1) return true;
  const seen = new Set<string>();
  const stack = [nodes[0]];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const n of neighbors(parseKey(cur)).map(coordKey)) {
      if (!seen.has(n) && (board[n]?.length ?? 0) > 0) stack.push(n);
    }
  }
  return seen.size === nodes.length;
}

function gateOpen(board: GameState["board"], from: HexCoord, to: HexCoord): boolean {
  const commons = neighbors(from).filter((a) => neighbors(to).some((b) => coordKey(a) === coordKey(b)));
  if (commons.length !== 2) return true;
  const [l, r] = commons;
  return !(occupied(board, l) && occupied(board, r));
}

function legalPlacementTargets(state: GameState, player: PlayerColor): Set<string> {
  const out = new Set<string>();
  const cells = boardNodes(state.board);
  if (cells.length === 0) {
    out.add(coordKey({ q: 0, r: 0 }));
    return out;
  }
  if (cells.length === 1) {
    for (const n of neighbors(parseKey(cells[0]))) out.add(coordKey(n));
    return out;
  }
  for (const cell of cells) {
    const top = topPiece(state.board, parseKey(cell));
    if (!top || top.owner !== player) continue;
    for (const n of neighbors(parseKey(cell))) {
      if (occupied(state.board, n)) continue;
      const neigh = neighbors(n).filter((x) => occupied(state.board, x));
      if (neigh.length === 0) continue;
      if (neigh.some((x) => topPiece(state.board, x)?.owner === other(player))) continue;
      out.add(coordKey(n));
    }
  }
  return out;
}

function crawlTargets(state: GameState, from: HexCoord, maxSteps?: number, exactSteps?: number): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>([coordKey(from)]);
  const queue: Array<{ at: HexCoord; steps: number; visited: Set<string> }> = [
    { at: from, steps: 0, visited: new Set([coordKey(from)]) }
  ];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const n of neighbors(cur.at)) {
      const k = coordKey(n);
      if (occupied(state.board, n)) continue;
      if (!gateOpen(state.board, cur.at, n)) continue;
      if (cur.visited.has(k)) continue;
      const nextSteps = cur.steps + 1;
      if (exactSteps && nextSteps === exactSteps) {
        out.add(k);
        continue;
      }
      if (!exactSteps) out.add(k);
      if (maxSteps && nextSteps >= maxSteps) continue;
      const nextVisited = new Set(cur.visited);
      nextVisited.add(k);
      queue.push({ at: n, steps: nextSteps, visited: nextVisited });
      seen.add(k);
    }
  }
  if (exactSteps) {
    return new Set(Array.from(out).filter((k) => k !== coordKey(from)));
  }
  return new Set(Array.from(out).filter((k) => k !== coordKey(from)));
}

function movableTopPiece(state: GameState, pieceId: string): { piece: Piece; at: HexCoord } | null {
  for (const [k, stack] of Object.entries(state.board)) {
    if (!stack.length) continue;
    if (stack[stack.length - 1].id === pieceId) return { piece: stack[stack.length - 1], at: parseKey(k) };
  }
  return null;
}

function withPieceLifted(state: GameState, at: HexCoord): GameState {
  const lifted = cloneState(state);
  const k = coordKey(at);
  lifted.board[k] = [...(lifted.board[k] ?? [])];
  lifted.board[k].pop();
  if (lifted.board[k].length === 0) delete lifted.board[k];
  return lifted;
}

function legalMoveTargets(state: GameState, pieceId: string): Set<string> {
  const lookup = movableTopPiece(state, pieceId);
  if (!lookup) return new Set();
  const lifted = withPieceLifted(state, lookup.at);
  if (!connected(lifted.board)) return new Set();
  switch (lookup.piece.type) {
    case "queen":
      return new Set(Array.from(crawlTargets(lifted, lookup.at, 1)).filter((k) => !occupied(lifted.board, parseKey(k))));
    case "beetle": {
      const out = new Set<string>();
      for (const n of neighbors(lookup.at)) {
        if (occupied(lifted.board, n) || gateOpen(lifted.board, lookup.at, n)) out.add(coordKey(n));
      }
      return out;
    }
    case "grasshopper": {
      const out = new Set<string>();
      for (const dir of DIRECTIONS) {
        let cur = add(lookup.at, dir);
        let jumped = 0;
        while (occupied(lifted.board, cur)) {
          jumped += 1;
          cur = add(cur, dir);
        }
        if (jumped > 0) out.add(coordKey(cur));
      }
      return out;
    }
    case "spider":
      return crawlTargets(lifted, lookup.at, undefined, 3);
    case "ant":
      return crawlTargets(lifted, lookup.at);
    default:
      return new Set();
  }
}

export function canApply(state: GameState, player: PlayerColor, action: Action): { ok: boolean; reason?: string } {
  if (state.status !== "active") return { ok: false, reason: "Game has ended." };
  if (player !== state.turn) return { ok: false, reason: "Not your turn." };
  if (action.kind === "place") {
    if (state.hands[player][action.pieceType] <= 0) return { ok: false, reason: "Piece unavailable." };
    if (state.movesByPlayer[player] >= 3 && !hasOwnQueenPlaced(state, player) && action.pieceType !== "queen") {
      return { ok: false, reason: "Queen must be placed by your fourth turn." };
    }
    const legal = legalPlacementTargets(state, player);
    if (!legal.has(coordKey(action.to))) return { ok: false, reason: "Illegal placement." };
    return { ok: true };
  }
  const lookup = movableTopPiece(state, action.pieceId);
  if (!lookup) return { ok: false, reason: "Piece not found." };
  if (lookup.piece.owner !== player) return { ok: false, reason: "Cannot move opponent piece." };
  if (!hasOwnQueenPlaced(state, player)) return { ok: false, reason: "Place queen before moving." };
  const targets = legalMoveTargets(state, action.pieceId);
  if (!targets.has(coordKey(action.to))) return { ok: false, reason: "Illegal move." };
  return { ok: true };
}

function queenSurrounded(state: GameState, player: PlayerColor): boolean {
  let queenCell: HexCoord | null = null;
  for (const [k, stack] of Object.entries(state.board)) {
    if (stack.some((p) => p.owner === player && p.type === "queen")) {
      queenCell = parseKey(k);
    }
  }
  if (!queenCell) return false;
  return neighbors(queenCell).every((n) => occupied(state.board, n));
}

export function applyAction(state: GameState, player: PlayerColor, action: Action): GameState {
  const next = cloneState(state);
  if (action.kind === "place") {
    const id = `${player}-${action.pieceType}-${next.turnNumber}-${Math.random().toString(36).slice(2, 8)}`;
    const key = coordKey(action.to);
    next.board[key] = [...(next.board[key] ?? []), { id, owner: player, type: action.pieceType }];
    next.hands[player][action.pieceType] -= 1;
  } else {
    const lookup = movableTopPiece(next, action.pieceId)!;
    const from = coordKey(lookup.at);
    next.board[from].pop();
    if (next.board[from].length === 0) delete next.board[from];
    const to = coordKey(action.to);
    next.board[to] = [...(next.board[to] ?? []), lookup.piece];
  }
  next.movesByPlayer[player] += 1;
  const whiteSurrounded = queenSurrounded(next, "white");
  const blackSurrounded = queenSurrounded(next, "black");
  if (whiteSurrounded && blackSurrounded) next.status = "draw";
  else if (whiteSurrounded) next.status = "black_won";
  else if (blackSurrounded) next.status = "white_won";
  next.turn = other(player);
  next.turnNumber += 1;
  return next;
}

export function availableMoves(state: GameState, player: PlayerColor): Action[] {
  const actions: Action[] = [];
  for (const pieceType of Object.keys(BASE_HAND) as PieceType[]) {
    if (state.hands[player][pieceType] <= 0) continue;
    for (const key of legalPlacementTargets(state, player)) actions.push({ kind: "place", pieceType, to: parseKey(key) });
  }
  for (const stack of Object.values(state.board)) {
    if (!stack.length) continue;
    const top = stack[stack.length - 1];
    if (top.owner !== player) continue;
    for (const key of legalMoveTargets(state, top.id)) actions.push({ kind: "move", pieceId: top.id, to: parseKey(key) });
  }
  return actions;
}
