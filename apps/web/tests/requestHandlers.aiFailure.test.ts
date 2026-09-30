import { AIInterpretationFailedError } from "saju-engine";

jest.mock("../src/server/aiEngineProvider", () => ({
  getInterpretationEngine: () => ({
    interpret: async () => {
      throw new AIInterpretationFailedError("mock: LLM이 계속 실패했습니다.", new Error("mock cause"), 3);
    },
  }),
}));

// eslint-disable-next-line import/first
import { handleAnalyzeRequest } from "../src/server/requestHandlers";

const validBody = {
  nickname: "홍길동",
  gender: "female",
  calendarType: "solar",
  date: "1990-05-20",
  time: "14:30",
};

describe("AI Interpretation Engine이 최종 실패했을 때의 API 응답", () => {
  test("AIInterpretationFailedError면 502와 사용자 친화적 메시지를 반환하고, 내부 오류 문구를 그대로 노출하지 않는다", async () => {
    const res = await handleAnalyzeRequest(validBody, "client-ai-fail-1");
    expect(res.status).toBe(502);
    const body = res.body as { error: { code: string; message: string } };
    expect(body.error.code).toBe("AI_INTERPRETATION_FAILED");
    expect(body.error.message).not.toContain("mock: LLM이 계속 실패했습니다");
  });
});
