import type { MatchRecord } from "@/lib/matches";
import { inferWinnerFromSets } from "@/lib/matches";

export type EloDelta = { player_id: string; delta: number };

export function expectedScore(ratingA: number, ratingB: number) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function computeDoublesEloDeltas(params: {
  teamA: { p1: string; p2: string; rating1: number; rating2: number };
  teamB: { p1: string; p2: string; rating1: number; rating2: number };
  winner: "A" | "B";
  k?: number;
}): EloDelta[] {
  const k = params.k ?? 20;

  const teamARating = (params.teamA.rating1 + params.teamA.rating2) / 2;
  const teamBRating = (params.teamB.rating1 + params.teamB.rating2) / 2;
  const expA = expectedScore(teamARating, teamBRating);

  const scoreA = params.winner === "A" ? 1 : 0;
  const deltaA = Math.round(k * (scoreA - expA));
  const deltaB = -deltaA;

  return [
    { player_id: params.teamA.p1, delta: deltaA },
    { player_id: params.teamA.p2, delta: deltaA },
    { player_id: params.teamB.p1, delta: deltaB },
    { player_id: params.teamB.p2, delta: deltaB },
  ];
}

/**
 * 미리보기용: DB 없이 Elo=1000 가정 델타. 실제 반영은 `applyEloForApprovedMatch`(ratings) 사용.
 */
export function onMatchApproved(match: MatchRecord) {
  let winner: "A" | "B" | null = null;
  try {
    winner = inferWinnerFromSets({
      set1: match.set1_score,
      set2: match.set2_score,
      set3: match.set3_score,
    });
  } catch {
    return { winner: null, deltas: [] as EloDelta[] };
  }

  const deltas = computeDoublesEloDeltas({
    teamA: { p1: match.teama_player1, p2: match.teama_player2, rating1: 1000, rating2: 1000 },
    teamB: { p1: match.teamb_player1, p2: match.teamb_player2, rating1: 1000, rating2: 1000 },
    winner: winner as "A" | "B",
  });

  return { winner, deltas };
}

