import type { FaceFeatureBuckets, FeatureBucket } from "@/server/face/types";
import { PARTNER_PARTS, PARTNER_PART_LABEL, PARTNER_FEATURE_TEXT, partnerBuckets } from "@/lib/facePartner";

/**
 * 이상형 관상 종합 분석 (2026-10-14 유샘 요청 - GPT 예시 카드의 "종합 분석" 표와 "두 사람의 인연" 네 칸을 우리 엔진으로).
 * AI 없이 내 얼굴 비율(버킷) → 인연의 얼굴(partnerBuckets) → 부위별 특징·뜻, 인상, 두 사람의 인연 네 칸.
 */

const MEANING: Record<keyof FaceFeatureBuckets, Record<FeatureBucket, string>> = {
  faceShape: { low: "다정하고 사람을 품는 성품", mid: "균형 감각이 좋고 침착한 성품", high: "단아하고 깊이 있는 성품" },
  forehead: { low: "현실 감각이 좋고 꼼꼼함", mid: "생각이 바르고 계획적임", high: "생각이 넓고 앞날을 내다봄" },
  eyeSpacing: { low: "한 사람에게 집중하는 다정함", mid: "마음을 고르게 쓰는 눈", high: "너그럽고 여유로운 마음" },
  nose: { low: "소박하고 정이 많음", mid: "책임감 있고 반듯함", high: "자존심과 생활력이 강함" },
  mouth: { low: "말을 아끼고 신중함", mid: "따뜻한 말씨", high: "솔직하고 표현이 시원함" },
  jaw: { low: "부드럽고 맞춰 주는 성품", mid: "끈기와 안정감", high: "결단력과 추진력" },
};

const IMPRESSION: Record<FeatureBucket, string> = {
  low: "따뜻하고 다정한 분위기",
  mid: "단정하고 믿음직한 분위기",
  high: "차분하고 단아한 분위기",
};

const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const GOLD = "var(--color-gold)";

export function IdealSummary({ me, partnerLabel = "인연" }: { me: FaceFeatureBuckets; partnerLabel?: string }) {
  const p = partnerBuckets(me);
  const diff = PARTNER_PARTS.filter((k) => p[k] !== me[k]).length;
  const boxes: Array<{ icon: string; title: string; text: string }> = [
    {
      icon: "♡",
      title: "궁합",
      text: diff >= 4 ? "서로 다른 부분이 많아 빈자리를 꼭 맞게 채워 주는 짝이에요." : "닮은 데가 많아 편안하고, 다른 한두 곳이 서로를 새롭게 해 줘요.",
    },
    {
      icon: "☆",
      title: "만남의 가능성",
      text: me.forehead === "high" ? "배움·일터처럼 뜻을 나누는 자리에서 자연스럽게 만나기 쉬워요." : "가까운 사람의 소개나 늘 가던 곳에서 뜻밖에 만나기 쉬워요.",
    },
    {
      icon: "❀",
      title: "관계의 강점",
      text: p.jaw === "high" ? "인연이 앞에서 이끌고 나는 곁에서 다듬어, 함께 일을 이루는 힘이 커요." : "인연이 부드럽게 받쳐 주어, 다툼이 생겨도 금세 풀리는 사이예요.",
    },
    {
      icon: "◇",
      title: "주의할 점",
      text: me.mouth === "high" ? "내 솔직한 말이 상대에게 크게 닿을 수 있어요. 한 번 더 부드럽게 전해 주세요." : "마음을 속에 담아 두기 쉬워요. 고마움과 서운함을 그때그때 말로 나눠 주세요.",
    },
  ];

  return (
    <section className="mb-4 rounded-2xl p-4" style={CARD}>
      <h3 className="mb-3 text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        이상형 관상 종합 분석
      </h3>
      <table className="w-full text-[13.5px]">
        <tbody>
          {PARTNER_PARTS.map((k) => (
            <tr key={k} style={{ borderTop: "1px solid var(--color-line)" }}>
              <td className="w-14 py-2 align-top font-bold" style={{ color: GOLD }}>
                {PARTNER_PART_LABEL[k]}
              </td>
              <td className="py-2">
                <b>{PARTNER_FEATURE_TEXT[k][p[k]]}</b>
                <span className="block text-[12.5px]" style={{ color: "var(--color-ink-soft)" }}>
                  {MEANING[k][p[k]]}
                </span>
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid var(--color-line)" }}>
            <td className="w-14 py-2 align-top font-bold" style={{ color: GOLD }}>
              인상
            </td>
            <td className="py-2">
              <b>{IMPRESSION[p.faceShape]}</b>
            </td>
          </tr>
        </tbody>
      </table>

      <p className="mb-2 mt-5 text-center text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        두 사람의 인연
      </p>
      <div className="grid grid-cols-2 gap-2">
        {boxes.map((b) => (
          <div key={b.title} className="rounded-xl px-3 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <p className="text-[13.5px] font-bold">
              <span style={{ color: GOLD }}>{b.icon}</span> {b.title}
            </p>
            <p className="mt-1 text-[12.5px] leading-[1.65]" style={{ color: "var(--color-ink-soft)" }}>
              {b.text}
            </p>
          </div>
        ))}
      </div>

      <a href="/couple" className="mt-4 block rounded-xl px-4 py-3.5 text-center" style={{ backgroundColor: "#16213a", color: "#f3e7c6", border: "1px solid var(--color-gold-line)" }}>
        <span className="block text-[15px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          혹시 주변에 닮은 사람이 있나요?
        </span>
        <span className="mt-0.5 block text-[12.5px]" style={{ color: "#c9cfda" }}>
          그 {partnerLabel}의 생년월일로 두 사람의 궁합을 봐 드려요 ›
        </span>
      </a>
    </section>
  );
}
