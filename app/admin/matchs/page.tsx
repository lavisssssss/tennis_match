"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  createSession,
  listSessions,
  updateSession,
  type Session,
  type SessionStatus,
} from "@/lib/matchs";
import {
  listAttendanceForSession,
  updateAttendanceCheckedIn,
  upsertAttendance,
  type AttendanceRowWithPlayer,
  type AttendanceStatus,
} from "@/lib/attendance";
import { useTierRoster } from "@/components/TierRosterProvider";
import { usePlayers } from "@/hooks/usePlayers";
import { DEFAULT_ELO } from "@/lib/ratings";

type FormState = {
  id?: string;
  date: string;
  location: string;
  start_time: string;
  end_time: string;
  description: string;
};

function formatTime(t: string) {
  return t.slice(0, 5);
}

function matchStatusLabel(status: SessionStatus) {
  if (status === "open") return "진행";
  if (status === "closed") return "종료";
  if (status === "deleted") return "삭제됨";
  return status;
}

function matchStatusClass(status: SessionStatus) {
  if (status === "open") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "closed") return "bg-slate-100 text-slate-700 border-slate-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function defaultFormFromMatch(m?: Session | null): FormState {
  return {
    id: m?.id,
    date: m?.date ?? new Date().toISOString().slice(0, 10),
    location: m?.location ?? "",
    start_time: m ? formatTime(m.start_time) : "07:00",
    end_time: m ? formatTime(m.end_time) : "09:00",
    description: m?.description ?? "",
  };
}

