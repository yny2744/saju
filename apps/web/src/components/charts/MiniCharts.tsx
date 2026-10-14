import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA } from "@/lib/manseView";

/**
 * 글 대신 한눈에 보는 작은 그림들 (2026-10-14 수정안 14). 모두 SVG/CSS로 그려 가볍고, 오행 색은 사이트 공통 색을 쓴다.
 *   ScoreRing 원형 점수 · ElementDonut 오행 원형 도표 · HBars 가로 막대 · PairBars 위아래 막대(전·후)
 *   StepArrows 네 단계 화살표 · FlowNodes 소리 흐름 동그라미+화살표 · YinYangDots 음양 점
 */

export const elColor = (e: ElementKo | null | undefined) => (e ? `var(--color-element-${ELEMENT_TOKEN[e]})` : "var(--color-ink-faint)");
const GOLD = "var(--color-gold)";

export function ScoreRing({ score, label, size = 132 }: { score: number; label: string; size?: number }) {
  const R = size / 2 - 10;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--color-line)" strokeWidth="10" />
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={GOLD} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[34px] font-bold leading-none tabular-nums" style={{ fontFamily: "var(--font-serif)" }}>
          {score}
        </span>
        <span className="mt-1 text-[11.5px]" style={{ color: "var(--color-ink-faint)" }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function ElementDonut({ shares, needed, size = 150 }: { shares: Array<{ element: ElementKo; percent: number }>; needed: ElementKo[]; size?: number }) {
  const R = size / 2 - 16;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="shrink-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--color-line)" strokeWidth="22" />
        {shares.map((s) => {
          const len = (C * s.percent) / 100;
          const el = (
            <circle key={s.element} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={elColor(s.element)} strokeWidth="22" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />
          );
          acc += len;
          return el;
        })}
      </svg>
      <ul className="flex-1 space-y-1 text-[13px]">
        {shares.map((s) => (
          <li key={s.element} className="flex items-center gap-2">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: elColor(s.element) }} />
            <span className="w-14">
              {s.element}({ELEMENT_HANJA[s.element]})
            </span>
            <span className="tabular-nums font-semibold">{s.percent}%</span>
            {needed.includes(s.element) && (
              <span className="rounded-full px-1.5 text-[11px] font-bold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-danger)" }}>
                아쉬움
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function HBars({ rows }: { rows: Array<{ label: string; got: number; max: number; note?: string }> }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const p = Math.round((r.got / r.max) * 100);
        return (
          <li key={r.label}>
            <div className="mb-1 flex items-baseline justify-between text-[13px]">
              <span className="font-semibold">{r.label}</span>
              <span style={{ color: "var(--color-ink-faint)" }}>{r.note}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
              <div className="h-full rounded-full" style={{ width: `${p}%`, backgroundColor: p >= 70 ? GOLD : "var(--color-ink-faint)" }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** 오행별 위아래 막대: 회색 = 사주만, 색 = 이름을 더한 뒤 */
export function PairBars({ before, after, needed }: { before: Record<ElementKo, number>; after: Record<ElementKo, number>; needed: ElementKo[] }) {
  const els: ElementKo[] = ["목", "화", "토", "금", "수"];
  const top = Math.max(...els.map((e) => after[e]), 0.0001);
  const H = 110;
  return (
    <div>
      <div className="flex items-end justify-around gap-2" style={{ height: H + 22 }}>
        {els.map((e) => {
          const add = after[e] - before[e];
          return (
            <div key={e} className="flex w-10 flex-col items-center">
              <span className="mb-1 h-4 text-[11px] font-bold" style={{ color: elColor(e) }}>
                {add > 0.001 ? "▲" : ""}
              </span>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-md" style={{ height: H }}>
                {add > 0.001 && <div style={{ height: (add / top) * H, backgroundColor: elColor(e), opacity: 0.95 }} />}
                <div style={{ height: (before[e] / top) * H, backgroundColor: elColor(e), opacity: 0.35 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-around gap-2">
        {els.map((e) => (
          <span key={e} className="w-10 text-center text-[12px] font-semibold" style={{ color: needed.includes(e) ? "var(--color-danger)" : undefined }}>
            {ELEMENT_HANJA[e]}
          </span>
        ))}
      </div>
      <p className="mt-2 text-center text-[11.5px]" style={{ color: "var(--color-ink-faint)" }}>
        옅은 막대 = 사주에 있는 기운 · 진한 막대(▲) = 이름이 더해 주는 기운 · 붉은 글자 = 아쉬운 기운
      </p>
    </div>
  );
}

export function StepArrows({ steps }: { steps: Array<{ top: string; big: string; sub: string; good: boolean }> }) {
  return (
    <div className="flex items-stretch justify-between gap-1">
      {steps.map((s, i) => (
        <div key={i} className="flex flex-1 items-center gap-1">
          <div className="flex-1 rounded-xl px-1 py-2.5 text-center" style={{ backgroundColor: s.good ? "var(--color-gold-soft)" : "var(--color-paper-soft)", border: `1px solid ${s.good ? "var(--color-gold-line)" : "var(--color-line)"}` }}>
            <p className="text-[10.5px]" style={{ color: "var(--color-ink-faint)" }}>
              {s.top}
            </p>
            <p className="text-[22px] font-bold leading-tight tabular-nums" style={{ fontFamily: "var(--font-serif)", color: s.good ? undefined : "var(--color-ink-soft)" }}>
              {s.big}
            </p>
            <p className="text-[10.5px] font-semibold" style={{ color: s.good ? GOLD : "var(--color-ink-faint)" }}>
              {s.sub}
            </p>
          </div>
          {i < steps.length - 1 && (
            <span aria-hidden className="text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
              ›
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const LINK: Record<string, { mark: string; word: string; good: boolean }> = {
  생: { mark: "→", word: "살려 줌", good: true },
  받음: { mark: "←", word: "도움 받음", good: true },
  같음: { mark: "=", word: "같은 기운", good: true },
  극: { mark: "✕", word: "부딪힘", good: false },
  눌림: { mark: "✕", word: "눌림", good: false },
};

export function FlowNodes({ nodes, links }: { nodes: Array<{ label: string; element: ElementKo | null }>; links: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {nodes.map((n, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full text-[20px] font-bold text-white" style={{ backgroundColor: elColor(n.element), fontFamily: "var(--font-serif)" }}>
              {n.label}
            </span>
            <span className="mt-0.5 block text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
              {n.element ? `${n.element}(${ELEMENT_HANJA[n.element]})` : "—"}
            </span>
          </div>
          {i < nodes.length - 1 && links[i] && (
            <div className="w-12 pb-4 text-center">
              <span className="block text-[18px] font-bold leading-none" style={{ color: LINK[links[i]].good ? "var(--color-element-wood)" : "var(--color-danger)" }}>
                {LINK[links[i]].mark}
              </span>
              <span className="block text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
                {LINK[links[i]].word}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function YinYangDots({ labels, marks }: { labels: string[]; marks: Array<"양" | "음" | null> }) {
  return (
    <div className="flex justify-center gap-3">
      {marks.map((m, i) => (
        <div key={i} className="text-center">
          <span
            className="mx-auto block h-9 w-9 rounded-full"
            style={{ backgroundColor: m === "양" ? "var(--color-ink)" : "transparent", border: "2px solid var(--color-ink)", opacity: m === null ? 0.25 : 1 }}
          />
          <span className="mt-1 block text-[12px]">{labels[i]}</span>
          <span className="block text-[10.5px]" style={{ color: "var(--color-ink-faint)" }}>
            {m ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}
