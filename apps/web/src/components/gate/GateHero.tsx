"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TenantGate } from "@/tenants/types";
import { HeaderAuth } from "@/components/landing/HeaderAuth";
import { BgmToggle } from "@/components/bgm/BgmPlayer";
import { buildStage, resetFruit, startFlow, startIntro, type Built } from "./gateMotion";
import { GateCards } from "./GateCards";
import { GateDoor } from "./GateDoor";
import { GateIntroDialog } from "./GateIntro";
import { GATE_CSS } from "./gateStyles";

/**
 * 세 길·일곱 운 대문 (2026-10-28 mgml). 시안(유샘 확정 레이아웃)을 그대로 옮겼다.
 *   - 화면 전체 폭 (PC에서는 액자 밖까지 - 가로 화면 구도, 휴대폰은 세로 화면 구도)
 *   - 엠블럼·제목을 누르면 소개글 창 (2번 작업)
 *   - 일곱 운·길 이름·채움을 누르면 아래 그 방(관)으로 (1·3번 작업)
 *   - 2026-10-29 첫 장면: 빛 구슬이 세 길을 차례로 내려가고 채움(結)이 피었다 접히면 소개 카드 9장이
 *     3초마다 넘어간다 (9번 다음은 1번 표지로). 오른쪽 화살표는 바로 다음 장, 건너뛰기는 대문으로.
 */
