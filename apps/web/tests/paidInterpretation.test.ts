import { calculateSaju } from "saju-engine";
import { saveResult } from "../src/server/resultStore";
import { issueEntitlement } from "../src/server/entitlement";
import {
  getPaidInterpretation,
  EntitlementInvalidError,
  BaseResultExpiredError,
} from "../src/server/paidInterpretation";
import type { AnalyzeResultResponse } from "../src/server/types";

function saveFreeResult(): string {
  const saju = calculateSaju({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" }, 2026);
  const value: AnalyzeResultResponse = {
    nickname: "유료해석테스트",
    saju,
    interpretation: {} as AnalyzeResultResponse["interpretation"],
  };
  return saveResult(value).id;
}

describe("getPaidInterpretation (지시서 12조: 사주 원국 재계산 없이 기존 SajuJson 재사용)", () => {
  test("BASIC 권한이면 4개(LOVE/MONEY/CAREER/YEARLY_3900) 엔진 결과를 모두 반환한다", async () => {
    const resultId = saveFreeResult();
    const entitlementToken = issueEntitlement({
      resultId,
      productType: "BASIC",
      orderId: "order-1",
      paidAt: new Date().toISOString(),
    });

    const response = await getPaidInterpretation(entitlementToken);
    expect(response.productType).toBe("BASIC");
    expect(Object.keys(response.results).sort()).toEqual(
      ["CAREER_3900", "LOVE_3900", "MONEY_3900", "YEARLY_3900"].sort()
    );
  });

  test("PREMIUM 권한이면 PREMIUM_9900 결과 하나만 반환한다", async () => {
    const resultId = saveFreeResult();
    const entitlementToken = issueEntitlement({
      resultId,
      productType: "PREMIUM",
      orderId: "order-2",
      paidAt: new Date().toISOString(),
    });

    const response = await getPaidInterpretation(entitlementToken);
    expect(Object.keys(response.results)).toEqual(["PREMIUM_9900"]);
  });

  test("위조되었거나 형식이 잘못된 entitlement 토큰은 거부한다", async () => {
    await expect(getPaidInterpretation("이건-유효한-토큰이-아님")).rejects.toBeInstanceOf(EntitlementInvalidError);
    await expect(getPaidInterpretation(undefined)).rejects.toBeInstanceOf(EntitlementInvalidError);
  });

  test("entitlement는 유효하지만 기반 무료 분석 결과가 만료/삭제되었으면 거부한다", async () => {
    const entitlementToken = issueEntitlement({
      resultId: "존재하지-않는-resultId",
      productType: "BASIC",
      orderId: "order-3",
      paidAt: new Date().toISOString(),
    });
    await expect(getPaidInterpretation(entitlementToken)).rejects.toBeInstanceOf(BaseResultExpiredError);
  });
});
