"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearHiveSession } from "@/lib/hiveSession";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function HomePage() {
  const [joinId, setJoinId] = useState("");
  const router = useRouter();

  const createLobby = () => {
    // Generate a random lobby ID
    const newLobbyId = Math.random().toString(36).substring(2, 11);
    // Clear session so we join as the creator (white)
    clearHiveSession();
    router.push(`/lobby/${newLobbyId}`);
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
      </section>
    </main>
  );
}
