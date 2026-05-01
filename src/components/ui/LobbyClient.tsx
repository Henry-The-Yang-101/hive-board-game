"use client";

import { useEffect, useRef, useState } from "react";
import { HiveBoard } from "@/components/board/HiveBoard";
import { clearHiveSession, COLOR_KEY, LOBBY_KEY, SESSION_KEY } from "@/lib/hiveSession";
import { socket } from "@/lib/socket";
import { Action, GameState, PieceType, PlayerColor } from "@/game/types";
import { initialState, playerHasAnyMove } from "@/game/rules";

type Props = { lobbyId: string };

type LobbySnapshot = {
  state: GameState;
  lobbyId: string;
  players: { sessionId: string; color: PlayerColor }[];
};

export function LobbyClient({ lobbyId }: Props) {
  const [state, setState] = useState<GameState>(initialState());
  const [selected, setSelected] = useState<PieceType>("queen");
  const [message, setMessage] = useState("Connecting...");
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const sessionFallbackUsed = useRef(false);

  useEffect(() => {
    const storedLobby = typeof window !== "undefined" ? localStorage.getItem(LOBBY_KEY) : null;
    if (storedLobby && storedLobby !== lobbyId) {
      clearHiveSession();
    }
    localStorage.setItem(LOBBY_KEY, lobbyId);

    const applyRoleFromSnapshot = (payload: LobbySnapshot) => {
      const sid = localStorage.getItem(SESSION_KEY);
      if (!sid) return;
      const me = payload.players.find((p) => p.sessionId === sid);
      if (me) setMyColor(me.color);
    };

    const onState = (payload: LobbySnapshot) => {
      setState(payload.state);
      applyRoleFromSnapshot(payload);
      setRoleReady(true);
    };

    const tryJoinFresh = () => {
      clearHiveSession();
      sessionFallbackUsed.current = true;
      setMessage("Starting a fresh session in this lobby…");
      socket.emit("joinLobby", { lobbyId });
    };

    const onError = (payload: { message: string; code?: string }) => {
      setMessage(payload.message);
      if (payload.code === "session_invalid" && !sessionFallbackUsed.current) {
        tryJoinFresh();
      }
    };

    const persistRole = (payload: { sessionId: string; color: PlayerColor }) => {
      localStorage.setItem(SESSION_KEY, payload.sessionId);
      localStorage.setItem(COLOR_KEY, payload.color);
      setMyColor(payload.color);
      setRoleReady(true);
    };

    const onCreated = (payload: { sessionId: string; color: PlayerColor }) => {
      persistRole(payload);
      setMessage("Lobby created. Share the link to invite black.");
    };

    const onJoined = (payload: { sessionId: string; color: PlayerColor }) => {
      persistRole(payload);
      setMessage(payload.color === "white" ? "Reconnected as white." : "Joined as black.");
    };

    socket.on("state", onState);
    socket.on("errorMessage", onError);
    socket.on("lobbyCreated", onCreated);
    socket.on("lobbyJoined", onJoined);

    const sessionId = localStorage.getItem(SESSION_KEY);
    if (sessionId) socket.emit("reconnectLobby", { lobbyId, sessionId });
    else socket.emit("joinLobby", { lobbyId });

    return () => {
      socket.off("state", onState);
      socket.off("errorMessage", onError);
      socket.off("lobbyCreated", onCreated);
      socket.off("lobbyJoined", onJoined);
    };
  }, [lobbyId]);

  const play = (action: Action) => socket.emit("playAction", { lobbyId, action });
  const placeAt = (q: number, r: number) => play({ kind: "place", pieceType: selected, to: { q, r } });
  const moveTo = (pieceId: string, q: number, r: number) => play({ kind: "move", pieceId, to: { q, r } });
  const pass = () => play({ kind: "pass" });

  const youLabel = !roleReady ? "…" : (myColor ?? "spectator");
  const canPass = myColor ? state.turn === myColor && !playerHasAnyMove(state, myColor) : false;

  return (
    <main className="container">
      <header className="topBar">
        <div>
          <h1>Hive</h1>
          <p>Lobby: {lobbyId}</p>
        </div>
        <div>
          <p>Turn: {state.turn}</p>
          <p>Status: {state.status}</p>
          <p>You: {youLabel}</p>
        </div>
      </header>
      <p className="message">{message}</p>
      <div className="boardActions">
        <button onClick={() => setSelectedPieceId(null)} disabled={!selectedPieceId}>Placement mode</button>
        <button onClick={pass} disabled={!canPass}>Pass</button>
      </div>
      <HiveBoard
        state={state}
        myColor={myColor}
        selectedPieceType={selected}
        selectedPieceId={selectedPieceId}
        onSelectPieceType={setSelected}
        onSelectPieceId={setSelectedPieceId}
        onPlace={placeAt}
        onMove={moveTo}
      />
    </main>
  );
}
