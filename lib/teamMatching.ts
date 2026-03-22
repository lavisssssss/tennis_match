/**
 * §5.4 Snake draft: 4인씩, Elo 내림차순 E1≥E2≥E3≥E4 → A: E1+E4, B: E2+E3
 */

export type AttendeeForMatching = {
  player_id: string;
  display_name: string;
  elo: number;
};

export type SuggestedCourt = {
  teamA: [AttendeeForMatching, AttendeeForMatching];
  teamB: [AttendeeForMatching, AttendeeForMatching];
  /** 팀 평균 Elo 차이 (작을수록 밸런스 좋음) */
  avgEloDiff: number;
};

export function suggestCourtsFromAttendees(attendees: AttendeeForMatching[]): {
  courts: SuggestedCourt[];
  remainder: AttendeeForMatching[];
} {
  if (attendees.length === 0) {
    return { courts: [], remainder: [] };
  }

  const sorted = [...attendees].sort((a, b) => b.elo - a.elo || a.display_name.localeCompare(b.display_name));
  const courts: SuggestedCourt[] = [];
  const n = sorted.length;
  const full = Math.floor(n / 4) * 4;

  for (let i = 0; i < full; i += 4) {
    const e1 = sorted[i];
    const e2 = sorted[i + 1];
    const e3 = sorted[i + 2];
    const e4 = sorted[i + 3];
    const teamA: [AttendeeForMatching, AttendeeForMatching] = [e1, e4];
    const teamB: [AttendeeForMatching, AttendeeForMatching] = [e2, e3];
    const avgA = (teamA[0].elo + teamA[1].elo) / 2;
    const avgB = (teamB[0].elo + teamB[1].elo) / 2;
    courts.push({
      teamA,
      teamB,
      avgEloDiff: Math.abs(avgA - avgB),
    });
  }

  const remainder = sorted.slice(full);
  return { courts, remainder };
}
