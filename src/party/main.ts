import type * as Party from "partykit/server";
import { HiveEngine } from "../game/engine";
import { PlayerColor, Action } from "../game/types";

type LobbyPlayer = { connectionId: string; sessionId: string; color: PlayerColor };

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default class Server implements Party.Server {
  engine: HiveEngine;
  players: LobbyPlayer[] = [];

  constructor(readonly room: Party.Room) {
    this.engine = new HiveEngine();
  }

  onConnect(connection: Party.Connection) {
    console.log("party onConnect", { room: this.room.id, connectionId: connection.id });
  }

  onMessage(message: string, sender: Party.Connection) {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error("Failed to parse message", message);
      return;
    }

    console.log(`Message from ${sender.id}:`, data.type);

    switch (data.type) {
      case "joinLobby": {
        const existing = this.players.find((p) => p.connectionId === sender.id);
        if (existing) {
          sender.send(JSON.stringify({ type: "lobbyJoined", sessionId: existing.sessionId, color: existing.color }));
          return;
        }

        if (this.players.length === 0) {
          // First player is white
          const sessionId = generateId();
          this.players.push({ connectionId: sender.id, sessionId, color: "white" });
          sender.send(JSON.stringify({ type: "lobbyCreated", lobbyId: this.room.id, sessionId, color: "white" }));
          this.broadcastState();
        } else if (this.players.length === 1) {
          // Second player is black
          const sessionId = generateId();
          this.players.push({ connectionId: sender.id, sessionId, color: "black" });
          sender.send(JSON.stringify({ type: "lobbyJoined", sessionId, color: "black" }));
          this.broadcastState();
        } else {
          sender.send(JSON.stringify({ type: "errorMessage", message: "Lobby is full." }));
        }
        break;
      }
      
      case "reconnectLobby": {
        const { sessionId } = data;
        const player = this.players.find((p) => p.sessionId === sessionId);
        if (!player) {
          sender.send(JSON.stringify({
            type: "errorMessage",
            code: "session_invalid",
            message: "This lobby or session is no longer valid. Join again as a new player."
          }));
          return;
        }
        player.connectionId = sender.id;
        sender.send(JSON.stringify({ type: "lobbyJoined", sessionId: player.sessionId, color: player.color }));
        this.broadcastState();
        break;
      }

      case "playAction": {
        const { action } = data;
        const player = this.players.find((p) => p.connectionId === sender.id);
        if (!player) {
          sender.send(JSON.stringify({ type: "errorMessage", message: "You are not in this lobby." }));
          return;
        }
        const played = this.engine.play(player.color, action as Action);
        if (!played.ok) {
          sender.send(JSON.stringify({ type: "errorMessage", message: played.reason }));
          return;
        }
        this.broadcastState();
        break;
      }
    }
  }
  
  onClose(connection: Party.Connection) {
    const player = this.players.find(p => p.connectionId === connection.id);
    if (player) {
      player.connectionId = "";
    }
  }

  broadcastState() {
    const payload = {
      type: "state",
      lobbyId: this.room.id,
      state: this.engine.snapshot(),
      players: this.players
    };
    this.room.broadcast(JSON.stringify(payload));
  }
}
