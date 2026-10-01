"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FortuneResultResponse, ApiErrorResponse } from "@/server/types";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { CircularGauge } from "@/components/CircularGauge";
import { fortuneStrengthScore } from "@/lib/fortuneScore";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: FortuneResultResponse };

// 지시서 17조: 사용자 화면에서 "AI"라는 표현을 쓰지 않는다. 이번 챕터는 Rule Engine
// 기반 무료 서비스이므로 문구에서 AI 언급을 의도적으로 배제했다.
// Phase 8: 카드 형태 유지(지시서 5-C조), 이모지는 제거하고 타이포그래피로만 구분한다.

const CATEGORY_META: Array<{ key: keyof FortuneResultResponse["result"]["categories"]; label: string }> = [
  { key: "money", label: "금전운" },
  { key: "love", label: "연애운" },
  { key: "relationship", label: "인간관계" },
  { key: "work", label: "직장·사업운" },
];

function FortuneBody() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!resultId) {
      setState({ status: "error", message: "잘못된 접근입니다. 먼저 사주 분석을 완료해주세요." });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/fortune/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId }),
        });
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          const err = data as ApiErrorResponse;
          setState({
            status: "error",
            message: err.error?.message ?? "오늘의 운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
          });
          return;
        }
        setState({ status: "done", data: data as FortuneResultResponse });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "오늘의 운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resultId]);

  if (state.status === "loading") {
    return <LoadingState message="오늘의 운세를 불러오고 있어요..." />;
  }

  if (state.status === "error") {
    return <ErrorState message={state.message} linkHref="/" linkLabel="처음으로 돌아가기" />;
  }

  const { nickname, fortune, result } = state.data;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-7">
        <p className="section-label mb-1.5">{nickname}님의 오늘의 운세</p>
        <div className="flex items-baseline justify-between">
          <h1 className="text-[26px] font-bold leading-snug">{result.date}</h1>
          <span
            className="rounded-lg px-3 py-1.5 text-sm font-bold"
            style={{ fontFamily: "var(--font-serif)", backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
          >
            {fortune.dayGanzhi.ganzhi}
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          오늘의 일진
        </p>
      </header>

      <section className="fortune-card mb-6">
        <h2 className="mb-3 text-base font-semibold">오늘의 종합운</h2>
        <div className="mb-3 flex justify-center">
          <CircularGauge
            value={fortuneStrengthScore(fortune.relationToday.twelveStageOfDay)}
            label={`오늘의 12운성 · ${fortune.relationToday.twelveStageOfDay}`}
          />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {result.summary}
        </p>
        <p className="mt-2 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          기운 지수는 전통 12운성 흐름을 참고한 지수이며, 과학적으로 확정된 값이 아닙니다.
        </p>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CATEGORY_META.map(({ key, label }) => (
          <div key={key} className="fortune-card">
            <h3 className="mb-1.5 text-sm font-semibold">{label}</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {result.categories[key]}
            </p>
          </div>
        ))}
      </section>

      <section className="mb-6">
        <h2 className="mb-2.5 text-sm font-medium" style={{ color: "var(--color-ink-soft)" }}>
          오늘의 키워드
        </h2>
        <div className="flex flex-wrap gap-2">
          {result.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full px-3 py-1 text-xs"
              style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}
            >
              #{kw}
            </span>
          ))}
        </div>
      </section>

      <section
        className="mb-8 rounded-xl px-4 py-4"
        style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}
      >
        <h2 className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-paper-soft)" }}>
          오늘의 조언
        </h2>
        <p className="text-sm leading-relaxed">{result.advice}</p>
      </section>

      {resultId && (
        <a
          href={`/result?id=${encodeURIComponent(resultId)}`}
          className="block py-2 text-center text-sm underline underline-offset-4"
          style={{ color: "var(--color-ink-soft)" }}
        >
          사주 결과로 돌아가기
        </a>
      )}
    </main>
  );
}

export default function FortunePage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <FortuneBody />
    </Suspense>
  );
}
