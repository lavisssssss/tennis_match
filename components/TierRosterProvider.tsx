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
import { listAllPlayersWithElo } from "@/lib/ratings";
import type { TierRosterEntry } from "@/lib/eloTier";

export type TierRosterContextValue = {
  roster: TierRosterEntry[];
  ready: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const TierRosterContext = createContext<TierRosterContextValue | null>(null);

export function TierRosterProvider({ children }: { children: ReactNode }) {
  const [roster, setRoster] = useState<TierRosterEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const rows = await listAllPlayersWithElo();
      setRoster(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "티어 분포 로드 실패");
      setRoster([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    function onFocus() {
      void reload();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [reload]);

  const value = useMemo<TierRosterContextValue>(
    () => ({ roster, ready, error, reload }),
    [roster, ready, error, reload],
  );

  return <TierRosterContext.Provider value={value}>{children}</TierRosterContext.Provider>;
}

export function useTierRoster(): TierRosterContextValue {
  const ctx = useContext(TierRosterContext);
  if (!ctx) {
    throw new Error("useTierRoster는 TierRosterProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}
