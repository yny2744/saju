"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";

/** 대문 머리줄 오른쪽: 로그인 전 "로그인", 로그인 후 "OO님 사주함" */
export function HeaderAuth() {
  const [me, setMe] = useState<{ nickname: string } | null | "loading">("loading");

  useEffect(() => {
    if (!isAuthEnabled()) return setMe(null);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setMe(d.user ?? null))
      .catch(() => setMe(null));
  }, []);

  if (!isAuthEnabled() || me === "loading") return <span className="w-12" />;

  return me ? (
    <a href="/mypage" className="text-[14px] font-semibold">
      {me.nickname}님 사주함
    </a>
  ) : (
    <a href="/login" className="text-[14px] font-semibold">
      로그인
    </a>
  );
}
