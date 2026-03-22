import { supabase } from "@/lib/supabaseClient";

export type AttendanceStatus = "attend" | "cancel" | "wait";

export type Attendance = {
  id: string;
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
  created_at: string;
  /** 대관료 정산 완료. 컬럼 없으면 false */
  venue_settled?: boolean;
};

export type AttendanceRowWithPlayer = Attendance & {
  player: { id: string; display_name: string; name?: string } | null;
};

export async function getAttendance(sessionId: string, playerId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("id,session_id,player_id,status,created_at")
    .eq("session_id", sessionId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data ?? null) as Attendance | null;
}

export async function upsertAttendance(input: {
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
}) {
  const { data, error } = await supabase
    .from("attendance")
    .upsert(input, { onConflict: "session_id,player_id" })
    .select("id,session_id,player_id,status,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Attendance;
}

export async function listAttendanceForSession(sessionId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select(
      "id,session_id,player_id,status,created_at,venue_settled,player:players(id,display_name,name)",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as unknown as Array<
    Attendance & { player?: { id: string; display_name: string; name?: string } | Array<{ id: string; display_name: string; name?: string }> | null }
  >;

  return rows.map((r) => ({
    id: r.id,
    session_id: r.session_id,
    player_id: r.player_id,
    status: r.status,
    created_at: r.created_at,
    venue_settled: Boolean(r.venue_settled),
    player: Array.isArray(r.player) ? r.player[0] ?? null : r.player ?? null,
  }));
}

export async function updateAttendanceVenueSettled(attendanceId: string, venue_settled: boolean) {
  const { error } = await supabase.from("attendance").update({ venue_settled }).eq("id", attendanceId);
  if (error) throw new Error(error.message);
}

/** 해당 매치에서 참석(attend)으로 신청한 player_id 목록 (중복 제거) */
export async function listAttendingPlayerIdsForSession(sessionId: string): Promise<string[]> {
  const rows = await listAttendanceForSession(sessionId);
  const ids = rows.filter((r) => r.status === "attend").map((r) => r.player_id);
  return Array.from(new Set(ids));
}

