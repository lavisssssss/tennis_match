import type { Player, PlayerRole } from "@/lib/players";

const STORAGE_KEY = "lges_tennis_player_session_v1";

export type PlayerSession = Pick<Player, "id" | "name" | "display_name" | "role">;

function parseRole(value: unknown): PlayerRole {
  return value === "staff" ? "staff" : "member";
}

export function readPlayerSession(): PlayerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as PlayerSession).id !== "string" ||
      typeof (parsed as PlayerSession).name !== "string" ||
      typeof (parsed as PlayerSession).display_name !== "string"
    ) {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    return {
      id: o.id as string,
      name: o.name as string,
      display_name: o.display_name as string,
      role: parseRole(o.role),
    };
  } catch {
    return null;
  }
}

export function writePlayerSession(player: PlayerSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function clearPlayerSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function playerToSession(player: Player): PlayerSession {
  return {
    id: player.id,
    name: player.name,
    display_name: player.display_name,
    role: player.role === "staff" ? "staff" : "member",
  };
}
