import { handleAnalyzeRequest, handleGetResult } from "../src/server/requestHandlers";
import type { AnalyzeAcceptedResponse, ApiErrorResponse } from "../src/server/types";

const validBody = {
  nickname: "홍길동",
  gender: "female",
  calendarType: "solar",
  date: "1990-05-20",
  time: "14:30",
};

describe("handleAnalyzeRequest / handleGetResult - 통합 흐름", () => {
  test("정상 요청 -> API -> calculateSaju -> AIInterpretationEngine -> id 발급 -> 결과 조회까지 전체 흐름이 동작한다", async () => {
    const analyzeRes = await handleAnalyzeRequest(validBody, "client-integration-1");
    expect(analyzeRes.status).toBe(200);

    const accepted = analyzeRes.body as AnalyzeAcceptedResponse;
    expect(typeof accepted.id).toBe("string");
    // 응답에 saju/interpretation 원본 데이터가 그대로 담겨있지 않아야 한다 (id만 반환).
    expect(Object.keys(accepted).sort()).toEqual(["expiresAt", "id"]);

    const resultRes = handleGetResult(accepted.id);
    expect(resultRes.status).toBe(200);
    const resultBody = resultRes.body as { nickname: string };
    expect(resultBody.nickname).toBe("홍길동");
  });

  test("필수값이 빠진 요청은 400과 issues를 반환하고 Saju Engine을 호출하지 않는다", async () => {
    const res = await handleAnalyzeRequest({ nickname: "테스트" }, "client-invalid-1");
    expect(res.status).toBe(400);
    const body = res.body as ApiErrorResponse;
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.issues!.length).toBeGreaterThan(0);
  });

  test("잘못된 날짜면 400을 반환한다", async () => {
    const res = await handleAnalyzeRequest({ ...validBody, date: "not-a-date" }, "client-invalid-2");
    expect(res.status).toBe(400);
  });

  test("잘못된 성별이면 400을 반환한다", async () => {
    const res = await handleAnalyzeRequest({ ...validBody, gender: "x" }, "client-invalid-3");
    expect(res.status).toBe(400);
  });

  test("지원하지 않는 옵션(잘못된 ziHourMethod)이면 400을 반환한다", async () => {
    const res = await handleAnalyzeRequest({ ...validBody, ziHourMethod: "invalid" }, "client-invalid-4");
    expect(res.status).toBe(400);
  });

  test("요청 본문이 객체가 아니면 400을 반환한다", async () => {
    const res = await handleAnalyzeRequest("not-an-object", "client-invalid-5");
    expect(res.status).toBe(400);
  });

  test("존재하지 않는 결과 id를 조회하면 404를 반환한다", () => {
    const res = handleGetResult("00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
    const body = res.body as ApiErrorResponse;
    expect(body.error.code).toBe("RESULT_NOT_FOUND");
  });

  test("짧은 시간에 너무 많은 요청을 보내면 429로 제한한다", async () => {
    const clientKey = "client-rate-limit-test";
    let lastStatus = 200;
    for (let i = 0; i < 15; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await handleAnalyzeRequest(validBody, clientKey);
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
