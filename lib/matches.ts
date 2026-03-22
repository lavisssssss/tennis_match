import { supabase } from "@/lib/supabaseClient";
import { getAutoApproveMatches } from "@/lib/clubSettings";

export type MatchRecordStatus = "pending" | "approved" | "rejected";

export type MatchRecord = {
  id: string;
  session_id: string;
  teama_player1: string;
  teama_player2: string;
  teamb_player1: string;
  teamb_player2: string;
  set1_score: string;
  set2_score: string;
  set3_score: string | null;
  status: MatchRecordStatus;
  created_by: string;
  approved_by: string | null;
  created_at: string;
};

export type MatchRecordWithJoins = MatchRecord & {
  session?: {
    id: string;
    date: string;
    location: string;
    start_time: string;
    end_time: string;
    description: string | null;
    status: string;
  } | null;
  teamA_p1?: { id: string; display_name: string; name?: string } | null;
  teamA_p2?: { id: string; display_name: string; name?: string } | null;
  teamB_p1?: { id: string; display_name: string; name?: string } | null;
  teamB_p2?: { id: string; display_name: string; name?: string } | null;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeScore(value: string) {
  const v = normalizeText(value);
  if (!/^\d{1,2}\s*-\s*\d{1,2}$/.test(v)) {
    throw new Error("스코어는 예: 6-4 형식으로 입력해 주세요.");
  }
  return v.replace(/\s+/g, "");
}

export function parseScore(score: string) {
  const [a, b] = score.split("-").map((x) => Number(x));
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new Error("스코어 파싱 실패");
  return { a, b };
}

export function inferWinnerFromSets(input: { set1: string; set2: string; set3?: string | null }) {
  const s1 = parseScore(input.set1);
  const s2 = parseScore(input.set2);
  const s3 = input.set3 ? parseScore(input.set3) : null;

  let aSets = 0;
  let bSets = 0;
  aSets += s1.a > s1.b ? 1 : 0;
  bSets += s1.b > s1.a ? 1 : 0;
  aSets += s2.a > s2.b ? 1 : 0;
  bSets += s2.b > s2.a ? 1 : 0;
  if (s3) {
    aSets += s3.a > s3.b ? 1 : 0;
    bSets += s3.b > s3.a ? 1 : 0;
  }

  if (aSets === bSets) throw new Error("승패를 판정할 수 없습니다. 세트 스코어를 확인해 주세요.");
  return aSets > bSets ? ("A" as const) : ("B" as const);
}

export type CreateMatchInput = {
  session_id: string;
  teamA_player1: string;
  teamA_player2: string;
  teamB_player1: string;
  teamB_player2: string;
  set1_score: string;
  set2_score: string;
  set3_score?: string | null;
  created_by: string;
};

async function insertMatchRow(
  input: CreateMatchInput,
  status: "pending" | "approved",
  approved_by: string | null,
): Promise<MatchRecord> {
  const created_by = normalizeText(input.created_by);
  if (!created_by) throw new Error("입력자(이름/닉네임)를 입력해 주세요.");

  const all = [
    input.teamA_player1,
    input.teamA_player2,
    input.teamB_player1,
    input.teamB_player2,
  ];
  if (new Set(all).size !== 4) throw new Error("선수 4명은 모두 달라야 합니다.");

  const set1_score = normalizeScore(input.set1_score);
  const set2_score = normalizeScore(input.set2_score);
  const set3_score = input.set3_score ? normalizeScore(input.set3_score) : null;

  if (status === "approved") {
    const who = (approved_by ?? "").trim();
    if (!who) throw new Error("승인자 정보가 비어 있습니다.");
  }

  const { data, error } = await supabase
    .from("matches")
    .insert({
      session_id: input.session_id,
      teama_player1: input.teamA_player1,
      teama_player2: input.teamA_player2,
      teamb_player1: input.teamB_player1,
      teamb_player2: input.teamB_player2,
      set1_score,
      set2_score,
      set3_score,
      status,
      created_by,
      approved_by: status === "approved" ? approved_by : null,
    })
    .select(
      "id,session_id,teama_player1,teama_player2,teamb_player1,teamb_player2,set1_score,set2_score,set3_score,status,created_by,approved_by,created_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return data as MatchRecord;
}

/** 자동 승인 설정이 켜져 있으면 곧바로 approved 로 저장하고 Elo를 반영합니다. */
export async function submitMatchResult(
  input: CreateMatchInput,
): Promise<{ record: MatchRecord; autoApproved: boolean; eloMessage?: string }> {
  const auto = await getAutoApproveMatches();
  if (!auto) {
    const record = await insertMatchRow(input, "pending", null);
    return { record, autoApproved: false };
  }

  const created = normalizeText(input.created_by);
  const approved_by = `${created} · 자동승인`;
  const record = await insertMatchRow(input, "approved", approved_by);
  const { applyEloForApprovedMatch } = await import("@/lib/ratings");
  const eloResult = await applyEloForApprovedMatch(record);
  return { record, autoApproved: true, eloMessage: eloResult.message };
}

export async function createPendingMatch(input: CreateMatchInput) {
  return insertMatchRow(input, "pending", null);
}

export async function listPendingMatches(params?: { limit?: number }) {
  let q = supabase
    .from("matches")
    .select(
      "id,session_id,teama_player1,teama_player2,teamb_player1,teamb_player2,set1_score,set2_score,set3_score,status,created_by,approved_by,created_at",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (params?.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const base = (data ?? []) as MatchRecord[];
  if (base.length === 0) return [];

  const sessionIds = Array.from(new Set(base.map((r) => r.session_id)));
  const playerIds = Array.from(
    new Set(
      base.flatMap((r) => [
        r.teama_player1,
        r.teama_player2,
        r.teamb_player1,
        r.teamb_player2,
      ]),
    ),
  );

  const [{ data: sessions, error: sessionError }, { data: players, error: playerError }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id,date,location,start_time,end_time,description,status")
        .in("id", sessionIds),
      supabase.from("players").select("id,display_name,name").in("id", playerIds),
    ]);

  if (sessionError) throw new Error(sessionError.message);
  if (playerError) throw new Error(playerError.message);

  const sessionMap = new Map<string, NonNullable<MatchRecordWithJoins["session"]>>(
    (sessions ?? []).map((s) => [s.id as string, s as any]),
  );
  const playerMap = new Map<string, NonNullable<MatchRecordWithJoins["teamA_p1"]>>(
    (players ?? []).map((p) => [p.id as string, p as any]),
  );

  return base.map((r) => ({
    ...r,
    session: sessionMap.get(r.session_id) ?? null,
    teamA_p1: playerMap.get(r.teama_player1) ?? null,
    teamA_p2: playerMap.get(r.teama_player2) ?? null,
    teamB_p1: playerMap.get(r.teamb_player1) ?? null,
    teamB_p2: playerMap.get(r.teamb_player2) ?? null,
  }));
}

export async function listApprovedMatches(params?: {
  session_id?: string;
  /** 포함된 경기만 (팀 A/B 중 한 명이라도 일치) */
  player_id?: string;
  limit?: number;
}) {
  let q = supabase
    .from("matches")
    .select(
      "id,session_id,teama_player1,teama_player2,teamb_player1,teamb_player2,set1_score,set2_score,set3_score,status,created_by,approved_by,created_at",
    )
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (params?.session_id) q = q.eq("session_id", params.session_id);
  if (params?.player_id) {
    const pid = params.player_id;
    q = q.or(
      `teama_player1.eq.${pid},teama_player2.eq.${pid},teamb_player1.eq.${pid},teamb_player2.eq.${pid}`,
    );
  }
  if (params?.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const base = (data ?? []) as MatchRecord[];
  if (base.length === 0) return [];

  const sessionIds = Array.from(new Set(base.map((r) => r.session_id)));
  const playerIds = Array.from(
    new Set(
      base.flatMap((r) => [
        r.teama_player1,
        r.teama_player2,
        r.teamb_player1,
        r.teamb_player2,
      ]),
    ),
  );

  const [{ data: sessions, error: sessionError }, { data: players, error: playerError }] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id,date,location,start_time,end_time,description,status")
        .in("id", sessionIds),
      supabase.from("players").select("id,display_name,name").in("id", playerIds),
    ]);

  if (sessionError) throw new Error(sessionError.message);
  if (playerError) throw new Error(playerError.message);

  const sessionMap = new Map<string, NonNullable<MatchRecordWithJoins["session"]>>(
    (sessions ?? []).map((s) => [s.id as string, s as any]),
  );
  const playerMap = new Map<string, NonNullable<MatchRecordWithJoins["teamA_p1"]>>(
    (players ?? []).map((p) => [p.id as string, p as any]),
  );

  return base.map((r) => ({
    ...r,
    session: sessionMap.get(r.session_id) ?? null,
    teamA_p1: playerMap.get(r.teama_player1) ?? null,
    teamA_p2: playerMap.get(r.teama_player2) ?? null,
    teamB_p1: playerMap.get(r.teamb_player1) ?? null,
    teamB_p2: playerMap.get(r.teamb_player2) ?? null,
  }));
}

export async function setMatchStatus(input: {
  id: string;
  status: Exclude<MatchRecordStatus, "pending">;
  approved_by?: string | null;
}) {
  const patch: Partial<Pick<MatchRecord, "status" | "approved_by">> = {
    status: input.status,
  };
  if (input.status === "approved") {
    const who = (input.approved_by ?? "").trim();
    if (!who) throw new Error("승인자(이름/닉네임)를 입력해 주세요.");
    patch.approved_by = who;
  } else {
    patch.approved_by = null;
  }

  const { data, error } = await supabase
    .from("matches")
    .update(patch)
    .eq("id", input.id)
    .select(
      "id,session_id,teama_player1,teama_player2,teamb_player1,teamb_player2,set1_score,set2_score,set3_score,status,created_by,approved_by,created_at",
    )
    .single();

  if (error) throw new Error(error.message);
  return data as MatchRecord;
}

