import { ELEMENT_TOKEN } from "@/lib/pillarView";
import { FillGauge } from "@/components/FillGauge";
import { TOPICS, isAnyTopicKey } from "@/lib/topics";
import type { DeepVisual } from "@/lib/basic/compose";
import type { DeepContent } from "@/server/readings/generateReading";
import { DaeunBar, ElementBars, LuckCard, PillarChart, Seal } from "./BasicReadingView";

/**
 * 깊게 보기 화면 (2026-10-11 수정안 37) - 990냥처럼 그림을 함께.
 *   요약 금장 카드 → 내 원국(이 운세의 자리) → (월별 운세면 열두 달 표) → 소제목들(번호 도장)
 *   → 둘째 소제목 아래 인생 흐름 막대 → 마지막 "꼭 채워야 할 하나"는 금장 카드 + 오행 막대 + 행운 카드
 * 그림은 엔진 값(visual)으로 열 때마다 그린다 - 예전에 쓴 깊은 풀이에도 붙는다.
 */

const NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二", "十三"];

export function DeepReadingView({ content, visual }: { content: DeepContent; visual: DeepVisual | null }) {
  const seal = isAnyTopicKey(content.topic) ? TOPICS[content.topic].hanja : "運";
  const parts = content.parts;
  const lastIdx = parts.length - 1;
  const lastIsFill = lastIdx >= 0 && /채워|채우/.test(parts[lastIdx].heading);
  const body = lastIsFill ? parts.slice(0, lastIdx) : parts;
  const fillPart = lastIsFill ? parts[lastIdx] : null;

  return (
    <div className="space-y-5">
      {content.summary && (
        <section className="gold-card rounded-2xl px-5 py-5 text-center">
          <p className="text-[12px] tracking-[0.3em]" style={{ color: "var(--color-gold)" }}>
            {seal} · 한눈에
          </p>
          <p className="mt-2 text-[16.5px] font-bold leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
            {content.summary}
          </p>
        </section>
      )}

      {visual && <PillarChart chart={visual.chart} />}

      {visual?.months && (
        <section className="rounded-2xl p-4" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}>
          <p className="text-center text-[13px] font-bold" style={{ color: "var(--color-accent)" }}>
            올해 열두 달의 기운
          </p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {visual.months.map((m) => (
              <div
                key={m.label}
                className="rounded-lg px-1 py-2"
                style={{
                  backgroundColor: m.fills ? "var(--color-gold-soft)" : "var(--color-paper-soft)",
                  border: m.fills ? "1px solid var(--color-gold-line)" : "1px solid var(--color-line)",
                }}
              >
                <p className="text-[10.5px] leading-tight" style={{ color: "var(--color-ink-faint)" }}>
                  {m.label.replace(/ \(.*\)/, "")}
                </p>
                <p className="mt-0.5 text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)", color: `var(--color-element-${ELEMENT_TOKEN[m.element]})` }}>
                  {m.hanja}
                </p>
              </div>
            ))}
          </div>
          {visual.months.some((m) => m.fills) && (
            <p className="mt-2 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              금색 달은 부족한 {visual.fill.element}({visual.fill.hanja}) 기운이 들어오는 달이에요 — 채우기 좋은 때
            </p>
          )}
        </section>
      )}

      {body.map((p, i) => (
        <section key={i} className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}>
          <h2 className="flex items-start gap-2 text-[17.5px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
            <Seal ch={NUM[i] ?? seal} />
            <span className="pt-0.5">{p.heading}</span>
          </h2>
          <div className="mt-3 space-y-3 text-[15.5px] leading-[1.9]">
            {p.body.split(/\n+/).map((para, j) => (
              <p key={j}>{para}</p>
            ))}
          </div>
          {i === 1 && visual && !visual.months && <DaeunBar daeun={visual.chart.daeun} />}
        </section>
      ))}

      {visual && (
        <section className="gold-card rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[28px] font-bold text-white"
              style={{ fontFamily: "var(--font-serif)", backgroundColor: `var(--color-element-${ELEMENT_TOKEN[visual.fill.element]})`, boxShadow: "0 0 0 3px var(--color-gold-soft)" }}
            >
              {visual.fill.hanja}
            </span>
            <h2 className="text-[19px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
              {fillPart?.heading ?? "남은 작은 빈자리 채우기"}
            </h2>
          </div>
          <ElementBars elements={visual.chart.elements} />
          {/* 2026-10-31 "남은 작은 빈자리" 게이지 */}
          <div className="mt-5">
            <FillGauge elements={[visual.fill.element]} gap={visual.fill.gap} lineColor="var(--color-accent)" />
          </div>
          {fillPart ? (
            <div className="mt-4 space-y-3 text-[15.5px] leading-[1.9]">
              {fillPart.body.split(/\n+/).map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[15.5px] leading-[1.9]">
              참 좋은 바탕인데, {visual.fill.element}({visual.fill.hanja})의 기운이 남은 작은 빈자리예요. 이 빈자리만 채우면 흐름이 한결 부드러워져요.
            </p>
          )}
          <LuckCard fill={visual.fill} person={visual.person} />
        </section>
      )}

      {!visual && fillPart && (
        <section className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}>
          <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-gold)" }}>
            {fillPart.heading}
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.9]">{fillPart.body}</p>
        </section>
      )}
    </div>
  );
}
