"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { HiveBoard } from "@/components/board/HiveBoard";
import { socket } from "@/lib/socket";
import { Action, GameState, PieceType, PlayerColor } from "@/game/types";
import { initialState } from "@/game/rules";

type Props = { lobbyId: string };

const SESSION_KEY = "hive_session";
const COLOR_KEY = "hive_color";

export function LobbyClient({ lobbyId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<GameState>(initialState());
  const [selected, setSelected] = useState<PieceType>("queen");
  const [message, setMessage] = useState("Connecting...");
  const myColor = useMemo(() => (typeof window === "undefined" ? null : (localStorage.getItem(COLOR_KEY) as PlayerColor | null)), []);

  useEffect(() => {
    const onState = (payload: { state: GameState }) => setState(payload.state);
    const onError = (payload: { message: string }) => setMessage(payload.message);
    const onCreated = (payload: { sessionId: string; color: PlayerColor }) => {
      localStorage.setItem(SESSION_KEY, payload.sessionId);
      localStorage.setItem(COLOR_KEY, payload.color);
      setMessage("Lobby created.");
    };
    const onJoined = (payload: { sessionId: string; color: PlayerColor }) => {
      localStorage.setItem(SESSION_KEY, payload.sessionId);
      localStorage.setItem(COLOR_KEY, payload.color);
      setMessage("Joined lobby.");
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
  }, [lobbyId, router]);

  const play = (action: Action) => socket.emit("playAction", { lobbyId, action });
  const placeAt = (q: number, r: number) => play({ kind: "place", pieceType: selected, to: { q, r } });

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
          <p>You: {myColor ?? "spectator"}</p>
        </div>
      </header>
      <p className="message">{message}</p>
      <HiveBoard state={state} selectedPieceType={selected} onSelectPieceType={setSelected} onPlace={placeAt} />
    </main>
  );
}
