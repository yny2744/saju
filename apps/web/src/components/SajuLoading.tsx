"use client";

import { useEffect, useRef, useState } from "react";
import type { SajuJson } from "saju-engine";
import { STEM_HANJA, BRANCH_HANJA, ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { STEM_ELEMENT, BRANCH_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";

/**
 * 무료 만세력 로딩 연출 (B안, 유샘 확정 2026-10-05).
 * 계산은 이미 끝나 있고, 정해진 시간(10~15초 랜덤) 동안 네 기둥 칸에 그 사람의 실제 한자 여덟 글자를
 * 년주 → 월주 → 일주 → 시주 순서로 하나씩 보여준 뒤, 오행 색을 입히고 결과로 넘어간다.
 * saju가 아직 안 왔으면(서버 응답 대기) 진행률을 앞부분에서 잠시 멈춰 둔다.
 */

const PILLAR_ORDER = ["year", "month", "day", "hour"] as const;
const DISPLAY_ORDER = ["hour", "day", "month", "year"] as const; // 화면은 전통 배열(시·일·월·년)
const LABEL: Record<string, string> = { year: "년주", month: "월주", day: "일주", hour: "시주" };

/** 10~15초 사이 랜덤 */
export function randomLoadingMs(): number {
  return 10000 + Math.floor(Math.random() * 5001);
}

const color = (el: string | undefined) =>
  el ? `var(--color-element-${ELEMENT_TOKEN[el as ElementKo]})` : "var(--color-ink)";

export function SajuLoading({
  nickname,
  saju,
  durationMs,
  onDone,
}: {
  nickname: string;
  saju: SajuJson | null;
  durationMs: number;
  onDone: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const pausedRef = useRef(0); // saju를 기다리느라 멈춘 시간
  const doneRef = useRef(false);
  const sajuRef = useRef(saju);
  sajuRef.current = saju;

  useEffect(() => {
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const t = now - startRef.current - pausedRef.current;
      // 서버 결과가 아직이면 12% 지점에서 멈춰 기다린다
      if (!sajuRef.current && t > durationMs * 0.12) {
        pausedRef.current += now - last;
      }
      last = now;
      const e = Math.min(durationMs, now - startRef.current - pausedRef.current);
      setElapsed(e);
      if (e >= durationMs && !doneRef.current && sajuRef.current) {
        doneRef.current = true;
        clearInterval(timer);
        onDone();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [durationMs, onDone]);

  const p = elapsed / durationMs; // 0~1
  // 숫자는 일정하게 오르지 않고 계단처럼 머물렀다 오르게(실제로 풀이하는 느낌)
  const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const percent = p >= 1 ? 100 : Math.min(99, Math.floor((eased * 100) / 3) * 3);
  // 여덟 글자는 진행 10%~78% 구간에 고르게 나타난다
  const revealed = Math.max(0, Math.min(8, Math.floor((p - 0.1) / (0.68 / 8)) + 1));
  const colored = p >= 0.82;

  const hasHour = Boolean(saju?.pillars.hour);
  const stepIndex = Math.min(3, Math.floor(Math.max(0, revealed - 1) / 2));
  const stepKey = PILLAR_ORDER[stepIndex];
  const message =
    p < 0.1
      ? "사주를 세울 준비를 하고 있어요"
      : p < 0.78
        ? stepKey === "hour" && !hasHour
          ? "태어난 시간을 모르셔서 시주는 비워 둘게요"
          : `${LABEL[stepKey]}를 세우고 있어요`
        : p < 0.92
          ? "오행의 균형을 살피고 있어요"
          : "풀이를 정리하고 있어요";

  const R = 54;
  const C = 2 * Math.PI * R;

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6" style={{ backgroundColor: "var(--color-paper)" }}>
      {/* 원형 진행률 */}
      <div className="relative h-[132px] w-[132px]">
        <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
          <circle cx="66" cy="66" r={R} fill="none" stroke="var(--color-line)" strokeWidth="7" />
          <circle
            cx="66"
            cy="66"
            r={R}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - percent / 100)}
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[34px] font-bold tabular-nums" style={{ fontFamily: "var(--font-serif)" }}>
            {percent}
            <span className="text-[18px]">%</span>
          </span>
        </div>
      </div>

      {/* 네 기둥 */}
      <div className="mt-8 grid grid-cols-4 gap-2">
        {DISPLAY_ORDER.map((key) => {
          const pillar = saju?.pillars[key] ?? null;
          const order = PILLAR_ORDER.indexOf(key);
          const stemShown = revealed >= order * 2 + 1;
          const branchShown = revealed >= order * 2 + 2;
          const empty = saju && !pillar;
          return (
            <div key={key} className="w-[60px] text-center">
              <div className="mb-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                {LABEL[key]}
              </div>
              {[0, 1].map((row) => {
                const shown = row === 0 ? stemShown : branchShown;
                const ch = pillar ? (row === 0 ? STEM_HANJA[pillar.heavenlyStem] : BRANCH_HANJA[pillar.earthlyBranch]) : "";
                const el = pillar ? (row === 0 ? STEM_ELEMENT[pillar.heavenlyStem] : BRANCH_ELEMENT[pillar.earthlyBranch]) : undefined;
                return (
                  <div
                    key={row}
                    className="mb-1.5 flex h-[56px] items-center justify-center rounded-lg text-[30px] font-bold"
                    style={{
                      fontFamily: "var(--font-serif)",
                      border: "1px solid var(--color-line)",
                      backgroundColor: "var(--color-paper-soft)",
                      color: colored ? color(el) : "var(--color-ink)",
                      transition: "color 0.8s ease",
                    }}
                  >
                    <span
                      style={{
                        opacity: shown && !empty ? 1 : 0,
                        transform: shown ? "translateY(0)" : "translateY(6px)",
                        transition: "opacity 0.6s ease, transform 0.6s ease",
                      }}
                    >
                      {ch}
                    </span>
                    {empty && shown && (
                      <span className="text-[11px] font-normal" style={{ color: "var(--color-ink-faint)" }}>
                        모름
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-center text-[16px] font-semibold">{nickname}님의 만세력을 풀이하고 있어요</p>
      <p className="mt-1.5 text-center text-sm" style={{ color: "var(--color-ink-soft)" }}>
        {message}
      </p>
    </div>
  );
}
