import { supabase } from "@/lib/supabaseClient";

/** 회원(일반) / 운영진(Admin·권한관리) */
export type PlayerRole = "member" | "staff";

export type Player = {
  id: string;
  name: string;
  phone_last4: string;
  display_name: string;
  role: PlayerRole;
  created_at: string;
};

function normalizeRole(value: unknown): PlayerRole {
  return value === "staff" ? "staff" : "member";
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizePhoneLast4(value: string) {
  return value.replace(/\D/g, "").slice(-4);
}

export function buildDisplayName(name: string, phoneLast4: string) {
  const n = normalizeName(name);
  const p = normalizePhoneLast4(phoneLast4);
  return `${n}${p}`;
}

export async function listPlayers() {
  const { data, error } = await supabase
    .from("players")
    .select("id,name,phone_last4,display_name,role,created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({ ...row, role: normalizeRole((row as { role?: unknown }).role) })) as Player[];
}

/** 계정 키: 이름 + 연락처 뒷4자리 조합. 일치 행이 있으면 로그인, 없으면 신규 가입 안내 */
export async function tryLoginPlayer(input: { name: string; phone_last4: string }) {
  const name = normalizeName(input.name);
  const phone_last4 = normalizePhoneLast4(input.phone_last4);

  if (!name) throw new Error("이름을 입력해 주세요.");
  if (phone_last4.length !== 4) throw new Error("연락처 뒷자리 4자리를 입력해 주세요.");

  const { data: matchRows, error: matchError } = await supabase
    .from("players")
    .select("id,name,phone_last4,display_name,role,created_at")
    .eq("name", name)
    .eq("phone_last4", phone_last4)
    .limit(2);

  if (matchError) throw new Error(matchError.message);
  const matches = (matchRows ?? []) as Array<Player & { role?: unknown }>;
  if (matches.length >= 1) {
    const p = matches[0];
    return { kind: "ok" as const, player: { ...p, role: normalizeRole(p.role) } };
  }

  return { kind: "not_found" as const, player: null };
}

export async function createPlayer(input: { name: string; phone_last4: string }) {
  const name = normalizeName(input.name);
  const phone_last4 = normalizePhoneLast4(input.phone_last4);

  if (!name) throw new Error("이름을 입력해 주세요.");
  if (phone_last4.length !== 4) throw new Error("연락처 뒷자리 4자리를 입력해 주세요.");

  const display_name = buildDisplayName(name, phone_last4);

  const { data, error } = await supabase
    .from("players")
    .insert({ name, phone_last4, display_name, role: "member" })
    .select("id,name,phone_last4,display_name,role,created_at")
    .single();

  if (error) throw new Error(error.message);
  const row = data as Player & { role?: unknown };
  return { ...row, role: normalizeRole(row.role) };
}

export async function updatePlayer(
  id: string,
  patch: Partial<Pick<Player, "name" | "phone_last4" | "display_name" | "role">>,
) {
  const next: Partial<Pick<Player, "name" | "phone_last4" | "display_name" | "role">> = {};

  if (typeof patch.name === "string") next.name = normalizeName(patch.name);
  if (typeof patch.phone_last4 === "string")
    next.phone_last4 = normalizePhoneLast4(patch.phone_last4);
  if (typeof patch.display_name === "string")
    next.display_name = patch.display_name.trim();
  if (patch.role !== undefined) {
    if (patch.role !== "member" && patch.role !== "staff") {
      throw new Error("권한 값이 올바르지 않습니다.");
    }
    next.role = patch.role;
  }

  if (next.name !== undefined && !next.name) throw new Error("이름을 입력해 주세요.");
  if (next.phone_last4 !== undefined && next.phone_last4.length !== 4) {
    throw new Error("연락처 뒷자리 4자리를 입력해 주세요.");
  }

  if (next.display_name === undefined) {
    const { data: current, error: currentError } = await supabase
      .from("players")
      .select("name,phone_last4")
      .eq("id", id)
      .maybeSingle();

    if (currentError) throw new Error(currentError.message);
    if (!current) throw new Error("수정할 선수를 찾을 수 없습니다.");

    const name = next.name ?? (current.name as string);
    const phoneLast4 = next.phone_last4 ?? (current.phone_last4 as string);
    next.display_name = buildDisplayName(name, phoneLast4);
  }

  const { data, error } = await supabase
    .from("players")
    .update(next)
    .eq("id", id)
    .select("id,name,phone_last4,display_name,role,created_at")
    .single();

  if (error) throw new Error(error.message);
  const row = data as Player & { role?: unknown };
  return { ...row, role: normalizeRole(row.role) };
}

export async function setPlayerRole(id: string, role: PlayerRole) {
  return updatePlayer(id, { role });
}

export async function deletePlayer(id: string) {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) {
    const msg = error.message;
    if (/foreign key|violates|참조/i.test(msg) || /23503/.test(msg)) {
      throw new Error(
        "이 선수는 참석·경기 기록 등에 연결되어 있어 삭제할 수 없습니다. 먼저 관련 데이터를 정리해 주세요.",
      );
    }
    throw new Error(msg);
  }
}
