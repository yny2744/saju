"use client";

import { useEffect, useState } from "react";
import { useBgmScene } from "@/components/bgm/bgm";

/** AI가 풀이를 쓰는 동안 덮는 화면 (30초~1분). grand = 12가지 운세 전부 보기를 산 손님 */
export function WritingOverlay({ title, steps, grand = false }: { title: string; steps: string[]; grand?: boolean }) {
  const [step, setStep] = useState(0);
  // 풀이를 기다리는 동안의 음악 (전부 보기 손님은 따로)
  useBgmScene(grand ? "all" : "waiting");
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(steps.length - 1, s + 1)), 8000);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6" style={{ backgroundColor: "var(--color-paper)" }}>
      <div className="h-14 w-14 animate-spin rounded-full" style={{ border: "4px solid var(--color-line)", borderTopColor: "var(--color-accent)" }} />
      <p className="mt-6 text-center text-[17px] font-semibold">{title}</p>
      <p className="mt-2 text-center text-sm" style={{ color: "var(--color-ink-soft)" }}>
        {steps[step]}
      </p>
      <p className="mt-6 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
        30초~1분 정도 걸려요. 화면을 닫지 말아 주세요.
      </p>
    </div>
  );
}
