"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { listPlayers, setPlayerRole, type Player, type PlayerRole } from "@/lib/players";

const ROLE_LABEL: Record<PlayerRole, string> = {
  member: "회원",
  staff: "운영진",
};

export default function AdminRolesPage() {
  const { session, login } = usePlayerSession();
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPlayers();
      setPlayers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "선수 목록을 불러오지 못했습니다.");
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onRoleChange(id: string, role: PlayerRole) {
    setToast(null);
    setBusyId(id);
    try {
      const updated = await setPlayerRole(id, role);
      if (session?.id === id) login(updated);
      setToast("저장했습니다.");
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-800">Admin 권한 관리</h2>
            <p className="text-xs text-slate-600">
              회원 / 운영진을 설정합니다. 운영진만 Admin 메뉴에 접근할 수 있습니다.
            </p>
          </div>
          <Link
            href="/admin"
            className="text-xs font-semibold text-teal-700 hover:underline"
          >
            ← Admin 홈
          </Link>
        </div>
      </section>

      {toast ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : players.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">등록된 선수가 없습니다.</div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">
              최초 운영진은 Supabase에서 해당 행의 <code className="rounded bg-slate-100 px-1">role</code>을{" "}
              <code className="rounded bg-slate-100 px-1">staff</code>로 설정해 주세요.
            </p>
            <ul className="divide-y divide-slate-100">
              {players.map((p) => {
                const busy = busyId === p.id;
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.display_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.name} · 뒤4자리 등록됨
                      </p>
                    </div>
                    <select
                      value={p.role}
                      disabled={busy}
                      onChange={(e) => onRoleChange(p.id, e.target.value as PlayerRole)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300 disabled:opacity-60"
                    >
                      <option value="member">{ROLE_LABEL.member}</option>
                      <option value="staff">{ROLE_LABEL.staff}</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
