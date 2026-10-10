"use client";

import { useEffect } from "react";

const VID_KEY = "ryugyeol_vid";
const DAY_KEY = "ryugyeol_vid_day";

/**
 * 방문 집계 (2026-10-10 수정안 26). 브라우저에 무작위 방문 번호를 하나 두고, 하루 한 번만 서버에 알린다.
 * 이름·생년월일·로그인 정보와 연결하지 않는다. 숫자는 관리자 화면에서만 보인다 (손님 화면에는 표시 안 함).
 */
export function VisitBeacon() {
  useEffect(() => {
    try {
      const day = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
      if (localStorage.getItem(DAY_KEY) === day) return;
      let vid = localStorage.getItem(VID_KEY);
      if (!vid) {
        vid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
        localStorage.setItem(VID_KEY, vid);
      }
      fetch("/api/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ vid }), keepalive: true })
        .then(() => localStorage.setItem(DAY_KEY, day))
        .catch(() => {});
    } catch {
      /* 저장소를 못 쓰는 브라우저 - 세지 않는다 */
    }
  }, []);
  return null;
}
