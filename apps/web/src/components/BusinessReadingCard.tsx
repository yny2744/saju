import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import type { BusinessReading } from "@/lib/businessName";

/** 상호 풀이 한 장 (무료 상호 풀이 · 상호 작명 후보 공용, 수정안 63) */

const elColor = (el: string) => (el ? `var(--color-element-${ELEMENT_TOKEN[el as ElementKo]})` : "var(--color-ink-faint)");
const FIRST: Record<string, string> = { 생: "업종 기운을 낳아 줘요", 같음: "업종 기운과 같아요", 극: "업종 기운을 눌러요", 보통: "업종 기운과 무난해요" };
export const BUSINESS_VERDICT: Record<BusinessReading["verdict"], { label: string; text: string }> = {
  good: { label: "잘 맞는 상호", text: "업종의 기운, 소리의 흐름, 수리가 고루 좋은 상호예요." },
  fair: { label: "무난한 상호", text: "큰 흠 없이 무난한 상호예요. 아쉬운 부분은 아래에서 확인해 보세요." },
  weak: { label: "아쉬운 점이 있는 상호", text: "소리나 업종 기운에서 아쉬운 부분이 보여요. 간판에 붙이는 말이나 로고 색으로 보완할 수 있어요." },
};

export function BusinessChars({ r }: { r: BusinessReading }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {r.chars.map((c, i) => {
        const el = c.element || c.sound || "";
        return (
          <div key={i} className="text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg text-[24px] font-bold text-white" style={{ backgroundColor: elColor(el), fontFamily: "var(--font-serif)" }}>
              {c.hanja ?? c.hangul}
            </span>
            <span className="mt-1 block text-[11.5px]" style={{ color: "var(--color-ink-faint)" }}>
              {c.hanja ? `${c.hangul} · ${c.strokes}획` : `소리 ${c.sound ?? "—"}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BusinessFacts({ r }: { r: BusinessReading }) {
  return (
    <ul className="space-y-1.5 text-[14px] leading-relaxed">
      {r.industry && (
        <li>
          <b>업종 오행</b> · {r.industry.label}은 {r.industry.element}의 기운이에요. 첫소리가 {FIRST[r.industry.first]}
          {r.industry.hurts > 0 && ` (업종 기운을 누르는 글자 ${r.industry.hurts}개)`}.
        </li>
      )}
      <li>
        <b>소리 흐름</b> · {r.sound.clashes === 0 ? "글자 사이 소리가 부딪힘 없이 이어져요." : `글자 사이 소리가 ${r.sound.clashes}곳 부딪혀요.`}
      </li>
      <li>
        <b>총획 수리</b> ·{" "}
        {r.suri ? `한자 ${r.totalStrokes}획, ${r.suri.lucky ? "길한 수예요." : "아쉬운 수예요."}` : "한글 상호라 획수 대신 소리로 봤어요. 한자 상호면 총획을 볼 수 있어요."}
      </li>
      {r.supports && (
        <li>
          <b>대표자 사주</b> · {r.supports.length ? `아쉬운 ${r.supports.join("·")}의 기운을 채워 줘요.` : `아쉬운 ${r.needed?.join("·")}의 기운을 채우는 소리·글자는 없어요.`}
        </li>
      )}
      <li>
        <b>부르기</b> · {r.lengthOk ? "기억하기 좋은 길이예요." : r.chars.length < 2 ? "한 글자라 다른 말과 헷갈릴 수 있어요." : "조금 길어요. 줄여 부를 이름도 함께 생각해 보세요."} · 영문 {r.english}
      </li>
    </ul>
  );
}
