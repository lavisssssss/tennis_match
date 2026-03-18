import type { Metadata } from "next";
import Link from "next/link";
import { MainNav } from "@/components/MainNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "LGES Tennis Manager (beta)",
  description: "테니스 동호회 경기 일정 및 Elo 관리 웹앱",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-100 font-sans text-slate-800">
        <div className="min-h-screen bg-slate-100">
          <header className="border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-sm">
            <div className="mx-auto max-w-md space-y-3 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-800">
                  <Link href="/" className="hover:text-teal-700">
                    LGES Tennis Manager{" "}
                    <span className="font-normal text-slate-500">(beta)</span>
                  </Link>
                </h1>
                <Link
                  href="/admin"
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Admin
                </Link>
              </div>
              <MainNav />
            </div>
          </header>
          <main className="mx-auto max-w-md px-4 py-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
