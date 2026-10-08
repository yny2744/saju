"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { formatNyang } from "@/lib/yeopjeon";

/** 대문 머리줄 오른쪽: 로그인 전 "로그인", 로그인 후 "OO님 복주머니 · 엽전 ○냥" */
export function HeaderAuth() {
  const [me, setMe] = useState<{ nickname: string; termsAgreed: boolean } | null | "loading">("loading");
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setMe(d.user ?? null);
        if (d.user?.termsAgreed) {
          fetch("/api/yeopjeon")
            .then((r) => (r.ok ? r.json() : null))
            .then((w) => setBalance(typeof w?.balance === "number" ? w.balance : null))
            .catch(() => {});
        }
      })
      .catch(() => setMe(null));
  }, []);

  if (!isAuthEnabled() || me === "loading") return <span className="w-12" />;

  return me ? (
    <a href="/mypage" className="text-right leading-tight">
      <span className="block text-[14px] font-semibold">{me.nickname}님 복주머니</span>
      {balance !== null && (
        <span className="block text-[12px]" style={{ color: "#9a7a45" }}>
          엽전 {formatNyang(balance)}
        </span>
      )}
    </a>
  ) : (
    <a href="/login" className="text-[14px] font-semibold">
      로그인
    </a>
  );
}
