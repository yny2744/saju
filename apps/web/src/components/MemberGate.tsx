"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled, isLoginRequired } from "@/lib/launchMode";

export interface MemberInfo {
  nickname: string;
  email: string | null;
  termsAgreed: boolean;
  marketingAgreed: boolean;
}

/**
 * 수정안 3번: 로그인 필수 스위치가 켜져 있으면, 이 안의 화면(사주 입력·관상 등)은 로그인 + 약관 동의를 마친
 * 사람에게만 보인다. 아니면 로그인 화면으로 보내고, 로그인 후 지금 화면으로 돌아오게 한다.
 * 스위치가 꺼져 있으면 지금처럼 그대로 보여준다(로그인 상태는 확인만 해서 children에 넘긴다).
 */
export function MemberGate({ children }: { children: (member: MemberInfo | null) => React.ReactNode }) {
  const required = isLoginRequired();
  const [state, setState] = useState<{ checked: boolean; member: MemberInfo | null }>({ checked: !required, member: null });

  useEffect(() => {
    if (!isAuthEnabled()) {
      setState({ checked: true, member: null }); // 로그인 기능 자체가 꺼져 있음(심사용 모드)
      return;
    }
    let cancelled = false;
    const here = window.location.pathname + window.location.search;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data: { user: MemberInfo | null }) => {
        if (cancelled) return;
        const member = data.user ?? null;
        if (required && !member) {
          window.location.replace(`/login?next=${encodeURIComponent(here)}`);
          return;
        }
        if (required && member && !member.termsAgreed) {
          window.location.replace(`/consent?next=${encodeURIComponent(here)}`);
          return;
        }
        setState({ checked: true, member });
      })
      .catch(() => {
        if (cancelled) return;
        if (required) window.location.replace(`/login?next=${encodeURIComponent(here)}`);
        else setState({ checked: true, member: null });
      });
    return () => {
      cancelled = true;
    };
  }, [required]);

  if (!state.checked) {
    return (
      <div className="py-24 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
        불러오는 중...
      </div>
    );
  }
  return <>{children(state.member)}</>;
}
