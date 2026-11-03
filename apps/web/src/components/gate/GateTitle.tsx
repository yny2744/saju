"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 대문 영상 위 글자 (2026-11-02 유샘 지시서) - 流結 엠블럼 · 제목 · 브랜드를 영상 화면 기준 비율로 원형 문 안에 얹는다.
 *   w·h 는 화면에 그려진 영상의 크기(px) - 잘려 보여도(cover) 영상 기준으로 계산한 상자 안에 그린다.
 *   제목·브랜드는 canvas 에 그린다 (카카오톡 글자 크기 설정에 커지지 않게, 2026-11-02).
 *   글자: Noto Serif KR 굵게, 밝은 금(#FFF6C8) → 짙은 금(#FFBA50) 세로 그라데이션, 짙은 갈색 테두리(#301604), 아래로 부드러운 그림자.
 *   phase: static(그대로) / in(1_intro 1.65초부터 커지며, 브랜드 1.8초부터 페이드 - d1·d2 는 남은 시간) / out(3_open 0.52초부터 빛 속으로)
 */

type Orient = "portrait" | "landscape";

const LAYOUT = {
  // 세로 1080×1920: 크기는 영상 폭 기준
  portrait: { cx: 50, ey: 31.5, ed: 0.218, ty: 43.2, th: 0.139, by: 50.8, bh: 0.056, base: "w" as const, unit: 1080 },
  // 가로 1280×720: 크기는 영상 높이 기준
  landscape: { cx: 49.8, ey: 28.9, ed: 0.23, ty: 49, th: 0.167, by: 62.2, bh: 0.056, base: "h" as const, unit: 720 },
};

export const GATE_TITLE_CSS = `
.gt-item{position:absolute;transform:translate(-50%,-50%);white-space:nowrap;line-height:1}
.gt-in .gt-pop{animation:gt-pop .35s cubic-bezier(.2,.9,.25,1) var(--gd1,0s) both}
.gt-in .gt-fade{animation:gt-fade .3s ease-out var(--gd2,0s) both}
@keyframes gt-pop{from{opacity:0;transform:translate(-50%,-50%) scale(.35)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
@keyframes gt-fade{from{opacity:0}to{opacity:1}}
.gt-out .gt-item{animation:gt-out .28s ease-in .52s both}
@keyframes gt-out{from{opacity:1;filter:none}to{opacity:0;transform:translate(-50%,-50%) scale(1.12);filter:brightness(2.4) blur(2px)}}
@media (prefers-reduced-motion:reduce){.gt-in .gt-pop,.gt-in .gt-fade,.gt-out .gt-item{animation:none}}
`;

/** 구글 폰트에서 쓰는 글자만 받아 온다 (제목·브랜드) */
export function gateFontHref(text: string): string {
  const chars = [...new Set([...text])].join("");
  return `https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@700;900&display=swap&text=${encodeURIComponent(chars)}`;
}


/**
 * 금빛 글자를 canvas 에 그린다 (2026-11-02 유샘: 카카오톡 인앱 브라우저가 글자 크기 설정으로 HTML 글자를 강제로 키우는 문제 -
 * canvas 그림은 커지지 않는다). 화면 배율(devicePixelRatio)만큼 크게 그려 선명하게.
 * 순서: 그림자(갈색 글자) → 갈색 테두리 → 금빛 그라데이션 글자. 글꼴(Noto Serif KR)이 늦게 오면 다시 그린다.
 * maxWidth 를 넘으면 그 안에 들어가게 줄인다.
 */
function GoldText({ text, size, stroke, shadow, weight, maxWidth }: { text: string; size: number; stroke: number; shadow: number; weight: number; maxWidth?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let alive = true;
    const draw = () => {
      const c = ref.current;
      if (!c || !alive) return;
      const font = (px: number) => `${weight} ${px}px "Noto Serif KR", "Nanum Myeongjo", serif`;
      const probe = c.getContext("2d");
      if (!probe) return;
      probe.font = font(size);
      let px = size;
      const measured = probe.measureText(text).width;
      if (maxWidth && measured > maxWidth) px = (size * maxWidth) / measured;
      const sc = px / size;
      const st = stroke * sc;
      const sh = shadow * sc;
      probe.font = font(px);
      const tw = probe.measureText(text).width;
      const padX = st * 2 + sh * 2.5 + 4;
      const padY = st * 2 + sh * 3 + 4;
      const w = Math.ceil(tw + padX * 2);
      const h = Math.ceil(px * 1.35 + padY * 2);
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.font = font(px);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const x = w / 2;
      const y = h / 2;
      // ① 그림자 + ② 갈색 테두리
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,.65)";
      ctx.shadowBlur = sh * 2.2;
      ctx.shadowOffsetY = sh;
      ctx.strokeStyle = "#301604";
      ctx.lineWidth = st * 2;
      ctx.strokeText(text, x, y);
      ctx.restore();
      ctx.strokeStyle = "#301604";
      ctx.lineWidth = st * 2;
      ctx.strokeText(text, x, y);
      // ③ 금빛 세로 그라데이션
      const g = ctx.createLinearGradient(0, y - px * 0.5, 0, y + px * 0.5);
      g.addColorStop(0, "#FFF6C8");
      g.addColorStop(0.45, "#FFE29A");
      g.addColorStop(1, "#FFBA50");
      ctx.fillStyle = g;
      ctx.fillText(text, x, y);
      setBox({ w, h });
    };
    draw();
    // 글꼴이 늦게 오면 다시
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    fonts?.load(`${weight} ${Math.round(size)}px "Noto Serif KR"`, text).then(() => alive && draw()).catch(() => {});
    fonts?.ready.then(() => alive && draw()).catch(() => {});
    return () => {
      alive = false;
    };
  }, [text, size, stroke, shadow, weight, maxWidth]);

  return <canvas ref={ref} aria-label={text} role="img" style={{ display: "block", width: box?.w ?? 0, height: box?.h ?? 0 }} />;
}

