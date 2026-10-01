import { AIInterpretationFailedError } from "saju-engine";

/**
 * ⚠️ 2026-10 수정: 이 파일은 원래 "/api/saju/analyze(무료)가 AI 호출에
 * 실패하면 502를 반환한다"를 검증했었다. Phase 10에서 무료 사주 경로를
 * AI 호출 없는 규칙 기반(generateSajuFreeInterpretation)으로 전환하면서
 * 그 시나리오 자체가 더 이상 존재하지 않는다 - analyzeSaju.ts는 이제
 * aiEngineProvider.ts를 아예 import하지 않는다.
 *
 * 테스트를 지우는 대신, 오히려 더 의미 있는 반대 시나리오로 바꿨다:
 * "AI Provider가 완전히 고장 나 있어도 무료 사주 분석은 영향을 받지 않는다"는
 * 이 전환의 핵심 목적(일 1,000명이 몰려도 AI 장애/한도와 무관하게 무료
 * 체험은 항상 동작해야 한다)을 직접 증명하는 테스트다. aiEngineProvider를
 * 일부러 깨뜨려도(mock) 무료 분석 API가 여전히 200을 반환하면, 이 결합이
 * 끊어졌다는 걸 보여준다. 유료 AI 해석 경로(paidInterpretation.ts)의
 * 실패 처리는 tests/paidInterpretation.test.ts가 별도로 담당한다.
 */
jest.mock("../src/server/aiEngineProvider", () => ({
  getInterpretationEngine: () => ({
    interpret: async () => {
      throw new AIInterpretationFailedError("mock: LLM이 계속 실패했습니다.", new Error("mock cause"), 3);
    },
  }),
}));

// eslint-disable-next-line import/first
import { handleAnalyzeRequest, handleGetResult } from "../src/server/requestHandlers";
// eslint-disable-next-line import/first
import type { AnalyzeAcceptedResponse, AnalyzeResultResponse } from "../src/server/types";

const validBody = {
  nickname: "홍길동",
  gender: "female",
  calendarType: "solar",
  date: "1990-05-20",
  time: "14:30",
};

describe("무료 사주 분석은 AI Provider 장애와 완전히 분리되어 있다 (Phase 10)", () => {
  test("aiEngineProvider가 항상 실패하도록 깨뜨려도, 무료 분석(FREE_BASIC)은 200과 규칙 기반 결과를 정상 반환한다", async () => {
    const res = await handleAnalyzeRequest(validBody, "client-ai-fail-1");
    expect(res.status).toBe(200);

    const { id } = res.body as AnalyzeAcceptedResponse;
    const stored = handleGetResult(id);
    expect(stored.status).toBe(200);
    const { interpretation } = stored.body as AnalyzeResultResponse;
    expect(interpretation.meta.provider).toBe("rule-engine");
  });
});
