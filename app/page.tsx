"use client";

import { useEffect, useMemo, useState } from "react";
import { usePlayers } from "@/hooks/usePlayers";
import { getAttendance, upsertAttendance, type AttendanceStatus } from "@/lib/attendance";
import { listUpcomingOpenSessions, type Session } from "@/lib/matchs";

function formatDate(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString("ko-KR", { weekday: "short", month: "2-digit", day: "2-digit" });
}

function formatTime(t: string) {
  return t.slice(0, 5);
}

export default function HomePage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [playerId, setPlayerId] = useState<string>("");
  const [status, setStatus] = useState<AttendanceStatus>("attend");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === sessionId) ?? null,
    [sessions, sessionId],
  );

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId) ?? null,
    [players, playerId],
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
      setToast("이름을 선택해 주세요.");
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

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          홈 (Phase 3)
        </h2>
        <p className="text-xs text-slate-600">
          다음 경기 1개를 확인하고, 이름/참석 상태를 선택해 저장합니다.
        </p>
      </section>

      {toast ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
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
          <span className="shrink-0 rounded-full bg-teal-500 px-4 py-1.5 text-[11px] font-medium text-white">
            참석 신청
          </span>
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
            <span className="text-[11px] font-medium text-slate-600">이름 선택</span>
            <select
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
              disabled={playersLoading || !!playersError}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">{playersLoading ? "불러오는 중..." : "선택해 주세요"}</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}
                </option>
              ))}
            </select>
            {playersError ? (
              <p className="text-[11px] text-rose-700">players 조회 오류: {playersError}</p>
            ) : null}
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
            {selectedPlayer ? (
              <p className="text-[11px] text-slate-500">
                선택: <span className="font-medium text-slate-700">{selectedPlayer.display_name}</span>
              </p>
            ) : null}
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

