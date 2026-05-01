import crypto from "node:crypto";
import { HiveEngine } from "../game/engine";
import { GameState, PlayerColor } from "../game/types";

export type LobbyPlayer = { socketId: string; sessionId: string; color: PlayerColor };
export type Lobby = {
  id: string;
  engine: HiveEngine;
  players: LobbyPlayer[];
  createdAt: number;
  updatedAt: number;
};

const lobbies = new Map<string, Lobby>();
const SESSION_COOKIE = "hive_session";

export function newLobby(hostSocketId: string): { lobby: Lobby; sessionId: string } {
  const id = crypto.randomBytes(9).toString("base64url");
  const sessionId = crypto.randomBytes(12).toString("hex");
  const lobby: Lobby = {
    id,
    engine: new HiveEngine(),
    players: [{ socketId: hostSocketId, sessionId, color: "white" }],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  lobbies.set(id, lobby);
  return { lobby, sessionId };
}

export function joinLobby(lobbyId: string, socketId: string): { lobby?: Lobby; sessionId?: string; reason?: string } {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return { reason: "Lobby not found." };
  if (lobby.players.length >= 2) return { reason: "Lobby is full." };
  const sessionId = crypto.randomBytes(12).toString("hex");
  lobby.players.push({ socketId, sessionId, color: "black" });
  lobby.updatedAt = Date.now();
  return { lobby, sessionId };
}

export function getLobby(lobbyId: string): Lobby | undefined {
  return lobbies.get(lobbyId);
}

export function reconnectLobby(lobbyId: string, sessionId: string, socketId: string): Lobby | undefined {
  const lobby = lobbies.get(lobbyId);
  if (!lobby) return undefined;
  const player = lobby.players.find((p) => p.sessionId === sessionId);
  if (!player) return undefined;
  player.socketId = socketId;
  lobby.updatedAt = Date.now();
  return lobby;
}

export function snapshot(lobby: Lobby): { state: GameState; lobbyId: string; players: LobbyPlayer[] } {
  return { lobbyId: lobby.id, state: lobby.engine.snapshot(), players: lobby.players };
}

export function removeSocket(socketId: string): void {
  for (const [id, lobby] of lobbies.entries()) {
    lobby.players = lobby.players.filter((p) => p.socketId !== socketId);
    if (lobby.players.length === 0) lobbies.delete(id);
  }
}

export function cleanupStale(maxAgeMs = 1000 * 60 * 60): void {
  const now = Date.now();
  for (const [id, lobby] of lobbies.entries()) {
    if (now - lobby.updatedAt > maxAgeMs) lobbies.delete(id);
  }
}

export { SESSION_COOKIE };
