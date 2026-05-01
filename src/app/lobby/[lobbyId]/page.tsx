import { LobbyClient } from "@/components/ui/LobbyClient";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default async function LobbyPage({ params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  return (
    <>
      <ThemeToggle />
      <LobbyClient lobbyId={lobbyId} />
    </>
  );
}
