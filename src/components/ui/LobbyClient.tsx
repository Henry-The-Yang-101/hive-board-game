"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type PartySocket from "partysocket";
import usePartySocket from "partysocket/react";
import { HiveBoard3D, type HiveTool } from "@/components/board/HiveBoard3D";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getPartyKitHost } from "@/lib/partykitHost";
import { clearHiveSession, COLOR_KEY, LOBBY_KEY, SESSION_KEY } from "@/lib/hiveSession";
import { GameState, PieceType, PlayerColor } from "@/game/types";
import { initialState, playerHasAnyMove } from "@/game/rules";

type Props = { lobbyId: string };

type LobbySnapshot = {
  state: GameState;
  lobbyId: string;
  players: { sessionId: string; color: PlayerColor }[];
};

/** PNG tray icons (paths match HiveBoard3D PNG table). */
const TRAY_IMG: Record<PieceType, string> = {
  queen: "/images/insects/queen_bee.png",
  ant: "/images/insects/soldier_ant.png",
  spider: "/images/insects/spider.png",
  beetle: "/images/insects/beetle.png",
  grasshopper: "/images/insects/grasshopper.png",
};

const SIDE_PIECES: PieceType[] = ["queen", "ant", "spider", "beetle", "grasshopper"];

export function LobbyClient({ lobbyId }: Props) {
  const [state, setState] = useState<GameState>(initialState());
  const [tool, setTool] = useState<HiveTool>("queen");
  const [message, setMessage] = useState("Connecting...");
  const [myColor, setMyColor] = useState<PlayerColor | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [roleReady, setRoleReady] = useState(false);
  const sessionFallbackUsed = useRef(false);
  const lastAutoPassKey = useRef<string | null>(null);
  const socketRef = useRef<PartySocket | null>(null);

  const applyRoleFromSnapshot = (payload: LobbySnapshot) => {
    const sid = localStorage.getItem(SESSION_KEY);
    if (!sid) return;
    const me = payload.players.find((p) => p.sessionId === sid);
    if (me) setMyColor(me.color);
  };

  const tryJoinFresh = () => {
    clearHiveSession();
    sessionFallbackUsed.current = true;
    setMessage("Starting a fresh session in this lobby…");
    socketRef.current?.send(JSON.stringify({ type: "joinLobby" }));
  };

  const persistRole = (payload: { sessionId: string; color: PlayerColor }) => {
    localStorage.setItem(SESSION_KEY, payload.sessionId);
    localStorage.setItem(COLOR_KEY, payload.color);
    setMyColor(payload.color);
    setRoleReady(true);
  };

  const socket = usePartySocket({
    host: getPartyKitHost(),
    room: lobbyId,
    onOpen() {
      const storedLobby = typeof window !== "undefined" ? localStorage.getItem(LOBBY_KEY) : null;
      if (storedLobby && storedLobby !== lobbyId) {
        clearHiveSession();
      }
      localStorage.setItem(LOBBY_KEY, lobbyId);

      const sessionId = localStorage.getItem(SESSION_KEY);
      if (sessionId) {
        socket.send(JSON.stringify({ type: "reconnectLobby", sessionId }));
      } else {
        socket.send(JSON.stringify({ type: "joinLobby" }));
      }
    },
    onClose() {
      setMessage("Disconnected from lobby server. Is PartyKit running and NEXT_PUBLIC_PARTYKIT_HOST correct?");
    },
    onError() {
      setMessage("Could not connect to PartyKit. Use hostname only (no https://)—e.g. my-app.mygithubuser.partykit.dev—and redeploy Vercel after setting env.");
    },
    onMessage(e) {
      const payload = JSON.parse(e.data);
      switch (payload.type) {
        case "state":
          setState(payload.state);
          applyRoleFromSnapshot(payload);
          setSelectedPieceId(null);
          setRoleReady(true);
          if (payload.players.length === 1) setMessage("Waiting for opponent to join...");
          else if (payload.players.length === 2) setMessage("Both players connected!");
          break;
        case "errorMessage":
          setMessage(payload.message);
          if (payload.code === "session_invalid" && !sessionFallbackUsed.current) {
            tryJoinFresh();
          }
          break;
        case "lobbyCreated":
          persistRole(payload);
          setMessage("Lobby created. Share the link to invite black.");
          break;
        case "lobbyJoined":
          persistRole(payload);
          setMessage(payload.color === "white" ? "Reconnected as white." : "Joined as black.");
          break;
      }
    }
  });

  socketRef.current = socket;

  useEffect(() => {
    if (!roleReady || !myColor || state.status !== "active") return;
    if (state.turn !== myColor) return;
    if (playerHasAnyMove(state, myColor)) return;
    const marker = `${lobbyId}:${state.turnNumber}`;
    if (lastAutoPassKey.current === marker) return;
    lastAutoPassKey.current = marker;
    socket.send(JSON.stringify({ type: "playAction", action: { kind: "pass" } }));
  }, [roleReady, myColor, lobbyId, state.status, state.turn, state.turnNumber, socket]);

  const placePieceType = tool === "move" ? null : tool;

  const placeAt = (q: number, r: number) => {
    if (placePieceType === null) return;
    socket.send(JSON.stringify({ type: "playAction", action: { kind: "place", pieceType: placePieceType, to: { q, r } } }));
  };

  const moveTo = (pieceId: string, q: number, r: number) => {
    socket.send(JSON.stringify({ type: "playAction", action: { kind: "move", pieceId, to: { q, r } } }));
  };

  const selectTool = (next: HiveTool) => {
    setTool(next);
    setSelectedPieceId(null);
  };

  const youLabel = !roleReady ? "…" : (myColor ?? "spectator");
  const canInteract = myColor !== null && state.turn === myColor && state.status === "active";

  const handTurn = state.hands[state.turn];

  return (
    <main className="gameShell">
      <aside className="gameSidebar">
        <div className="sidebarInset">
          <div className="sidebarInsetTop">
            <h1 className="sidebarTitle">Hive</h1>
            <ThemeToggle variant="icon" />
          </div>
          <div className="sidebarStatus">
            <p className="sidebarMeta">
              Lobby <span className="sidebarMono">{lobbyId}</span>
            </p>
            <p className="sidebarMeta">Turn: {state.turn}</p>
            <p className="sidebarMeta">Status: {state.status}</p>
            <p className="sidebarMeta">
              You: <span className="sidebarMono">{youLabel}</span>
            </p>
            <p className="message sidebarMessage">{message}</p>
          </div>

          <div className="sidebarTrayLabel">Choose action</div>
          <div className="sidebarTray">
          <button
            type="button"
            className={`trayBtn ${tool === "move" ? "active" : ""}`}
            aria-pressed={tool === "move"}
            disabled={!canInteract}
            onClick={() => selectTool("move")}
          >
            <Image
              src="/images/misc/move_button.png"
              alt="Move"
              width={32}
              height={32}
              className="trayIcon"
              style={{ objectFit: "contain" }}
            />
            <span className="trayLabel">Move</span>
          </button>
          {SIDE_PIECES.map((piece) => {
            const count = handTurn[piece];
            return (
              <button
                key={piece}
                type="button"
                className={`trayBtn ${tool === piece ? "active" : ""}`}
                aria-pressed={tool === piece}
                disabled={!canInteract}
                onClick={() => selectTool(piece)}
              >
                <Image
                  src={TRAY_IMG[piece]}
                  alt={piece}
                  width={32}
                  height={32}
                  className="trayIcon"
                  style={{ objectFit: "contain" }}
                />
                <span className="trayLabel">{piece}</span>
                <strong className="trayCount">{count}</strong>
              </button>
            );
          })}
          </div>
        </div>
      </aside>

      <div className="gameBoardPane">
        <HiveBoard3D
          state={state}
          myColor={myColor}
          tool={tool}
          selectedPieceId={selectedPieceId}
          onSelectPieceId={setSelectedPieceId}
          onPlace={placeAt}
          onMove={moveTo}
        />
      </div>
    </main>
  );
}
