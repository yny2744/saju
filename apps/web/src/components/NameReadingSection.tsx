"use client";

import { useEffect, useState } from "react";
import type { SajuJson } from "saju-engine";
import { neededEnergy } from "@/lib/neededEnergy";
import { readName, type NameHanjaDict, type NameReadingResult } from "@/lib/nameReading";
import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";

/**
 * 무료 결과 화면 "이름 풀이" 칸 (수정안 11번, AI 없음).
 * 작명 자료(약 190KB)는 이 칸이 화면에 나올 때 한 번만 내려받는다.
 */

let dictCache: Promise<NameHanjaDict> | null = null;
function loadDict(): Promise<NameHanjaDict> {
  if (!dictCache) {
    dictCache = fetch("/hanja/name-hanja.json")
      .then((r) => {
        if (!r.ok) throw new Error("name-hanja");
        return r.json() as Promise<NameHanjaDict>;
      })
      .catch((e) => {
        dictCache = null;
        throw e;
      });
  }
  return dictCache;
}

const GOLD = "var(--color-gold)";
const elColor = (el: string) => (el ? `var(--color-element-${ELEMENT_TOKEN[el as ElementKo]})` : "var(--color-ink-faint)");
const FLOW_LABEL: Record<string, string> = { 생: "→ 살려 줌", 받음: "← 도움 받음", 같음: "= 같은 기운", 극: "✕ 부딪힘", 눌림: "✕ 눌림" };
const VERDICT: Record<NameReadingResult["verdict"], { label: string; text: string }> = {
  good: { label: "잘 맞는 이름", text: "수리와 소리, 사주와의 어울림이 고루 좋은 이름이에요." },
  fair: { label: "무난한 이름", text: "큰 흠 없이 무난한 이름이에요. 아쉬운 부분은 아래에서 확인해 보세요." },
  weak: { label: "아쉬운 점이 있는 이름", text: "수리나 소리 흐름에서 아쉬운 부분이 보여요. 부르는 이름(호·아호)으로 보완하는 방법도 있어요." },
};

export function NameReadingSection({ nickname, hanjaName, saju }: { nickname: string; hanjaName?: string; saju: SajuJson }) {
  const [result, setResult] = useState<NameReadingResult | null | "loading" | "error">("loading");

  useEffect(() => {
    loadDict()
      .then((dict) => setResult(readName(nickname, hanjaName, neededEnergy(saju).elements, dict)))
      .catch(() => setResult("error"));
  }, [nickname, hanjaName, saju]);

  if (result === "loading") return null;
  if (result === "error" || result === null) return null; // 이름이 한 글자 등 풀 수 없으면 칸을 숨긴다

  const v = VERDICT[result.verdict];
  const needed = neededEnergy(saju).elements;

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">이름 풀이</h2>
        <span className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
          무료 · 작명 이론 참고용
        </span>
      </div>

      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
        {/* 글자별 */}
        <div className="flex justify-center gap-2">
          {result.chars.map((c, i) => (
            <div key={i} className="w-[64px] rounded-xl py-2 text-center" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <p className="text-[24px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)" }}>
                {c.hanja ?? c.hangul}
              </p>
              <p className="text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
                {c.hangul}
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                {c.strokes !== null ? `${c.strokes}획 · ${c.yinYang}` : "한자 없음"}
              </p>
              {c.hanja && (
                <p className="text-[11px] font-semibold" style={{ color: elColor(c.element) }}>
                  {c.element ? `${c.element} 기운` : "—"}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 text-center">
          <span className="inline-block rounded-full px-3 py-1 text-[13px] font-bold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
            {v.label}
          </span>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {v.text}
          </p>
        </div>

        {/* 수리 4격 */}
        {result.complete ? (
          <div className="mt-5">
            <p className="mb-2 text-[14px] font-bold" style={{ color: GOLD }}>
              수리 (원·형·이·정 4격)
            </p>
            <ul className="space-y-1.5">
              {result.suri.map((s) => (
                <li key={s.name} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                  <span>
                    <b>{s.name}</b> <span style={{ color: "var(--color-ink-faint)" }}>{s.meaning}</span>
                  </span>
                  <span className="shrink-0 font-bold" style={{ color: s.lucky ? "var(--color-element-wood)" : "var(--color-danger)" }}>
                    {s.value}수 · {s.lucky ? "길" : "주의"}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              음양: {result.yinYangBalanced ? "홀수·짝수 획이 섞여 음양이 조화로워요." : "획수가 모두 홀수이거나 모두 짝수라 음양이 한쪽으로 치우쳤어요."}
            </p>
          </div>
        ) : (
          <p className="mt-5 rounded-lg px-3 py-2.5 text-[13px]" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}>
            한자 이름을 넣으면 수리(원·형·이·정)와 음양, 자원오행까지 볼 수 있어요.{" "}
            <a href="/start" className="underline underline-offset-4">
              한자 넣고 다시 보기
            </a>
          </p>
        )}

        {/* 발음오행 */}
        <div className="mt-5">
          <p className="mb-2 text-[14px] font-bold" style={{ color: GOLD }}>
            소리의 흐름 (발음오행)
          </p>
          <p className="text-[14px] leading-relaxed">
            {result.chars.map((c, i) => (
              <span key={i}>
                {i > 0 && (
                  <span className="mx-1 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                    {FLOW_LABEL[result.sound.flow[i - 1]] ?? "·"}
                  </span>
                )}
                <b>{c.hangul}</b>
                <span style={{ color: elColor(result.sound.elements[i] ?? "") }}>({result.sound.elements[i] ?? "?"})</span>
              </span>
            ))}
          </p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            {result.sound.clashes === 0 ? "부르는 소리가 서로 부딪히지 않고 부드럽게 이어져요." : `소리가 부딪히는 곳이 ${result.sound.clashes}군데 있어요.`}
          </p>
        </div>

        {/* 사주 보완 */}
        {result.complete && (
          <div className="mt-5">
            <p className="mb-2 text-[14px] font-bold" style={{ color: GOLD }}>
              사주와의 어울림 (자원오행)
            </p>
            <p className="text-[14px] leading-relaxed">
              사주에 필요한 기운: <b>{needed.join(" · ")}</b>
              <br />
              {result.supports.length > 0 ? (
                <>
                  이름 한자가 <b style={{ color: elColor(result.supports[0]) }}>{result.supports.join(" · ")}</b> 기운을 채워 주고 있어요.
                </>
              ) : (
                "이름 한자에서 필요한 기운을 채워 주는 글자는 보이지 않아요."
              )}
            </p>
            {result.unknownElements > 0 && (
              <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                이름 글자 중 {result.unknownElements}자는 부수만으로 오행을 정하기 어려워 계산에서 뺐어요.
              </p>
            )}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
          <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            사주에 맞춘 아이 작명 · 개명 추천
          </span>
          <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px]" style={{ border: "1px solid var(--color-line)", color: "var(--color-ink-faint)" }}>
            곧 열려요
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        획수는 강희자전 기준 원획, 81수리 길흉은 전해 오는 분류를 따랐어요. 작명 학파에 따라 획수와 기준이 조금 다를 수 있어요.
      </p>
    </section>
  );
}
