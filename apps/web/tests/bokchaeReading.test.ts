import { calculateSaju } from "saju-engine";
import { inviteRewardsFor, nextMilestone, INVITE_REWARD, formatWon } from "@/lib/bokchae";
import { isAuthEnabled, isLoginRequired } from "@/lib/launchMode";
import {
  buildGroupPrompt,
  generateSajuReading,
  orderSections,
  parseGroupResponse,
  type ReadingSection,
} from "@/server/readings/generateReading";
import { readingHeader, readingSourceKey } from "@/server/readings/readings";
import { handleCreateReading, handleBokchaeSummary } from "@/server/readings/readingHandlers";

const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);

describe("복채 보상 규칙 (2026-10-06)", () => {
  it("초대 1명마다 990원, 3명·10명째에는 보너스가 더해진다", () => {
    expect(inviteRewardsFor(1)).toEqual([{ amount: INVITE_REWARD, kind: "invite", label: "친구 초대 복채" }]);
    expect(inviteRewardsFor(2)).toHaveLength(1);
    expect(inviteRewardsFor(3).map((r) => r.amount)).toEqual([990, 4900]);
    expect(inviteRewardsFor(10).map((r) => r.amount)).toEqual([990, 29500]);
  });

  it("다음 보너스까지 남은 인원", () => {
    expect(nextMilestone(0)).toMatchObject({ count: 3, remaining: 3 });
    expect(nextMilestone(3)).toMatchObject({ count: 10, remaining: 7 });
    expect(nextMilestone(10)).toBeNull();
  });

  it("금액 표시", () => {
    expect(formatWon(29500)).toBe("29,500원");
  });
});

describe("로그인 정책: 무료는 로그인 없이, 회원 기능은 스위치로", () => {
  const original = process.env.NEXT_PUBLIC_LOGIN_REQUIRED;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LOGIN_REQUIRED;
    else process.env.NEXT_PUBLIC_LOGIN_REQUIRED = original;
  });

  it("스위치가 켜져 있어도 무료 화면은 로그인을 요구하지 않는다", () => {
    process.env.NEXT_PUBLIC_LOGIN_REQUIRED = "true";
    expect(isLoginRequired()).toBe(false);
    expect(isAuthEnabled()).toBe(true);
  });
});

describe("990원 사주보기 프롬프트·응답 처리", () => {
  it("엔진 계산 데이터 블록을 그대로 쓰고, 관심 분야 주제를 가장 길게 요청한다", () => {
    const p = buildGroupPrompt(saju, "유남영", ["love", "money"], "love", 2026);
    expect(p).toContain(saju.pillars.day.ganzhi);
    expect(p).toContain("유남영님");
    expect(p).toMatch(/"love":.*가장 자세히/);
    expect(p).not.toMatch(/"money":.*가장 자세히/);
    expect(p).not.toContain("# 요청 상품:"); // 엔진의 무료 상품 요청문은 잘라냈다
  });

  it("직업·재물 관심이면 직업과 재물 둘 다 길게", () => {
    const p = buildGroupPrompt(saju, "홍길동", ["love", "money"], "work", 2026);
    expect(p).toMatch(/"money":.*가장 자세히/);
  });

  it("코드블록·앞뒤 말이 섞인 응답에서도 JSON을 읽는다", () => {
    const raw = '좋습니다.\n```json\n{"sections":[{"key":"love","body":"' + "가".repeat(30) + '","deeper":"더"}]}\n```';
    const out = parseGroupResponse(raw, ["love"]);
    expect(out[0]).toMatchObject({ key: "love", title: "연애·결혼", deeper: "더" });
  });

  it("주제가 빠지면 실패로 처리한다 (반쪽 풀이를 팔지 않음)", () => {
    expect(() => parseGroupResponse('{"sections":[]}', ["love"])).toThrow();
  });

  it("관심 분야 주제를 맨 앞으로", () => {
    const secs = (["nature", "love", "money", "career", "health", "relationship", "year"] as const).map(
      (key) => ({ key, title: key, body: "x", deeper: "" }) as ReadingSection
    );
    expect(orderSections(secs, "work").map((s) => s.key).slice(0, 2)).toEqual(["career", "money"]);
    expect(orderSections(secs, undefined)[0].key).toBe("nature");
  });

  it("개발용 풀이 생성기로 7개 주제가 모두 나온다", async () => {
    const content = await generateSajuReading(saju, "유남영", "health", 2026);
    expect(content.sections).toHaveLength(7);
    expect(content.sections[0].key).toBe("health");
  });
});

describe("저장 키·머리말", () => {
  it("같은 사람·같은 관심 분야는 같은 키 (두 번 결제 방지), 관심 분야가 다르면 다른 키", () => {
    expect(readingSourceKey(saju, "유남영", "love")).toBe(readingSourceKey(saju, " 유남영 ", "love"));
    expect(readingSourceKey(saju, "유남영", "love")).not.toBe(readingSourceKey(saju, "유남영", "work"));
  });

  it("머리말에 네 기둥과 생년월일", () => {
    const h = readingHeader(saju, "유남영", "柳南榮");
    expect(h.pillars.map((p) => p.label)).toEqual(["시주", "일주", "월주", "년주"]);
    expect(h.birth).toContain("1967-04-03");
  });
});

describe("회원 확인 (DB 없이 끝나는 경로)", () => {
  it("로그인 안 하면 401", async () => {
    expect((await handleCreateReading(undefined, { resultId: "x" })).status).toBe(401);
    expect((await handleBokchaeSummary(undefined)).status).toBe(401);
  });
});
