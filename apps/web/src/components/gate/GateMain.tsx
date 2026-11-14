"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bgm } from "@/components/bgm/bgm";
import { isOnSale } from "@/lib/sale";

/**
 * 정문 대문 (2026-11-11 유샘 확정 시안 gate_mock 2안)
 *   ① 대문 영상이 화면을 꽉 채운다 (머리줄 없이). 소리 없이 시작 - 화면을 누르면 소리와 함께 처음부터.
 *      오른쪽 아래 "건너뛰기". 영상이 끝나거나 건너뛰면 ②로.
 *   ② 2026-11-14 유샘 확정 시안(gate_draft2): 무료로 시작해요 8 (4×2, 배지 없이)
 *      → 내 사주 겹쳐 보기 6 (3×2, 제목 옆 "각 990냥" 하나) → 지금 뜨는 운세: 수능대박운 긴 카드 + 곧 열려요 3.
 *      수능대박운 긴 카드는 짧은 영상이 소리 없이 돈다.
 *   같은 창에서 다시 오면(새로 고침·뒤로 가기) 대문 영상은 건너뛴다 (세션 한 번).
 */

const INTRO = { video: "/gate/mgml/intro-portrait.mp4", poster: "/gate/mgml/intro-portrait.jpg" };
const SEEN_KEY = "gate-intro-seen";

type Card = { href?: string; img: string; video?: string; stamp: string; title: string; desc: string; badge: string; soon?: boolean; sale?: string };

const FREE: Card[] = [
  { href: "/start?next=fortune", img: "/promo/free-fortune.jpg", stamp: "日", title: "오늘의 운세", desc: "", badge: "" },
  { href: "/start", img: "/promo/free-manse.jpg", stamp: "命", title: "만세력", desc: "", badge: "" },
  { href: "/tti", img: "/promo/free-tti.jpg", stamp: "支", title: "띠별 운세", desc: "", badge: "" },
  { href: "/face", img: "/promo/free-face.jpg", stamp: "相", title: "관상", desc: "", badge: "" },
  { href: "/fun/mbti", img: "/promo/fun-mbti.jpg", stamp: "型", title: "MBTI", desc: "", badge: "" },
  { href: "/fun/zodiac", img: "/promo/fun-zodiac.jpg", stamp: "★", title: "별자리", desc: "", badge: "" },
  { href: "/fun/blood", img: "/promo/fun-blood.jpg", stamp: "血", title: "혈액형", desc: "", badge: "" },
  { href: "/fun/numerology", img: "/promo/fun-numerology.jpg", stamp: "數", title: "수비학", desc: "", badge: "" },
];

/** 2026-11-14 유샘: 재미 운세에 내 사주를 겹쳐 보는 990냥 (기본 풀이는 무료, 겹쳐 보기 풀이만 엽전) */
const OVERLAY: Card[] = [
  { href: "/fun/mbti", img: "/promo/fun-mbti.jpg", stamp: "型", title: "MBTI × 사주", desc: "유형과 일간을 겹쳐", badge: "" },
  { href: "/fun/numerology", img: "/promo/fun-numerology.jpg", stamp: "數", title: "수비학 × 사주", desc: "인생 수와 오행", badge: "" },
  { href: "/fun/zodiac", img: "/promo/fun-zodiac.jpg", stamp: "★", title: "별자리 × 사주", desc: "별과 여덟 글자", badge: "" },
  { href: "/fun/blood", img: "/promo/fun-blood.jpg", stamp: "血", title: "혈액형 × 사주", desc: "기질 두 겹", badge: "" },
  { href: "/fun/flower", img: "/promo/fun-flower.jpg", stamp: "花", title: "탄생화 × 사주", desc: "나를 채우는 꽃", badge: "" },
  { href: "/fun/birthstone", img: "/promo/fun-birthstone.jpg", stamp: "石", title: "탄생석 × 사주", desc: "나를 채우는 돌", badge: "" },
];

const SUNEUNG: Card = { href: "/go/suneung", img: "/promo/pv-suneung.jpg", video: "/promo/pv-suneung.mp4", stamp: "試", title: "수능대박운", desc: "11월 19일, 나의 기운은?", badge: "무료로 시작" };

