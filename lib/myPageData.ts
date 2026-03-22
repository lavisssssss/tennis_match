import { supabase } from "@/lib/supabaseClient";
import { inferWinnerFromSets, listApprovedMatches, type MatchRecord, type MatchRecordWithJoins } from "@/lib/matches";

export type RecentPartnerStat = {
  player_id: string;
  /** players.name (표시용 실명 등) */
  name: string;
  wins: number;
  losses: number;
  games: number;
  winRatePct: number;
};

export type Recent10Digest = {
  wins: number;
  losses: number;
  games: number;
  winRatePct: number;
  partners: RecentPartnerStat[];
};

function teammatePlayerId(m: MatchRecord, selfId: string): string | null {
  if (m.teama_player1 === selfId) return m.teama_player2;
  if (m.teama_player2 === selfId) return m.teama_player1;
  if (m.teamb_player1 === selfId) return m.teamb_player2;
  if (m.teamb_player2 === selfId) return m.teamb_player1;
  return null;
}

function playerWonMatch(m: MatchRecord, playerId: string): boolean | null {
  let winner: "A" | "B";
  try {
    winner = inferWinnerFromSets({
      set1: m.set1_score,
      set2: m.set2_score,
      set3: m.set3_score,
    });
  } catch {
    return null;
  }
  const onA = m.teama_player1 === playerId || m.teama_player2 === playerId;
  if (winner === "A") return onA;
  return !onA;
}

/** 승인된 경기 전체 기준 통산 (`ratings`와 어긋날 때 My page 등 표시용) */
export type CareerFromMatches = {
  wins: number;
  losses: number;
  games: number;
  winRatePct: number;
};

/**
 * `status = approved`인 복식 경기만 집계합니다. 스코어로 승패 불가(동점 등)인 건은 제외합니다.
 */
export async function computeApprovedMatchCareerStats(playerId: string): Promise<CareerFromMatches> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "teama_player1,teama_player2,teamb_player1,teamb_player2,set1_score,set2_score,set3_score",
    )
    .eq("status", "approved")
    .or(
      `teama_player1.eq.${playerId},teama_player2.eq.${playerId},teamb_player1.eq.${playerId},teamb_player2.eq.${playerId}`,
    )
    .limit(5000);

  if (error) throw new Error(error.message);

  let wins = 0;
  let losses = 0;
  for (const row of data ?? []) {
    const outcome = playerWonMatch(row as MatchRecord, playerId);
    if (outcome === null) continue;
    if (outcome) wins += 1;
    else losses += 1;
  }
  const games = wins + losses;
  const winRatePct = games > 0 ? Math.round((wins / games) * 1000) / 10 : 0;
  return { wins, losses, games, winRatePct };
}

/**
 * 최근 승인된 복식 경기 중 최대 n경기(동점 제외)에 대한 승/패 및 파트너별 통계.
 */
export async function computeRecentGamesDigest(
  playerId: string,
  n: number,
): Promise<Recent10Digest> {
  const { data, error } = await supabase
    .from("matches")
    .select(
      "id,session_id,teama_player1,teama_player2,teamb_player1,teamb_player2,set1_score,set2_score,set3_score,status,created_at",
    )
    .eq("status", "approved")
    .or(
      `teama_player1.eq.${playerId},teama_player2.eq.${playerId},teamb_player1.eq.${playerId},teamb_player2.eq.${playerId}`,
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as MatchRecord[];
  let wins = 0;
  let losses = 0;
  const partnerAgg = new Map<string, { wins: number; losses: number }>();

  for (const m of rows) {
    const outcome = playerWonMatch(m, playerId);
    if (outcome === null) continue;

    if (outcome) wins += 1;
    else losses += 1;

    const mate = teammatePlayerId(m, playerId);
    if (mate) {
      const cur = partnerAgg.get(mate) ?? { wins: 0, losses: 0 };
      if (outcome) cur.wins += 1;
      else cur.losses += 1;
      partnerAgg.set(mate, cur);
    }

    if (wins + losses >= n) break;
  }

  const games = wins + losses;
  const winRatePct = games > 0 ? Math.round((wins / games) * 1000) / 10 : 0;

  const partnerIds = Array.from(partnerAgg.keys());
  let nameMap = new Map<string, string>();
  if (partnerIds.length > 0) {
    const { data: players, error: pe } = await supabase
      .from("players")
      .select("id,name,display_name")
      .in("id", partnerIds);
    if (!pe) {
      for (const p of players ?? []) {
        const id = p.id as string;
        const rawName = String((p as { name?: string }).name ?? "").trim();
        const disp = String((p as { display_name?: string }).display_name ?? "").trim();
        nameMap.set(id, rawName || disp || `${id.slice(0, 8)}…`);
      }
    }
  }

  const partners: RecentPartnerStat[] = Array.from(partnerAgg.entries())
    .map(([pid, { wins: pw, losses: pl }]) => {
      const g = pw + pl;
      return {
        player_id: pid,
        name: nameMap.get(pid) ?? `${pid.slice(0, 8)}…`,
        wins: pw,
        losses: pl,
        games: g,
        winRatePct: g > 0 ? Math.round((pw / g) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.games - a.games || b.winRatePct - a.winRatePct)
    .slice(0, 3);

  return { wins, losses, games, winRatePct, partners };
}

export async function fetchMyApprovedMatchLines(
  playerId: string,
  limit = 80,
): Promise<MatchRecordWithJoins[]> {
  return listApprovedMatches({ player_id: playerId, limit });
}

export type StaffVenueAlertSession = {
  id: string;
  date: string;
  location: string;
  start_time: string;
  /** 표시용 한 줄 */
  label: string;
};

function formatSessionTime(t: string) {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

/**
 * 오늘(로컬 기준)보다 이전 날짜의 매치 중 대관료 마감(venue_fee_closed)이 안 된 일정.
 * 운영진(staff) My page 알림용.
 */
export async function listPastSessionsWithVenueNotClosed(
  todayLocalISO: string,
): Promise<StaffVenueAlertSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, date, location, start_time, status, venue_fee_closed")
    .lt("date", todayLocalISO)
    .neq("status", "deleted")
    .order("date", { ascending: false })
    .order("start_time", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).filter(
    (s) => !Boolean((s as { venue_fee_closed?: boolean }).venue_fee_closed),
  ) as Array<{
    id: string;
    date: string;
    location: string;
    start_time: string;
  }>;

  return rows.map((s) => ({
    id: s.id,
    date: s.date,
    location: s.location,
    start_time: s.start_time,
    label: `${s.date} · ${s.location} · ${formatSessionTime(s.start_time)}`,
  }));
}
