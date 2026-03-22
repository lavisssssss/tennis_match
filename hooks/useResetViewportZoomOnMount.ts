"use client";

import { useEffect } from "react";

/**
 * 로그인 직후(특히 iOS Safari) 남는 뷰포트 확대를 완화합니다.
 * — 이전 화면에서 포커스된 input 해제
 * — zoom 을 지원하는 엔진에서는 100%(1)로 맞춤
 */
export function useResetViewportZoomOnMount() {
  useEffect(() => {
    function run() {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) ae.blur();

      document.documentElement.style.zoom = "1";
      document.body.style.zoom = "1";
    }

    run();
    const t0 = window.setTimeout(run, 0);
    const t1 = window.setTimeout(run, 150);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
    };
  }, []);
}
