"use client";

import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-4 py-2">
      <section className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-slate-800">
          Admin 대시보드
        </h2>
        <p className="text-xs text-slate-600">
          선수/매치(경기 일정) 관리 화면으로 이동합니다.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <Link
          href="/admin/players"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          선수 관리 (Phase 2)
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            선수 등록/수정 및 드롭다운 데이터 준비
          </p>
        </Link>

        <Link
          href="/admin/matchs"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          매치(경기 일정) 관리 (Phase 3)
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            매치 생성/수정 및 목록/참석 관리
          </p>
        </Link>

        <Link
          href="/admin/matches"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          경기 기록 승인 (Phase 5)
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            Guest 경기 기록(pending) 승인/반려
          </p>
        </Link>

        <Link
          href="/matchs"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          Matchs (Guest)
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            매치 목록 및 참석 현황 확인
          </p>
        </Link>

        <Link
          href="/match-entry"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          경기 결과 입력 (Guest)
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            경기 결과 제출(승인 대기)
          </p>
        </Link>

        <Link
          href="/match-records"
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50"
        >
          경기 기록 조회 (Guest)
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            승인된 경기 기록 확인
          </p>
        </Link>
      </section>
    </div>
  );
}

