import { useCallback, useEffect, useMemo, useState } from "react";
import { listPlayers, type Player } from "@/lib/players";

type State = {
  players: Player[];
  loading: boolean;
  error: string | null;
};

export function usePlayers() {
  const [state, setState] = useState<State>({
    players: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const players = await listPlayers();
      setState({ players, loading: false, error: null });
    } catch (e) {
      const message = e instanceof Error ? e.message : "players 조회 중 오류가 발생했습니다.";
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return useMemo(
    () => ({
      ...state,
      refresh,
    }),
    [state, refresh],
  );
}

