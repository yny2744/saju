import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { FillGauge } from "@/components/FillGauge";
import { ENERGY_GUIDE } from "@/lib/neededEnergy";
import { GoodsPicks } from "@/components/GoodsPicks";
import { TOPICS } from "@/lib/topics";
import type { BasicReadingV2, FillCard } from "@/lib/basic/compose";

/**
 * 990냥 운세 보기 화면 (2026-10-10 수정안 34) - 글만 있으면 성의 없어 보이니 엔진 값으로 그림을 함께.
 *   한 줄 요약 카드 → 내 원국(이 운세의 자리 금색) → 소제목 4개 → 인생 흐름 막대(대운) → 꼭 채워야 할 하나(결론·행운 카드)
 *   → 깊게 보기에서 열리는 것(흐린 미리보기)
 */

const GOLD = "var(--color-gold)";
const el = (e: ElementKo | null) => (e ? `var(--color-element-${ELEMENT_TOKEN[e]})` : "var(--color-line)");

export function Seal({ ch }: { ch: string }) {
  return (
    <span
      aria-hidden
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[15px] font-bold"
      style={{ fontFamily: "var(--font-serif)", color: "#fff", backgroundColor: "var(--color-danger)", boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.35)" }}
    >
      {ch}
    </span>
  );
}

export function BasicReadingView({ content }: { content: BasicReadingV2 }) {
  const seal = TOPICS[content.topic]?.hanja ?? "運";
  const need = content.lack.fill;

  return (
    <div className="space-y-6">
      {/* 한 줄 요약 */}
      <section className="gold-card rounded-2xl px-5 py-5 text-center">
        <p className="text-[17px] font-bold leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
          {content.summary}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {content.keywords.map((k) => (
            <span key={k} className="rounded-full px-3 py-1 text-[12.5px] font-semibold" style={{ backgroundColor: "var(--color-gold-soft)", border: "1px solid var(--color-gold-line)" }}>
              {k}
            </span>
          ))}
        </div>
      </section>

      <PillarChart chart={content.chart} />

      {/* 소제목 4개 */}
      {content.sections.map((s, i) => (
        <section key={i} className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}>
          <h2 className="flex items-center gap-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
            <Seal ch={seal} />
            {s.heading}
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.9]">{s.body}</p>

          {i === 2 && <DaeunBar daeun={content.chart.daeun} />}
        </section>
      ))}

      {/* 결론: 남은 작은 빈자리 채우기 (2026-10-31 말투 통일) */}
      <section className="gold-card rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[28px] font-bold text-white"
            style={{ fontFamily: "var(--font-serif)", backgroundColor: el(need.element), boxShadow: "0 0 0 3px var(--color-gold-soft)" }}
          >
            {need.hanja}
          </span>
          <h2 className="text-[19px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
            {content.lack.heading}
          </h2>
        </div>

        <ElementBars elements={content.chart.elements} />

        {/* 2026-10-31 "남은 작은 빈자리" 게이지 - 결론이 정리되는 자리 */}
        <div className="mt-5">
          <FillGauge elements={[need.element]} gap={need.gap} lineColor="var(--color-accent)" />
        </div>

        <p className="mt-4 text-[15.5px] leading-[1.9]">{content.lack.body}</p>

        <LuckCard fill={need} person={content.lack.person} />
      </section>

      {/* 깊게 보기에서 열리는 것 */}
      {content.deeper.length > 0 && (
        <section className="rounded-2xl px-5 py-4" style={{ border: "1px dashed var(--color-gold-line)" }}>
          <p className="text-[13px] font-bold" style={{ color: GOLD }}>
            깊게 보기에서 열리는 것
          </p>
          <ul className="mt-2 space-y-1.5">
            {content.deeper.map((d) => (
              <li key={d} className="flex items-center gap-2 text-[14px]">
                <span aria-hidden style={{ color: GOLD }}>◆</span>
                <span style={{ filter: "blur(0.6px)", color: "var(--color-ink-soft)" }}>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

type Chart = BasicReadingV2["chart"];

/** 내 원국 여덟 글자 - 오행 색, 이 운세의 자리는 금색 */
export function PillarChart({ chart }: { chart: Chart }) {
  const hl = new Set((chart as unknown as { hlKeys?: string[] }).hlKeys ?? []);
  const keyOf: Record<string, string> = { 시주: "hour", 일주: "day", 월주: "month", 년주: "year" };
  return (
      <section className="rounded-2xl px-4 py-4" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}>
        <div className="grid grid-cols-4 gap-2 text-center">
          {chart.pillars.map((p) => {
            const k = keyOf[p.label];
            const cell = (ch: string, e: ElementKo | null, on: boolean) => (
              <span
                className="flex h-12 items-center justify-center rounded-lg text-[24px] font-bold"
                style={{
                  fontFamily: "var(--font-serif)",
                  color: p.empty ? "var(--color-ink-faint)" : "#fff",
                  backgroundColor: p.empty ? "var(--color-paper-soft)" : el(e),
                  boxShadow: on ? "0 0 0 3px var(--color-gold), 0 0 12px rgba(168,132,58,0.55)" : undefined,
                }}
              >
                {p.empty ? "?" : ch}
              </span>
            );
            return (
              <div key={p.label} className="space-y-1.5">
                <p className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                  {p.label}
                </p>
                {cell(p.stem, p.stemEl, hl.has(`${k}:stem`))}
                {cell(p.branch, p.branchEl, hl.has(`${k}:branch`))}
              </div>
            );
          })}
        </div>
        {chart.highlightNote && (
          <p className="mt-3 text-center text-[13px] font-semibold" style={{ color: GOLD }}>
            {chart.highlightNote}
          </p>
        )}
      </section>
  );
}

/** 인생 흐름 막대 (대운) */
export function DaeunBar({ daeun: all }: { daeun: Chart["daeun"] }) {
  if (all.length === 0) return null;
  // 폰 화면에 "지금"이 보이도록 지금 대운 앞 두 칸부터 보여 준다
  const cur = all.findIndex((d) => d.current);
  const daeun = cur > 2 ? all.slice(cur - 2) : all;
  return (
          

            <div className="mt-4">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {daeun.map((d) => (
                  <div key={d.age} className="w-[52px] shrink-0 text-center">
                    <p className="h-4 text-[11px] font-bold" style={{ color: "var(--color-danger)" }}>
                      {d.current ? "▼ 지금" : ""}
                    </p>
                    <div
                      className="rounded-md px-1 py-2 text-[15px] font-bold"
                      style={{
                        fontFamily: "var(--font-serif)",
                        backgroundColor: d.power ? "var(--color-gold-soft)" : "var(--color-paper-soft)",
                        border: d.current ? "2px solid var(--color-accent)" : d.power ? "1px solid var(--color-gold-line)" : "1px solid var(--color-line)",
                      }}
                    >
                      {d.hanja}
                    </div>
                    <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                      {d.age}세
                    </p>
                  </div>
                ))}
              </div>
              {daeun.some((d) => d.power) && (
                <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                  금색 칸은 이 운세에 힘이 실리는 대운이에요
                </p>
              )}
            </div>
          
  );
}

/** 오행 막대 - 부족한 기운이 한눈에 */
export function ElementBars({ elements }: { elements: Chart["elements"] }) {
  return (
        
        <div className="mt-4 space-y-1.5">
          {elements.map((e) => (
            <div key={e.element} className="flex items-center gap-2 text-[13px]">
              <span className="w-5 font-bold" style={{ color: e.needed ? "var(--color-danger)" : "var(--color-ink-soft)" }}>
                {e.element}
              </span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.max(3, e.percent)}%`, backgroundColor: el(e.element), opacity: e.needed ? 1 : 0.55 }} />
              </div>
              <span className="w-[4.5rem] shrink-0 whitespace-nowrap text-right tabular-nums" style={{ color: e.needed ? "var(--color-danger)" : "var(--color-ink-faint)", fontWeight: e.needed ? 700 : 400 }}>
                {e.percent}%{e.needed ? " 아쉬움" : ""}
              </span>
            </div>
          ))}
        </div>
  );
}

/** 행운 카드 - 남은 작은 빈자리를 채우는 색·방위·숫자·동물·식물·물건·생활·사람 */
export function LuckCard({ fill: need, person }: { fill: FillCard; person: string }) {
  const guide = ENERGY_GUIDE[need.element];
  return (
        
        <div className="mt-5 rounded-2xl p-4" style={{ background: "linear-gradient(160deg, #1b2f52, #16294a)", color: "#f6ecd2", boxShadow: "inset 0 0 0 1px var(--color-gold-line)" }}>
          <p className="text-center text-[12px] tracking-[0.3em]" style={{ color: "var(--color-gold-light)" }}>
            나를 채우는 {need.element}({need.hanja})의 기운
          </p>
          <div className="mt-3 flex justify-center gap-2">
            {guide.colors.map((c) => (
              <span key={c.name} className="flex flex-col items-center gap-1 text-[11px]">
                <span className="h-8 w-8 rounded-full" style={{ backgroundColor: c.hex, boxShadow: "0 0 0 2px var(--color-gold-line)" }} />
                {c.name}
              </span>
            ))}
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2.5 text-[13px]">
            {[
              ["방위", need.direction],
              ["숫자", need.numbers],
              ["동물", need.animal],
              ["식물", need.plant],
              ["곁에 둘 물건", need.object],
              ["생활", need.habit],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px]" style={{ color: "var(--color-gold-light)" }}>
                  {k}
                </dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t pt-3 text-[13px]" style={{ borderColor: "rgba(212,178,101,0.35)" }}>
            <span className="text-[11px]" style={{ color: "var(--color-gold-light)" }}>
              곁에 두면 좋은 사람
            </span>
            <br />
            <b>{person}</b>
          </p>
          {/* 2026-10-26 굿즈 추천 - 고객사 설정에 링크가 있을 때만 보인다 */}
          <GoodsPicks elements={[need.element]} tone="dark" />
        </div>
  );
}