function seasonCards(): Card[] {
  const list: Card[] = [
    { href: "/go/newyear2027", img: "/promo/pv-newyear2027.jpg", stamp: "年", title: "2027 신년운", desc: "", badge: "▶", sale: "newyear" },
    { href: "/go/gunghap", img: "/promo/pv-xmas.jpg", stamp: "緣", title: "크리스마스 연애운", desc: "", badge: "▶", sale: "love" },
    // 2026-11-10 유샘: 타로는 카드 그림 22장이 준비될 때까지 열지 않는다
    { img: "/promo/pv-tarot.jpg", stamp: "卜", title: "오늘의 타로", desc: "", badge: "곧 열려요", soon: true },
  ];
  // 2026-11-12 유샘: 판매 잠금(saleOnly) 중인 운세는 보여만 주고 "곧 열려요"
  return list.map((c) => (c.sale && !isOnSale(c.sale) ? { ...c, soon: true, badge: "곧 열려요" } : c));
}

const GOLD = "#d6b36a";

export function GateMain({ suneung }: { suneung: boolean }) {
  const [intro, setIntro] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const vRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) setIntro(false);
    } catch {
      /* 저장소를 못 쓰면 매번 보여 준다 */
    }
  }, []);

  // 대문이 떠 있는 동안 아래 화면이 스크롤되지 않게
  useEffect(() => {
    if (!intro) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [intro]);

  const finish = useCallback(() => {
    setLeaving(true);
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* 무시 */
    }
    const v = vRef.current;
    if (v) v.muted = true;
    bgm().holdForVideo(false);
    window.setTimeout(() => setIntro(false), 550);
  }, []);

  const tapSound = () => {
    const v = vRef.current;
    if (!v || !v.muted) return;
    v.currentTime = 0;
    v.muted = false;
    bgm().holdForVideo(true);
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
  };

  const seasons = seasonCards();

  return (
    <>
      {intro && (
        <div
          role="dialog"
          aria-label="대문"
          onClick={tapSound}
          className="fixed inset-0 z-[80] overflow-hidden transition-opacity duration-500"
          style={{ backgroundColor: "#060a18", opacity: leaving ? 0 : 1 }}
        >
          <video
            ref={vRef}
            className="gm-video absolute inset-0 h-full w-full"
            src={INTRO.video}
            poster={INTRO.poster}
            autoPlay
            muted
            playsInline
            preload="auto"
            onEnded={finish}
          />
          <p className="pointer-events-none absolute inset-x-0 bottom-[78px] text-center text-[12.5px]" style={{ color: "rgba(243,231,198,.85)", textShadow: "0 1px 4px rgba(0,0,0,.7)" }}>
            화면을 누르면 소리와 함께 다시 시작해요
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              finish();
            }}
            className="absolute bottom-[26px] right-[14px] rounded-full px-4 py-2 text-[13.5px]"
            style={{ border: `1px solid ${GOLD}`, backgroundColor: "rgba(8,12,28,.55)", color: "#f3e7c6" }}
          >
            건너뛰기 ›
          </button>
          <style
            dangerouslySetInnerHTML={{
              __html: `.gm-video{object-fit:cover}@media (min-aspect-ratio:3/4){.gm-video{object-fit:contain}}`,
            }}
          />
        </div>
      )}

      <section className="gm-cards px-[14px] pb-6 pt-px" style={{ backgroundColor: "#0b1226", color: "#f3e7c6" }}>
        <Head title="무료로 시작해요" sub="로그인 없이 바로 볼 수 있어요" />
        <div className="grid grid-cols-4 gap-1.5">
          {FREE.map((c) => (
            <Tile key={c.title} c={c} small />
          ))}
        </div>

        <Head title="내 사주 겹쳐 보기" sub="재미 운세에 내 사주를 더해 깊게 · 가입 선물 990냥으로 바로" price="각 990냥" />
        <div className="grid grid-cols-3 gap-[7px]">
          {OVERLAY.map((c) => (
            <Tile key={c.title} c={c} />
          ))}
        </div>

        <Head title="지금 뜨는 운세" sub="무료로 맛보고, 로그인하면 끝까지" />
        {suneung && <Wide c={SUNEUNG} play={!intro} />}
        <div className="mt-[7px] grid grid-cols-3 gap-[7px]">
          {seasons.map((c) => (
            <Tile key={c.title} c={c} badge={c.soon ? "곧 열려요" : undefined} />
          ))}
        </div>
      </section>
    </>
  );
}

