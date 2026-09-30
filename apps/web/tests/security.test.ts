/**
 * 이 파일은 aiEngineProvider를 mock으로 고정해서, 환경변수 ANTHROPIC_API_KEY 값과
 * 무관하게(즉 실제 Anthropic API를 절대 호출하지 않고) 응답 형태만 결정론적으로
 * 검증한다. API Key 유출 여부는 "실제로 키를 넣고 진짜로 호출해봐야" 알 수 있는
 * 것이 아니라 - 응답 조립 코드가 process.env 값을 어딘가에 그대로 심지 않는지를
 * 확인하는 회귀 테스트다.
 */
import fs from "fs";
import path from "path";

jest.mock("../src/server/aiEngineProvider", () => ({
  getInterpretationEngine: () => ({
    interpret: async () => ({
      elements: { wood: "-", fire: "-", earth: "-", metal: "-", water: "-", dominant: "화", lacking: null },
      tenGods: { dayMaster: "갑", summary: "-" },
      analysis: { temperament: "-" },
      disclaimer: "-",
      meta: { provider: "mock", model: "mock", productType: "FREE_BASIC" },
    }),
  }),
}));

// eslint-disable-next-line import/first
import { handleAnalyzeRequest, handleGetResult } from "../src/server/requestHandlers";

const validBody = {
  nickname: "보안테스트",
  gender: "male",
  calendarType: "solar",
  date: "1985-11-03",
  time: "09:15",
};

describe("보안 점검 (지시서 17조/25조)", () => {
  test("ANTHROPIC_API_KEY가 설정되어 있어도 분석/조회 응답 어디에도 그 값이 포함되지 않는다", async () => {
    const originalKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-ant-test-secret-should-never-leak";

    try {
      const res = await handleAnalyzeRequest(validBody, "client-security-1");
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain("sk-ant-test-secret-should-never-leak");

      const id = (res.body as { id: string }).id;
      const resultRes = handleGetResult(id);
      expect(JSON.stringify(resultRes.body)).not.toContain("sk-ant-test-secret-should-never-leak");
    } finally {
      process.env.ANTHROPIC_API_KEY = originalKey;
    }
  });

  test("분석 요청 성공 응답에는 id/expiresAt만 있고 출생연월일 원문 문자열이 그대로 담기지 않는다 (URL에 실릴 수 있는 필드 최소화)", async () => {
    const res = await handleAnalyzeRequest(validBody, "client-security-2");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("1985-11-03");
    expect(Object.keys(res.body as object).sort()).toEqual(["expiresAt", "id"]);
  });

  test("서버 내부 오류가 발생해도 스택 트레이스나 파일 경로를 응답에 노출하지 않는다", async () => {
    const res = await handleAnalyzeRequest("이건 객체가 아닌 문자열입니다", "client-security-3");
    const text = JSON.stringify(res.body);
    expect(text).not.toMatch(/\.ts:\d+/);
    expect(text).not.toContain("/home/");
    expect(text).not.toContain("node_modules");
  });
});

describe("XSS 방지 (지시서 9조) - dangerouslySetInnerHTML 미사용 회귀 테스트", () => {
  test("src/app 아래 어떤 컴포넌트도 dangerouslySetInnerHTML을 사용하지 않는다", () => {
    const appDir = path.join(__dirname, "..", "src", "app");
    const files = fs.readdirSync(appDir, { recursive: true, encoding: "utf-8" }) as string[];
    const tsxFiles = files.filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

    expect(tsxFiles.length).toBeGreaterThan(0);

    for (const file of tsxFiles) {
      const content = fs.readFileSync(path.join(appDir, file), "utf-8");
      expect(content).not.toContain("dangerouslySetInnerHTML");
      expect(content).not.toContain(".innerHTML");
    }
  });
});
