import { supabase } from "@/lib/supabaseClient";

export type AttendanceStatus = "attend" | "cancel" | "wait";

export type Attendance = {
  id: string;
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
  created_at: string;
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
    .select("id,session_id,player_id,status,created_at,player:players(id,display_name,name)")
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
    player: Array.isArray(r.player) ? r.player[0] ?? null : r.player ?? null,
  }));
}

