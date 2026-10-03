"use client";

import { useEffect, useState } from "react";

/**
 * 로그인 버튼(카카오/이메일) — /login 페이지로 보내는 진입점이다.
 *
 * ⚠️ DATABASE_URL/KAKAO_REST_API_KEY가 아직 설정 안 된 환경에서는 실제
 * 로그인/회원가입 API 호출 시 서버가 명확한 에러를 반환한다(조용히 가짜로
 * 성공 처리하지 않는다) - /login 페이지가 그 에러 메시지를 그대로 보여준다.
 *
 * 로그인 상태면 닉네임 + 로그아웃 버튼으로 바뀐다.
 */
export function LoginButtons() {
  const [me, setMe] = useState<{ nickname: string } | null | "loading">("loading");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setMe(data.user))
      .catch(() => setMe(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.reload();
  }

  if (me === "loading") {
    return <div className="h-[42px]" />; // 레이아웃 흔들림 방지용 자리만 차지
  }

  if (me) {
    return (
      <div className="flex items-center justify-between rounded-full px-4 py-2" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        <a href="/mypage" className="text-[13px] font-medium">
          {me.nickname}님
        </a>
        <button type="button" onClick={handleLogout} className="text-xs underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <a
        href="/api/auth/kakao/start"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-medium"
        style={{ backgroundColor: "#fee500", color: "#191600" }}
      >
        카카오 로그인
      </a>
      <a
        href="/login"
        className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-medium"
        style={{ border: "1px solid var(--color-line)", color: "var(--color-ink-soft)" }}
      >
        이메일 로그인
      </a>
    </div>
  );
}
