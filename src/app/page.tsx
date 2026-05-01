"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function HomePage() {
  const [joinId, setJoinId] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const createLobby = () => {
    socket.emit("createLobby");
    socket.once("lobbyCreated", ({ lobbyId }) => router.push(`/lobby/${lobbyId}`));
    socket.once("errorMessage", ({ message }) => setError(message));
  };

  return (
    <main className="container home">
      <ThemeToggle />
      <section className="card">
        <h1>Hive Private Lobbies</h1>
        <p>Create a private two-player lobby and share the link.</p>
        <div className="row">
          <button onClick={createLobby}>Create lobby</button>
          <input value={joinId} onChange={(e) => setJoinId(e.target.value)} placeholder="Paste lobby id" />
          <button onClick={() => router.push(`/lobby/${joinId.trim()}`)} disabled={!joinId.trim()}>Join</button>
        </div>
        {error ? <p className="message">{error}</p> : null}
      </section>
    </main>
  );
}
