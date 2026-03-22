"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlayerSession } from "@/hooks/usePlayerSession";

/** 한 줄 또는 2글자+2글자 두 줄(참여/신청 등) */
const NAV_PUBLIC = [
  { href: "/my-page", lines: ["MY"] as const, exact: true, auth: false as const },
  { href: "/participate", lines: ["참여", "신청"] as const, exact: true, auth: false as const },
] as const;

const NAV_AUTH = [
  { href: "/matchs", lines: ["매치", "조회"] as const, exact: false, auth: true as const },
  { href: "/match-entry", lines: ["결과", "등록"] as const, exact: false, auth: true as const },
  { href: "/match-records", lines: ["결과", "조회"] as const, exact: false, auth: true as const },
  { href: "/ranking", lines: ["랭킹"] as const, exact: true, auth: true as const },
] as const;

export function MainNav() {
  const pathname = usePathname() ?? "";
  const { session, ready } = usePlayerSession();

  const items = [...NAV_PUBLIC, ...(ready && session ? NAV_AUTH : [])];

  return (
    <nav className="flex w-full min-w-0 flex-nowrap items-stretch gap-1 sm:gap-1.5">
      {items.map(({ href, lines, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "flex min-h-10 min-w-0 flex-1 basis-0 flex-col items-center justify-center rounded-full bg-teal-500 px-1 py-1.5 text-center text-[11px] font-semibold leading-tight text-white shadow-sm transition hover:bg-teal-600 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-xs"
                : "flex min-h-10 min-w-0 flex-1 basis-0 flex-col items-center justify-center rounded-full border border-slate-200 bg-white px-1 py-1.5 text-center text-[11px] font-medium leading-tight text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-0 sm:px-2.5 sm:py-1.5 sm:text-xs"
            }
          >
            {lines.length === 1 ? (
              lines[0]
            ) : (
              <>
                <span className="block">{lines[0]}</span>
                <span className="block">{lines[1]}</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
