"use client";

import { useEffect, useMemo, useState } from "react";
import { LoginRequiredCard } from "@/components/LoginRequiredCard";
import { PageMascot } from "@/components/PageMascot";
import { TierMarkImage } from "@/components/TierMarkImage";
import { usePlayerSession } from "@/hooks/usePlayerSession";
import { listAttendanceForSession, type AttendanceRowWithPlayer } from "@/lib/attendance";
import { listSessions, type Session, type SessionStatus } from "@/lib/matchs";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function matchStatusLabel(status: SessionStatus) {
  if (status === "open") return "진행";
  if (status === "closed") return "종료";
  return "삭제됨";
}

function matchStatusClass(status: SessionStatus) {
  if (status === "open") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "closed") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function statusLabel(status: string) {
  if (status === "attend") return "참석";
  if (status === "wait") return "대기";
  if (status === "cancel") return "취소";
  return status;
}

function statusClass(status: string) {
  if (status === "attend") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "wait") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "cancel") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function attendeeDisplayName(row: AttendanceRowWithPlayer) {
  const d = row.player?.display_name?.trim();
  if (d) return d;
  const n = row.player?.name?.trim();
  if (n) return n;
  return "이름 없음";
}

export default function MatchsPage() {
  const { session, ready: sessionReady } = usePlayerSession();
  const [matchs, setMatchs] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRowWithPlayer[]>([]);

  const selected = useMemo(
    () => matchs.find((s) => s.id === selectedId) ?? null,
    [matchs, selectedId],
  );

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listSessions({ statuses: ["open", "closed"] });
      const sorted = [...list].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date); // date desc
        if (a.start_time !== b.start_time) return b.start_time.localeCompare(a.start_time); // time desc
        return b.created_at.localeCompare(a.created_at);
      });
      setMatchs(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "matchs 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadAttendance() {
      if (!selectedId) return;
      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        const rows = await listAttendanceForSession(selectedId);
        setAttendance(rows);
      } catch (e) {
        setAttendanceError(e instanceof Error ? e.message : "attendance 조회 중 오류가 발생했습니다.");
        setAttendance([]);
      } finally {
        setAttendanceLoading(false);
      }
    }

    loadAttendance();
  }, [selectedId]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { attend: 0, wait: 0, cancel: 0 };
    for (const row of attendance) map[row.status] = (map[row.status] ?? 0) + 1;
    return map;
  }, [attendance]);

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
          <h2 className="text-xl font-semibold tracking-tight text-slate-800">매치 조회</h2>
          <p className="text-xs text-slate-600">로그인 후 매치와 참석 현황을 확인할 수 있습니다.</p>
        </section>
        <LoginRequiredCard />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          매치 조회
        </h2>
        <p className="text-xs text-slate-600">
          경기 일정을 확인하고, 선택한 매치의 참석 현황을 확인합니다.
        </p>
      </section>

      <section className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <PageMascot variant="matchs" />
        <div className="mb-3 space-y-0.5 pr-14">
          <p className="text-sm font-semibold text-slate-800">매치 리스트</p>
          <p className="text-[11px] text-slate-500">
            탭해서 참석 현황을 확인하세요.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            불러오는 중...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {error}
          </div>
        ) : matchs.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            매치가 없습니다. Admin에서 매치를 생성해 주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {matchs.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId((cur) => (cur === s.id ? null : s.id))}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-teal-200 bg-teal-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {s.date} · {s.location}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        {s.description ? ` · ${s.description}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${matchStatusClass(
                          s.status,
                        )}`}
                      >
                        {matchStatusLabel(s.status)}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-medium ${
                          active
                            ? "border-teal-200 bg-white text-teal-700"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        {active ? "닫기" : "보기"}
                      </span>
                    </div>
                  </div>

                  {active ? (
                    <div className="mt-3 rounded-xl bg-white p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-medium text-slate-600">
                          참석 현황
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          참석 {counts.attend}
                        </span>
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          대기 {counts.wait}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          취소 {counts.cancel}
                        </span>
                      </div>

                      {attendanceLoading ? (
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          불러오는 중...
                        </div>
                      ) : attendanceError ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {attendanceError}
                        </div>
                      ) : attendance.length === 0 ? (
                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                          아직 참석 신청이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2 px-1 text-[10px] font-semibold text-slate-500">
                            <span className="w-7 text-center">마크</span>
                            <span>이름</span>
                            <span className="text-right">참석현황</span>
                          </div>
                          {attendance.map((row) => (
                            <div
                              key={row.id}
                              className="grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                            >
                              <div className="flex w-7 shrink-0 justify-center">
                                <TierMarkImage playerId={row.player_id} size={22} />
                              </div>
                              <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                                {attendeeDisplayName(row)}
                              </span>
                              <span
                                className={`shrink-0 justify-self-end rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass(
                                  row.status,
                                )}`}
                              >
                                {statusLabel(row.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">
            팁
          </p>
          <p className="mt-1 text-xs text-slate-600">
            참여신청에서 저장한 참석 상태는 이 화면과 Admin의 “경기 일정 관리”에서 확인할 수 있습니다.
          </p>
        </section>
      ) : null}
    </div>
  );
}

