"use client";

import { useState } from "react";
import { DeepCards } from "@/components/suneung/DeepCards";
import { EXAM_DEEP_SUB, EXAM_EXTRA_SUB, EXAM_EXTRA_TITLE, type ExamExtraKind } from "@/lib/examProductsView";

/**
 * 랜딩 [시험날 깊게 보기] (2026-11-13 유샘 시안) - 이름 넣는 칸이 아니라 심층분석 네 가지와 묶음이 먼저 보인다.
 *   카드를 고르면 그 아래에 "누구의 풀이를 볼까요?" - 로그인했으면 저장된 수험생을 고르고, 처음이면 이름·생년월일을 넣는다.
 *   (시안: 사람 고르기 칸은 모양만)
 */
const TITLE: Record<string, string> = { exam: "수능대박운 심층분석", "exam/x/all": "네 가지 모두 보기", ...Object.fromEntries((["goal", "focus", "calm"] as ExamExtraKind[]).map((k) => [`exam/x/${k}`, EXAM_EXTRA_TITLE[k]])) };
const SUB = (p: string) => (p === "exam" ? EXAM_DEEP_SUB : p === "exam/x/all" ? ["심층분석 1~4를 한 번에 (3+1)"] : EXAM_EXTRA_SUB[p.split("/").pop() as ExamExtraKind]);

export function ExamDeepPick() {
  const [path, setPath] = useState<string | null>(null);
  return (
    <div>
      <DeepCards
        onPick={(p) => {
          setPath(p);
          window.setTimeout(() => document.getElementById("deep-who")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
        }}
      />
      {path && (
        <section id="deep-who" className="mt-4 scroll-mt-4 rounded-2xl p-4" style={{ backgroundColor: "#fffaf0", border: "1px solid #d9c49a" }}>
          <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: "#b8913f" }}>
            고른 풀이
          </p>
          <p className="mt-0.5 text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {TITLE[path]}
          </p>
          <p className="mt-1 text-center text-[12px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
            {SUB(path).join(" · ")}
          </p>
          <p className="mt-4 text-[15px] font-bold">누구의 풀이를 볼까요?</p>
          <select className="mt-2 w-full rounded-lg border px-3 py-2.5 text-[15px]" style={{ borderColor: "#d9c49a" }} defaultValue="a">
            <option value="a">홍길동 · 2008.03.15 (저장된 사람)</option>
            <option value="new">+ 새로 넣기</option>
          </select>
          <button type="button" className="btn-primary mt-3">
            이 수험생으로 결제하고 보기
          </button>
          <p className="mt-2 text-center text-[11.5px]" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
            처음 오셨으면 카카오 로그인 뒤 이름·생년월일을 한 번만 넣어요. 결제는 보호자(만 19세 이상)께 부탁드려요.
          </p>
        </section>
      )}
    </div>
  );
}
