import { supabase } from "@/lib/supabaseClient";
import type { TierRosterEntry } from "@/lib/eloTier";
import { computeDoublesEloDeltas, type EloDelta } from "@/lib/elo";
import { inferWinnerFromSets, type MatchRecord } from "@/lib/matches";

export type RatingRow = {
  player_id: string;
  elo: number;
  wins: number;
  losses: number;
  matches_played: number;
  updated_at: string;
};

export const DEFAULT_ELO = 1000;

export async function fetchRatingsByPlayerIds(playerIds: string[]): Promise<Map<string, RatingRow>> {
  const uniq = Array.from(new Set(playerIds)).filter(Boolean);
  const map = new Map<string, RatingRow>();
  if (uniq.length === 0) return map;

  const { data, error } = await supabase
    .from("ratings")
    .select("player_id,elo,wins,losses,matches_played,updated_at")
    .in("player_id", uniq);

  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    const r = row as RatingRow;
    map.set(r.player_id, r);
  }
  return map;
}

/** DB에 없으면 기본값(메모리만). apply 시 upsert로 생성됨 */
export function getEloSnapshot(map: Map<string, RatingRow>, playerId: string) {
  const row = map.get(playerId);
  return {
    elo: row?.elo ?? DEFAULT_ELO,
    wins: row?.wins ?? 0,
    losses: row?.losses ?? 0,
    matches_played: row?.matches_played ?? 0,
  };
}

/** 티어(상대 순위·임시 티어)용: 등록된 모든 선수 + ratings 없으면 Elo 기본값 · matches_played 0 */
export async function listAllPlayersWithElo(): Promise<TierRosterEntry[]> {
  const [{ data: players, error: pe }, { data: ratings, error: re }] = await Promise.all([
    supabase.from("players").select("id"),
    supabase.from("ratings").select("player_id,elo,matches_played"),
  ]);
  if (pe) throw new Error(pe.message);
  if (re) throw new Error(re.message);

  const rowMap = new Map<string, { elo: number; matches_played: number }>();
  for (const r of ratings ?? []) {
    const pid = r.player_id as string;
    rowMap.set(pid, {
      elo: (r as { elo: number }).elo,
      matches_played: Number((r as { matches_played?: number }).matches_played ?? 0),
    });
  }
  return (players ?? []).map((p) => {
    const id = p.id as string;
    const row = rowMap.get(id);
    return {
      player_id: id,
      elo: row?.elo ?? DEFAULT_ELO,
      matches_played: row?.matches_played ?? 0,
    };
  });
}

export type ApplyEloResult = {
  applied: boolean;
  winner: "A" | "B" | null;
  deltas: EloDelta[];
  message: string;
};

/**
 * 승인된 경기 1건에 대해 Elo·전적을 DB에 반영합니다.
 * 동점 등 승패 불가 시 applied=false.
 */
export async function applyEloForApprovedMatch(match: MatchRecord): Promise<ApplyEloResult> {
  let winner: "A" | "B" | null = null;
  try {
    winner = inferWinnerFromSets({
      set1: match.set1_score,
      set2: match.set2_score,
      set3: match.set3_score,
    });
  } catch {
    return {
      applied: false,
      winner: null,
      deltas: [],
      message: "동점 등으로 승패를 판정할 수 없어 Elo·전적을 반영하지 않았습니다.",
    };
  }

  const ids = [
    match.teama_player1,
    match.teama_player2,
    match.teamb_player1,
    match.teamb_player2,
  ];
  const map = await fetchRatingsByPlayerIds(ids);

  const s1 = getEloSnapshot(map, match.teama_player1);
  const s2 = getEloSnapshot(map, match.teama_player2);
  const s3 = getEloSnapshot(map, match.teamb_player1);
  const s4 = getEloSnapshot(map, match.teamb_player2);

  const deltas = computeDoublesEloDeltas({
    teamA: {
      p1: match.teama_player1,
      p2: match.teama_player2,
      rating1: s1.elo,
      rating2: s2.elo,
    },
    teamB: {
      p1: match.teamb_player1,
      p2: match.teamb_player2,
      rating1: s3.elo,
      rating2: s4.elo,
    },
    winner,
    k: 20,
  });

  const next = new Map<
    string,
    { elo: number; wins: number; losses: number; matches_played: number }
  >();

  for (const id of ids) {
    next.set(id, { ...getEloSnapshot(map, id) });
  }

  for (const d of deltas) {
    const cur = next.get(d.player_id);
    if (!cur) continue;
    cur.elo = Math.max(0, cur.elo + d.delta);
  }

  const aWon = winner === "A";
  for (const id of [match.teama_player1, match.teama_player2]) {
    const cur = next.get(id);
    if (!cur) continue;
    cur.matches_played += 1;
    if (aWon) cur.wins += 1;
    else cur.losses += 1;
  }
  for (const id of [match.teamb_player1, match.teamb_player2]) {
    const cur = next.get(id);
    if (!cur) continue;
    cur.matches_played += 1;
    if (!aWon) cur.wins += 1;
    else cur.losses += 1;
  }

  const now = new Date().toISOString();
  const upserts = ids.map((player_id) => {
    const cur = next.get(player_id)!;
    return {
      player_id,
      elo: cur.elo,
      wins: cur.wins,
      losses: cur.losses,
      matches_played: cur.matches_played,
      updated_at: now,
    };
  });

  const { error } = await supabase.from("ratings").upsert(upserts, { onConflict: "player_id" });
  if (error) throw new Error(error.message);

  const deltaStr = deltas.map((d) => `${d.player_id.slice(0, 8)}…:${d.delta > 0 ? "+" : ""}${d.delta}`).join(", ");
  return {
    applied: true,
    winner,
    deltas,
    message: `Elo 반영 완료 (승: ${winner}) · Δ ${deltaStr}`,
  };
}
