export const SESSION_KEY = "hive_session";
export const COLOR_KEY = "hive_color";
export const LOBBY_KEY = "hive_lobby_id";

export function clearHiveSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(COLOR_KEY);
}
