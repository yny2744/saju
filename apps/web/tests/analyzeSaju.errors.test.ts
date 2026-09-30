import * as sajuEngine from "saju-engine";
import { analyzeSaju, SajuCalculationError } from "../src/server/analyzeSaju";
import type { ValidatedAnalyzeInput } from "../src/server/types";

const validInput: ValidatedAnalyzeInput = {
  nickname: "테스트유저",
  sajuInput: { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
  productType: "FREE_BASIC",
};

describe("analyzeSaju - Saju Engine 계산 오류 처리", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("calculateSaju()가 예외를 던지면 SajuCalculationError로 변환해서 던진다 (내부 오류 스택을 그대로 노출하지 않음)", async () => {
    jest.spyOn(sajuEngine, "calculateSaju").mockImplementation(() => {
      throw new Error("내부 계산 라이브러리 오류 (사용자에게 노출되면 안 되는 상세 메시지)");
    });

    await expect(analyzeSaju(validInput)).rejects.toBeInstanceOf(SajuCalculationError);

    try {
      await analyzeSaju(validInput);
      fail("에러가 던져져야 합니다");
    } catch (err) {
      expect(err).toBeInstanceOf(SajuCalculationError);
      expect((err as Error).message).not.toContain("내부 계산 라이브러리 오류");
    }
  });
});
