import { isQuarterlyFlow, isStringArray, labelFor, quarterLabel } from "@/lib/analysisLabels";

/**
 * Phase 8 지시서 5-B/5-D조: 긴 해석문을 제목+문단으로 구분하고, 내부 키 대신
 * 한글 라벨을 보여준다. result/page.tsx(무료)와 result/paid/page.tsx(유료)가
 * 완전히 같은 analysis 렌더링 규칙을 공유해야 하므로 한 컴포넌트로 뺐다.
 *
 * 값의 실제 타입(문자열 / 문자열 배열 / {q1..q4} 분기 객체)에 따라 표현만
 * 다르게 할 뿐, InterpretationResult의 데이터 자체는 그대로 사용한다.
 */
export function AnalysisSection({ fieldKey, value }: { fieldKey: string; value: unknown }) {
  return (
    <div>
      <h3 className="mb-1.5 text-[15px] font-semibold">{labelFor(fieldKey)}</h3>
      <AnalysisValue value={value} />
    </div>
  );
}

function AnalysisValue({ value }: { value: unknown }) {
  if (isQuarterlyFlow(value)) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {Object.entries(value).map(([q, text]) => (
          <div key={q} className="rounded-lg p-2.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <div className="section-label mb-1">{quarterLabel(q)}</div>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {text}
            </p>
          </div>
        ))}
      </div>
    );
  }

  if (isStringArray(value)) {
    return (
      <ul className="space-y-1.5">
        {value.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <span aria-hidden style={{ color: "var(--color-accent)" }}>
              ·
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
      {typeof value === "string" ? value : JSON.stringify(value)}
    </p>
  );
}
