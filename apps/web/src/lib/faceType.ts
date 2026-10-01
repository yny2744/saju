import type { FaceFeatureBuckets } from "@/server/face/types";

/**
 * 얼굴형(faceShape) + 턱선(jaw) 버킷 조합으로 "관상 유형" 이름을 붙인다.
 * 새로운 판정 로직이 아니라, 이미 서버가 계산해 돌려준 버킷 값을 그대로
 * 조합해서 보여주기 좋은 이름으로 라벨링만 하는 것뿐이다 (지시서 2-A조:
 * 실제로 분석되지 않은 내용을 지어내지 않는다 - 버킷 값 자체는 전부 실제 계산값).
 */
const TYPE_NAMES: Record<string, string> = {
  "low-low": "온화형",
  "low-mid": "친화형",
  "low-high": "결단온화형",
  "mid-low": "균형유연형",
  "mid-mid": "표준형",
  "mid-high": "균형강단형",
  "high-low": "세련유연형",
  "high-mid": "세련형",
  "high-high": "세련결단형",
};

export function faceTypeName(buckets: FaceFeatureBuckets): string {
  const key = `${buckets.faceShape}-${buckets.jaw}`;
  return TYPE_NAMES[key] ?? "표준형";
}
