"use client";

import { useEffect, useMemo, useState } from "react";
import { PageMascot } from "@/components/PageMascot";
import { listApprovedMatches, parseScore, type MatchRecordWithJoins } from "@/lib/matches";
import { listSessions, type Session } from "@/lib/matchs";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function sortSessionsDesc(a: Session, b: Session) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  if (a.start_time !== b.start_time) return b.start_time.localeCompare(a.start_time);
  return b.created_at.localeCompare(a.created_at);
}

function teamLabel(a?: { name?: string; display_name: string } | null, b?: { name?: string; display_name: string } | null) {
  const left = a?.name ?? a?.display_name ?? "—";
  const right = b?.name ?? b?.display_name ?? "—";
  return `${left}·${right}`;
}

export default function MatchRecordsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [rows, setRows] = useState<MatchRecordWithJoins[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  async function refreshSessions() {
    setLoading(true);
    setError(null);
    try {
      const list = await listSessions({ statuses: ["open", "closed"] });
      setSessions([...list].sort(sortSessionsDesc));
    } catch (e) {
      setError(e instanceof Error ? e.message : "매치 일정을 불러오는 중 오류가 발생했습니다.");
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        setRows([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const list = await listApprovedMatches({ session_id: sessionId });
        setRows(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "승인된 경기 기록을 불러오는 중 오류가 발생했습니다.");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">결과 조회</h2>
        <p className="text-xs text-slate-600">
          승인된 경기 기록만 조회가능합니다.
        </p>
      </section>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PageMascot variant="records" />
        <label className="block space-y-1 pr-14">
          <span className="text-xs font-semibold text-slate-700">매치 일정 선택</span>
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-teal-300"
          >
            <option value="">선택하세요</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} {formatTime(s.start_time)} · {s.location}
              </option>
            ))}
          </select>
          {selectedSession ? (
            <p className="text-[11px] text-slate-500">
              선택됨: {selectedSession.date} {formatTime(selectedSession.start_time)}–{formatTime(selectedSession.end_time)}
              {selectedSession.description ? ` · ${selectedSession.description}` : ""}
            </p>
          ) : null}
        </label>

        <div className="mt-4">
          {loading ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">불러오는 중...</div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
          ) : !sessionId ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              매치 일정을 선택해 주세요.
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              승인된 경기 기록이 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((m) => {
                const { a, b } = parseScore(m.set1_score);
                const winnerSide: "A" | "B" | null = a === b ? null : a > b ? "A" : "B";
                const line = `[${teamLabel(m.teamA_p1, m.teamA_p2)} ${a} : ${b} ${teamLabel(m.teamB_p1, m.teamB_p2)}]`;
                return (
                  <div
                    key={m.id}
                    className="relative rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800"
                  >
                    {winnerSide === "A" ? (
                      <span className="absolute left-2 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Win
                      </span>
                    ) : null}
                    {winnerSide === "B" ? (
                      <span className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Win
                      </span>
                    ) : null}
                    <p className="mx-auto max-w-full break-words px-11 text-center text-sm font-medium leading-snug tabular-nums">
                      {line}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

