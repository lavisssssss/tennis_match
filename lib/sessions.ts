import { supabase } from "@/lib/supabaseClient";

export type SessionStatus = "open" | "closed" | "deleted";

export type Session = {
  id: string;
  date: string; // YYYY-MM-DD
  location: string;
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  description: string | null;
  status: SessionStatus;
  created_by: string | null;
  created_at: string;
};

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDate(value: string) {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error("날짜는 YYYY-MM-DD 형식으로 입력해 주세요.");
  return v;
}

function normalizeTime(value: string) {
  const v = value.trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(v)) throw new Error("시간은 HH:MM 또는 HH:MM:SS 형식으로 입력해 주세요.");
  return v.length === 5 ? `${v}:00` : v;
}

export async function listSessions(params?: {
  fromDate?: string;
  toDate?: string;
  limit?: number;
  statuses?: SessionStatus[];
}) {
  let q = supabase
    .from("sessions")
    .select("id,date,location,start_time,end_time,description,status,created_by,created_at");

  if (params?.fromDate) q = q.gte("date", params.fromDate);
  if (params?.toDate) q = q.lte("date", params.toDate);
  if (params?.statuses?.length) q = q.in("status", params.statuses);

  q = q.order("date", { ascending: true }).order("start_time", { ascending: true });

  if (params?.limit) q = q.limit(params.limit);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function listUpcomingSessions(params?: {
  todayISO?: string;
  limit?: number;
  statuses?: SessionStatus[];
}) {
  const today = (params?.todayISO ?? new Date().toISOString().slice(0, 10)).slice(0, 10);
  let q = supabase
    .from("sessions")
    .select("id,date,location,start_time,end_time,description,status,created_by,created_at")
    .gte("date", today)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (params?.statuses?.length) q = q.in("status", params.statuses);
  if (params?.limit) q = q.limit(params.limit);

  const { data, error } = await q;

  if (error) throw new Error(error.message);
  return (data ?? []) as Session[];
}

export async function listUpcomingOpenSessions(params?: { todayISO?: string; limit?: number }) {
  return await listUpcomingSessions({
    todayISO: params?.todayISO,
    limit: params?.limit,
    statuses: ["open"],
  });
}

export async function createSession(input: {
  date: string;
  location: string;
  start_time: string;
  end_time: string;
  description?: string;
}) {
  const date = normalizeDate(input.date);
  const location = normalizeText(input.location);
  const start_time = normalizeTime(input.start_time);
  const end_time = normalizeTime(input.end_time);
  const description = input.description ? normalizeText(input.description) : null;

  if (!location) throw new Error("장소를 입력해 주세요.");

  const { data, error } = await supabase
    .from("sessions")
    .insert({ date, location, start_time, end_time, description, status: "open" })
    .select("id,date,location,start_time,end_time,description,status,created_by,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Session;
}

export async function updateSession(
  id: string,
  patch: Partial<
    Pick<Session, "date" | "location" | "start_time" | "end_time" | "description" | "status">
  >,
) {
  const next: Partial<
    Pick<Session, "date" | "location" | "start_time" | "end_time" | "description" | "status">
  > = {};

  if (typeof patch.date === "string") next.date = normalizeDate(patch.date);
  if (typeof patch.location === "string") next.location = normalizeText(patch.location);
  if (typeof patch.start_time === "string") next.start_time = normalizeTime(patch.start_time);
  if (typeof patch.end_time === "string") next.end_time = normalizeTime(patch.end_time);
  if (patch.description === null) next.description = null;
  if (typeof patch.description === "string")
    next.description = patch.description.trim() ? normalizeText(patch.description) : null;
  if (typeof patch.status === "string") next.status = patch.status;

  if (next.location !== undefined && !next.location) throw new Error("장소를 입력해 주세요.");

  const { data, error } = await supabase
    .from("sessions")
    .update(next)
    .eq("id", id)
    .select("id,date,location,start_time,end_time,description,status,created_by,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Session;
}

