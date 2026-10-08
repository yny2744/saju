"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { SajuJson } from "saju-engine";
import type { FortuneResultResponse, ApiErrorResponse, AnalyzeResultResponse } from "@/server/types";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { WeatherIcon } from "@/components/WeatherIcon";
import { buildFortuneView, WEATHER_LABEL, type FortuneView } from "@/lib/fortuneView";
import { kstDateString } from "@/lib/manseView";
import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { STEM_ELEMENT, BRANCH_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";

// 지시서 17조: 사용자 화면에서 "AI"라는 표현을 쓰지 않는다. 오늘/내일의 운세는 규칙 엔진 기반 무료 서비스(AI 0%).

type Day = "today" | "tomorrow";
type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; nickname: string; view: FortuneView };

const elColor = (el: string) => `var(--color-element-${ELEMENT_TOKEN[el as ElementKo]})`;

function FortuneBody() {
  const searchParams = useSearchParams();
  const resultId = searchParams.get("resultId");
  const [day, setDay] = useState<Day>(searchParams.get("day") === "tomorrow" ? "tomorrow" : "today");
  const [saju, setSaju] = useState<SajuJson | null>(null);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  // 원국(일주 비교·근거 표시용)은 한 번만 불러온다
  useEffect(() => {
    if (!resultId) return;
    fetch(`/api/saju/result/${encodeURIComponent(resultId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: AnalyzeResultResponse | null) => {
        if (d) setSaju(d.saju);
        else setState({ status: "error", message: "사주 결과를 찾을 수 없습니다. 생년월일을 다시 입력해주세요." });
      })
      .catch(() => setState({ status: "error", message: "운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." }));
  }, [resultId]);

  useEffect(() => {
    if (!resultId) {
      setState({ status: "error", message: "잘못된 접근입니다. 먼저 생년월일을 입력해주세요." });
      return;
    }
    if (!saju) return;
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const res = await fetch("/api/fortune/today", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(day === "tomorrow" ? { resultId, targetDate: kstDateString(1) } : { resultId }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          const err = data as ApiErrorResponse;
          setState({ status: "error", message: err.error?.message ?? "운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." });
          return;
        }
        const d = data as FortuneResultResponse;
        setState({ status: "done", nickname: d.nickname, view: buildFortuneView(saju, d.fortune, d.result) });
      } catch {
        if (!cancelled) setState({ status: "error", message: "운세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resultId, saju, day]);

  if (state.status === "error") {
    return <ErrorState message={state.message} linkHref="/" linkLabel="처음으로 돌아가기" />;
  }

  const dayWord = day === "today" ? "오늘" : "내일";

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      {/* 오늘 / 내일 탭 */}
      <div className="mb-6 grid grid-cols-2 rounded-xl p-1" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        {(["today", "tomorrow"] as Day[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className="rounded-lg py-2 text-sm font-semibold"
            style={day === d ? { backgroundColor: "var(--color-paper)", color: "var(--color-ink)", boxShadow: "0 1px 2px rgba(0,0,0,.06)" } : { color: "var(--color-ink-faint)" }}
          >
            {d === "today" ? "오늘의 운세" : "내일의 운세"}
          </button>
        ))}
      </div>

      {state.status === "loading" ? (
        <LoadingState message={`${dayWord}의 운세를 불러오고 있어요...`} />
      ) : (
        <FortuneContent nickname={state.nickname} view={state.view} dayWord={dayWord} />
      )}

      {resultId && (
        <a
          href={`/result?id=${encodeURIComponent(resultId)}`}
          className="btn-secondary mt-8 block"
        >
          내 만세력 보기
        </a>
      )}
    </main>
  );
}

function FortuneContent({ nickname, view, dayWord }: { nickname: string; view: FortuneView; dayWord: string }) {
  return (
    <>
      <header className="mb-6">
        <p className="section-label mb-1.5">
          {nickname}님의 {dayWord}의 운세
        </p>
        <h1 className="text-[26px] font-bold leading-snug">{view.dateLabel}</h1>
      </header>

      {/* 일진 ↔ 내 일주 */}
      <section className="mb-6 grid grid-cols-2 gap-2.5">
        {[
          { label: `${dayWord}의 일진`, g: view.day },
          { label: "나의 일주", g: view.me },
        ].map(({ label, g }) => (
          <div key={label} className="rounded-xl py-3 text-center" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <div className="section-label mb-1">{label}</div>
            <div className="text-[34px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
              <span style={{ color: elColor(STEM_ELEMENT[g.stem]) }}>{g.hanja[0]}</span>
              <span style={{ color: elColor(BRANCH_ELEMENT[g.branch]) }}>{g.hanja[1]}</span>
            </div>
            <div className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              {g.stem}
              {g.branch}
            </div>
          </div>
        ))}
      </section>
      {view.chips.length > 0 && (
        <div className="-mt-3 mb-6 flex flex-wrap gap-1.5">
          {view.chips.map((c, i) => (
            <span
              key={i}
              className="rounded-full px-2.5 py-0.5 text-[12px] font-semibold"
              style={{ backgroundColor: "var(--color-paper-soft)", color: c.tone === "good" ? "var(--color-element-wood)" : "var(--color-danger)" }}
            >
              {c.text}
            </span>
          ))}
        </div>
      )}

      {/* 종합운 */}
      <section className="fortune-card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="section-label mb-1">{dayWord}의 종합운</div>
            <div className="flex items-baseline gap-2">
              <span className="text-[34px] font-bold tabular-nums">{view.overall.score}</span>
              <span className="text-sm font-semibold" style={{ color: "var(--color-ink-soft)" }}>
                {WEATHER_LABEL[view.overall.weather]}
              </span>
            </div>
          </div>
          <WeatherIcon weather={view.overall.weather} size={52} />
        </div>
        <p className="mt-2 text-[15px] font-semibold leading-relaxed">{view.overall.text}</p>
        {view.overall.phase && (
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            {dayWord}의 기운: {view.overall.phase}
          </p>
        )}
      </section>

      {/* 영역별 */}
      <section className="mb-6">
        <h2 className="mb-2.5 text-[15px] font-semibold">영역별 운세</h2>
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }}>
          {view.areas.map((a, i) => (
            <details key={a.key} className="group" style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}>
              <summary className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                <WeatherIcon weather={a.weather} />
                <span className="flex-1 text-[14px] font-semibold">{a.label}</span>
                <span className="text-[13px] tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                  <b style={{ color: "var(--color-ink)" }}>{a.score}</b>/10
                </span>
                <span aria-hidden className="text-xs transition-transform group-open:rotate-180" style={{ color: "var(--color-ink-faint)" }}>
                  ▾
                </span>
              </summary>
              <div className="px-3.5 pb-3">
                <p className="text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                  {a.text}
                </p>
                {a.evidence.map((e, j) => (
                  <p key={j} className="mt-1.5 text-[12px] leading-relaxed" style={{ color: e.tone === "good" ? "var(--color-element-wood)" : "var(--color-danger)" }}>
                    · {e.text}
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
          항목을 누르면 풀이와 근거가 펼쳐져요.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-medium" style={{ color: "var(--color-ink-soft)" }}>
          {dayWord}의 키워드
        </h2>
        <div className="flex flex-wrap gap-2">
          {view.keywords.map((kw) => (
            <span key={kw} className="rounded-full px-3 py-1 text-xs" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}>
              #{kw}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl px-4 py-4" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
        <h2 className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-paper-soft)" }}>
          {dayWord}의 조언
        </h2>
        <p className="text-sm leading-relaxed">{view.advice}</p>
      </section>

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        점수는 일진과 사주 원국의 관계(십신·12운성·합충형파해)를 참고해 매긴 지수이며, 과학적으로 확정된 값이 아닙니다.
      </p>
    </>
  );
}

export default function FortunePage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <FortuneBody />
    </Suspense>
  );
}
