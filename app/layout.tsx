import type { Metadata, Viewport } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AppProviders } from "@/components/AppProviders";
import { MainNav } from "@/components/MainNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ensol Tennis Aces",
  description: "테니스 동호회 경기 일정 및 Elo 관리 웹앱",
};

/** 인앱·외부 링크 진입 시 노치/상단 크롬 아래로 헤더가 오도록 safe-area 반영 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
        <AppProviders>
          <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white/90 pt-[max(4rem,calc(env(safe-area-inset-top,0px)+1.25rem))] shadow-sm backdrop-blur-sm md:pt-[max(1rem,env(safe-area-inset-top,0px))]">
              <div className="mx-auto max-w-md space-y-3 px-4 py-3">
                <AppHeader />
                <MainNav />
              </div>
            </header>
            <main className="mx-auto max-w-md px-4 py-4">{children}</main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
