"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { roomHome } from "@/lib/roomHome";

/**
 * 머리줄 뒤로가기 (2026-11-01 유샘: 웹과 앱 모두) - 앱(홈 화면 아이콘)으로 열면 브라우저 단추가 없고, 아이폰은 뒤로 갈 길이 없다.
 *   대문(첫 화면)에서는 숨긴다.
 *   사이트 안에서 들어온 화면이면 바로 앞 화면으로, 알림·공유 링크로 바로 들어와 앞 화면이 없으면 대문으로 (사이트 밖으로 튕겨 나가지 않게).
 */
export function BackButton() {
  const pathname = usePathname();
  const first = useRef(true);
  const [inSite, setInSite] = useState(false);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      try {
        setInSite(document.referrer !== "" && new URL(document.referrer).origin === location.origin);
      } catch {
        setInSite(false);
      }
      return;
    }
    setInSite(true); // 사이트 안에서 화면이 바뀌었다
  }, [pathname]);

  if (pathname === "/") return null;
  // 2026-11-03 유샘: 뒤로가기는 바로 앞 단계로 - 관 안의 단계(roomStep)·받침 칸(rg)이 있으면 한 칸 뒤로,
  //   앞 기록이 없으면 메인 첫 화면 맨 위가 아니라 메인에서 그 관이 들어 있는 길·운이 펼쳐진 자리로 (lib/roomHome.ts)
  const back = () => {
    const st = (history.state ?? {}) as { roomStep?: string; rg?: string };
    if (st.roomStep || st.rg === "top" || (inSite && history.length > 1)) history.back();
    else location.href = roomHome(location.pathname, location.search);
  };
  return (
    <button
      type="button"
      onClick={back}
      aria-label="뒤로 가기"
      className="back-btn -ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ border: "1px solid var(--color-gold-line)", color: "var(--color-gold-light)" }}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
        <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
