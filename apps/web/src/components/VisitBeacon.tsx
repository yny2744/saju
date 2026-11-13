"use client";

import { useEffect } from "react";
import { SRC_COOKIE_NAME, SRC_COOKIE_ON, sourceFromUrl } from "@/lib/source";

const VID_KEY = "ryugyeol_vid";
const DAY_KEY = "ryugyeol_vid_day";

/**
 * 방문 집계 (2026-10-10 수정안 26). 브라우저에 무작위 방문 번호를 하나 두고, 하루 한 번만 서버에 알린다.
 * 이름·생년월일·로그인 정보와 연결하지 않는다. 숫자는 관리자 화면에서만 보인다 (손님 화면에는 표시 안 함).
 * 2026-11-14 유샘: 홍보 링크(utm 꼬리표)로 들어온 순간 플랫폼별 방문자만 센다 - 쿠키에 남기지 않고 결제와도 잇지 않는다.
 *   (같은 날 이미 센 방문자라도 꼬리표 주소로 들어오면 그 플랫폼에 한 번 더한다. 같은 날·같은 플랫폼은 한 번만)
 */
export function VisitBeacon() {
  useEffect(() => {
    try {
      const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      const urlSrc = sourceFromUrl(window.location.search, window.location.pathname);
      if (localStorage.getItem(DAY_KEY) === day && !urlSrc) return;
      let vid = localStorage.getItem(VID_KEY);
      if (!vid) {
        vid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem(VID_KEY, vid);
      }
      fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vid, src: urlSrc ?? (!SRC_COOKIE_ON ? null : document.cookie.split("; ").find((c) => c.startsWith(`${SRC_COOKIE_NAME}=`))?.slice(SRC_COOKIE_NAME.length + 1) ?? null) }), keepalive: true })
        .then(() => localStorage.setItem(DAY_KEY, day))
        .catch(() => {});
    } catch {
      /* 저장소를 못 쓰는 브라우저 - 세지 않는다 */
    }
  }, []);
  return null;
}
