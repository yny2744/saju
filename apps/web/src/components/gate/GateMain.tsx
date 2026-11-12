"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { bgm } from "@/components/bgm/bgm";
import { isOnSale } from "@/lib/sale";

/**
 * 정문 대문 (2026-11-11 유샘 확정 시안 gate_mock 2안)
 *   ① 대문 영상이 화면을 꽉 채운다 (머리줄 없이). 소리 없이 시작 - 화면을 누르면 소리와 함께 처음부터.
 *      오른쪽 아래 "건너뛰기". 영상이 끝나거나 건너뛰면 ②로.
 *   ② 카드 여덟 장이 휴대폰 한 화면에: 무료로 시작해요 4 (오늘의 운세 · 만세력 · 띠별 운세 · 관상)
 *      + 지금 뜨는 운세 4 (수능대박운 · 2027 신년운 · 크리스마스 연애운 · 오늘의 타로 - 곧 열려요).
 *      지금 뜨는 운세는 유튜브 홈처럼 카드 속 짧은 영상이 소리 없이 하나씩 차례로 돈다.
 *   같은 창에서 다시 오면(새로 고침·뒤로 가기) 대문 영상은 건너뛴다 (세션 한 번).
 */

const INTRO = { video: "/gate/mgml/intro-portrait.mp4", poster: "/gate/mgml/intro-portrait.jpg" };
const SEEN_KEY = "gate-intro-seen";

type Card = { href?: string; img: string; video?: string; stamp: string; title: string; desc: string; badge: string; soon?: boolean; sale?: string };

const FREE: Card[] = [
  { href: "/start?next=fortune", img: "/promo/free-fortune.jpg", stamp: "日", title: "오늘의 운세", desc: "오늘과 내일, 나의 기운", badge: "무료" },
  { href: "/start", img: "/promo/free-manse.jpg", stamp: "命", title: "만세력", desc: "여덟 글자 · 오행 · 대운", badge: "무료" },
  { href: "/tti", img: "/promo/free-tti.jpg", stamp: "支", title: "띠별 운세", desc: "띠만 고르면 바로", badge: "무료" },
  { href: "/face", img: "/promo/free-face.jpg", stamp: "相", title: "관상", desc: "사진 한 장으로 보는 기질", badge: "무료" },
];

function seasonCards(suneung: boolean): Card[] {
  const list: Card[] = [];
  if (suneung) list.push({ href: "/go/suneung", img: "/promo/pv-suneung.jpg", video: "/promo/pv-suneung.mp4", stamp: "試", title: "수능대박운", desc: "시험날, 나의 기운은?", badge: "▶" });
  list.push(
    { href: "/go/newyear2027", img: "/promo/pv-newyear2027.jpg", video: "/promo/pv-newyear2027.mp4", stamp: "年", title: "2027 신년운", desc: "정미년, 나의 한 해는?", badge: "▶", sale: "newyear" },
    { href: "/go/gunghap", img: "/promo/pv-xmas.jpg", video: "/promo/pv-xmas.mp4", stamp: "緣", title: "크리스마스 연애운", desc: "이번 겨울, 나의 인연은?", badge: "▶", sale: "love" },
    // 2026-11-10 유샘: 타로는 카드 그림 22장이 준비될 때까지 열지 않는다
    { img: "/promo/pv-tarot.jpg", stamp: "卜", title: "오늘의 타로", desc: "곧 열려요", badge: "곧 열려요", soon: true },
  );
  // 2026-11-12 유샘: 판매 잠금(saleOnly) 중인 운세는 보여만 주고 "곧 열려요"
  return list.map((c) => (c.sale && !isOnSale(c.sale) ? { ...c, soon: true, badge: "곧 열려요", video: undefined } : c));
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
    bgm().pauseForHidden(false);
    window.setTimeout(() => setIntro(false), 550);
  }, []);

  const tapSound = () => {
    const v = vRef.current;
    if (!v || !v.muted) return;
    v.currentTime = 0;
    v.muted = false;
    bgm().pauseForHidden(true);
    v.play().catch(() => {
      v.muted = true;
      v.play().catch(() => {});
    });
  };

  const seasons = seasonCards(suneung);

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
        <Group title="무료로 시작해요" sub="로그인 없이 바로 볼 수 있어요" cards={FREE} free />
        <Group title="지금 뜨는 운세" sub="무료로 맛보고, 로그인하면 끝까지" cards={seasons} preview={!intro} />
      </section>
    </>
  );
}

