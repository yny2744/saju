"use client";

import { useState } from "react";

/**
 * 로그인 버튼(카카오/이메일) — 지금은 UI 진입점만 만들어둔다.
 *
 * ⚠️ 실제 로그인은 아직 동작하지 않는다. 카카오 로그인은 카카오 개발자센터
 * 앱 등록+API 키가 있어야 하고(외부 절차, 유샘이 직접 해야 함), 이메일/
 * 아이디·비번 로그인은 회원 정보를 저장할 데이터베이스가 있어야 하는데
 * (Phase 11 Postgres 도입 전), 지금 서비스는 의도적으로 "저장 안 하고 30분
 * 뒤 사라지는" 무상태 구조라 회원 저장소 자체가 없다. 그래서 버튼을 누르면
 * "준비 중" 안내만 뜨게 해뒀다 - 죽은 링크(아무 반응 없음)보다는 솔직하게
 * 상태를 알려주는 쪽이 낫다고 판단했다.
 */
export function LoginButtons() {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setNotice("카카오 로그인은 준비 중이에요. 곧 만나요!")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-medium"
          style={{ backgroundColor: "#fee500", color: "#191600" }}
        >
          카카오 로그인
        </button>
        <button
          type="button"
          onClick={() => setNotice("이메일 로그인은 준비 중이에요. 곧 만나요!")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2.5 text-[13px] font-medium"
          style={{ border: "1px solid var(--color-line)", color: "var(--color-ink-soft)" }}
        >
          이메일 로그인
        </button>
      </div>
      {notice && (
        <p className="mt-2 text-center text-xs" style={{ color: "var(--color-ink-faint)" }}>
          {notice}
        </p>
      )}
    </div>
  );
}
