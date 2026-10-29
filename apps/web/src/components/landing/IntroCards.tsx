"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 류결의 명견만리 소개 카드 9장 (2026-10-29 天命→結 새 흐름) - 옆으로 넘겨 보기.
 * 휴대폰은 손가락으로 밀고, PC는 양옆 화살표·점으로 넘긴다.
 */
export const INTRO_CARDS: Array<{ src: string; alt: string }> = [
  { src: "/cards/intro-01.webp", alt: "류결사주 - 류결의 명견만리. 천 년의 지혜와 오늘이 만나는 곳. 나를 알고, 마음을 보고, 만 리 앞을 내다본다" },
  { src: "/cards/intro-02.webp", alt: "01. 물음 - 天命, 왜 나인가. 오랜 지혜를 오늘의 언어로. 나는 왜 이런 사람일까? 지금은 나아갈 때일까, 멈출 때일까? 그 답은 내가 타고난 기운 안에 있습니다" },
  { src: "/cards/intro-03.webp", alt: "02. 뿌리 - 나는 어디서 왔는가. 태어난 순간의 기운이 나를 만듭니다. 그 네 기둥의 기운을 사주(四柱)라 합니다" },
  { src: "/cards/intro-04.webp", alt: "03. 읽는 법 - 명리학이란 무엇인가. 그 기운을 읽는 천 년의 학문, 나를 이해하는 지혜" },
  { src: "/cards/intro-05.webp", alt: "04. 三道 - 하나의 물음, 세 개의 길. 나를 아는 길: 나는 무엇을 타고났나. 마음을 보는 길: 지금 내 마음은 어디에. 앞을 내다보는 길: 언제 나아갈까" },
  { src: "/cards/intro-06.webp", alt: "05. 七運 - 세 길 위의 일곱 개의 운. 타고난 나, 나의 상징, 성향과 적성, 지금 내 마음, 우리 사이, 앞날, 이름과 날짜" },
  { src: "/cards/intro-07.webp", alt: "06. 읽어 주는 이 - 누가 읽어 주는가. 당신의 사주를 당신의 언어로. 명리심리사 1급의 해석에 AI의 분석을 더해 풀어 드립니다" },
  { src: "/cards/intro-08.webp", alt: "07. 結 - 알고 나서, 채우며 살다. 운명은 아는 것으로 끝나지 않습니다. 부족한 기운은 채우고 넘치는 기운은 다스릴 때, 비로소 내 삶이 됩니다" },
  { src: "/cards/intro-09.webp", alt: "08. 류결사주 - 운명의 문이 열리는 날, 류결의 명견만리에서 당신의 길을 만나 보세요" },
];
const CARDS = INTRO_CARDS;

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
