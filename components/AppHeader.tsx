"use client";

import Link from "next/link";
import { usePlayerSession } from "@/hooks/usePlayerSession";

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0-3-3m0 0-3-3m3 3H12"
      />
    </svg>
  );
}

export function AppHeader() {
  const { session, ready, logout, isStaff } = usePlayerSession();

  return (
    <div className="flex items-center justify-between gap-2">
      <h1 className="min-w-0 text-lg font-bold leading-tight tracking-tight">
        <Link href="/" className="group">
          <span className="font-bold text-slate-800 transition-colors group-hover:text-slate-700">
            <span className="text-teal-600 transition-colors group-hover:text-teal-700">E</span>
            nsol{" "}
            <span className="text-teal-600 transition-colors group-hover:text-teal-700">T</span>
            ennis{" "}
            <span className="text-teal-600 transition-colors group-hover:text-teal-700">A</span>
            ces
          </span>
        </Link>
      </h1>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {!ready ? (
          <span className="text-[11px] text-slate-400">…</span>
        ) : session ? (
          <>
            <Link
              href="/my-page"
              title="마이페이지로 이동"
              className="group max-w-[9rem] truncate rounded-lg px-1.5 py-1 text-right text-[10px] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 sm:max-w-[15rem] sm:px-2 sm:text-[11px]"
            >
              환영합니다{" "}
              <span className="font-semibold text-teal-600 transition group-hover:text-teal-700">
                {session.name}
              </span>
              님!
            </Link>
            {isStaff ? (
              <Link
                href="/admin"
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 sm:px-3 sm:text-sm"
              >
                Admin
              </Link>
            ) : null}
            <button
              type="button"
              onClick={logout}
              title="로그아웃"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <LogoutIcon className="h-5 w-5" />
              <span className="sr-only">로그아웃</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
