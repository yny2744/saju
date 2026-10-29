"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 류결의 명견만리 소개 카드 9장 (2026-10-29 유샘 확정본) - 옆으로 넘겨 보기.
 * 휴대폰은 손가락으로 밀고, PC는 양옆 화살표·점으로 넘긴다.
 */
const CARDS: Array<{ src: string; alt: string }> = [
  { src: "/cards/intro-01.webp", alt: "류결사주 - 류결의 명견만리. 천 년의 지혜와 오늘이 만나는 곳. 나를 알고, 마음을 보고, 만 리 앞을 내다본다" },
  { src: "/cards/intro-02.webp", alt: "01. 브랜드의 시작 - 사람은 누구나 묻습니다. 명리학은 천 년 넘게 그 물음에 답해 온 학문입니다" },
  { src: "/cards/intro-03.webp", alt: "02. 전통과 AI의 만남 - 오랜 지혜를 오늘의 언어로" },
  { src: "/cards/intro-04.webp", alt: "03. 명리학의 역사 - 천 년의 지혜가 지금까지 이어진 이유" },
  { src: "/cards/intro-05.webp", alt: "04. 류결(流結), 흐르고 맺다 - 전통과 기술 사이에 다리를 놓았습니다" },
  { src: "/cards/intro-06.webp", alt: "05. 창립자의 준비와 철학 - 명리심리사 1급" },
  { src: "/cards/intro-07.webp", alt: "06. 세 개의 길과 일곱 개의 운 - 나를 아는 길, 마음을 보는 길, 앞을 내다보는 길, 그리고 채움" },
  { src: "/cards/intro-08.webp", alt: "07. 우리의 약속 - 운명을 단정하기보다, 나를 이해하는 지혜로" },
  { src: "/cards/intro-09.webp", alt: "08. 류결사주 - 운명의 문이 열리는 날, 류결의 명견만리에서 당신의 길을 만나 보세요" },
];

export function IntroCards({ dark = false }: { dark?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIdx(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(CARDS.length - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  const gold = "#d6bc8a";
  const arrow =
    "absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-[22px] leading-none sm:flex disabled:opacity-0 transition-opacity";

  return (
    <section aria-roledescription="carousel" aria-label="류결의 명견만리 소개 카드" className="py-2">
      <div className="relative">
        <div
          ref={track}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-2xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ boxShadow: dark ? "0 10px 36px rgba(0,0,0,.45)" : "0 6px 24px rgba(14,22,40,.25)" }}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(idx + 1);
            if (e.key === "ArrowLeft") go(idx - 1);
          }}
        >
          {CARDS.map((c, i) => (
            <div key={c.src} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} / ${CARDS.length}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- 정적 카드 그림 */}
              <img src={c.src} alt={c.alt} width={1080} height={1080} loading={i < 2 ? "eager" : "lazy"} className="block aspect-square w-full" />
            </div>
          ))}
        </div>
        <button type="button" aria-label="이전 카드" onClick={() => go(idx - 1)} disabled={idx === 0} className={`${arrow} left-2`} style={{ background: "rgba(7,11,22,.7)", color: gold, border: `1px solid ${gold}` }}>
          ‹
        </button>
        <button type="button" aria-label="다음 카드" onClick={() => go(idx + 1)} disabled={idx === CARDS.length - 1} className={`${arrow} right-2`} style={{ background: "rgba(7,11,22,.7)", color: gold, border: `1px solid ${gold}` }}>
          ›
        </button>
      </div>
      <div className="mt-4 flex items-center justify-center gap-2">
        {CARDS.map((c, i) => (
          <button
            key={c.src}
            type="button"
            aria-label={`${i + 1}번째 카드`}
            aria-current={i === idx}
            onClick={() => go(i)}
            className="h-2.5 rounded-full transition-all"
            style={{ width: i === idx ? 22 : 10, background: i === idx ? gold : dark ? "rgba(214,188,138,.35)" : "rgba(20,32,58,.22)" }}
          />
        ))}
      </div>
      <p className="mt-2 text-center text-[13px]" style={{ color: dark ? "#b9b1a0" : "var(--color-ink-soft)" }}>
        옆으로 넘겨 보세요 · {idx + 1} / {CARDS.length}
      </p>
    </section>
  );
}