export default function AdminMatchsPage() {
  const { players, loading: playersLoading, error: playersError } = usePlayers();
  const { roster: tierRoster } = useTierRoster();
  const [matchs, setMatchs] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(() => defaultFormFromMatch(null));

  const isEditing = useMemo(() => Boolean(form.id), [form.id]);

  const [manageMatchId, setManageMatchId] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRowWithPlayer[]>([]);
  const [attendanceBusyPlayerId, setAttendanceBusyPlayerId] = useState<string | null>(
    null,
  );
  const [addPlayerId, setAddPlayerId] = useState<string>("");
  const [addStatus, setAddStatus] = useState<AttendanceStatus>("attend");

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const list = await listSessions({ statuses: ["open", "closed", "deleted"] });
      const sorted = [...list].sort((a, b) => {
        const byDate = b.date.localeCompare(a.date);
        if (byDate !== 0) return byDate;
        return b.start_time.localeCompare(a.start_time);
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
    async function load() {
      if (!manageMatchId) return;
      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        const rows = await listAttendanceForSession(manageMatchId);
        setAttendance(rows);
      } catch (e) {
        setAttendanceError(
          e instanceof Error ? e.message : "attendance 조회 중 오류가 발생했습니다.",
        );
        setAttendance([]);
      } finally {
        setAttendanceLoading(false);
      }
    }

    load();
  }, [manageMatchId]);

  function openCreate() {
    setToast(null);
    setForm(defaultFormFromMatch(null));
    setModalOpen(true);
  }

  function openEdit(m: Session) {
    setToast(null);
    setForm(defaultFormFromMatch(m));
    setModalOpen(true);
  }

  async function onSave() {
    setToast(null);
    setSaving(true);
    try {
      if (form.id) {
        await updateSession(form.id, {
          date: form.date,
          location: form.location,
          start_time: form.start_time,
          end_time: form.end_time,
          description: form.description,
        });
        setToast("매치를 수정했습니다.");
      } else {
        await createSession({
          date: form.date,
          location: form.location,
          start_time: form.start_time,
          end_time: form.end_time,
          description: form.description,
        });
        setToast("매치를 생성했습니다.");
      }
      setModalOpen(false);
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function setMatchStatus(id: string, status: SessionStatus) {
    setToast(null);
    setActionId(id);
    try {
      await updateSession(id, { status });
      setToast(status === "closed" ? "경기를 종료 처리했습니다." : "매치를 삭제 처리했습니다.");
      if (manageMatchId === id && status === "deleted") {
        setManageMatchId(null);
        setAttendance([]);
      }
      await refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "상태 변경 중 오류가 발생했습니다.");
    } finally {
      setActionId(null);
    }
  }

  async function changeAttendance(playerId: string, next: AttendanceStatus) {
    if (!manageMatchId) return;
    setToast(null);
    setAttendanceBusyPlayerId(playerId);
    try {
      const prev = attendance.find((r) => r.player_id === playerId);
      await upsertAttendance({
        session_id: manageMatchId,
        player_id: playerId,
        status: next,
      });
      if (prev && next !== "attend") {
        await updateAttendanceCheckedIn(prev.id, false);
      }
      const rows = await listAttendanceForSession(manageMatchId);
      setAttendance(rows);
      setToast("상태를 변경했습니다.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "상태 변경 중 오류가 발생했습니다.");
    } finally {
      setAttendanceBusyPlayerId(null);
    }
  }

  async function setCheckedInForRow(rowId: string, nextChecked: boolean) {
    const row = attendance.find((r) => r.id === rowId);
    if (!row || row.status !== "attend") return;
    setAttendanceBusyPlayerId(row.player_id);
    setToast(null);
    try {
      await updateAttendanceCheckedIn(rowId, nextChecked);
      setAttendance((prev) =>
        prev.map((r) => (r.id === rowId ? { ...r, checked_in: nextChecked } : r)),
      );
      setToast(nextChecked ? "출석 ON으로 저장했습니다." : "출석 OFF로 저장했습니다.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "출석 저장 중 오류가 발생했습니다.");
    } finally {
      setAttendanceBusyPlayerId(null);
    }
  }

  async function addAttendance() {
    if (!manageMatchId) return;
    if (!addPlayerId) {
      setToast("추가할 선수를 선택해 주세요.");
      return;
    }
    setToast(null);
    setAttendanceBusyPlayerId(addPlayerId);
    try {
      await upsertAttendance({
        session_id: manageMatchId,
        player_id: addPlayerId,
        status: addStatus,
      });
      const rows = await listAttendanceForSession(manageMatchId);
      setAttendance(rows);
      setAddPlayerId("");
      setAddStatus("attend");
      setToast("참석 인원을 추가했습니다.");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "참석 인원 추가 중 오류가 발생했습니다.");
    } finally {
      setAttendanceBusyPlayerId(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          매치(경기 일정) 관리 (Admin · Phase 3/4)
        </h2>
        <p className="text-xs text-slate-600">
          매치를 생성/수정하고, 참석 신청·출결(대관료 정산 대상)을 관리합니다.
        </p>
      </section>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            새 매치 생성
          </button>
          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            새로고침
          </button>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
        >
          Home
        </Link>
      </div>

      {toast ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
          {toast}
        </div>
      ) : null}

      <section className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-slate-800">매치 목록</p>
            <p className="text-[11px] text-slate-500">
              총 <span className="font-medium text-slate-700">{matchs.length}</span>개
            </p>
          </div>
          <span className="rounded-full bg-teal-500 px-3 py-1 text-[11px] font-medium text-white">
            Admin
          </span>
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
            아직 생성된 매치가 없습니다. “새 매치 생성”으로 추가해 주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {matchs.map((m) => {
              const busy = actionId === m.id;
              const isDeleted = m.status === "deleted";
              const isClosed = m.status === "closed";
              const isManaging = manageMatchId === m.id;

              return (
                <div
                  key={m.id}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${matchStatusClass(
                          m.status,
                        )}`}
                      >
                        {matchStatusLabel(m.status)}
                      </span>
                      {busy ? (
                        <p className="text-right text-[10px] font-medium text-slate-500">
                          처리 중...
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="break-words text-sm font-semibold text-slate-800">
                        {m.date} · {m.location}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {formatTime(m.start_time)}–{formatTime(m.end_time)}
                        {m.description ? ` · ${m.description}` : ""}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isManaging) {
                            setManageMatchId(null);
                            setAttendance([]);
                            return;
                          }
                          setAddPlayerId("");
                          setAddStatus("attend");
                          setManageMatchId(m.id);
                        }}
                        disabled={busy || isDeleted}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isManaging ? "닫기" : "출결관리"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatchStatus(m.id, "closed")}
                        disabled={busy || isDeleted || isClosed}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        경기종료
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(m)}
                        disabled={busy || isDeleted}
                        className="rounded-full bg-teal-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatchStatus(m.id, "deleted")}
                        disabled={busy || isDeleted}
                        className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {isManaging ? (
                    <div className="mt-3 rounded-xl bg-slate-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-800">출결 관리</p>
                          <p className="text-[11px] text-slate-500">
                            참석-출석 on 인 경우에만 대관료 정산목록에 포함됩니다.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            setToast(null);
                            setAttendanceLoading(true);
                            setAttendanceError(null);
                            try {
                              const rows = await listAttendanceForSession(m.id);
                              setAttendance(rows);
                            } catch (e) {
                              setAttendanceError(
                                e instanceof Error
                                  ? e.message
                                  : "attendance 조회 중 오류가 발생했습니다.",
                              );
                              setAttendance([]);
                            } finally {
                              setAttendanceLoading(false);
                            }
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          새로고침
                        </button>
                      </div>

                      {attendanceLoading ? (
                        <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                          불러오는 중...
                        </div>
                      ) : attendanceError ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                          {attendanceError}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {attendance.length === 0 ? (
                            <div className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                              아직 참석 신청이 없습니다.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {attendance.map((row) => {
                                const busyRow = attendanceBusyPlayerId === row.player_id;
                                return (
                                  <div
                                    key={row.id}
                                    className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                                      <p className="min-w-0 truncate text-sm font-medium text-slate-800">
                                        {row.player?.display_name ?? row.player_id}
                                      </p>
                                      <span className="text-[10px] tabular-nums text-slate-500">
                                        Elo{" "}
                                        {tierRoster.find((x) => x.player_id === row.player_id)?.elo ?? DEFAULT_ELO}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center justify-end gap-2 sm:shrink-0">
                                      {row.status === "attend" ? (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] font-medium text-slate-500">출석</span>
                                          <div
                                            className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5"
                                            role="group"
                                            aria-label="출석 여부"
                                          >
                                            <button
                                              type="button"
                                              disabled={busyRow}
                                              onClick={() => setCheckedInForRow(row.id, true)}
                                              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                                row.checked_in
                                                  ? "bg-teal-600 text-white shadow-sm"
                                                  : "bg-transparent text-slate-500 hover:bg-white"
                                              }`}
                                            >
                                              ON
                                            </button>
                                            <button
                                              type="button"
                                              disabled={busyRow}
                                              onClick={() => setCheckedInForRow(row.id, false)}
                                              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition disabled:opacity-50 ${
                                                !row.checked_in
                                                  ? "bg-slate-600 text-white shadow-sm"
                                                  : "bg-transparent text-slate-500 hover:bg-white"
                                              }`}
                                            >
                                              OFF
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">출석 — (참석 시 설정)</span>
                                      )}
                                      <select
                                        value={row.status}
                                        onChange={(e) =>
                                          changeAttendance(
                                            row.player_id,
                                            e.target.value as AttendanceStatus,
                                          )
                                        }
                                        disabled={busyRow}
                                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[12px] font-semibold text-slate-700 outline-none ring-teal-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        <option value="attend">참석</option>
                                        <option value="wait">대기</option>
                                        <option value="cancel">취소</option>
                                      </select>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                            <p className="text-sm font-semibold text-slate-800">
                              참석 인원 추가
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              선수 선택 후 상태를 지정해 추가합니다(이미 있으면 상태가 업데이트됩니다).
                            </p>

                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <select
                                value={addPlayerId}
                                onChange={(e) => setAddPlayerId(e.target.value)}
                                disabled={playersLoading || !!playersError}
                                className="sm:col-span-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <option value="">
                                  {playersLoading ? "선수 불러오는 중..." : "선수 선택"}
                                </option>
                                {players
                                  .filter((p) => !attendance.some((a) => a.player_id === p.id))
                                  .map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.display_name}
                                    </option>
                                  ))}
                              </select>
                              <select
                                value={addStatus}
                                onChange={(e) =>
                                  setAddStatus(e.target.value as AttendanceStatus)
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
                              >
                                <option value="attend">참석</option>
                                <option value="wait">대기</option>
                                <option value="cancel">취소</option>
                              </select>
                            </div>

                            {playersError ? (
                              <p className="mt-1 text-[11px] font-medium text-rose-700">
                                players 조회 오류: {playersError}
                              </p>
                            ) : null}

                            <button
                              type="button"
                              onClick={addAttendance}
                              disabled={!addPlayerId || attendanceBusyPlayerId === addPlayerId}
                              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              추가하기
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-800">
                  {isEditing ? "매치 수정" : "새 매치 생성"}
                </p>
                <p className="text-[11px] text-slate-500">
                  날짜/장소/시간/설명을 입력해 주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">날짜</span>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">장소</span>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((s) => ({ ...s, location: e.target.value }))}
                    placeholder="예: 항공대"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
                    autoComplete="off"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">시작 시간</span>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((s) => ({ ...s, start_time: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-slate-600">종료 시간</span>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((s) => ({ ...s, end_time: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
                  />
                </label>
              </div>

              <label className="space-y-1">
                <span className="text-[11px] font-medium text-slate-600">설명 (선택)</span>
                <input
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="예: 2코트, 라이트볼"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-teal-500 focus:ring-2"
                  autoComplete="off"
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


