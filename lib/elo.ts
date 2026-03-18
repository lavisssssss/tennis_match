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
  const k = params.k ?? 32;

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
 * Phase 5 1차 버전:
 * - ratings 테이블(Phase 6)이 없어도 호출은 가능하게 "델타 계산"까지만 제공
 * - 실제 DB 반영은 Phase 6에서 `ratings`가 준비된 뒤 확장
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
    // 동점 등으로 승패를 판정할 수 없는 경우(Elo 반영 없음)
    return { winner: null, deltas: [] as EloDelta[] };
  }

  // Phase 6 전까지는 선수 Elo를 DB에서 조회하지 않으므로,
  // 기본 Elo=100 가정으로 델타만 계산해 리턴한다.
  const deltas = computeDoublesEloDeltas({
    teamA: { p1: match.teama_player1, p2: match.teama_player2, rating1: 100, rating2: 100 },
    teamB: { p1: match.teamb_player1, p2: match.teamb_player2, rating1: 100, rating2: 100 },
    winner: winner as "A" | "B",
  });

  return { winner, deltas };
}

