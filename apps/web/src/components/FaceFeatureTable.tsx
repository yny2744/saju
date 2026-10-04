import type { FaceFeatureBuckets, FaceRuleResult, FeatureBucket } from "@/server/face/types";

/**
 * 무료 관상 "얼굴 특징" 도표 - 만세력의 "나의 기본 성향" 표와 같은 형식.
 * 각 줄: 부위 · 3단계 눈금(서버가 계산한 버킷 그대로) · 키워드 칩, 누르면 규칙 문장이 펼쳐진다.
 * 키워드는 faceRuleEngine.ts 문장 안에 이미 있는 말을 뽑은 표시용 요약이다(새 해석 아님).
 */

type RowKey = keyof FaceFeatureBuckets;
type TextKey = keyof FaceRuleResult["features"];

const ROWS: Array<{ key: RowKey; text: TextKey; label: string; hanja: string; scale: [string, string, string]; kw: Record<FeatureBucket, string[]> }> = [
  { key: "faceShape", text: "faceShape", label: "얼굴형", hanja: "面", scale: ["둥근형", "균형형", "갸름형"], kw: { low: ["둥근 인상", "부드러움"], mid: ["무난함", "안정감"], high: ["갸름함", "세련됨"] } },
  { key: "forehead", text: "forehead", label: "이마", hanja: "額", scale: ["아담", "보통", "넓음"], kw: { low: ["신중함", "내실"], mid: ["균형 잡힌 초년운"], high: ["총명함", "일찍 트임"] } },
  { key: "eyeSpacing", text: "eyes", label: "눈 사이", hanja: "眼", scale: ["가까움", "보통", "넓음"], kw: { low: ["집중력", "세심함"], mid: ["균형 잡힌 대인관계"], high: ["여유", "포용력"] } },
  { key: "nose", text: "nose", label: "코", hanja: "鼻", scale: ["아담", "보통", "길고 뚜렷"], kw: { low: ["온화함", "사교성"], mid: ["균형 잡힌 재물운"], high: ["뚜렷한 주관"] } },
  { key: "mouth", text: "mouth", label: "입매", hanja: "口", scale: ["아담", "보통", "시원"], kw: { low: ["신중함", "절제"], mid: ["균형 잡힌 표현력"], high: ["활달함", "풍부한 표현"] } },
  { key: "jaw", text: "jaw", label: "턱선", hanja: "頤", scale: ["부드러움", "보통", "또렷"], kw: { low: ["유연함", "친화력"], mid: ["균형 잡힌 추진력"], high: ["결단력", "뚝심"] } },
];

const IDX: Record<FeatureBucket, number> = { low: 0, mid: 1, high: 2 };

export function FaceFeatureTable({ buckets, texts }: { buckets: FaceFeatureBuckets; texts: FaceRuleResult["features"] }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-paper-soft)" }}>
        {ROWS.map((r, i) => {
          const b = buckets[r.key];
          return (
            <details key={r.key} className="group" style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}>
              <summary className="cursor-pointer list-none px-3.5 py-3 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
                    {r.hanja}
                  </span>
                  <span className="w-[52px] shrink-0 text-[13px] font-semibold">{r.label}</span>
                  {/* 3단계 눈금 */}
                  <div className="flex flex-1 gap-1">
                    {r.scale.map((s, j) => (
                      <span
                        key={s}
                        className="flex-1 rounded py-0.5 text-center text-[11px]"
                        style={
                          j === IDX[b]
                            ? { backgroundColor: "var(--color-ink)", color: "var(--color-paper)", fontWeight: 700 }
                            : { backgroundColor: "var(--color-paper)", color: "var(--color-ink-faint)" }
                        }
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <span aria-hidden className="shrink-0 text-xs transition-transform group-open:rotate-180" style={{ color: "var(--color-ink-faint)" }}>
                    ▾
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5 pl-[86px]">
                  {r.kw[b].map((k) => (
                    <span key={k} className="rounded-full px-2 py-0.5 text-[12px]" style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-line)" }}>
                      {k}
                    </span>
                  ))}
                </div>
              </summary>
              <p className="px-3.5 pb-3 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {texts[r.text]}
              </p>
            </details>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
        항목을 누르면 풀이가 펼쳐져요. 눈금은 얼굴 비율을 세 단계로 나눈 값이에요.
      </p>
    </div>
  );
}
