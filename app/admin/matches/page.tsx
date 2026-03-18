"use client";

import { useEffect, useMemo, useState } from "react";
import { listPendingMatches, setMatchStatus, type MatchRecordWithJoins } from "@/lib/matches";
import { onMatchApproved } from "@/lib/elo";
import { listPlayers, type Player } from "@/lib/players";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function nameOrId(p?: { id: string; display_name: string } | null, fallback?: string) {
  return p?.display_name ?? fallback ?? "—";
}

export default function AdminMatchesApprovePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<MatchRecordWithJoins[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);

  const [approvedByPlayerId, setApprovedByPlayerId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const approvedByName = useMemo(() => {
    const p = players.find((x) => x.id === approvedByPlayerId);
    return p?.display_name ?? "";
  }, [players, approvedByPlayerId]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const [list, p] = await Promise.all([listPendingMatches(), listPlayers()]);
      setRows(list);
      setPlayers(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "pending 경기 조회 중 오류가 발생했습니다.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(id: string) {
    setOk(null);
    setError(null);
    setBusyId(id);
    try {
      const updated = await setMatchStatus({ id, status: "approved", approved_by: approvedByName });
      const result = onMatchApproved(updated);
      if (result.winner === null) {
        setOk("승인 완료 · 동점(승패 판정 없음) · Elo 반영 없음");
      } else {
        setOk(
          `승인 완료 · winner=${result.winner} · eloΔ(가정)=` +
            result.deltas.map((d) => `${d.player_id.slice(0, 6)}:${d.delta}`).join(", "),
        );
      }
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "승인 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setOk(null);
    setError(null);
    setBusyId(id);
    try {
      await setMatchStatus({ id, status: "rejected" });
      setOk("반려 완료");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "반려 중 오류가 발생했습니다.");
    } finally {
      setBusyId(null);
    }
  }

  const pendingCount = useMemo(() => rows.length, [rows]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">경기 기록 승인</h2>
        <p className="text-xs text-slate-600">Guest가 올린 경기 기록(pending)을 승인/반려합니다.</p>
      </section>

      <div className="flex items-center justify-end gap-2">
        <span className="rounded-full bg-teal-500 px-4 py-1.5 text-[11px] font-medium text-white">
          Phase 5
        </span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">Pending 리스트</p>
            <p className="text-[11px] text-slate-500">{pendingCount}건</p>
          </div>
          <label className="min-w-[12rem] space-y-1">
            <span className="text-[11px] font-semibold text-slate-600">승인자(이름/닉네임)</span>
            <select
              value={approvedByPlayerId}
              onChange={(e) => setApprovedByPlayerId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
            >
              <option value="">선택하세요</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">불러오는 중...</div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {ok ? (
          <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {ok}
          </div>
        ) : null}

        {loading ? null : rows.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">pending 기록이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => {
              const session = m.session ?? null;
              const busy = busyId === m.id;
              return (
                <div key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-slate-800">
                        {session ? (
                          <>
                            {session.date} {formatTime(session.start_time)} · {session.location}
                          </>
                        ) : (
                          <>세션 정보 없음 (session_id={m.session_id.slice(0, 8)})</>
                        )}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        입력자: {m.created_by} · {new Date(m.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      pending
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl bg-slate-50 p-3">
                    <div className="grid grid-cols-1 gap-1 text-sm text-slate-800">
                      <p className="font-semibold">Team A</p>
                      <p className="text-sm">
                        {nameOrId(m.teamA_p1, m.teama_player1)} · {nameOrId(m.teamA_p2, m.teama_player2)}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-sm text-slate-800">
                      <p className="font-semibold">Team B</p>
                      <p className="text-sm">
                        {nameOrId(m.teamB_p1, m.teamb_player1)} · {nameOrId(m.teamB_p2, m.teamb_player2)}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-800">
                      <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold">
                        {m.set1_score}
                      </span>
                      {m.set3_score ? (
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold">
                          {m.set3_score}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy || !approvedByPlayerId}
                      onClick={() => approve(m.id)}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                        busy || !approvedByPlayerId ? "bg-slate-300" : "bg-teal-600 hover:bg-teal-700"
                      }`}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => reject(m.id)}
                      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                        busy
                          ? "border-slate-200 bg-slate-100 text-slate-400"
                          : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      반려
                    </button>
                    <span className="ml-auto text-[11px] font-medium text-slate-500">
                      id: {m.id.slice(0, 8)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

