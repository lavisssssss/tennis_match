"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  listAttendanceForSession,
  updateAttendanceVenueSettled,
  type AttendanceRowWithPlayer,
} from "@/lib/attendance";
import { listSessionsForVenueFee, updateSession, type Session } from "@/lib/sessions";

function formatTime(t: string) {
  return t.slice(0, 5);
}

function isVenueClosed(s: Session) {
  return Boolean(s.venue_fee_closed);
}

export default function AdminVenueFeePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [attendRows, setAttendRows] = useState<AttendanceRowWithPlayer[]>([]);
  const [settledMap, setSettledMap] = useState<Record<string, boolean>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const selectedSession = sessions.find((s) => s.id === selectedId) ?? null;
  const closed = selectedSession ? isVenueClosed(selectedSession) : false;

  const refreshList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const list = await listSessionsForVenueFee();
      setSessions(list);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "일정을 불러오지 못했습니다.");
      setSessions([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  const loadDetail = useCallback(async (sessionId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const rows = await listAttendanceForSession(sessionId);
      const attendOnly = rows.filter((r) => r.status === "attend");
      setAttendRows(attendOnly);
      const m: Record<string, boolean> = {};
      for (const r of attendOnly) m[r.id] = Boolean(r.venue_settled);
      setSettledMap(m);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "참석자를 불러오지 못했습니다.");
      setAttendRows([]);
      setSettledMap({});
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setAttendRows([]);
      setSettledMap({});
      return;
    }
    loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  function toggleSettled(attendanceId: string, next: boolean) {
    if (closed) return;
    setSettledMap((prev) => ({ ...prev, [attendanceId]: next }));
  }

  async function onSave() {
    if (!selectedId || attendRows.length === 0) {
      setToast("저장할 참석 데이터가 없습니다.");
      return;
    }
    setSaving(true);
    setToast(null);
    try {
      await Promise.all(
        attendRows.map((r) =>
          updateAttendanceVenueSettled(r.id, Boolean(settledMap[r.id])),
        ),
      );
      setToast("정산 상태를 저장했습니다.");
      await loadDetail(selectedId);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function onCloseVenueFee() {
    if (!selectedId) return;
    setClosing(true);
    setToast(null);
    try {
      await updateSession(selectedId, { venue_fee_closed: true });
      setToast("대관료를 마감완료 처리했습니다.");
      await refreshList();
      await loadDetail(selectedId);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "마감 처리 중 오류가 발생했습니다.");
    } finally {
      setClosing(false);
    }
  }

  async function onReopenVenueFee() {
    if (!selectedId) return;
    setClosing(true);
    setToast(null);
    try {
      await updateSession(selectedId, { venue_fee_closed: false });
      setToast("마감을 취소했습니다. 정산 토글을 다시 수정할 수 있습니다.");
      await refreshList();
      await loadDetail(selectedId);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-800">
              대관료 관리 (Phase 6)
            </h2>
            <p className="text-xs text-slate-600">총무용 · 일정별 참석자 정산 및 마감</p>
          </div>
          <Link href="/admin" className="text-xs font-semibold text-teal-700 hover:underline">
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
        <p className="text-sm font-semibold text-slate-800">매치 일정</p>
        <p className="text-[11px] text-slate-500">최신 일정이 위에 표시됩니다.</p>

        {listLoading ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">불러오는 중...</div>
        ) : listError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {listError}
            <p className="mt-2 text-[11px] text-rose-800/90">
              `venue_fee` 컬럼이 없다면 supabase/venue_fee.sql 을 실행했는지 확인하세요.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">일정이 없습니다.</div>
        ) : (
          <ul className="mt-3 space-y-2">
            {sessions.map((s) => {
              const active = s.id === selectedId;
              const done = isVenueClosed(s);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full flex-col gap-1 rounded-xl border p-3 text-left transition sm:flex-row sm:items-center sm:justify-between ${
                      active
                        ? "border-teal-300 bg-teal-50/50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        {s.date} · {s.location}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatTime(s.start_time)}–{formatTime(s.end_time)}
                        {s.description ? ` · ${s.description}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 self-start rounded-full border px-2.5 py-0.5 text-[10px] font-bold sm:self-center ${
                        done
                          ? "border-slate-300 bg-slate-100 text-slate-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {done ? "마감완료" : "마감진행중"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selectedId && selectedSession ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">참석자 · 정산</p>
          <p className="text-[11px] text-slate-500">
            참석으로 신청한 인원만 표시합니다. 정산 완료는 토글로 표시합니다.
          </p>

          {detailLoading ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">불러오는 중...</div>
          ) : detailError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {detailError}
            </div>
          ) : (
            <>
              <p className="mt-3 text-xs font-medium text-slate-700">
                참석 <span className="text-teal-700">{attendRows.length}</span>명
              </p>

              {attendRows.length === 0 ? (
                <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  참석 신청이 없습니다.
                </div>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">
                  {attendRows.map((r) => {
                    const on = Boolean(settledMap[r.id]);
                    return (
                      <li
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5"
                      >
                        <span className="text-sm font-medium text-slate-800">
                          {r.player?.display_name ?? r.player_id}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium text-slate-500">
                            {on ? "정산완료" : "미정산"}
                          </span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            disabled={closed}
                            onClick={() => toggleSettled(r.id, !on)}
                            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                              closed ? "cursor-not-allowed opacity-50" : "hover:opacity-90"
                            } ${on ? "bg-teal-600" : "bg-slate-300"}`}
                          >
                            <span
                              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                                on ? "left-5" : "left-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  disabled={saving || closed || attendRows.length === 0}
                  onClick={onSave}
                  className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white ${
                    saving || closed || attendRows.length === 0
                      ? "bg-slate-300"
                      : "bg-teal-600 hover:bg-teal-700"
                  }`}
                >
                  {saving ? "저장 중..." : "저장"}
                </button>

                {!closed ? (
                  <button
                    type="button"
                    disabled={closing}
                    onClick={onCloseVenueFee}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                      closing
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-slate-300 bg-slate-800 text-white hover:bg-slate-900"
                    }`}
                  >
                    {closing ? "처리 중..." : "마감완료"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={closing}
                    onClick={onReopenVenueFee}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                      closing
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    }`}
                  >
                    {closing ? "처리 중..." : "마감취소"}
                  </button>
                )}
              </div>

              {closed ? (
                <p className="mt-2 text-[11px] text-slate-500">
                  마감완료된 일정은 정산 토글을 바꿀 수 없습니다. 수정이 필요하면 마감취소 후 변경하세요.
                </p>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}
