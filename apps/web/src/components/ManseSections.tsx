import { ELEMENT_TOKEN, STEM_HANJA, BRANCH_HANJA, type ElementKo } from "@/lib/pillarView";
import {
  ELEMENT_HANJA,
  ELEMENT_NATURE,
  iGa,
  type DaeunCell,
  type ElementShare,
  type RelationRow,
} from "@/lib/manseView";
import { STEM_ELEMENT, BRANCH_ELEMENT } from "saju-engine/dist/src/rules/fiveElementTables";

/** 무료 만세력 화면의 표·그래프 묶음. 값은 전부 엔진 계산 결과를 그대로 쓴다. */

const color = (el: ElementKo) => `var(--color-element-${ELEMENT_TOKEN[el]})`;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
      {children}
    </div>
  );
}

/* ── 오행 비율 + 음양 ───────────────────────────── */
export function ElementBalance({
  shares,
  dominant,
  lacking,
  yinYang,
}: {
  shares: ElementShare[];
  dominant: ElementKo;
  lacking: ElementKo[];
  yinYang: { yang: number; yin: number };
}) {
  const max = Math.max(1, ...shares.map((s) => s.percent));
  const nature = `${ELEMENT_NATURE[dominant]}(${ELEMENT_HANJA[dominant]})`;
  const yyTotal = yinYang.yang + yinYang.yin || 1;
  const yangPct = Math.round((yinYang.yang / yyTotal) * 100);
  return (
    <section className="mb-8">
      <p className="section-label mb-1">오행 · 음양</p>
      <h2 className="mb-3 text-lg font-bold">
        {nature}
        {iGa(ELEMENT_NATURE[dominant])} 가장 많아요
      </h2>
      <Card>
        <div className="flex h-36 items-end justify-between gap-2.5 px-1">
          {shares.map((s) => (
            <div key={s.element} className="flex flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[12px] tabular-nums" style={{ color: s.element === dominant ? "var(--color-ink)" : "var(--color-ink-soft)", fontWeight: s.element === dominant ? 700 : 400 }}>
                {s.percent}%
              </span>
              <div className="w-full rounded-t-md" style={{ height: `${Math.max(3, (s.percent / max) * 96)}px`, backgroundColor: color(s.element), opacity: s.percent === 0 ? 0.25 : 1 }} />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between gap-2.5 px-1">
          {shares.map((s) => (
            <div key={s.element} className="flex-1 text-center">
              <div className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)", color: color(s.element) }}>
                {ELEMENT_HANJA[s.element]}
              </div>
              <div className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                {ELEMENT_NATURE[s.element]}
              </div>
            </div>
          ))}
        </div>
        {lacking.length > 0 && (
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            비어 있는 기운: <b>{lacking.map((el) => `${ELEMENT_NATURE[el]}(${ELEMENT_HANJA[el]})`).join(", ")}</b>
          </p>
        )}

        <div className="hairline my-4" />

        <div className="flex items-center justify-between text-[13px]">
          <span style={{ color: "var(--color-ink-soft)" }}>
            양(陽) <b style={{ color: "var(--color-ink)" }}>{yinYang.yang}</b>
          </span>
          <span className="font-semibold">{yinYang.yang === yinYang.yin ? "음양이 고르게 섞여 있어요" : yinYang.yang > yinYang.yin ? "양(陽)이 더 많아요" : "음(陰)이 더 많아요"}</span>
          <span style={{ color: "var(--color-ink-soft)" }}>
            음(陰) <b style={{ color: "var(--color-ink)" }}>{yinYang.yin}</b>
          </span>
        </div>
        <div className="mt-2 flex h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
          <div style={{ width: `${yangPct}%`, backgroundColor: "var(--color-element-earth)" }} />
          <div style={{ width: `${100 - yangPct}%`, backgroundColor: "var(--color-element-water)" }} />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          오행 비율은 천간·지지에 지장간 비중까지 더한 값이고, 음양은 여덟 글자를 센 값이에요.
        </p>
      </Card>
    </section>
  );
}

/* ── 합충형파해 표 ───────────────────────────── */
export function RelationsTable({ rows }: { rows: RelationRow[] }) {
  const good = rows.filter((r) => r.tone === "good").length;
  const bad = rows.length - good;
  return (
    <section className="mb-8">
      <p className="section-label mb-1">합충형파해</p>
      <h2 className="mb-3 text-lg font-bold">
        {rows.length === 0 ? "원국 안에 부딪히거나 묶인 글자가 없어요" : `어울림 ${good}건 · 부딪힘 ${bad}건이 있어요`}
      </h2>
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }}>
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ color: "var(--color-ink-faint)" }}>
                <th className="px-3 py-2 text-left font-normal">글자</th>
                <th className="px-3 py-2 text-left font-normal">관계</th>
                <th className="px-3 py-2 text-right font-normal">자리</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--color-line)" }}>
                  <td className="px-3 py-2 text-[15px]" style={{ fontFamily: "var(--font-serif)" }}>
                    {r.chars}
                  </td>
                  <td className="px-3 py-2 font-semibold" style={{ color: r.tone === "good" ? "var(--color-element-wood)" : "var(--color-accent)" }}>
                    {r.label}
                  </td>
                  <td className="px-3 py-2 text-right" style={{ color: "var(--color-ink-soft)" }}>
                    {r.where}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        합(合)은 서로 끌어당겨 묶이는 관계, 충·형·파·해는 부딪히거나 어긋나는 관계예요.
      </p>
    </section>
  );
}

