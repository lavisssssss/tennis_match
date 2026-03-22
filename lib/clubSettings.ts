import { supabase } from "@/lib/supabaseClient";

const TABLE = "club_settings";

/** 테이블/RLS 미설정 시 false (pending만 사용) */
export async function getAutoApproveMatches(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select("auto_approve_matches")
      .eq("id", 1)
      .maybeSingle();

    if (error) return false;
    return Boolean(data?.auto_approve_matches);
  } catch {
    return false;
  }
}

export async function setAutoApproveMatches(value: boolean): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .upsert({ id: 1, auto_approve_matches: value }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}