function Head({ title, sub, price }: { title: string; sub: string; price?: string }) {
  return (
    <>
      <h2 className="mb-0.5 mt-4 flex items-center gap-2 text-[16.5px] font-bold" style={{ color: "#f6dfa0", fontFamily: "var(--font-serif)" }}>
        {title}
        {price && (
          <span className="rounded-xl px-2.5 py-px text-[12px] font-black" style={{ background: "linear-gradient(#f2d48a,#c99a3c)", color: "#13203f", border: "1px solid #f6dfa0" }}>
            {price}
          </span>
        )}
      </h2>
      <p className="mb-2 text-[11.5px]" style={{ color: "#bfae86", wordBreak: "keep-all" }}>
        {sub}
      </p>
    </>
  );
}

const STAMP = { backgroundColor: "rgba(16,26,52,.9)", border: `1.3px solid ${GOLD}`, color: "#f2d48a", fontFamily: "var(--font-serif)" } as const;

/** 정사각에 가까운 칸 - small 은 4칸 줄(무료), 아니면 3칸 줄 */
function Tile({ c, small, badge }: { c: Card; small?: boolean; badge?: string }) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- 카드 그림 */}
      <img src={c.img} alt="" className="absolute inset-0 h-full w-full object-cover" style={c.soon ? { filter: "grayscale(.5) brightness(.65)" } : undefined} />
      <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 35%, rgba(6,10,24,.9) 82%)" }} />
      <span aria-hidden className={`absolute left-1 top-1 flex items-center justify-center rounded-full font-bold ${small ? "h-[21px] w-[21px] text-[11px]" : "h-[24px] w-[24px] text-[12px]"}`} style={STAMP}>
        {c.stamp}
      </span>
      {badge && (
        <span className="absolute right-1 top-1 rounded-lg px-[5px] text-[9.5px]" style={{ backgroundColor: "rgba(16,26,52,.85)", border: `1px solid ${GOLD}`, color: "#f3e7c6" }}>
          {badge}
        </span>
      )}
      <span className="absolute bottom-1.5 left-1.5 right-1" style={{ textShadow: "0 2px 4px rgba(0,0,0,.8)" }}>
        <span className={`block font-bold leading-tight ${small ? "text-[12.5px]" : "text-[13.5px]"}`} style={{ color: "#fff", fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
          {c.title}
        </span>
        {c.desc && (
          <span className="mt-px block text-[9.5px]" style={{ color: "#f0e2bf", wordBreak: "keep-all" }}>
            {c.desc}
          </span>
        )}
      </span>
    </>
  );
  const cls = "relative block overflow-hidden rounded-[11px]";
  const style = { border: "1px solid #cfa95c", aspectRatio: small ? "1 / 1.12" : "1 / 1.05" } as const;
  return c.href && !c.soon ? (
    <Link href={c.href} className={`${cls} transition-transform active:scale-[0.98]`} style={style}>
      {inner}
    </Link>
  ) : (
    <div className={cls} style={style} aria-disabled>
      {inner}
    </div>
  );
}

/** 수능대박운 긴 카드 - 짧은 영상이 소리 없이 돈다. 누르면 랜딩이 나레이션과 함께 (?sound=1, 같은 창 Link) */
function Wide({ c, play }: { c: Card; play: boolean }) {
  return (
    <Link href={`${c.href}?sound=1`} className="relative block h-[150px] overflow-hidden rounded-[13px] transition-transform active:scale-[0.99]" style={{ border: `1.5px solid ${GOLD}` }}>
      {play && c.video ? (
        <video className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 25%" }} src={c.video} poster={c.img} autoPlay muted loop playsInline aria-hidden />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 카드 그림
        <img src={c.img} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: "50% 25%" }} />
      )}
      <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(6,10,24,.9) 0%, rgba(6,10,24,.55) 48%, rgba(0,0,0,0) 75%)" }} />
      <span className="absolute right-2 top-2 rounded-[10px] px-[7px] py-px text-[10.5px]" style={{ backgroundColor: "#2f6b3a", border: "1px solid #7fc08a", color: "#fff" }}>
        {c.badge}
      </span>
      <span className="absolute left-3.5 top-[18px]">
        <span className="block text-[24px] font-bold" style={{ color: "#f6dfa0", fontFamily: "var(--font-serif)" }}>
          {c.title}
        </span>
        <span className="mt-1 block text-[12px]" style={{ color: "#f3e7c6" }}>
          {c.desc}
        </span>
      </span>
      <span className="absolute bottom-3.5 left-3.5 rounded-full px-3 py-1.5 text-[12.5px] font-black" style={{ background: "linear-gradient(#f2d48a,#c99a3c)", color: "#13203f" }}>
        ▶ 시험날 기운 보기
      </span>
    </Link>
  );
}
