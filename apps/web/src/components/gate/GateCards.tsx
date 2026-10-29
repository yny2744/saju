"use client";

import { useEffect, useState } from "react";
import { INTRO_CARDS } from "@/components/landing/IntroCards";

/**
 * 대문 첫 장면 뒤에 열리는 소개 카드 9장 (2026-10-29 유샘).
 *   - 2026-10-30: 상단 제목·三道·流結·七運은 그대로 두고, 카드 윗변이 流結 엠블럼 아래쪽에 살짝 맞물린다
 *     (엠블럼이 카드 위에 오도록 같은 자리에 엠블럼을 한 번 더 얹는다)
 *   - 3초마다 다음 장으로, 9번 다음은 1번 표지로 (계속 돈다)
 *   - 오른쪽 화살표: 바로 다음 장 / 건너뛰기: 카드를 닫고 대문으로 (어디로 보낼지는 추후 결정)
 *   - 2026-10-30: 카드를 누르면 멈춤(일시정지 표시), 다시 누르면 3초 뒤부터 다시 넘어간다
 */
const DELAY = 3000;

/** 카드 윗변 = 엠블럼 중심 + 반지름 × 0.71 (엠블럼 아래 약 1/7이 카드에 걸침) */
const OVERLAP = 0.71;

export function GateCards({ onSkip, disc, emblem }: { onSkip: () => void; disc: { cx: number; cy: number; r: number } | null; emblem: string }) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = INTRO_CARDS.length;

  // 장이 바뀔 때마다(또는 멈춤을 풀 때) 3초를 새로 잰다. 멈춘 동안에는 넘어가지 않는다.
  useEffect(() => {
    if (paused) return;
    const t = window.setTimeout(() => setIdx((i) => (i + 1) % n), DELAY);
    return () => window.clearTimeout(t);
  }, [idx, n, paused]);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % n);
  };
  const toggle = () => setPaused((p) => !p);

  const top = disc ? Math.round(disc.cy + disc.r * OVERLAP) : null;

  return (
    <>
    <div className="gh-cards" style={top === null ? undefined : { top }} role="region" aria-roledescription="carousel" aria-label="류결의 명견만리 소개 카드">
      <div
        className="gh-cards-frame"
        role="button"
        tabIndex={0}
        aria-pressed={paused}
        aria-label={paused ? "카드 다시 넘기기" : "카드 멈추기"}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle();
          }
        }}
      >
        {INTRO_CARDS.map((c, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- 정적 카드 그림
          <img
            key={c.src}
            src={c.src}
            alt={c.alt}
            width={1080}
            height={1080}
            className={i === idx ? "gh-card on" : "gh-card"}
            aria-hidden={i !== idx}
            loading={i < 3 ? "eager" : "lazy"}
          />
        ))}
        <button type="button" className="gh-cards-next" onClick={next} aria-label="다음 카드">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {paused && (
          <span className="gh-cards-paused" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
            </svg>
            일시정지
          </span>
        )}
      </div>
      <div className="gh-cards-dots" aria-hidden="true">
        {INTRO_CARDS.map((c, i) => (
          <span key={c.src} className={i === idx ? "on" : ""} />
        ))}
      </div>
      <button type="button" className="gh-cards-skip" onClick={onSkip}>
        건너뛰기 ›
      </button>
    </div>
    {disc && (
      <span className="gh-cards-emblem" aria-hidden="true" style={{ left: disc.cx - disc.r, top: disc.cy - disc.r, width: disc.r * 2, height: disc.r * 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
        <img src={emblem} alt="" />
      </span>
    )}
    </>
  );
}
