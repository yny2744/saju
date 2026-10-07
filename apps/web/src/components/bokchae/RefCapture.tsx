"use client";

import { useEffect } from "react";
import { REF_CODE_RE, REF_COOKIE_NAME } from "@/lib/bokchae";

/**
 * 친구 초대 링크(…/?ref=CODE)로 들어오면 초대 코드를 30일 동안 기억한다.
 * 친구가 그 사이 처음 가입(필수 동의)하면 서버가 이 쿠키를 읽어 초대한 사람에게 복채를 준다.
 * 이미 다른 코드가 있으면 덮어쓰지 않는다(처음 받은 링크 우선).
 */
export function RefCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref")?.toUpperCase();
      if (!code || !REF_CODE_RE.test(code)) return;
      if (document.cookie.split("; ").some((c) => c.startsWith(`${REF_COOKIE_NAME}=`))) return;
      document.cookie = `${REF_COOKIE_NAME}=${code}; Max-Age=${60 * 60 * 24 * 30}; Path=/; SameSite=Lax`;
    } catch {
      /* 쿠키를 못 써도 서비스 이용에는 지장 없음 */
    }
  }, []);
  return null;
}
