"use client";

type Props = {
  wins: number;
  losses: number;
  size?: number;
  stroke?: number;
  className?: string;
};

/** SVG 도넛: 승(틸) / 패(슬레이트) */
export function WinLossDonut({
  wins,
  losses,
  size = 132,
  stroke = 14,
  className = "",
}: Props) {
  const total = wins + losses;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const winFrac = total > 0 ? wins / total : 0;
  const winLen = c * winFrac;
  const lossLen = Math.max(0, c - winLen);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`shrink-0 ${className}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden
    >
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-slate-200"
      />
      {total > 0 ? (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={`${winLen} ${lossLen}`}
          strokeLinecap="round"
          className="text-teal-600"
        />
      ) : null}
    </svg>
  );
}
