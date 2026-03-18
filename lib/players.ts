import { supabase } from "@/lib/supabaseClient";

export type Player = {
  id: string;
  name: string;
  phone_last4: string;
  display_name: string;
  created_at: string;
};

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
    .select("id,name,phone_last4,display_name,created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Player[];
}

export async function createPlayer(input: { name: string; phone_last4: string }) {
  const name = normalizeName(input.name);
  const phone_last4 = normalizePhoneLast4(input.phone_last4);

  if (!name) throw new Error("이름을 입력해 주세요.");
  if (phone_last4.length !== 4) throw new Error("연락처 뒷자리 4자리를 입력해 주세요.");

  const display_name = buildDisplayName(name, phone_last4);

  const { data, error } = await supabase
    .from("players")
    .insert({ name, phone_last4, display_name })
    .select("id,name,phone_last4,display_name,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Player;
}

export async function updatePlayer(
  id: string,
  patch: Partial<Pick<Player, "name" | "phone_last4" | "display_name">>,
) {
  const next: Partial<Pick<Player, "name" | "phone_last4" | "display_name">> = {};

  if (typeof patch.name === "string") next.name = normalizeName(patch.name);
  if (typeof patch.phone_last4 === "string")
    next.phone_last4 = normalizePhoneLast4(patch.phone_last4);
  if (typeof patch.display_name === "string")
    next.display_name = patch.display_name.trim();

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
    .select("id,name,phone_last4,display_name,created_at")
    .single();

  if (error) throw new Error(error.message);
  return data as Player;
}

