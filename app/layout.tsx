import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tennis Club Match Manager",
  description: "테니스 동호회 경기 일정 및 Elo 관리 웹앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-100 text-slate-800">
        <div className="min-h-screen bg-slate-100">
          <header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm">
            <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
              <div className="space-y-0.5">
                <h1 className="text-base font-semibold tracking-tight text-slate-800">
                  <Link href="/" className="hover:underline">
                    Tennis Club Match Manager
                  </Link>
                </h1>
                <p className="text-[11px] text-slate-500">
                  테니스 동호회 경기 운영을 위한 MVP
                </p>
              </div>
              <div className="flex items-center gap-2">
                <nav className="hidden items-center gap-1 sm:flex">
                  <Link
                    href="/"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Home
                  </Link>
                  <Link
                    href="/matchs"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Matchs
                  </Link>
                  <Link
                    href="/match-entry"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Match Entry
                  </Link>
                  <Link
                    href="/match-records"
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Match Records
                  </Link>
                </nav>
                <Link
                  href="/admin"
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Admin
                </Link>
                <span className="rounded-full bg-teal-500 px-4 py-1.5 text-[11px] font-medium text-white">
                  Phase 5
                </span>
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-md px-4 py-4">{children}</main>
        </div>
      </body>
    </html>
  );
}

