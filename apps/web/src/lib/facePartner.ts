import type { FaceFeatureBuckets, FeatureBucket } from "@/server/face/types";

/**
 * 인연의 얼굴 특징 (2026-10-13 수정안 56·58) - AI 없이, 내 얼굴 비율(버킷)에서 "서로 채워 주는" 인연의 얼굴을 정한다.
 * 전통 관상의 음양 조화(둥근 얼굴 ↔ 갸름한 얼굴처럼 반대 기운이 서로를 채운다)를 단순한 규칙으로 옮긴 것.
 * 이마와 코는 밝고 반듯할수록 복이 있다고 보아 한 단계 높여 준다.
 * 유료 풀이 프롬프트와 인연 얼굴 그림(58번 시험)이 같은 값을 쓴다 - 그림과 글이 어긋나지 않게.
 */

const OPPOSITE: Record<FeatureBucket, FeatureBucket> = { low: "high", mid: "mid", high: "low" };
const UPLIFT: Record<FeatureBucket, FeatureBucket> = { low: "high", mid: "high", high: "mid" };

export function partnerBuckets(me: FaceFeatureBuckets): FaceFeatureBuckets {
  return {
    faceShape: OPPOSITE[me.faceShape],
    forehead: UPLIFT[me.forehead],
    eyeSpacing: OPPOSITE[me.eyeSpacing],
    nose: me.nose === "low" ? "high" : "mid",
    mouth: OPPOSITE[me.mouth],
    jaw: OPPOSITE[me.jaw],
  };
}

export const PARTNER_PART_LABEL: Record<keyof FaceFeatureBuckets, string> = {
  faceShape: "얼굴형",
  forehead: "이마",
  eyeSpacing: "눈",
  nose: "코",
  mouth: "입",
  jaw: "턱",
};

export const PARTNER_FEATURE_TEXT: Record<keyof FaceFeatureBuckets, Record<FeatureBucket, string>> = {
  faceShape: { low: "둥글고 복스러운 얼굴", mid: "갸름하고 균형 잡힌 얼굴", high: "길고 단아한 얼굴" },
  forehead: { low: "아담한 이마", mid: "반듯한 이마", high: "넓고 시원한 이마" },
  eyeSpacing: { low: "또렷하게 모인 눈", mid: "균형 잡힌 눈매", high: "여유로운 눈매" },
  nose: { low: "아담한 코", mid: "반듯한 코", high: "콧대가 곧은 코" },
  mouth: { low: "단정한 입매", mid: "부드러운 입매", high: "시원한 입매" },
  jaw: { low: "부드러운 턱선", mid: "단정한 턱선", high: "또렷한 턱선" },
};

export const PARTNER_PARTS = Object.keys(PARTNER_PART_LABEL) as Array<keyof FaceFeatureBuckets>;

/** "넓고 시원한 이마, 여유로운 눈매, ..." */
export function partnerSummary(p: FaceFeatureBuckets): string {
  return PARTNER_PARTS.map((k) => PARTNER_FEATURE_TEXT[k][p[k]]).join(", ");
}
