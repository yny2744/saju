"use client";

import { useEffect } from "react";
import { SRC_COOKIE_NAME, SRC_MAX_AGE, sourceFromUrl } from "@/lib/source";

/** 광고·글 주소의 utm 꼬리표를 30일 동안 기억 (처음 받은 것 우선 - 덮어쓰지 않는다). src/lib/source.ts */
export function SrcCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split("; ").some((c) => c.startsWith(`${SRC_COOKIE_NAME}=`))) return;
      const v = sourceFromUrl(window.location.search, window.location.pathname);
      if (!v) return;
      document.cookie = `${SRC_COOKIE_NAME}=${encodeURIComponent(v)}; Max-Age=${SRC_MAX_AGE}; Path=/; SameSite=Lax`;
    } catch {
      /* 쿠키를 못 써도 서비스 이용에는 지장 없음 */
    }
  }, []);
  return null;
}
