"use client";

import { useEffect, useState } from "react";
import { useBgmScene } from "@/components/bgm/bgm";

/**
 * 풀이를 쓰는 동안 덮는 화면 (2026-10-10 수정안 32).
 * 원형 진행률(%)이 durationMs(최소 대기 시간)에 맞춰 차오르고 단계 문구가 바뀐다 - 무료 만세력 로딩과 같은 방식의 연출.
 * 실제 풀이가 더 늦게 끝나면 99%를 향해 천천히 차오르며 기다린다 (2026-11-13). grand = 12가지 운세 전부 보기 손님 (음악이 다름).
 */
export function WritingOverlay({ title, steps, grand = false, durationMs = 20000 }: { title: string; steps: string[]; grand?: boolean; durationMs?: number }) {
  const [elapsed, setElapsed] = useState(0);
  useBgmScene(grand ? "all" : "waiting");
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsed(Date.now() - start), 200);
    return () => clearInterval(t);
  }, []);
  // 2026-11-13 유샘: 시간을 정해 두지 않는다 - durationMs 까지 90%를 채우고, 그 뒤로는 풀이가 끝날 때까지 99%를 향해 천천히 차오른다.
  //   단계 문구도 멈추지 않고 계속 돈다. 풀이가 끝나면 이 화면이 닫힌다.
  const over = Math.max(0, elapsed - durationMs);
  const ratio = elapsed <= durationMs ? 0.9 * (elapsed / durationMs) : 0.9 + 0.09 * (1 - Math.exp(-over / (durationMs * 0.8)));
  const pct = Math.floor(ratio * 100);
  const stepMs = durationMs / Math.max(1, steps.length);
  const step = Math.floor(elapsed / stepMs) % Math.max(1, steps.length);
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6" style={{ backgroundColor: "var(--color-paper)" }}>
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-line)" strokeWidth="6" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--color-gold)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - ratio)}
            style={{ transition: "stroke-dashoffset 0.2s linear" }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[28px] font-bold tabular-nums" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
          {pct}%
        </span>
      </div>
      <p className="mt-6 text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </p>
      <p className="mt-2 min-h-[1.5em] text-center text-[15px]" style={{ color: "var(--color-ink-soft)" }} aria-live="polite">
        {steps[step]}
      </p>
      <p className="mt-6 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        {over > 0 ? "정성껏 쓰느라 조금 더 걸리고 있어요. 화면을 닫지 말아 주세요." : "잠시만 기다려 주세요. 화면을 닫지 말아 주세요."}
      </p>
    </div>
  );
}
