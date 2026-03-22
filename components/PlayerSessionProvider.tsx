"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Player } from "@/lib/players";
import {
  clearPlayerSession,
  playerToSession,
  readPlayerSession,
  writePlayerSession,
  type PlayerSession,
} from "@/lib/playerSessionStorage";

export type PlayerSessionContextValue = {
  session: PlayerSession | null;
  ready: boolean;
  login: (player: Player) => void;
  logout: () => void;
  isStaff: boolean;
};

const PlayerSessionContext = createContext<PlayerSessionContextValue | null>(null);

export function PlayerSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSession(readPlayerSession());
    setReady(true);
  }, []);

  const login = useCallback((player: Player) => {
    const s = playerToSession(player);
    writePlayerSession(s);
    setSession(s);
  }, []);

  const logout = useCallback(() => {
    clearPlayerSession();
    setSession(null);
  }, []);

  const value = useMemo<PlayerSessionContextValue>(
    () => ({
      session,
      ready,
      login,
      logout,
      isStaff: session?.role === "staff",
    }),
    [session, ready, login, logout],
  );

  return (
    <PlayerSessionContext.Provider value={value}>{children}</PlayerSessionContext.Provider>
  );
}

export function usePlayerSession(): PlayerSessionContextValue {
  const ctx = useContext(PlayerSessionContext);
  if (!ctx) {
    throw new Error("usePlayerSession은 PlayerSessionProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}
