"use client";

import { useEffect, useLayoutEffect } from "react";

/**
 * My page 진입 시(로그인 직후 등) 스크롤을 맨 위로 두고,
 * iOS 등에서 남는 확대·포커스를 완화합니다.
 */
export function useResetViewportZoomOnMount() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  useEffect(() => {
    function run() {
      const ae = document.activeElement;
      if (ae instanceof HTMLElement) ae.blur();

      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;

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
