"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AnalyzeResultResponse, ApiErrorResponse } from "@/server/types";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { ElementBadge } from "@/components/ElementBadge";
import { ElementRadarChart } from "@/components/ElementRadarChart";
import { ShareCard } from "@/components/ShareCard";
import { SajuPillarsCard } from "@/components/SajuPillarsCard";

const ELEMENT_TAGLINE: Record<string, string> = {
  목: "성장하고 뻗어나가는 기운",
  화: "열정적이고 밝게 타오르는 기운",
  토: "안정적이고 중심을 잡아주는 기운",
  금: "단단하고 결단력 있는 기운",
  수: "유연하고 지혜로운 기운",
};
import { AnalysisSection } from "@/components/AnalysisSection";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: AnalyzeResultResponse };


function ResultBody() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!id) {
      setState({ status: "error", message: "잘못된 접근입니다. 다시 분석을 시작해주세요." });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/saju/result/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          const err = data as ApiErrorResponse;
          setState({ status: "error", message: err.error?.message ?? "결과를 불러오지 못했습니다." });
          return;
        }
        setState({ status: "done", data: data as AnalyzeResultResponse });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") {
    return <LoadingState message="사주를 살펴보고 있어요..." />;
  }

  if (state.status === "error") {
    return <ErrorState message={state.message} linkHref="/" linkLabel="다시 입력하러 가기" />;
  }

  const { nickname, hanjaName, saju, interpretation } = state.data;
  const analysisEntries = Object.entries(interpretation.analysis as Record<string, unknown>);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="section-label mb-1.5">사주풀이 결과</p>
        <h1 className="text-[26px] font-bold leading-snug">
          {nickname}
          {hanjaName && <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>({hanjaName})</span>}
          님의 사주
        </h1>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          {interpretation.disclaimer}
        </p>
      </header>

      {/* 사주 원국 - 4기둥을 표 형태로 명확히 구분 */}
      <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold">사주 원국</h2>
          <SajuPillarsCard saju={saju} />
        </section>

      {/* 오행 · 십신 요약 */}
      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">오행 · 십신</h2>
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
          <div className="mx-auto mb-2 aspect-square w-full max-w-[220px]">
            <ElementRadarChart counts={saju.elements.summary.counts} />
          </div>
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>우세 오행</span>
            <ElementBadge element={interpretation.elements.dominant} />
            {interpretation.elements.lacking && (
              <>
                <span className="ml-2" style={{ color: "var(--color-ink-soft)" }}>
                  부족 오행
                </span>
                <ElementBadge element={interpretation.elements.lacking} />
              </>
            )}
          </div>
          <p className="mt-3 text-sm">
            <span style={{ color: "var(--color-ink-soft)" }}>일간</span>{" "}
            <b>{interpretation.tenGods.dayMaster}</b>
          </p>
          <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {interpretation.tenGods.summary}
          </p>
        </div>
      </section>

      {/* 상세 해석 - 문서형으로 제목+문단 구분 */}
      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold">상세 해석</h2>
        <div className="space-y-6">
          {analysisEntries.map(([key, value], i) => (
            <div key={key}>
              {i > 0 && <div className="hairline mb-6" />}
              <AnalysisSection fieldKey={key} value={value} />
            </div>
          ))}
        </div>
      </section>

      {/* 공유용 결과 카드 - 생년월일/출생시간/출생도시는 포함하지 않는다 */}
      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold">결과 카드 공유하기</h2>
        <ShareCard
          nickname={nickname}
          dominant={interpretation.elements.dominant}
          counts={saju.elements.summary.counts}
          tagline={ELEMENT_TAGLINE[interpretation.elements.dominant] ?? ""}
        />
      </section>

      <div className="space-y-2.5">
        {id && (
          <a href={`/products?resultId=${encodeURIComponent(id)}`} className="btn-primary block">
            더 깊은 해석 보러가기 (유료)
          </a>
        )}
        {id && (
          <a href={`/fortune?resultId=${encodeURIComponent(id)}`} className="btn-secondary block">
            오늘의 운세 보기
          </a>
        )}
        <a href="/start" className="block py-2 text-center text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          다시 분석하기
        </a>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <ResultBody />
    </Suspense>
  );
}