/* ── 대운 흐름 ───────────────────────────── */
export function DaeunTimeline({ cells, seun }: { cells: DaeunCell[]; seun: { year: number; stem: string; branch: string; tenGod: string } }) {
  const current = cells.find((c) => c.current);
  return (
    <section className="mb-8">
      <p className="section-label mb-1">대운 · 세운</p>
      <h2 className="mb-3 text-lg font-bold">
        {current ? `지금은 ${current.startAge}세부터 시작된 ${STEM_HANJA[current.stem]}${BRANCH_HANJA[current.branch]} 대운이에요` : "10년마다 바뀌는 큰 운의 흐름"}
      </h2>
      <div className="-mx-1 overflow-x-auto pb-1">
        <div className="flex w-max gap-1.5 px-1">
          {cells.map((c, i) => (
            <div
              key={i}
              className="w-[52px] rounded-lg py-2 text-center"
              style={{
                backgroundColor: c.current ? "var(--color-paper)" : "var(--color-paper-soft)",
                border: c.current ? "2px solid var(--color-accent)" : "1px solid var(--color-line)",
              }}
            >
              <div className="text-[11px]" style={{ color: c.current ? "var(--color-accent)" : "var(--color-ink-faint)", fontWeight: c.current ? 700 : 400 }}>
                {c.startAge}세
              </div>
              <div className="text-[20px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)", color: color(STEM_ELEMENT[c.stem] as ElementKo) }}>
                {STEM_HANJA[c.stem]}
              </div>
              <div className="text-[20px] font-bold leading-tight" style={{ fontFamily: "var(--font-serif)", color: color(BRANCH_ELEMENT[c.branch] as ElementKo) }}>
                {BRANCH_HANJA[c.branch]}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        <span className="text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          {seun.year}년 세운
        </span>
        <span className="text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          <span style={{ color: color(STEM_ELEMENT[seun.stem] as ElementKo) }}>{STEM_HANJA[seun.stem]}</span>
          <span style={{ color: color(BRANCH_ELEMENT[seun.branch] as ElementKo) }}>{BRANCH_HANJA[seun.branch]}</span>
          <span className="ml-1.5 text-[12px] font-normal" style={{ fontFamily: "inherit", color: "var(--color-ink-soft)" }}>
            · {seun.tenGod}의 해
          </span>
        </span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        대운이 언제 어떻게 작용하는지 풀이는 유료 해석에서 확인할 수 있어요. 시작 나이는 반올림한 값이에요.
      </p>
    </section>
  );
}
