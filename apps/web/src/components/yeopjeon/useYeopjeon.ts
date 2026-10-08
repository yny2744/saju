"use client";

import { useEffect, useState } from "react";

export interface PersonListItem {
  id: string;
  nickname: string;
  birth: string;
  unlockedCount: number;
  hasTaste: boolean;
  createdAt: string;
}

export interface YeopjeonSummary {
  balance: number;
  ledger: Array<{ amount: number; kind: string; label: string; createdAt: string }>;
  refCode: string;
  invited: number;
  persons: PersonListItem[];
}

/** 로그인한 회원의 엽전 요약. 로그인 안 했으면 null. */
export function useYeopjeon(enabled = true): { data: YeopjeonSummary | null; loading: boolean; reload: () => void } {
  const [data, setData] = useState<YeopjeonSummary | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/yeopjeon")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setData(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);
  return { data, loading, reload: () => setTick((t) => t + 1) };
}

export function inviteUrl(refCode: string): string {
  return `${window.location.origin}/?ref=${refCode}`;
}

/** 휴대폰이면 공유창(카카오톡 등), 아니면 링크 복사 */
export async function shareInvite(refCode: string): Promise<"shared" | "copied" | "failed"> {
  const url = inviteUrl(refCode);
  const text = "류결사주에서 내 사주 여덟 글자를 무료로 봤어요. 가입하면 엽전 선물로 맛보기도 무료예요!";
  try {
    if (navigator.share) {
      await navigator.share({ title: "류결사주", text, url });
      return "shared";
    }
  } catch {
    /* 공유창을 닫은 경우 등 - 복사로 넘어감 */
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

/** 화면 오류를 서버 알림으로 보낸다 (손님 정보 없이 화면 이름과 오류 문구만) */
export function reportClientError(where: string, message: string): void {
  try {
    fetch("/api/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ where, message }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* 무시 */
  }
}
