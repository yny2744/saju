"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementKo } from "@/lib/pillarView";
import { WALL_THEME, type WallpaperSpec } from "@/lib/wallpaper";

/**
 * 행운 배경화면 그리기 (수정안 12) - 휴대폰 세로 1080×2340, 손님 기기 안에서 캔버스로 그린다 (서버·AI 없음).
 * 위쪽 1/4은 시계가 올라오는 자리라 비워 두고, 가운데에 부족한 기운의 금박 한자, 아래에 사주 여덟 글자·띠·행운 숫자·이름.
 */

const W = 1080;
const H = 2340;
const GOLD = "#d4b265";
const GOLD_L = "#f0dca6";
const LIGHT: Record<ElementKo, string> = { 목: "#8fcc9d", 화: "#ef8b7a", 토: "#e2c27c", 금: "#e4e7ee", 수: "#8fb3e6" };
const PHRASE: Record<ElementKo, string> = {
  목: "새로 돋아 뻗어 가는 하루",
  화: "따뜻하게 빛나는 하루",
  토: "단단히 쌓여 가는 하루",
  금: "맺고 이루는 하루",
  수: "윤택하게 채워지는 하루",
};

function rng(seed: number) {
  let s = seed % 2147483647 || 1;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

function pattern(ctx: CanvasRenderingContext2D, kind: (typeof WALL_THEME)[ElementKo]["pattern"], seed: number) {
  const r = rng(seed);
  ctx.save();
  ctx.strokeStyle = "rgba(240,220,166,0.10)";
  ctx.fillStyle = "rgba(240,220,166,0.07)";
  ctx.lineWidth = 3;
  if (kind === "wave") {
    for (let y = 120; y < H; y += 90) {
      ctx.beginPath();
      const ph = r() * Math.PI * 2;
      for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y + Math.sin(x / 60 + ph) * 16);
      ctx.stroke();
    }
  } else if (kind === "leaf") {
    for (let i = 0; i < 70; i++) {
      ctx.save();
      ctx.translate(r() * W, r() * H);
      ctx.rotate(r() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (kind === "flame") {
    for (let i = 0; i < 60; i++) {
      const x = r() * W;
      const y = r() * H;
      const s = 18 + r() * 22;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 1.6);
      ctx.quadraticCurveTo(x + s, y, x, y + s * 0.6);
      ctx.quadraticCurveTo(x - s, y, x, y - s * 1.6);
      ctx.fill();
    }
  } else if (kind === "earth") {
    for (let y = 140; y < H; y += 70) {
      ctx.beginPath();
      ctx.moveTo(0, y + r() * 10);
      ctx.lineTo(W, y + r() * 10);
      ctx.stroke();
    }
    for (let i = 0; i < 90; i++) {
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, 3 + r() * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 24; i++) {
      const x = r() * W;
      const y = r() * H;
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(x, y, k * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

export function drawWallpaper(canvas: HTMLCanvasElement, s: WallpaperSpec, serif: string) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const t = WALL_THEME[s.element];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, t.deep);
  g.addColorStop(0.5, t.mid);
  g.addColorStop(1, t.deep);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  pattern(ctx, t.pattern, s.seed);

  // 금테 두 줄
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(50, 50, W - 100, H - 100);

  const font = (px: number, weight = 700) => `${weight} ${px}px ${serif}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // 머리글 (시계 자리 아래)
  ctx.fillStyle = GOLD;
  ctx.font = font(34, 600);
  ctx.fillText("나 를  채 우 는  기 운", W / 2, 700);

  // 가운데 큰 한자 + 이중 원
  const cy = 1060;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(W / 2, cy, 270, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(W / 2, cy, 248, 0, Math.PI * 2);
  ctx.stroke();
  const gg = ctx.createLinearGradient(0, cy - 180, 0, cy + 180);
  gg.addColorStop(0, GOLD_L);
  gg.addColorStop(1, GOLD);
  ctx.fillStyle = gg;
  ctx.font = font(300, 900);
  ctx.fillText(s.big, W / 2, cy + 10);
  // 낙관
  ctx.fillStyle = "#a83a2e";
  ctx.fillRect(W / 2 + 170, cy + 170, 96, 96);
  ctx.fillStyle = "#f6ecd2";
  ctx.font = font(64, 800);
  ctx.fillText(s.bless, W / 2 + 218, cy + 220);

  ctx.fillStyle = GOLD_L;
  ctx.font = font(48, 700);
  ctx.fillText(`${s.nature}(${s.big})의 기운`, W / 2, 1410);
  ctx.fillStyle = "rgba(240,220,166,0.85)";
  ctx.font = font(34, 500);
  ctx.fillText(PHRASE[s.element], W / 2, 1470);

  // 사주 여덟 글자
  const bw = 150;
  const gap = 24;
  const x0 = (W - (bw * 4 + gap * 3)) / 2;
  const y0 = 1580;
  s.pillars.forEach((p, i) => {
    const x = x0 + i * (bw + gap);
    ctx.fillStyle = "rgba(240,220,166,0.75)";
    ctx.font = font(26, 500);
    ctx.fillText(`${p.label}주`, x + bw / 2, y0 - 30);
    [p.stem, p.branch].forEach((ch, row) => {
      const y = y0 + row * (bw + 14);
      ctx.strokeStyle = "rgba(212,178,101,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, bw, bw);
      ctx.fillStyle = (row === 0 ? p.stemEl : p.branchEl) ? LIGHT[(row === 0 ? p.stemEl : p.branchEl)!] : "rgba(240,220,166,0.4)";
      ctx.font = font(92, 800);
      ctx.fillText(ch || "·", x + bw / 2, y + bw / 2 + 4);
    });
  });

  // 띠 · 숫자 · 방위
  const yi = 1990;
  const cols = [
    ["띠", `${s.animalHanja} ${s.animal}`],
    ["행운 숫자", s.numbers],
    ["방위", s.direction.replace(/\(.*\)/, "")],
  ];
  cols.forEach(([k, v], i) => {
    const x = W / 2 + (i - 1) * 300;
    ctx.fillStyle = "rgba(240,220,166,0.7)";
    ctx.font = font(26, 500);
    ctx.fillText(k, x, yi);
    ctx.fillStyle = GOLD_L;
    ctx.font = font(40, 700);
    ctx.fillText(v, x, yi + 52);
  });

  // 이름
  ctx.fillStyle = GOLD;
  ctx.font = font(52, 800);
  ctx.fillText(s.hanjaName ? `${s.name} · ${s.hanjaName}` : s.name, W / 2, 2170);
  ctx.fillStyle = "rgba(240,220,166,0.6)";
  ctx.font = font(28, 600);
  ctx.fillText("류 결 사 주", W / 2, 2240);
}

export function LuckyWallpaper({ spec }: { spec: WallpaperSpec }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* 글꼴을 못 기다려도 그린다 */
      }
      if (cancelled || !ref.current) return;
      const serif = getComputedStyle(document.body).getPropertyValue("--font-serif").trim() || "serif";
      drawWallpaper(ref.current, spec, serif);
      ref.current.toBlob((b) => {
        if (b && !cancelled) setUrl(URL.createObjectURL(b));
      }, "image/png");
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [spec]);

  return (
    <div className="text-center">
      <canvas ref={ref} className={url ? "hidden" : "mx-auto block w-full max-w-[300px] rounded-2xl"} style={{ aspectRatio: `${W} / ${H}` }} />
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- 손님 기기에서 그린 그림 (길게 눌러 저장할 수 있게 img로)
        <img src={url} alt={`${spec.name}님의 행운 배경화면`} className="mx-auto block w-full max-w-[300px] rounded-2xl" style={{ boxShadow: "0 8px 28px rgba(14,22,40,0.3)" }} />
      )}
      {url && (
        <a href={url} download={`${spec.name}_행운배경화면.png`} className="btn-primary mt-5 block text-center">
          배경화면 내려받기
        </a>
      )}
      <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        아이폰은 그림을 길게 눌러 &quot;사진에 저장&quot;을 골라 주세요. 저장한 뒤 설정 › 배경화면에서 바꿀 수 있어요.
      </p>
    </div>
  );
}
