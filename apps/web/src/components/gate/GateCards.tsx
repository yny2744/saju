"use client";

import { useEffect, useState } from "react";
import { INTRO_CARDS } from "@/components/landing/IntroCards";

/**
 * 대문 첫 장면 뒤에 열리는 소개 카드 9장 (2026-10-29 유샘).
 *   - 3초마다 다음 장으로, 9번 다음은 1번 표지로 (계속 돈다)
 *   - 오른쪽 화살표: 바로 다음 장 / 건너뛰기: 카드를 닫고 대문으로 (어디로 보낼지는 추후 결정)
 */
const DELAY = 3000;

export function GateCards({ onSkip }: { onSkip: () => void }) {
  const [idx, setIdx] = useState(0);
  const n = INTRO_CARDS.length;

  // 장이 바뀔 때마다 3초를 새로 잰다 (화살표로 넘겨도 다음 장은 3초 보여 준다)
  useEffect(() => {
    const t = window.setTimeout(() => setIdx((i) => (i + 1) % n), DELAY);
    return () => window.clearTimeout(t);
  }, [idx, n]);

  const next = () => setIdx((i) => (i + 1) % n);

  return (
    <div className="gh-cards" role="region" aria-roledescription="carousel" aria-label="류결의 명견만리 소개 카드">
      <div className="gh-cards-frame">
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
          ›
        </button>
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
  );
}
