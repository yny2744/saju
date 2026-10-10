"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { intentDestination, intentLabel, intentQuery, parseIntent, type Intent } from "@/lib/intent";
import { LoadingState } from "@/components/StatusScreens";
import type { PersonListItem } from "@/components/yeopjeon/useYeopjeon";

/**
 * 대문에서 운세·묶음·전부 보기를 눌렀을 때 (2026-10-09 수정안 20·24).
 *   로그인했고 풀이해 둔 사람이 있으면 → "누구의 운세를 볼까요?" (그 사람으로 바로 / 새로 입력)
 *   아니면 → 생년월일 입력 화면(/start?topic=… 등)으로.
 */
function GoBody() {
  const router = useRouter();
  const search = useSearchParams();
  const [choice, setChoice] = useState<{ intent: Intent; persons: PersonListItem[] } | null>(null);

  useEffect(() => {
    const intent = parseIntent(new URLSearchParams(search.toString()));
    if (!intent) {
      router.replace("/");
      return;
    }
    const toStart = () => router.replace(`/start?${intentQuery(intent)}`);
    if (!isAuthEnabled()) return toStart();
    (async () => {
      const me = await fetch("/api/auth/me")
        .then((r) => (r.ok ? r.json() : { user: null }))
        .catch(() => ({ user: null }));
      if (!me.user?.termsAgreed) return toStart();
      const w = await fetch("/api/yeopjeon")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      const persons: PersonListItem[] = Array.isArray(w?.persons) ? w.persons : [];
      if (persons.length === 0) return toStart();
      setChoice({ intent, persons });
    })();
  }, [router, search]);

  if (!choice) return <LoadingState message="잠시만요..." />;

  const { intent, persons } = choice;
  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-14">
      <div className="text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <p className="mt-3 text-[14px]" style={{ color: "var(--color-gold)" }}>
          {intentLabel(intent)}
        </p>
        <h1 className="mt-1 text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          누구의 운세를 볼까요?
        </h1>
      </div>
      <ul className="mt-6 space-y-2.5">
        {persons.map((p) => (
          <li key={p.id}>
            <a href={intentDestination(p.id, intent)} className="gold-card flex items-center justify-between gap-3 rounded-2xl px-4 py-4">
              <span className="min-w-0">
                <span className="block text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {p.nickname}
                </span>
                <span className="mt-0.5 block truncate text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                  {p.birth}
                </span>
              </span>
              <span aria-hidden className="shrink-0 text-[18px]" style={{ color: "var(--color-gold)" }}>
                ›
              </span>
            </a>
          </li>
        ))}
      </ul>
      <a href={`/start?${intentQuery(intent)}`} className="btn-secondary mt-4 block text-center">
        다른 사람 새로 입력하기
      </a>
    </main>
  );
}

export default function GoPage() {
  return (
    <Suspense fallback={<LoadingState message="잠시만요..." />}>
      <GoBody />
    </Suspense>
  );
}
