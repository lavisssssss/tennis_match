"use client";

import Link from "next/link";

type Props = {
  title?: string;
  description?: string;
};

export function LoginRequiredCard({
  title = "로그인이 필요합니다",
  description = "홈에서 로그인한 뒤 다시 이용해 주세요.",
}: Props) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-sm">
      <p className="font-medium">{title}</p>
      <p className="mt-2 text-xs text-amber-800/90">{description}</p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
      >
        홈(로그인)으로 이동
      </Link>
    </div>
  );
}
