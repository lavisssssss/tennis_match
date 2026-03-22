"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { getAttendance, upsertAttendance, type AttendanceStatus } from "@/lib/attendance";
import { PageMascot } from "@/components/PageMascot";
import { listUpcomingOpenSessions, type Session } from "@/lib/matchs";

function formatDate(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString("ko-KR", { weekday: "short", month: "2-digit", day: "2-digit" });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

export default function ParticipatePage() {
  const { session, ready, logout } = usePlayerSession();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const playerId = session?.id ?? "";
  const [status, setStatus] = useState<AttendanceStatus>("attend");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  useEffect(() => {
    async function run() {
      setSessionLoading(true);
      setSessionError(null);
      try {
        const list = await listUpcomingOpenSessions({ limit: 10 });
        setSessions(list);
        setSessionId((cur) => {
          if (cur && list.some((s) => s.id === cur)) return cur;
          return list[0]?.id ?? "";
        });
      } catch (e) {
        setSessionError(e instanceof Error ? e.message : "다음 경기 조회 중 오류가 발생했습니다.");
        setSessions([]);
        setSessionId("");
      } finally {
        setSessionLoading(false);
      }
    }

    run();
  }, []);

  useEffect(() => {
    async function syncExisting() {
      if (!sessionId || !playerId) return;
      setStatusLoading(true);
      setToast(null);
      try {
        const existing = await getAttendance(sessionId, playerId);
        if (existing?.status) setStatus(existing.status);
        else setStatus("attend");
      } catch (e) {
        setToast(e instanceof Error ? e.message : "현재 참석 상태를 불러오지 못했습니다.");
      } finally {
        setStatusLoading(false);
      }
    }

    syncExisting();
  }, [sessionId, playerId]);

  async function onSave() {
    if (!sessionId) {
      setToast("경기 일정을 선택해 주세요.");
      return;
    }
    if (!playerId) {
      setToast("로그인이 필요합니다.");
      return;
    }

    setSaving(true);
    setToast(null);
    try {
      await upsertAttendance({ session_id: sessionId, player_id: playerId, status });
      setToast("저장했습니다.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
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
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">참여 신청</h2>
          <p className="text-xs text-slate-600">
            로그인은 홈에서 할 수 있습니다. 로그인 후 다시 이 페이지로 오시면 참석 여부를 입력할 수 있습니다.
          </p>
        </section>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
          <p className="font-medium">로그인이 필요합니다.</p>
          <Link
            href="/"
            className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          참여 신청
        </h2>
        <p className="text-xs text-slate-600">
          다가오는 경기 일정을 확인하고 참석여부를 입력합니다. (입력 후 수정가능)
        </p>
      </section>

      {toast ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PageMascot variant="participate" />
        <div className="mb-4 flex items-start justify-between gap-3 pr-14">
          <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Upcoming Matchs
            </p>
            <p className="text-sm font-medium text-slate-800">
              {sessionLoading
                ? "불러오는 중..."
                : selectedSession
                  ? `${formatDate(selectedSession.date)} · ${selectedSession.location}`
                  : "다가오는 경기가 없습니다"}
            </p>
            <p className="text-[11px] text-slate-500">
              {selectedSession
                ? `${formatTime(selectedSession.start_time)}–${formatTime(selectedSession.end_time)}${selectedSession.description ? ` · ${selectedSession.description}` : ""}`
                : sessionError
                  ? sessionError
                  : "Admin이 먼저 세션을 생성해 주세요."}
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-teal-100 bg-teal-50/80 px-3 py-2">
          <p className="text-xs text-slate-700">
            <span className="font-medium text-slate-800">{session.display_name}</span>
            <span className="text-slate-500"> 님으로 로그인됨</span>
          </p>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-600">
              경기 일정 선택
            </span>
            <select
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              disabled={sessionLoading || sessions.length === 0}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sessionLoading ? (
                <option value="">불러오는 중...</option>
              ) : sessions.length === 0 ? (
                <option value="">다가오는 경기가 없습니다</option>
              ) : (
                sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDate(s.date)} · {s.location} ({formatTime(s.start_time)}–{formatTime(s.end_time)})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[11px] font-medium text-slate-600">참석 상태</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
              disabled={!sessionId || !playerId || statusLoading}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="attend">참석</option>
              <option value="wait">대기</option>
              <option value="cancel">취소</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onSave}
            disabled={!sessionId || !playerId || saving}
            className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </section>
    </div>
  );
}
