import { PRODUCT_TEMPLATES } from "saju-engine";
import { engineProductLabel, labelFor, isQuarterlyFlow, isStringArray } from "../src/lib/analysisLabels";

/**
 * src/lib/analysisLabels.ts의 ENGINE_PRODUCT_LABELS는 saju-engine의
 * PRODUCT_TEMPLATES[type].displayName을 그대로 복사해온 값이다 (result/paid
 * 화면이 client 컴포넌트라서 saju-engine 패키지 전체를 번들에 실을 수 없어
 * 문자열만 복사해뒀다 - 주석 참고).
 *
 * 이 테스트는 Node 환경(Jest)에서만 실행되므로 saju-engine을 안전하게 import해서,
 * 복사해둔 문자열이 엔진의 실제 displayName과 계속 일치하는지 지켜본다.
 * 엔진 쪽 문구가 바뀌면 이 테스트가 즉시 실패해서 라벨 드리프트를 잡아낸다.
 */
describe("engineProductLabel - saju-engine PRODUCT_TEMPLATES와의 동기화", () => {
  test.each(Object.keys(PRODUCT_TEMPLATES) as Array<keyof typeof PRODUCT_TEMPLATES>)(
    "%s의 하드코딩된 라벨이 엔진의 displayName과 일치한다",
    (productType) => {
      expect(engineProductLabel(productType)).toBe(PRODUCT_TEMPLATES[productType].displayName);
    }
  );

  test("알 수 없는 상품 키는 키 자체를 그대로 반환한다 (안전한 폴백)", () => {
    expect(engineProductLabel("NOT_A_REAL_PRODUCT")).toBe("NOT_A_REAL_PRODUCT");
  });
});

describe("labelFor - analysis 필드 키 한글 라벨", () => {
  test("알려진 키는 한글 라벨을 반환한다", () => {
    expect(labelFor("temperament")).toBe("성향");
    expect(labelFor("actionGuide")).toBe("실천 가이드");
  });

  test("알려지지 않은 키는 camelCase를 사람이 읽을 수 있는 형태로 변환한다", () => {
    expect(labelFor("someNewField")).toBe("Some New Field");
  });
});

describe("값 형태 판별 헬퍼", () => {
  test("isQuarterlyFlow는 q1~q4를 모두 가진 객체만 true", () => {
    expect(isQuarterlyFlow({ q1: "a", q2: "b", q3: "c", q4: "d" })).toBe(true);
    expect(isQuarterlyFlow({ q1: "a" })).toBe(false);
    expect(isQuarterlyFlow("문자열")).toBe(false);
    expect(isQuarterlyFlow(["a", "b"])).toBe(false);
  });

  test("isStringArray는 문자열 배열만 true", () => {
    expect(isStringArray(["a", "b"])).toBe(true);
    expect(isStringArray([1, 2])).toBe(false);
    expect(isStringArray("문자열")).toBe(false);
  });
});
