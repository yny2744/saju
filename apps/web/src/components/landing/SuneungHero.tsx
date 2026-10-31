"use client";

import { BRAND } from "@/tenants";
import { useEffect, useRef, useState } from "react";
import { bgm } from "@/components/bgm/bgm";
import { SEASON_INFO, examDday, examSeason } from "@/lib/suneung";
import {
  CURRENCY_NAME,
  PRICE,
  WELCOME_GIFT,
  formatNyang,
} from "@/lib/yeopjeon";

/**
 * 대문 맨 위 - 수능대박운 영상 (2026-10-17 수정안 17).
 *   영상(16:9, 10초 반복)은 소리 켠 채 시작을 시도하고, 막히면 소리 없이 재생 (폰 브라우저 규칙). 🔊를 누르면 나레이션이 나오고 가야금 배경음은 잠시 멈춘다.
 *   D-day 숫자와 자막은 영상에 굽지 않고 화면 글자로 얹는다 - 날짜가 바뀌어도 영상을 다시 만들 필요가 없다.
 *   수능이 끝나면(11/20~) 영상 대신 합격운·새 출발운 카드로 바뀐다.
 */

/** 무료 보기에서 사주 보기를 누를 때 보내는 신호 - 받으면 나레이션을 끈다 */
export const NARRATION_OFF = "suneung-narration-off";

/** 나레이션 시간표 (영상 소리 분석 + 유샘이 준 문장, 2026-10-17) */
const CAPTIONS: Array<{ start: number; end: number; text: string }> = [
  { start: 0.1, end: 2.4, text: "당신의 꿈이 반드시 이루어지길" },
  { start: 2.9, end: 3.9, text: "수능대박운" },
  { start: 4.3, end: 5.5, text: "지금 확인해 보세요" },
  { start: 5.7, end: 7.4, text: "당신의 사주로 확인해 보세요" },
  { start: 8.2, end: 9.9, text: "합격은 반드시 해낸다!" },
];

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";

/**
 * inlineStart: 수능대박운 랜딩(/suneung)처럼 바로 아래에 생년월일 입력 칸이 있는 화면 - 영상 아래 로그인 단추·가격 줄을 빼고
 * 입력 칸으로 이어지게 한다 (2026-10-30 무료 미리보기).
 */
