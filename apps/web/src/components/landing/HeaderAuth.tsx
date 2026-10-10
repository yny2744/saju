"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { formatNyang } from "@/lib/yeopjeon";
import { YEOPJEON_CHANGED } from "@/components/yeopjeon/useYeopjeon";

/** 머리줄(감청 띠) 오른쪽: 로그인 전 "로그인", 로그인 후 "OO님 복주머니 · 엽전 ○냥" - 글자는 밝은색·금색 */
export function HeaderAuth() {
  const [me, setMe] = useState<{ nickname: string; termsAgreed: boolean } | null | "loading">("loading");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    const loadBalance = () =>
      fetch("/api/yeopjeon")
        .then((r) => (r.ok ? r.json() : null))
        .then((w) => setBalance(typeof w?.balance === "number" ? w.balance : null))
        .catch(() => {});
    let member = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user ?? null);
        member = Boolean(d.user?.termsAgreed);
        if (member) loadBalance();
      })
      .catch(() => setMe(null));
    // 운세를 사면 머리줄 잔액도 바로 새로 고친다
    const onChange = () => member && loadBalance();
    window.addEventListener(YEOPJEON_CHANGED, onChange);
    return () => window.removeEventListener(YEOPJEON_CHANGED, onChange);
  }, []);

  if (!isAuthEnabled() || me === "loading") return <span className="w-12" />;

  return me ? (
    <a href="/mypage" className="text-right leading-tight">
      <span className="block text-[14px] font-semibold">{me.nickname}님 복주머니</span>
      {balance !== null && (
        <span className="block text-[12px] font-bold" style={{ color: "var(--color-gold-light)" }}>
          엽전 {formatNyang(balance)}
        </span>
      )}
    </a>
  ) : (
    <a href="/login" className="rounded-full px-3 py-1.5 text-[13px] font-semibold" style={{ border: "1px solid var(--color-gold-line)", color: "var(--color-gold-light)" }}>
      로그인
    </a>
  );
}
