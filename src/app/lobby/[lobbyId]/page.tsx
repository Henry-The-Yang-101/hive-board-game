import { LobbyClient } from "@/components/ui/LobbyClient";

export default async function LobbyPage({ params }: { params: Promise<{ lobbyId: string }> }) {
  const { lobbyId } = await params;
  return <LobbyClient lobbyId={lobbyId} />;
}