export function SuneungHero({
  inlineStart = false,
}: { inlineStart?: boolean } = {}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [caption, setCaption] = useState("");
  const [sound, setSound] = useState(false);
  // 소리를 켠 채 시작하려다 브라우저가 막았을 때 - 소리 켜기 단추를 금빛으로 깜빡여 알린다
  const [hint, setHint] = useState(false);
  // 날짜는 손님 기기에서 계산 (서버에서 미리 그린 화면이 하루 지나 남아 있어도 맞게)
  const [today, setToday] = useState<{
    season: ReturnType<typeof examSeason>;
    dday: number | null;
  } | null>(null);

  useEffect(() => {
    setToday({ season: examSeason(), dday: examDday() });
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onTime = () => {
      const t = v.currentTime;
      setCaption(CAPTIONS.find((c) => t >= c.start && t <= c.end)?.text ?? "");
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [today]);

  // 2026-10-31 유샘: 대문 문을 누르고 들어오면 나레이션이 바로 나오게 - 소리를 켠 채 처음부터 재생을 시도한다.
  //   브라우저가 막으면 (아이폰·카카오톡 안 브라우저 등) 영상이 멈추지 않게 소리 없이 다시 재생하고 소리 켜기 단추를 깜빡인다.
  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let done = false;
    const fallback = () => {
      if (done) return;
      done = true;
      v.muted = true;
      v.play().catch(() => {});
      setSound(false);
      setHint(true);
      bgm().pauseForHidden(false);
    };
    v.muted = false;
    v.currentTime = 0;
    v.play()
      .then(() => {
        // 소리 켠 재생이 받아들여졌어도 곧바로 멈춰 버리는 브라우저가 있어 한 번 더 본다
        window.setTimeout(() => {
          if (done) return;
          if (v.paused || v.muted) return fallback();
          done = true;
          setSound(true);
          bgm().pauseForHidden(true);
        }, 300);
      })
      .catch(fallback);
  }, []);

  // 2026-10-31 유샘: 무료 보기에서 "사주 보기"를 누르면 나레이션은 끄고 배경음악을 다시 잔잔히 (ExamFreeStart 가 알린다)
  useEffect(() => {
    const off = () => {
      const v = ref.current;
      if (v) v.muted = true;
      setSound(false);
      setHint(false);
      bgm().pauseForHidden(false);
    };
    window.addEventListener(NARRATION_OFF, off);
    return () => window.removeEventListener(NARRATION_OFF, off);
  }, []);

  // 화면을 떠나면 배경음을 돌려놓는다
  useEffect(() => () => bgm().pauseForHidden(false), []);

  function toggleSound() {
    const v = ref.current;
    if (!v) return;
    const next = !sound;
    v.muted = !next;
    if (next) {
      v.currentTime = 0;
      v.play().catch(() => {});
      bgm().pauseForHidden(true);
    } else bgm().pauseForHidden(false);
    setSound(next);
    setHint(false);
  }

  const season = today?.season ?? "suneung";
  const info = SEASON_INFO[season];
  const href = "/go?exam=1";

  if (season !== "suneung") {
    return (
      <a
        href={href}
        className="block rounded-2xl px-5 py-7 text-center"
        style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}
      >
        <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
          {info.hanja} · {BRAND}
        </p>
        <p
          className="mt-1 text-[28px] font-bold"
          style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}
        >
          {info.title}
        </p>
        <p className="mt-2 text-[14px]" style={{ color: GOLD_L }}>
          {info.blurb}
        </p>
        <span
          className="mt-4 inline-block rounded-xl px-5 py-2.5 text-[15px] font-bold"
          style={{ backgroundColor: GOLD, color: NAVY }}
        >
          {info.short} 보기 · {formatNyang(PRICE.EXAM)}
        </span>
      </a>
    );
  }

  return (
    <div>
      {/* D-day와 소리 단추는 영상 밖 위쪽에 - 영상 속 글씨를 가리지 않게 */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span
          className="whitespace-nowrap rounded-lg px-2.5 py-1 text-[clamp(12px,3.9vw,15px)] font-black tracking-wide"
          style={{
            backgroundColor: NAVY,
            color: GOLD_L,
            border: `1px solid ${GOLD}`,
          }}
        >
          {today?.dday === 0
            ? "오늘 수능 D-DAY"
            : today?.dday != null
              ? `수능 D-${today.dday}`
              : "수능대박운"}
          <span
            className="ml-1.5 text-[clamp(10.5px,3.3vw,12px)] font-semibold"
            style={{ color: GOLD }}
          >
            11월 19일 (목)
          </span>
        </span>
        <button
          type="button"
          onClick={toggleSound}
          aria-label={sound ? "소리 끄기" : "소리 켜기"}
          className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[clamp(12px,3.8vw,13px)] font-bold${hint ? " sound-hint" : ""}`}
          style={{ border: `1px solid ${GOLD}`, color: "var(--color-ink)" }}
        >
          {sound ? "🔊 소리 끄기" : hint ? "🔈 나레이션 듣기" : "🔈 소리 켜기"}
        </button>
      </div>
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ boxShadow: "0 6px 24px rgba(14,22,40,0.25)" }}
      >
        <video
          ref={ref}
          className="block w-full motion-reduce:hidden"
          style={{ aspectRatio: "16 / 9" }}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/landing/suneung-poster.jpg"
          aria-label="수능대박운 - 벚꽃 아래 웃는 수험생, 지금 당신의 사주로 확인해 보세요"
        >
          <source src="/landing/suneung.webm" type="video/webm" />
          <source src="/landing/suneung.mp4" type="video/mp4" />
        </video>
        {/* eslint-disable-next-line @next/next/no-img-element -- 움직임 줄이기를 켠 기기: 그림만 */}
        <img
          src="/landing/suneung-poster.jpg"
          alt={`수능대박운 · ${BRAND}`}
          className="hidden w-full motion-reduce:block"
        />

        {caption && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex justify-center">
            <p
              aria-live="off"
              className="rounded-lg px-3 py-1.5 text-center text-[14px] font-bold sm:text-[16px]"
              style={{ backgroundColor: "rgba(22,33,58,0.72)", color: "#fff" }}
            >
              {caption}
            </p>
          </div>
        )}
      </div>

      {!inlineStart && (
        <>
          <a
            href={href}
            className="mt-3 block rounded-2xl py-4 text-center text-[17px] font-bold"
            style={{
              backgroundColor: "#f6ecd2",
              color: NAVY,
              border: `1px solid ${GOLD}`,
              fontFamily: "var(--font-serif)",
            }}
          >
            카카오로 로그인하고 수능대박운 무료로 보기
          </a>
          <p
            className="mt-2 text-center text-[13px]"
            style={{ color: "var(--color-ink-soft)" }}
          >
            가볍게 보기 {formatNyang(PRICE.EXAM)} · 로그인 선물 {CURRENCY_NAME}{" "}
            {formatNyang(WELCOME_GIFT)}으로 바로 · 깊게 보기{" "}
            {formatNyang(PRICE.EXAM_DEEP)}
          </p>
          {/* 2026-10-26: 부모·조부모가 자녀·손주를 위해 보는 상품으로 (결제는 보호자) */}
          <p
            className="mt-1 text-center text-[13px] font-semibold"
            style={{ color: "var(--color-ink)" }}
          >
            자녀·손주의 생년월일로 보고, 시험날 응원을 건네 보세요
          </p>
        </>
      )}
    </div>
  );
}