function Group({ title, sub, cards, free, preview }: { title: string; sub: string; cards: Card[]; free?: boolean; preview?: boolean }) {
  // 지금 뜨는 운세: 영상이 있는 카드 하나씩 차례로 소리 없이 재생 (4.5초마다 다음 카드)
  const playable = cards.map((c, i) => (c.video ? i : -1)).filter((i) => i >= 0);
  const [active, setActive] = useState(playable[0] ?? -1);
  useEffect(() => {
    if (!preview || playable.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => {
      setActive((a) => playable[(playable.indexOf(a) + 1) % playable.length]);
    }, 4500);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, playable.join(",")]);

  return (
    <div>
      <h2 className="mb-0.5 mt-4 text-[16.5px] font-bold" style={{ color: "#f6dfa0", fontFamily: "var(--font-serif)" }}>
        {title}
      </h2>
      <p className="mb-2 text-[11.5px]" style={{ color: "#bfae86" }}>
        {sub}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cards.map((c, i) => {
          const inner = (
            <>
              {preview && i === active && c.video ? (
                <video className="absolute inset-0 h-full w-full object-cover" src={c.video} poster={c.img} autoPlay muted loop playsInline aria-hidden />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- 카드 그림
                <img src={c.img} alt="" className="absolute inset-0 h-full w-full object-cover" style={c.soon ? { filter: "grayscale(.45) brightness(.7)" } : undefined} />
              )}
              <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 32%, rgba(6,10,24,.62) 56%, rgba(6,10,24,.93) 82%)" }} />
              <span
                aria-hidden
                className="absolute left-[7px] top-[7px] flex h-[27px] w-[27px] items-center justify-center rounded-full text-[13.5px] font-bold"
                style={{ backgroundColor: "rgba(16,26,52,.88)", border: `1.5px solid ${GOLD}`, color: "#f2d48a", fontFamily: "var(--font-serif)" }}
              >
                {c.stamp}
              </span>
              <span
                className="absolute right-[7px] top-[7px] rounded-[10px] px-[7px] py-px text-[10.5px]"
                style={free ? { backgroundColor: "#2f6b3a", border: "1px solid #7fc08a", color: "#fff" } : { backgroundColor: "rgba(16,26,52,.85)", border: `1px solid ${GOLD}`, color: "#f3e7c6" }}
              >
                {c.badge}
              </span>
              <span className="absolute bottom-[9px] left-[10px] right-[8px]" style={{ textShadow: "0 2px 5px rgba(0,0,0,.75)" }}>
                <span className="block text-[15px] font-bold leading-tight" style={{ color: "#fff", fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
                  {c.title}
                </span>
                <span className="mt-0.5 block text-[11px]" style={{ color: "#f0e2bf", wordBreak: "keep-all" }}>
                  {c.desc}
                </span>
              </span>
            </>
          );
          const cls = "gm-card relative block overflow-hidden rounded-[13px]";
          const style = { border: "1px solid #cfa95c" } as const;
          return c.href && !c.soon ? (
            // 2026-11-11 유샘: 지금 뜨는 운세를 누르면 랜딩 영상이 나레이션과 함께 바로 나온다.
            //   같은 창 안에서 넘어가야(Link) 누른 손길이 이어져 휴대폰이 소리를 허락한다 - 랜딩은 ?sound=1 을 보고 소리를 켠다.
            <Link key={c.title} href={c.video ? `${c.href}?sound=1` : c.href} className={`${cls} transition-transform active:scale-[0.98]`} style={style}>
              {inner}
            </Link>
          ) : (
            <div key={c.title} className={cls} style={style} aria-disabled>
              {inner}
            </div>
          );
        })}
      </div>
      {/* 카드 여덟 장이 휴대폰 한 화면에 들어오게: 화면 높이에 맞춰 카드 높이를 정한다 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `.gm-card{height:clamp(108px,calc((100svh - 240px) / 4),190px)}`,
        }}
      />
    </div>
  );
}
