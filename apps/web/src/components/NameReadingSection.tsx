"use client";

import { useEffect, useState } from "react";
import type { SajuJson } from "saju-engine";
import type { NameHanjaDict } from "@/lib/nameReading";
import { ELEMENT_HANJA } from "@/lib/manseView";
import { buildNameReport, type MeaningDict, type NameReport } from "@/lib/nameReport";
import { ElementDonut, FlowNodes, HBars, PairBars, ScoreRing, StepArrows, YinYangDots, elColor } from "@/components/charts/MiniCharts";

/**
 * 무료 이름 풀이 (수정안 11번 → 2026-10-14 수정안 14: 사주와 함께 푸는 긴 리포트 + 그림, AI 없음).
 * 작명 자료(획수 약 190KB, 뜻 약 180KB)는 이 칸이 화면에 나올 때 한 번만 내려받는다.
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

let meaningCache: Promise<MeaningDict | null> | null = null;
function loadMeanings(): Promise<MeaningDict | null> {
  if (!meaningCache) {
    meaningCache = fetch("/hanja/dict.json")
      .then((r) => (r.ok ? (r.json() as Promise<MeaningDict>) : null))
      .catch(() => null);
  }
  return meaningCache;
}

const GOLD = "var(--color-gold)";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const VERDICT_LABEL: Record<NameReport["verdict"], string> = { good: "잘 맞는 이름", fair: "무난한 이름", weak: "아쉬운 점이 있는 이름" };

function Block({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl p-5" style={CARD}>
      <p className="mb-1 text-[12px] font-semibold" style={{ color: GOLD }}>
        {no}
      </p>
      <h3 className="mb-3 text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {title}
      </h3>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-[15px] leading-[1.85]">{children}</p>;
}

export function NameReadingSection({ nickname, hanjaName, saju }: { nickname: string; hanjaName?: string; saju: SajuJson }) {
  const [report, setReport] = useState<NameReport | null | "loading">("loading");

  useEffect(() => {
    Promise.all([loadDict(), loadMeanings()])
      .then(([dict, meanings]) => setReport(buildNameReport(nickname, hanjaName, saju, dict, meanings)))
      .catch(() => setReport(null));
  }, [nickname, hanjaName, saju]);

  if (report === "loading" || report === null) return null; // 이름이 한 글자 등 풀 수 없으면 칸을 숨긴다
  const r = report;

  return (
    <div className="mb-10">
      {/* 한눈에 */}
      <section className="mb-5 rounded-2xl p-5 text-center" style={CARD}>
        <div className="mb-4 flex justify-center gap-2">
          {r.chars.map((c, i) => (
            <span key={i} className="flex h-14 w-14 flex-col items-center justify-center rounded-xl text-white" style={{ backgroundColor: c.isSurname ? "#8f8a7d" : elColor(c.element ?? c.sound) }}>
              <span className="text-[24px] font-bold leading-none" style={{ fontFamily: "var(--font-serif)" }}>
                {c.hanja ?? c.hangul}
              </span>
              <span className="mt-0.5 text-[10.5px]">{c.hangul}</span>
            </span>
          ))}
        </div>
        <ScoreRing score={r.score} label="이름 점수" />
        <span className="mt-3 inline-block rounded-full px-3 py-1 text-[13px] font-bold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
          {VERDICT_LABEL[r.verdict]}
        </span>
        <p className="mt-3 text-[17px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
          {r.headline}
        </p>
        <p className="mt-2 text-left text-[14.5px] leading-[1.8]" style={{ color: "var(--color-ink-soft)" }}>
          {r.summary}
        </p>
        <div className="mt-4 text-left">
          <HBars rows={r.criteria} />
        </div>
      </section>

      <Block no="첫째" title={`나의 바탕 — ${r.base.dayStemLabel}`}>
        <ElementDonut shares={r.base.shares} needed={r.base.needed} />
        <P>{r.base.dayText}</P>
        <P>
          사주의 다섯 기운을 보면 <b>{r.base.lackText}</b>
        </P>
        <P>이름은 이 바탕 위에 평생 덧입히는 옷이에요. 그래서 이름 풀이는 늘 사주와 함께 봐야 해요.</P>
        {r.relation && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[13px]">
            <span className="rounded-lg px-3 py-2 font-bold" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              나 · {r.base.dayStemLabel}
            </span>
            <span style={{ color: GOLD }}>⇄</span>
            <span className="rounded-lg px-3 py-2 font-bold" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              이름 첫 글자
            </span>
          </div>
        )}
        {r.relation && <P>{r.relation}</P>}
      </Block>

      <Block no="둘째" title="이름 글자 하나하나">
        <div className="space-y-3">
          {r.chars.map((c, i) => (
            <div key={i} className="flex gap-3 rounded-xl p-3" style={{ backgroundColor: c.fills ? "var(--color-gold-soft)" : "var(--color-paper-soft)" }}>
              <div className="w-14 shrink-0 text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg text-[24px] font-bold text-white" style={{ backgroundColor: c.isSurname ? "#8f8a7d" : elColor(c.element ?? c.sound), fontFamily: "var(--font-serif)" }}>
                  {c.hanja ?? c.hangul}
                </span>
                <span className="mt-1 block text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  {c.isSurname ? "성" : c.strokes !== null ? `${c.strokes}획` : "소리"}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">
                  {c.meaning ?? c.hangul}
                  {c.fills && (
                    <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[11px]" style={{ backgroundColor: "var(--color-card)", color: "var(--color-danger)" }}>
                      아쉬운 기운을 채움
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[13.5px] leading-[1.75]" style={{ color: "var(--color-ink-soft)" }}>
                  {c.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Block>

      <Block no="셋째" title="이름이 사주에 더해 주는 기운">
        <PairBars before={r.boost.before} after={r.boost.after} needed={r.base.needed} />
        <P>{r.boost.text}</P>
      </Block>

      <Block no="넷째" title="수리 네 격 — 평생의 흐름">
        {r.complete ? (
          <>
            <StepArrows steps={r.suri.map((s) => ({ top: s.name, big: String(s.value), sub: `${s.period.split("·")[0]} · ${s.lucky ? "길" : "보완"}`, good: s.lucky }))} />
            <P>{r.suriText}</P>
            <ul className="mt-3 space-y-2">
              {r.suri.map((s) => (
                <li key={s.name} className="rounded-xl px-3.5 py-2.5 text-[14px] leading-[1.75]" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                  <b>
                    {s.name}({s.period}) {s.value}수 · {s.title}
                  </b>
                  <br />
                  <span style={{ color: "var(--color-ink-soft)" }}>{s.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="rounded-xl px-3.5 py-3 text-[14px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}>
            {r.suriText}{" "}
            <a href="/start?next=name" className="underline underline-offset-4">
              한자 넣고 다시 보기
            </a>
          </p>
        )}
      </Block>

      <Block no="다섯째" title="부르는 소리의 흐름">
        <FlowNodes nodes={r.sound.nodes.map((n) => ({ label: n.hangul, element: n.element }))} links={r.sound.links} />
        <P>{r.sound.text}</P>
        {r.impression && <P>{r.impression}</P>}
      </Block>

      {r.yinYang.balanced !== null && (
        <Block no="여섯째" title="음양의 짜임">
          <YinYangDots labels={r.chars.map((c) => c.hanja ?? c.hangul)} marks={r.yinYang.marks} />
          <p className="mt-2 text-center text-[11.5px]" style={{ color: "var(--color-ink-faint)" }}>
            ● 양(홀수 획) · ○ 음(짝수 획)
          </p>
          <P>{r.yinYang.text}</P>
        </Block>
      )}

      <Block no="맺음" title="이름과 함께 채우는 기운">
        <div className="grid grid-cols-2 gap-2 text-[13.5px]">
          {[
            ["색", r.fill.colors],
            ["방위", r.fill.direction],
            ["숫자", r.fill.numbers],
            ["곁에 둘 것", r.fill.object],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl px-3 py-2.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <p className="text-[11.5px]" style={{ color: "var(--color-ink-faint)" }}>
                {k}
              </p>
              <p className="font-semibold" style={{ color: k === "색" ? elColor(r.fill.element) : undefined }}>
                {v}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
          {r.fill.element}({ELEMENT_HANJA[r.fill.element]})의 기운 · 생활 습관: {r.fill.habit}
        </p>
        <P>{r.closing}</P>
      </Block>

      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        획수는 강희자전 기준 원획, 81수리는 전해 오는 분류를 따랐어요. 작명 학파에 따라 획수와 기준이 조금 다를 수 있어요. 재미와 참고로 봐 주세요.
      </p>
    </div>
  );
}
