import { handleAnalyzeRequest } from "../src/server/requestHandlers";
import { handleFortuneRequest } from "../src/server/fortuneHandlers";
import type { AnalyzeAcceptedResponse } from "../src/server/types";

const validAnalyzeBody = {
  nickname: "홍길동",
  gender: "female",
  calendarType: "solar",
  date: "1990-05-20",
  time: "14:30",
};

async function createSajuResultId(clientKey: string): Promise<string> {
  const res = await handleAnalyzeRequest(validAnalyzeBody, clientKey);
  expect(res.status).toBe(200);
  return (res.body as AnalyzeAcceptedResponse).id;
}

describe("handleFortuneRequest", () => {
  test("기존 saju 분석 결과 id로 오늘의 운세를 계산한다 (Saju Engine 재계산 없음)", async () => {
    const resultId = await createSajuResultId("fortune-client-1");

    const res = handleFortuneRequest({ resultId, targetDate: "2026-09-22" }, "fortune-req-1");
    expect(res.status).toBe(200);

    const body = res.body as { nickname: string; fortune: { date: string }; result: { categories: Record<string, string>; keywords: string[]; advice: string } };
    expect(body.nickname).toBe("홍길동");
    expect(body.fortune.date).toBe("2026-09-22");
    expect(body.result.categories.overall).toBeTruthy();
    expect(body.result.categories.money).toBeTruthy();
    expect(Array.isArray(body.result.keywords)).toBe(true);
    expect(body.result.advice).toBeTruthy();
  });

  test("targetDate 생략 시 KST 기준 오늘 날짜로 계산한다", async () => {
    const resultId = await createSajuResultId("fortune-client-2");
    const res = handleFortuneRequest({ resultId }, "fortune-req-2");
    expect(res.status).toBe(200);
  });

  test("존재하지 않는 resultId는 404 RESULT_NOT_FOUND를 반환한다", () => {
    const res = handleFortuneRequest({ resultId: "nonexistent-token" }, "fortune-req-3");
    expect(res.status).toBe(404);
    expect((res.body as any).error.code).toBe("RESULT_NOT_FOUND");
  });

  test("resultId가 없으면 400 INVALID_INPUT을 반환한다", () => {
    const res = handleFortuneRequest({}, "fortune-req-4");
    expect(res.status).toBe(400);
    expect((res.body as any).error.code).toBe("INVALID_INPUT");
  });

  test("잘못된 targetDate 형식이면 400을 반환한다", async () => {
    const resultId = await createSajuResultId("fortune-client-3");
    const res = handleFortuneRequest({ resultId, targetDate: "2026/09/22" }, "fortune-req-5");
    expect(res.status).toBe(400);
  });

  test("body가 객체가 아니면 400을 반환한다", () => {
    const res = handleFortuneRequest("not-an-object", "fortune-req-6");
    expect(res.status).toBe(400);
  });

  // 배포 전 최종 수정 지시서 4조: 형식은 맞지만 실재하지 않는 그레고리력 날짜 검증
  describe("targetDate Gregorian calendar 실재 여부 검증", () => {
    test.each([["2026-02-31"], ["2026-04-31"], ["2026-13-01"]])(
      "%s 는 400 INVALID_INPUT을 반환한다",
      async (targetDate) => {
        const resultId = await createSajuResultId(`fortune-client-invalid-${targetDate}`);
        const res = handleFortuneRequest({ resultId, targetDate }, `fortune-req-invalid-${targetDate}`);
        expect(res.status).toBe(400);
        expect((res.body as any).error.code).toBe("INVALID_INPUT");
      }
    );

    test.each([["2026-09-23"], ["2026-02-28"], ["2028-02-29"]])(
      "%s 는 실재하는 날짜이므로 200을 반환한다",
      async (targetDate) => {
        const resultId = await createSajuResultId(`fortune-client-valid-${targetDate}`);
        const res = handleFortuneRequest({ resultId, targetDate }, `fortune-req-valid-${targetDate}`);
        expect(res.status).toBe(200);
      }
    );
  });

  // 배포 전 최종 수정 지시서 5조: 기존 rateLimit.ts(10회/1분) 재사용 검증
  test("짧은 시간에 너무 많은 요청을 보내면 429로 제한한다", async () => {
    const resultId = await createSajuResultId("fortune-client-ratelimit");
    const clientKey = "fortune-rate-limit-test";
    let lastStatus = 200;
    for (let i = 0; i < 15; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = handleFortuneRequest({ resultId }, clientKey);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
