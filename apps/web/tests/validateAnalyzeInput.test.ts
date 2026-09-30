import { validateAnalyzeInput } from "../src/server/validateAnalyzeInput";
import type { AnalyzeRequestBody } from "../src/server/types";

function validBody(overrides: Partial<AnalyzeRequestBody> = {}): AnalyzeRequestBody {
  return {
    nickname: "홍길동",
    gender: "female",
    calendarType: "solar",
    date: "1990-05-20",
    time: "14:30",
    ...overrides,
  };
}

describe("validateAnalyzeInput", () => {
  test("정상 입력이면 통과하고 SajuInput/닉네임/productType을 반환한다", () => {
    const result = validateAnalyzeInput(validBody());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nickname).toBe("홍길동");
      expect(result.value.sajuInput.date).toBe("1990-05-20");
      expect(result.value.sajuInput.time).toBe("14:30");
      expect(result.value.productType).toBe("FREE_BASIC");
    }
  });

  test("출생시간은 선택값이라 없어도 통과한다", () => {
    const result = validateAnalyzeInput(validBody({ time: undefined }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.sajuInput.time).toBeUndefined();
    }
  });

  test("닉네임 누락이면 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ nickname: "" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("nickname"))).toBe(true);
    }
  });

  test("닉네임에 HTML 태그가 포함되면 실패한다 (XSS 방지)", () => {
    const result = validateAnalyzeInput(validBody({ nickname: "<script>alert(1)</script>" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("nickname"))).toBe(true);
    }
  });

  test("잘못된 성별이면 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ gender: "unknown" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("gender"))).toBe(true);
    }
  });

  test("잘못된 날짜 형식이면 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ date: "1990/05/20" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("date"))).toBe(true);
    }
  });

  test("범위를 벗어난 연도의 날짜면 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ date: "1800-01-01" }));
    expect(result.ok).toBe(false);
  });

  test("양력 2월 31일처럼 실제로 존재하지 않는 날짜는 실패한다 (지시서 5조)", () => {
    const result = validateAnalyzeInput(validBody({ date: "2023-02-31", calendarType: "solar" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("date"))).toBe(true);
    }
  });

  test("양력 4월 31일처럼 실제로 존재하지 않는 날짜는 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ date: "2023-04-31", calendarType: "solar" }));
    expect(result.ok).toBe(false);
  });

  test("윤년(2024년) 양력 2월 29일은 정상 통과한다", () => {
    const result = validateAnalyzeInput(validBody({ date: "2024-02-29", calendarType: "solar" }));
    expect(result.ok).toBe(true);
  });

  test("평년(2023년) 양력 2월 29일은 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ date: "2023-02-29", calendarType: "solar" }));
    expect(result.ok).toBe(false);
  });

  test("음력은 30일까지는 형식상 통과시키고, 실제 존재 여부는 Saju Engine 계산 단계에서 걸러진다", () => {
    const result = validateAnalyzeInput(validBody({ date: "2023-02-30", calendarType: "lunar" }));
    expect(result.ok).toBe(true);
  });

  test("음력이어도 31일은 형식 단계에서 거부한다", () => {
    const result = validateAnalyzeInput(validBody({ date: "2023-01-31", calendarType: "lunar" }));
    expect(result.ok).toBe(false);
  });

  test("잘못된 시간 형식이면 실패한다", () => {
    const result = validateAnalyzeInput(validBody({ time: "25:99" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("time"))).toBe(true);
    }
  });

  test("필수값 여러 개가 동시에 누락되면 issues에 전부 담긴다", () => {
    const result = validateAnalyzeInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThanOrEqual(3);
    }
  });

  test("이번 단계에서 지원하지 않는 상품 유형이면 실패한다 (결제 미구현)", () => {
    const result = validateAnalyzeInput(validBody({ productType: "PREMIUM_9900" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.startsWith("productType"))).toBe(true);
    }
  });

  test("Saju Engine이 지원하는 자시 처리 옵션만 허용한다", () => {
    const ok = validateAnalyzeInput(validBody({ ziHourMethod: "yaja_joja_split" }));
    expect(ok.ok).toBe(true);

    const bad = validateAnalyzeInput(validBody({ ziHourMethod: "something_else" }));
    expect(bad.ok).toBe(false);
  });
});
