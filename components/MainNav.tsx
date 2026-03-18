"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "참여신청", exact: true },
  { href: "/matchs", label: "매치조회", exact: false },
  { href: "/match-entry", label: "결과등록", exact: false },
  { href: "/match-records", label: "결과조회", exact: false },
] as const;

export function MainNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex w-full flex-wrap items-center justify-center gap-1.5 sm:justify-end sm:gap-2">
      {NAV.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "rounded-full bg-teal-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-600"
                : "rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