export function GateTitle({
  orient,
  w,
  h,
  title,
  brand,
  emblem,
  phase = "static",
  d1 = 0,
  d2 = 0,
  fitWidth,
}: {
  orient: Orient;
  w: number;
  h: number;
  title: string;
  brand: string;
  emblem: string;
  phase?: "static" | "in" | "out";
  d1?: number;
  d2?: number;
  /** 실제로 보이는 폭(px) - 영상 양옆이 화면 밖으로 잘릴 때 긴 제목이 잘리지 않게 (없으면 영상 폭) */
  fitWidth?: number;
}) {
  const L = LAYOUT[orient];
  const basis = L.base === "w" ? w : h;
  const s = basis / L.unit; // 영상 1픽셀이 화면에서 몇 픽셀인지
  // 글자 높이 → 글자 크기 (한글 굵은 명조의 글자 높이는 대략 0.9em)
  const titleSize = (L.th * basis) / 0.9;
  const fit = (fitWidth ?? w) * 0.92; // 긴 제목은 보이는 폭 안으로 (canvas 가 재서 줄인다)
  const brandSize = (L.bh * basis) / 0.9;
  const ed = L.ed * basis;
  return (
    <div className={phase === "in" ? "gt-in" : phase === "out" ? "gt-out" : undefined} style={{ position: "absolute", inset: 0, ["--gd1" as string]: `${d1}s`, ["--gd2" as string]: `${d2}s` }}>
      <div
        className="gt-item gt-pop"
        style={{
          left: `${L.cx}%`,
          top: `${L.ey}%`,
          width: ed,
          height: ed,
          borderRadius: "50%",
          backgroundColor: "rgba(10,20,44,.9)",
          boxShadow: `0 0 0 ${Math.max(1, 2 * s)}px rgba(255,214,140,.55), 0 ${4 * s}px ${14 * s}px rgba(0,0,0,.5)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
        <img src={emblem} alt="" style={{ width: "92%", height: "92%", objectFit: "contain" }} />
      </div>
      <div className="gt-item gt-pop" style={{ left: `${L.cx}%`, top: `${L.ty}%` }}>
        <GoldText text={title} size={titleSize} stroke={6.5 * s} shadow={6 * s} weight={900} maxWidth={fit} />
      </div>
      <div className="gt-item gt-fade" style={{ left: `${L.cx}%`, top: `${L.by}%` }}>
        <GoldText text={brand} size={brandSize} stroke={3.5 * s} shadow={4 * s} weight={700} maxWidth={fit} />
      </div>
    </div>
  );
}
