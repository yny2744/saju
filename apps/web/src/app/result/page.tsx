"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { AnalyzeResultResponse, ApiErrorResponse } from "@/server/types";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { ShareCard } from "@/components/ShareCard";
import { SajuPillarsCard } from "@/components/SajuPillarsCard";
import { TenGodBarChart } from "@/components/TenGodBarChart";
import { buildTenGodDistribution, topHeadline, TEN_GOD_HINT } from "@/lib/tenGodDistribution";

const ELEMENT_TAGLINE: Record<string, string> = {
  목: "성장하고 뻗어나가는 기운",
  화: "열정적이고 밝게 타오르는 기운",
  토: "안정적이고 중심을 잡아주는 기운",
  금: "단단하고 결단력 있는 기운",
  수: "유연하고 지혜로운 기운",
};
import { AnalysisSection } from "@/components/AnalysisSection";
import { FreeAnalysisBoards, isFreeAnalysisShape } from "@/components/FreeAnalysisBoards";
import { buildFreeAnalysisKeywords } from "@/lib/freeAnalysisKeywords";
import { ElementBalance, NeededEnergySection, RelationsTable, DaeunTimeline } from "@/components/ManseSections";
import { focusLabel } from "@/lib/focus";
import { ReadingCta } from "@/components/yeopjeon/ReadingCta";
import { NameReadingSection } from "@/components/NameReadingSection";
import { PENDING_RESULT_KEY } from "@/lib/yeopjeon";
import { neededEnergy } from "@/lib/neededEnergy";
import { elementShares, yinYangCount, relationRows, daeunCells, kstDateString } from "@/lib/manseView";
import type { ElementKo } from "@/lib/pillarView";
import type { SajuJson } from "saju-engine";

function birthLine(saju: SajuJson): string {
  const [y, m, d] = saju.birth.date.split("-").map(Number);
  const cal = saju.birth.calendarType === "solar" ? "양력" : "음력";
  return `${cal} ${y}년 ${m}월 ${d}일${saju.birth.time ? ` ${saju.birth.time}` : " · 시간 모름"}`;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; data: AnalyzeResultResponse };


function ResultBody() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const resume = searchParams.get("resume") === "1";
  // undefined = 아직 확인 중. 카카오 가입 후 "/result?resume=1"로 돌아오면 브라우저에 기억해 둔 결과를 다시 연다.
  const [id, setId] = useState<string | null | undefined>(queryId ?? undefined);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (queryId) return setId(queryId);
    let stored: string | null = null;
    if (resume) {
      try {
        stored = localStorage.getItem(PENDING_RESULT_KEY);
      } catch {
        stored = null;
      }
    }
    setId(stored);
    if (stored) window.history.replaceState(null, "", `/result?id=${encodeURIComponent(stored)}`);
  }, [queryId, resume]);

  useEffect(() => {
    if (id === undefined) return;
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

  const { nickname, hanjaName, focus, saju, interpretation } = state.data;
  const analysisRecord = interpretation.analysis as Record<string, unknown>;
  const analysisEntries = Object.entries(analysisRecord);
  const tenGodDist = buildTenGodDistribution(saju);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="section-label mb-1.5">무료 만세력</p>
        <h1 className="text-[26px] font-bold leading-snug">
          {nickname}
          {hanjaName && <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>({hanjaName})</span>}
          님의 만세력
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          {birthLine(saju)}
        </p>
        {focus && (
          <a
            href={focus === "health" ? "#needed-energy" : "#detail"}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
          >
            관심 분야 · {focusLabel(focus)} — 먼저 보기 ↓
          </a>
        )}
      </header>

      {/* 사주 원국 - 4기둥을 표 형태로 명확히 구분 */}
      <section className="mb-8">
          <h2 className="mb-3 text-base font-semibold">사주 원국</h2>
          <SajuPillarsCard saju={saju} />
        </section>

      <ElementBalance
        shares={elementShares(saju)}
        dominant={saju.elements.summary.dominant as ElementKo}
        lacking={saju.elements.summary.lacking as ElementKo[]}
        yinYang={yinYangCount(saju)}
      />

      <div id="needed-energy" className="scroll-mt-6">
        <NeededEnergySection need={neededEnergy(saju)} highlight={focus === "health"} />
      </div>

      {/* 무료 이름 풀이 (수정안 11번) */}
      <div id="name-reading" className="scroll-mt-6">
        <NameReadingSection nickname={nickname} hanjaName={hanjaName} saju={saju} />
      </div>

      {/* 십신 분포 - 문장형 제목 + 막대그래프 (엔진 십신에 지장간 가중치를 더한 값) */}
      <section className="mb-8">
        <p className="section-label mb-1">십신 분포</p>
        <h2 className="mb-1 text-lg font-bold">{topHeadline(tenGodDist.top)}</h2>
        {tenGodDist.top.length === 1 && (
          <p className="mb-3 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {TEN_GOD_HINT[tenGodDist.top[0]]}
          </p>
        )}
        <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
          <TenGodBarChart dist={tenGodDist} />
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            일간({interpretation.tenGods.dayMaster})을 기준으로 천간·지지와 지장간의 비중을 함께 반영했어요.
          </p>
        </div>
      </section>

      <RelationsTable rows={relationRows(saju)} />

      <DaeunTimeline
        cells={daeunCells(saju, kstDateString())}
        seun={{ year: saju.seun.year, stem: saju.seun.pillar.stem, branch: saju.seun.pillar.branch, tenGod: saju.seun.tenGod }}
      />

      {/* 상세 해석 - 문서형으로 제목+문단 구분 */}
      <section id="detail" className="mb-10 scroll-mt-6">
        <h2 className="mb-4 text-base font-semibold">상세 해석</h2>
        {interpretation.meta?.provider === "rule-engine" && isFreeAnalysisShape(analysisRecord) ? (
          <FreeAnalysisBoards analysis={analysisRecord} kw={buildFreeAnalysisKeywords(saju)} focus={focus} />
        ) : (
          <div className="space-y-6">
            {analysisEntries.map(([key, value], i) => (
              <div key={key}>
                {i > 0 && <div className="hairline mb-6" />}
                <AnalysisSection fieldKey={key} value={value} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 이어서 보기 - 12가지 운 맛보기 990냥 (가입 선물 엽전으로 첫 맛보기 무료) */}
      {id && <ReadingCta resultId={id} nickname={nickname} focus={focus} />}

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
          <a href={`/fortune?resultId=${encodeURIComponent(id)}`} className="btn-secondary block text-center">
            오늘·내일의 운세 보기
          </a>
        )}
        <a href="/start" className="block py-2 text-center text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          다시 분석하기
        </a>
      </div>

      {/* 면책 문구 - 첫 화면 제목 아래에서 결과 맨 아래로 옮김 (모든 페이지 하단 고지·이용약관 제9조는 별도 유지) */}
      <p className="mt-8 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        {interpretation.disclaimer}
      </p>
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
