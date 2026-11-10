"use client";

import { useEffect, useRef, useState } from "react";
import { bgm } from "@/components/bgm/bgm";

/**
 * 홍보 랜딩 첫 화면 (2026-11-10 유샘 확정 시안 landing3)
 *   제목 → 1:1 홍보 영상(소리 없이 자동 반복, 소리 켜기) → 질문 한 줄 → 그림 카드 두 장(세로, 좌우) → 무료 안내 한 줄
 *   카드: 그림 위에 상자 없이 글자만, 왼쪽 위 작은 금빛 한자 도장. 누르면 같은 화면 아래 입력 칸이 열린다.
 *   자막은 영상에 구워 두었다 (사이트용 1:1 영상).
 */

export type PromoCard = {
  img: string;
  stamp: string;
  /** 줄바꿈은 \n */
  title: string;
  desc: string;
  tag?: string;
};

export const PROMO_OPEN = "promo-open";

/** 카드를 누르면 아래 입력 칸 쪽에 알린다 (detail: 카드 번호) */
export function openPromo(i: number) {
  window.dispatchEvent(new CustomEvent(PROMO_OPEN, { detail: i }));
}

const NAVY = "#13203f";
const GOLD = "#d6b36a";

export function PromoTop({
  title,
  video,
  poster,
  question,
  sub,
  cards,
  foot,
  onPick,
}: {
  title: string;
  video: string;
  poster: string;
  question: string;
  sub: string;
  cards: [PromoCard, PromoCard];
  foot: string;
  onPick?: (i: number) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);

  // 소리 없이 자동 재생 (휴대폰 브라우저 규칙). 소리는 손님이 켤 때 한 번만 - 한 바퀴 돌면 다시 끈다.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
    let last = 0;
    const onTime = () => {
      if (v.currentTime + 0.5 < last && !v.muted) {
        v.muted = true;
        setSound(false);
        bgm().pauseForHidden(false);
      }
      last = v.currentTime;
    };
    v.addEventListener("timeupdate", onTime);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      bgm().pauseForHidden(false);
    };
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    const next = !sound;
    v.muted = !next;
    if (next) {
      v.currentTime = 0;
      v.play().catch(() => {});
    }
    bgm().pauseForHidden(next);
    setSound(next);
  };

  const pick = (i: number) => {
    const v = ref.current;
    if (v && !v.muted) {
      v.muted = true;
      setSound(false);
      bgm().pauseForHidden(false);
    }
    if (onPick) onPick(i);
    else openPromo(i);
  };

  return (
    <section className="pb-2">
      <h1 className="pt-4 text-center text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
        {title}
      </h1>

      <div className="relative mt-3.5 overflow-hidden rounded-[14px]" style={{ border: `1px solid ${GOLD}`, aspectRatio: "1 / 1", backgroundColor: "#0b1020" }}>
        <video ref={ref} className="block h-full w-full object-cover" poster={poster} autoPlay muted loop playsInline preload="auto" aria-label={`${title} 홍보 영상`}>
          <source src={video} type="video/mp4" />
        </video>
        <button
          type="button"
          onClick={toggle}
          aria-label={sound ? "소리 끄기" : "소리 켜기"}
          className="absolute right-2.5 top-2.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold"
          style={{ backgroundColor: "rgba(19,32,63,.78)", color: "#f3e7c6", border: `1px solid ${GOLD}` }}
        >
          {sound ? "🔊 소리 끄기" : "🔈 소리 켜기"}
        </button>
      </div>

      <p className="mt-[18px] text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {question}
      </p>
      <p className="mt-1 text-center text-[12.5px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {sub}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {cards.map((c, i) => (
          <button
            key={c.title}
            type="button"
            onClick={() => pick(i)}
            className="relative block overflow-hidden rounded-2xl text-left transition-transform active:scale-[0.98]"
            style={{ aspectRatio: "3 / 4", border: "1.5px solid #cfa95c", boxShadow: "0 3px 8px rgba(60,40,10,.25)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- 카드 그림 */}
            <img src={c.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(8,12,28,.6) 52%, rgba(8,12,28,.9) 78%)" }} />
            <span
              aria-hidden
              className="absolute left-[9px] top-[9px] flex h-[30px] w-[30px] items-center justify-center rounded-full text-[15px] font-bold"
              style={{ backgroundColor: "rgba(19,32,63,.85)", border: `1.5px solid ${GOLD}`, color: "#f2d48a", fontFamily: "var(--font-serif)" }}
            >
              {c.stamp}
            </span>
            <span className="absolute left-[11px] right-[11px] top-[57%]" style={{ color: "#fff", textShadow: "0 2px 6px rgba(0,0,0,.7)" }}>
              <span className="block whitespace-pre-line text-[16px] font-bold leading-[1.3]" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
                {c.title}
              </span>
              <span className="mt-1 block whitespace-pre-line text-[11.5px] leading-[1.35]" style={{ color: "#f0e2bf", wordBreak: "keep-all" }}>
                {c.desc}
              </span>
              {c.tag && (
                <span className="mt-1.5 inline-block rounded-md px-[7px] py-px text-[11px]" style={{ backgroundColor: "#a8322a", color: "#fff", textShadow: "none" }}>
                  {c.tag}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <p className="mt-3.5 text-center text-[13px]" style={{ color: NAVY }}>
        <span className="rounded-full px-3 py-1 text-[12px] font-bold" style={{ backgroundColor: NAVY, color: "#f3e7c6" }}>
          무료로 시작해요
        </span>
        &nbsp; {foot}
      </p>
    </section>
  );
}

/** 카드를 누르기 전에는 숨겨 두었다가, 누르면(또는 카카오 로그인에서 돌아오면) 열고 그 자리로 내려간다 */
export function PromoReveal({ id, children }: { id: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("resume")) setOpen(true);
    const on = () => {
      setOpen(true);
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    };
    window.addEventListener(PROMO_OPEN, on);
    return () => window.removeEventListener(PROMO_OPEN, on);
  }, [id]);
  return (
    <section id={id} className="scroll-mt-4 pb-8 pt-5" hidden={!open}>
      {open && children}
    </section>
  );
}

/** 랜딩 아래쪽 세 단 (2026-11-10 유샘 확정 시안 below4): 볼 수 있는 것 / 이렇게 보세요 / 다른 운세 */
export function PromoBelow({
  see,
  prices,
  fine,
  others,
}: {
  see: Array<[string, string, string]>;
  prices: Array<[string, string]>;
  fine?: string;
  others: Array<[string, string, string]>;
}) {
  const card = { backgroundColor: "#fffaf0", border: "1px solid #d9c49a" } as const;
  const H = ({ t }: { t: string }) => (
    <h2 className="mb-3 mt-6 text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
      {t}
    </h2>
  );
  return (
    <div className="pb-6">
      <H t="이 풀이에서 볼 수 있는 것" />
      <ol className="space-y-2">
        {see.map(([m, a, b]) => (
          <li key={a} className="flex items-start gap-3 rounded-[14px] px-3.5 py-[11px]" style={card}>
            <span aria-hidden className="w-[18px] shrink-0 text-center text-[17px] font-black" style={{ color: "#b8913f", fontFamily: "var(--font-serif)" }}>
              {m}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">{a}</span>
              <span className="block text-[12.5px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                {b}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <H t="이렇게 보세요" />
      <div className="rounded-[14px] px-3.5 py-1" style={{ backgroundColor: "#ebe3d1" }}>
        {prices.map(([a, v], i) => (
          <div key={a} className="flex items-center py-[9px] text-[14px]" style={i < prices.length - 1 ? { borderBottom: "1px dashed #cdbd98" } : undefined}>
            <span style={{ wordBreak: "keep-all" }}>{a}</span>
            <span className="ml-auto shrink-0 pl-3 font-bold" style={v.startsWith("무료") ? { color: "#2f6b3a" } : undefined}>
              {v}
            </span>
          </div>
        ))}
      </div>
      {fine && (
        <p className="mt-2.5 text-center text-[11.5px]" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
          {fine}
        </p>
      )}
      <H t="다른 운세" />
      <div className="grid grid-cols-2 gap-2">
        {others.map(([a, b, href]) => (
          <a key={a} href={href} className="block rounded-[14px] px-3 py-2.5" style={card}>
            <span className="block text-[14.5px] font-bold">{a}</span>
            <span className="block text-[11.5px]" style={{ color: "var(--color-ink-soft)" }}>
              {b}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
