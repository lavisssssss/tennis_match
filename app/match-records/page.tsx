"use client";

import { useEffect, useMemo, useState } from "react";
import { ApprovedMatchResultRow } from "@/components/ApprovedMatchResultRow";
import { LoginRequiredCard } from "@/components/LoginRequiredCard";
import { PageMascot } from "@/components/PageMascot";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { listApprovedMatches, type MatchRecordWithJoins } from "@/lib/matches";
import { listSessions, type Session } from "@/lib/matchs";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function sortSessionsDesc(a: Session, b: Session) {
  if (a.date !== b.date) return b.date.localeCompare(a.date);
  if (a.start_time !== b.start_time) return b.start_time.localeCompare(a.start_time);
  return b.created_at.localeCompare(a.created_at);
}

export default function MatchRecordsPage() {
  const { session, ready: sessionReady } = usePlayerSession();
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

  if (!sessionReady) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600 shadow-sm">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
        <section className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">결과 조회</h2>
          <p className="text-xs text-slate-600">로그인 후 승인된 경기 기록을 조회할 수 있습니다.</p>
        </section>
        <LoginRequiredCard />
      </div>
    );
  }

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
              {rows.map((m) => (
                <ApprovedMatchResultRow key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