export function GateHero({ gate, brand }: { gate: TenantGate; brand: string }) {
  const ptRef = useRef<SVGSVGElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [introOpen, setIntroOpen] = useState(false);
  const [phase, setPhase] = useState<"intro" | "cards" | "gate">("intro");
  // 광고별 홀로그램 대문이 떠 있으면 대문 그림(제목·엠블럼·길)을 그만큼 아래로 내린다
  const [doorOn, setDoorOn] = useState(false);
  const onDoorShown = useCallback((on: boolean) => setDoorOn(on), []);
  const builtRef = useRef<Built | null>(null);
  const flowStop = useRef<(() => void) | null>(null);
  // 카드 칸 자리: 流結 엠블럼 아래쪽에 카드 윗변이 살짝 맞물리게 (2026-10-30 유샘 확정 시안) - 화면 크기에 따라 다시 잰다
  const [disc, setDisc] = useState<{ cx: number; cy: number; r: number } | null>(null);
  useEffect(() => {
    if (phase !== "cards") return;
    const measure = () => {
      const hero = heroRef.current;
      const d = ptRef.current?.querySelector(".gh-disc");
      if (!hero || !d) return;
      const a = d.getBoundingClientRect();
      const h = hero.getBoundingClientRect();
      setDisc({ cx: a.left + a.width / 2 - h.left, cy: a.top + a.height / 2 - h.top, r: a.width / 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [phase]);

  // 영상: 대문은 사이트 폭(휴대폰 폭) 안에 세로 구도로 들어간다 (2026-10-28 유샘: 아래 화면과 같은 폭)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.getAttribute("src") !== gate.media.portrait) {
      v.setAttribute("src", gate.media.portrait);
      v.play?.().catch(() => {});
    }
  }, [gate]);

  // 한 화면에 다 들어오게: 영상은 화면을 꽉 채우고(cover), 그림(길·운·채움)은
  // 꽉 채워도 안 잘리면 그대로(slice), 잘릴 화면이면 전체가 보이게 줄인다(meet).
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    // 그림이 차지하는 범위 [x1, y1, x2, y2] (가로 1600×900, 세로 900×1600 좌표)
    const fit = (svg: SVGSVGElement | null, vw: number, vh: number, box: [number, number, number, number]) => {
      if (!svg) return;
      const w = svg.clientWidth || hero.clientWidth;
      const h = svg.clientHeight || hero.clientHeight;
      if (!w || !h) return;
      const s = Math.max(w / vw, h / vh);
      const ox = (w - vw * s) / 2;
      const oy = (h - vh * s) / 2;
      const ok = box[0] * s + ox >= 0 && box[2] * s + ox <= w && box[1] * s + oy >= 0 && box[3] * s + oy <= h;
      svg.setAttribute("preserveAspectRatio", ok ? "xMidYMid slice" : "xMidYMid meet");
    };
    const apply = () => {
      fit(ptRef.current, 900, 1600, [96, 160, 804, 1500]);
    };
    apply();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(apply) : null;
    ro?.observe(hero);
    if (ptRef.current) ro?.observe(ptRef.current);
    return () => ro?.disconnect();
  }, [doorOn]);

  // 홀로그램 대문과 제목이 겹치지 않게: 문 아래 끝 + 12px 아래에서 제목이 시작하도록 대문 그림을 내린다.
  // 2026-10-30 고침: 화면에 그려진 제목 위치를 재면(그리기 전·움직이는 중에 재면) 크게 어긋날 수 있어,
  // 화면 크기와 그림 비율(fit 과 같은 규칙)로 계산한다 - 언제 재도 같은 값.
  useEffect(() => {
    const hero = heroRef.current;
    if (!doorOn || !hero) return;
    const solve = () => {
      const W = hero.clientWidth;
      const H = hero.clientHeight;
      const wrap = hero.querySelector<HTMLElement>(".gh-door-wrap");
      if (!W || !H || !wrap) return;
      const doorBottom = wrap.offsetTop + wrap.offsetHeight;
      // 제목 글자 윗선 (그림 좌표, 글꼴이 늦게 와도 170 근처)
      let tTop = 170;
      try {
        const bb = (ptRef.current?.querySelector(".gh-title") as SVGGraphicsElement | null)?.getBBox();
        if (bb && bb.height > 10) tTop = bb.y;
      } catch {
        /* 기본값 */
      }
      const titleAt = (S: number) => {
        const h = H - S;
        const s1 = Math.max(W / 900, h / 1600);
        const ox = (W - 900 * s1) / 2;
        const oy = (h - 1600 * s1) / 2;
        const ok = 96 * s1 + ox >= 0 && 804 * s1 + ox <= W && 160 * s1 + oy >= 0 && 1500 * s1 + oy <= h;
        const sc = ok ? s1 : Math.min(W / 900, h / 1600);
        const oyy = ok ? oy : (h - 1600 * sc) / 2;
        return S + oyy + tTop * sc;
      };
      let S = 0;
      while (S < 200 && titleAt(S) < doorBottom + 12) S += 2;
      hero.style.setProperty("--gh-door-shift", `${S}px`);
    };
    const raf = requestAnimationFrame(solve);
    const t1 = window.setTimeout(solve, 400);
    const t2 = window.setTimeout(solve, 1200);
    document.fonts?.ready.then(solve).catch(() => {});
    window.addEventListener("resize", solve);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", solve);
    };
  }, [doorOn]);

  // 길·운 그리기 → 첫 장면(빛 구슬이 세 길을 차례로) → 소개 카드
  useEffect(() => {
    let stopIntro: (() => void) | null = null;
    let done = false;
    const build = () => {
      if (done || !ptRef.current) return;
      done = true;
      const b = buildStage(ptRef.current, "pt", gate, [450, 388]);
      builtRef.current = b;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPhase("cards");
      else stopIntro = startIntro(b, () => setPhase("cards"));
    };
    // 글자 바탕 크기를 실제 글꼴로 재야 하므로 글꼴이 준비된 뒤 (최대 1.2초)
    const timer = window.setTimeout(build, 1200);
    document.fonts?.ready.then(build).catch(build);
    return () => {
      window.clearTimeout(timer);
      stopIntro?.();
      flowStop.current?.();
    };
  }, [gate]);

  // 건너뛰기 - 카드를 닫고 대문(세 길·일곱 운)으로. 빛 구슬은 그때부터 계속 흐른다.
  const skipCards = () => {
    setPhase("gate");
    const b = builtRef.current;
    if (!b || flowStop.current) return;
    resetFruit(b);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) flowStop.current = startFlow([b], () => !document.hidden);
  };

  const openIntro = (e: React.MouseEvent) => {
    e.preventDefault();
    setIntroOpen(true);
  };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- 대문 명조 글꼴 (한자 포함) */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Gowun+Dodum&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: GATE_CSS }} />
      <section ref={heroRef} className={`gh-hero${phase === "cards" ? " gh-cards-on" : ""}${doorOn ? " gh-door-on" : ""}`} aria-labelledby="gh-h1">
        <h1 id="gh-h1" className="sr-only">{`${gate.title} · ${gate.intro.tagline} · ${brand}`}</h1>
        <video ref={videoRef} className="gh-video" muted playsInline autoPlay loop preload="auto" aria-hidden="true" poster={gate.media.posterPortrait} />
        <div className="gh-shade" />

        <header className="gh-bar">
          <a className="gh-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
            <img src={gate.emblem} alt="" />
            {/* 2026-10-30 유샘: 머리줄은 엠블럼 + 대문 이름 (모든 화면 머리줄과 같게) */}
            {gate.title}
          </a>
          <nav className="gh-nav" aria-label="세 길">
            <BgmToggle />
            <HeaderAuth />
          </nav>
        </header>

        {/* 세로 화면 (영상 9:16 기준 좌표) - 2026-10-28 유샘 확정 레이아웃 */}
        {/* 2026-10-30: 三道·七運은 제목 아래 끝과 카드 윗변(엠블럼 중심 + 반지름 × 0.71)의 정중앙 y=358 (유샘) */}
        <svg ref={ptRef} className="gh-stage gh-pt" viewBox="0 0 900 1600" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="gh-glow-pt" filterUnits="userSpaceOnUse" x="0" y="0" width="900" height="1600">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="gh-sun-pt">
              <stop offset="0" stopColor="#f4e2b8" stopOpacity=".55" />
              <stop offset="1" stopColor="#f4e2b8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <a href="#intro" onClick={openIntro} aria-label="소개글 보기">
            <text className="gh-title gh-a-title" x="450" y="240" fontSize="76" textAnchor="middle">
              {gate.title}
            </text>
          </a>
          <text className="gh-side gh-a-tag" x="232" y="358" fontSize="58" textAnchor="middle" dominantBaseline="central">
            {gate.sideLeft}
          </text>
          <text className="gh-side gh-a-tag" x="668" y="358" fontSize="58" textAnchor="middle" dominantBaseline="central">
            {gate.sideRight}
          </text>
          <circle className="gh-halo" cx="450" cy="388" r="210" fill="url(#gh-sun-pt)" />
          <a href="#intro" onClick={openIntro} aria-label="소개글 보기" className="gh-a-emblem">
            <g className="gh-emblem-pulse">
              <circle cx="450" cy="388" r="98" className="gh-disc" />
              <image href={gate.emblem} x="362" y="300" width="176" height="176" />
            </g>
          </a>
          <path className="gh-way-path gh-way-know" pathLength={1} />
          <path className="gh-way-path gh-way-heart" pathLength={1} />
          <path className="gh-way-path gh-way-ahead" pathLength={1} />
          <g className="gh-nodes" />
        </svg>
        {gate.doors && <GateDoor doors={gate.doors} onShown={onDoorShown} />}
        {phase === "cards" && <GateCards onSkip={skipCards} disc={disc} emblem={gate.emblem} />}
      </section>
      <GateIntroDialog gate={gate} open={introOpen} onClose={() => setIntroOpen(false)} />
    </>
  );
}
