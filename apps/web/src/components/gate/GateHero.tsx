"use client";

import { useEffect, useRef, useState } from "react";
import type { TenantGate } from "@/tenants/types";
import { HeaderAuth } from "@/components/landing/HeaderAuth";
import { BgmToggle } from "@/components/bgm/BgmPlayer";
import { buildStage, startFlow } from "./gateMotion";
import { GateIntroDialog } from "./GateIntro";
import { GATE_CSS } from "./gateStyles";

/**
 * 세 길·일곱 운 대문 (2026-10-28 mgml). 시안(유샘 확정 레이아웃)을 그대로 옮겼다.
 *   - 화면 전체 폭 (PC에서는 액자 밖까지 - 가로 화면 구도, 휴대폰은 세로 화면 구도)
 *   - 엠블럼·제목을 누르면 소개글 창 (2번 작업)
 *   - 일곱 운·길 이름·채움을 누르면 아래 그 방(관)으로 (1·3번 작업)
 */
export function GateHero({ gate, brand }: { gate: TenantGate; brand: string }) {
  const lsRef = useRef<SVGSVGElement>(null);
  const ptRef = useRef<SVGSVGElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [introOpen, setIntroOpen] = useState(false);

  // 영상: 화면 방향에 맞는 것 하나만 받는다
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const mq = window.matchMedia("(orientation: portrait)");
    const pick = () => {
      const src = mq.matches ? gate.media.portrait : gate.media.landscape;
      v.poster = mq.matches ? gate.media.posterPortrait : gate.media.posterLandscape;
      if (v.getAttribute("src") !== src) {
        v.setAttribute("src", src);
        v.play?.().catch(() => {});
      }
    };
    pick();
    mq.addEventListener?.("change", pick);
    return () => mq.removeEventListener?.("change", pick);
  }, [gate]);

  // 길·운 그리기 → 빛 구슬 흐름
  useEffect(() => {
    let stop: (() => void) | null = null;
    let done = false;
    let onScreen = true;
    const io = typeof IntersectionObserver !== "undefined" && heroRef.current ? new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)) : null;
    if (io && heroRef.current) io.observe(heroRef.current);
    const build = () => {
      if (done || !lsRef.current || !ptRef.current) return;
      done = true;
      const stages = [buildStage(lsRef.current, "ls", gate, [800, 262]), buildStage(ptRef.current, "pt", gate, [450, 388])];
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) stop = startFlow(stages, () => onScreen && !document.hidden);
    };
    // 글자 바탕 크기를 실제 글꼴로 재야 하므로 글꼴이 준비된 뒤 (최대 1.2초)
    const timer = window.setTimeout(build, 1200);
    document.fonts?.ready.then(build).catch(build);
    return () => {
      window.clearTimeout(timer);
      stop?.();
      io?.disconnect();
    };
  }, [gate]);

  const openIntro = (e: React.MouseEvent) => {
    e.preventDefault();
    setIntroOpen(true);
  };

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- 대문 명조 글꼴 (한자 포함) */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@500;700;900&family=Gowun+Dodum&display=swap" />
      <style dangerouslySetInnerHTML={{ __html: GATE_CSS }} />
      <section ref={heroRef} className="gh-hero" aria-labelledby="gh-h1">
        <h1 id="gh-h1" className="sr-only">{`${gate.title} · ${gate.intro.tagline} · ${brand}`}</h1>
        <video ref={videoRef} className="gh-video" muted playsInline autoPlay loop preload="auto" aria-hidden="true" poster={gate.media.posterPortrait} />
        <div className="gh-shade" />

        <header className="gh-bar">
          <a className="gh-brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
            <img src={gate.emblem} alt="" />
            {brand}
          </a>
          <nav className="gh-nav" aria-label="세 길">
            {gate.ways.map((w) => (
              <a key={w.key} className="gh-nl" href={`#way-${w.key}`}>
                {w.name}
              </a>
            ))}
            <a className="gh-nl" href="#fill">
              {gate.fruit.title}
            </a>
            <BgmToggle />
            <HeaderAuth />
          </nav>
        </header>

        {/* 가로 화면 (영상 16:9 기준 좌표) */}
        <svg ref={lsRef} className="gh-stage gh-ls" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="gh-glow-ls" filterUnits="userSpaceOnUse" x="0" y="0" width="1600" height="900">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="gh-sun-ls">
              <stop offset="0" stopColor="#f4e2b8" stopOpacity=".55" />
              <stop offset="1" stopColor="#f4e2b8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <a href="#intro" onClick={openIntro} aria-label="소개글 보기">
            <text className="gh-title gh-a-title" x="800" y="146" fontSize="60" textAnchor="middle">
              {gate.title}
            </text>
          </a>
          <text className="gh-side gh-a-tag" x="628" y="262" fontSize="44" textAnchor="middle" dominantBaseline="central">
            {gate.sideLeft}
          </text>
          <text className="gh-side gh-a-tag" x="972" y="262" fontSize="44" textAnchor="middle" dominantBaseline="central">
            {gate.sideRight}
          </text>
          <circle className="gh-halo" cx="800" cy="262" r="120" fill="url(#gh-sun-ls)" />
          <a href="#intro" onClick={openIntro} aria-label="소개글 보기" className="gh-a-emblem">
            <g className="gh-emblem-pulse">
              <circle cx="800" cy="262" r="68" className="gh-disc" />
              <image href={gate.emblem} x="740" y="202" width="120" height="120" />
            </g>
          </a>
          <path className="gh-way-path gh-way-know" pathLength={1} />
          <path className="gh-way-path gh-way-heart" pathLength={1} />
          <path className="gh-way-path gh-way-ahead" pathLength={1} />
          <g className="gh-nodes" />
        </svg>

        {/* 세로 화면 (영상 9:16 기준 좌표) - 2026-10-28 유샘 확정 레이아웃 */}
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
          <text className="gh-side gh-a-tag" x="232" y="388" fontSize="58" textAnchor="middle" dominantBaseline="central">
            {gate.sideLeft}
          </text>
          <text className="gh-side gh-a-tag" x="668" y="388" fontSize="58" textAnchor="middle" dominantBaseline="central">
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
      </section>
      <GateIntroDialog gate={gate} open={introOpen} onClose={() => setIntroOpen(false)} />
    </>
  );
}
