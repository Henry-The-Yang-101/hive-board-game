import { Server } from "socket.io";
import { Action, PlayerColor } from "../game/types";
import { cleanupStale, getLobby, joinLobby, newLobby, reconnectLobby, removeSocket, SESSION_COOKIE, snapshot } from "./lobbies";

type ClientToServerEvents = {
  createLobby: () => void;
  joinLobby: (payload: { lobbyId: string }) => void;
  reconnectLobby: (payload: { lobbyId: string; sessionId: string }) => void;
  playAction: (payload: { lobbyId: string; action: Action }) => void;
};

type ServerToClientEvents = {
  lobbyCreated: (payload: { lobbyId: string; sessionId: string; color: PlayerColor }) => void;
  lobbyJoined: (payload: { sessionId: string; color: PlayerColor }) => void;
  state: (payload: ReturnType<typeof snapshot>) => void;
  errorMessage: (payload: { message: string }) => void;
};

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  setInterval(() => cleanupStale(), 1000 * 60 * 5).unref();

  io.on("connection", (socket) => {
    socket.on("createLobby", () => {
      const { lobby, sessionId } = newLobby(socket.id);
      socket.join(lobby.id);
      socket.emit("lobbyCreated", { lobbyId: lobby.id, sessionId, color: "white" });
      socket.emit("state", snapshot(lobby));
    });

    socket.on("joinLobby", ({ lobbyId }) => {
      const result = joinLobby(lobbyId, socket.id);
      if (!result.lobby || !result.sessionId) {
        socket.emit("errorMessage", { message: result.reason ?? "Unable to join lobby." });
        return;
      }
      socket.join(result.lobby.id);
      socket.emit("lobbyJoined", { sessionId: result.sessionId, color: "black" });
      io.to(result.lobby.id).emit("state", snapshot(result.lobby));
    });

    socket.on("reconnectLobby", ({ lobbyId, sessionId }) => {
      const lobby = reconnectLobby(lobbyId, sessionId, socket.id);
      if (!lobby) {
        socket.emit("errorMessage", { message: `Session expired. Clear ${SESSION_COOKIE} and rejoin.` });
        return;
      }
      socket.join(lobbyId);
      io.to(lobbyId).emit("state", snapshot(lobby));
    });

    socket.on("playAction", ({ lobbyId, action }) => {
      const lobby = getLobby(lobbyId);
      if (!lobby) return socket.emit("errorMessage", { message: "Lobby not found." });
      const player = lobby.players.find((p) => p.socketId === socket.id);
      if (!player) return socket.emit("errorMessage", { message: "You are not in this lobby." });
      const played = lobby.engine.play(player.color, action);
      if (!played.ok) return socket.emit("errorMessage", { message: played.reason });
      io.to(lobbyId).emit("state", snapshot(lobby));
    });

    socket.on("disconnect", () => {
      removeSocket(socket.id);
    });
  });
}
