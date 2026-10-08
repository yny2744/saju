import { calculateSaju } from "saju-engine";
import { INVITE_CUMULATIVE, PRICE, displayLedgerLabel, formatNyang, inviteProgress, inviteRewardFor } from "@/lib/yeopjeon";
import { isAuthEnabled, isLoginRequired } from "@/lib/launchMode";
import { TOPIC_KEYS, EXTRA_KEYS, isTopicKey } from "@/lib/topics";
import { monthPillarsOfYear } from "@/lib/monthPillars";
import {
  buildDeepPrompt,
  buildTastePrompt,
  generateDeep,
  generateTaste,
  fillName,
  NAME_TOKEN,
  orderSections,
  parseDeepResponse,
  parseTasteResponse,
  type ReadingSection,
} from "@/server/readings/generateReading";
import { personKey, planPurchase, readingHeader, readingSourceKey, PurchaseError } from "@/server/readings/readings";
import { handleCreateReading, handleYeopjeonSummary, handlePurchase, handleTopic, handleCreatePerson } from "@/server/readings/readingHandlers";
import { formatAlert } from "@/server/alert";

const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);

describe("엽전 금액 (2026-10-08 유샘 확정)", () => {
  it("가격", () => {
    expect(PRICE).toEqual({ TASTE: 990, DEEP: 4900, BUNDLE3: 9900, BUNDLE12: 29500 });
    expect(formatNyang(29500)).toBe("29,500냥");
  });

  it("친구 초대 누적 총액: 1명 990 · 2명 1,980 · 3명 4,900 · 4명부터 +990 · 10명 30,000", () => {
    let sum = 0;
    const totals: number[] = [];
    for (let n = 1; n <= 10; n++) {
      sum += inviteRewardFor(n);
      totals.push(sum);
    }
    expect(totals).toEqual([990, 1980, 4900, 5890, 6880, 7870, 8860, 9850, 10840, 30000]);
    expect(totals).toEqual([...INVITE_CUMULATIVE]);
  });

  it("11명째부터 새 바퀴 (11명째 = 1명째, 20명째에 다시 30,000)", () => {
    expect(inviteRewardFor(11)).toBe(990);
    expect(inviteRewardFor(13)).toBe(inviteRewardFor(3));
    let sum = 0;
    for (let n = 11; n <= 20; n++) sum += inviteRewardFor(n);
    expect(sum).toBe(30000);
    expect(inviteRewardFor(0)).toBe(0);
  });

  it("진행 상황", () => {
    expect(inviteProgress(0)).toMatchObject({ round: 1, inRound: 0, next: { atCount: 3, total: 4900, remaining: 3 } });
    expect(inviteProgress(3)).toMatchObject({ inRound: 3, earnedThisRound: 4900, next: { atCount: 10, remaining: 7 } });
    expect(inviteProgress(10)).toMatchObject({ round: 2, inRound: 0, next: { atCount: 3 } });
  });

  it("예전 장부 기록의 '복채'는 '엽전'으로 보인다", () => {
    expect(displayLedgerLabel("회원가입 축하 복채")).toBe("회원가입 축하 엽전");
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

describe("12가지 운", () => {
  it("주제 12개 + 전부 보기 전용 2개", () => {
    expect(TOPIC_KEYS).toHaveLength(12);
    expect(EXTRA_KEYS).toEqual(["monthly", "gaeun"]);
    expect(isTopicKey("money")).toBe(true);
    expect(isTopicKey("monthly")).toBe(false);
  });
});

describe("구매 계획 (planPurchase)", () => {
  it("깊게 보기: 안 연 주제 1개 → 4,900", () => {
    expect(planPurchase("deep", ["money"], [])).toEqual({ topics: ["money"], price: 4900 });
  });
  it("깊게 보기: 이미 연 주제면 거절", () => {
    expect(() => planPurchase("deep", ["money"], ["money"])).toThrow(PurchaseError);
  });
  it("몰아보기: 서로 다른 3개만", () => {
    expect(planPurchase("bundle3", ["money", "health", "family"], [])).toEqual({ topics: ["money", "health", "family"], price: 9900 });
    expect(() => planPurchase("bundle3", ["money", "money", "family"], [])).toThrow(PurchaseError);
    expect(() => planPurchase("bundle3", ["money", "health"], [])).toThrow(PurchaseError);
    expect(() => planPurchase("bundle3", ["money", "health", "monthly"], [])).toThrow(PurchaseError); // 전부 보기 전용은 못 고름
    expect(() => planPurchase("bundle3", ["money", "health", "family"], ["health"])).toThrow(PurchaseError);
  });
  it("전부 보기: 안 연 것 전부 + 월별·개운법, 가격은 늘 29,500", () => {
    const all = planPurchase("bundle12", undefined, []);
    expect(all.price).toBe(29500);
    expect(all.topics).toHaveLength(14);
    const some = planPurchase("bundle12", undefined, ["money", "health"]);
    expect(some.topics).toHaveLength(12);
    expect(some.price).toBe(29500);
    expect(() => planPurchase("bundle12", undefined, [...TOPIC_KEYS, ...EXTRA_KEYS])).toThrow(PurchaseError);
  });
});

describe("월건 (월별 운세 데이터)", () => {
  it("2026 병오년 → 寅월은 경인, 열두 달", () => {
    const m = monthPillarsOfYear(2026);
    expect(m).toHaveLength(12);
    expect(m[0].ganzhi).toBe("경인");
    expect(m[11].ganzhi).toBe("신축");
  });
  it("2024 갑진년 → 병인월로 시작", () => {
    expect(monthPillarsOfYear(2024)[0].ganzhi).toBe("병인");
  });
});

describe("AI 요청문·응답 처리", () => {
  it("맛보기: 엔진 데이터 그대로, 관심 분야는 가장 길게", () => {
    const p = buildTastePrompt(saju, ["money", "job", "promotion"], "work", 2026);
    expect(p).toContain(saju.pillars.day.ganzhi);
    expect(p).toMatch(/"money":.*가장 자세히/);
    expect(p).toMatch(/"job":.*가장 자세히/);
    expect(p).not.toMatch(/"promotion":.*가장 자세히/);
    expect(p).not.toContain("# 요청 상품:");
  });

  it("깊게 보기 월별: 계산된 월건을 함께 넣는다", () => {
    const p = buildDeepPrompt(saju, "monthly", 2026);
    expect(p).toContain("경인월");
    expect(p).toContain("2026년");
  });

  it("깊게 보기 개운법: 필요한 기운의 색·방향을 함께 넣는다", () => {
    expect(buildDeepPrompt(saju, "gaeun", 2026)).toMatch(/보완하면 좋은 오행/);
  });

  it("손님 이름은 AI로 보내지 않고, 돌아온 풀이에 서버가 채운다 (수정안 14)", async () => {
    for (const p of [buildTastePrompt(saju, ["love", "marriage", "family"], "love", 2026), buildDeepPrompt(saju, "money", 2026), buildDeepPrompt(saju, "monthly", 2026)]) {
      expect(p).not.toContain("유남영");
      expect(p).toContain(`${NAME_TOKEN}님`);
    }
    expect(fillName("{이름}님은 재물 그릇이 커요. ｛이름｝님, { 이름 }님", "유남영")).toBe("유남영님은 재물 그릇이 커요. 유남영님, 유남영님");
    expect(fillName("{이름}님", "$&$1")).toBe("$&$1님");
    // AI가 표시를 그대로 써서 돌려준 경우 → 저장되는 풀이에는 실제 이름이 들어간다
    const echo = {
      providerName: "echo",
      modelName: "echo",
      async complete(_s: string, user: string) {
        expect(user).not.toContain("유남영");
        if (user.includes("# 요청: 깊게 보기")) {
          return JSON.stringify({ summary: "{이름}님 요약", parts: [1, 2].map((i) => ({ heading: `{이름}님 ${i}`, body: "{이름}님은 " + "가".repeat(30) })) });
        }
        const keys = [...user.matchAll(/^- "(\w+)":/gm)].map((m) => m[1]);
        return JSON.stringify({ sections: keys.map((key) => ({ key, body: "{이름}님은 " + "나".repeat(30), deeper: "{이름}님께 더" })) });
      },
    };
    const taste = await generateTaste(saju, "유남영", undefined, 2026, echo);
    expect(taste.sections.every((s) => s.body.startsWith("유남영님은") && s.deeper === "유남영님께 더")).toBe(true);
    const deep = await generateDeep(saju, "유남영", "money", 2026, echo);
    expect(deep.summary).toBe("유남영님 요약");
    expect(deep.parts[0]).toMatchObject({ heading: "유남영님 1" });
    expect(JSON.stringify([taste, deep])).not.toContain("{이름}");
  });

  it("코드블록이 섞인 응답도 읽고, 빠진 주제는 실패", () => {
    const raw = '```json\n{"sections":[{"key":"love","body":"' + "가".repeat(30) + '","deeper":"더"}]}\n```';
    expect(parseTasteResponse(raw, ["love"])[0]).toMatchObject({ key: "love", title: "연애", deeper: "더" });
    expect(() => parseTasteResponse('{"sections":[]}', ["love"])).toThrow();
  });

  it("깊은 풀이가 너무 짧으면 실패 (반쪽 풀이를 팔지 않음)", () => {
    expect(() => parseDeepResponse('{"summary":"s","parts":[{"heading":"a","body":"' + "가".repeat(30) + '"}]}', "money")).toThrow();
    const ok = parseDeepResponse('{"summary":"s","parts":[{"heading":"a","body":"' + "가".repeat(30) + '"},{"heading":"b","body":"' + "나".repeat(30) + '"}]}', "money");
    expect(ok.parts).toHaveLength(2);
  });

  it("관심 분야 주제를 맨 앞으로", () => {
    const secs = TOPIC_KEYS.map((key) => ({ key, title: key, body: "x", deeper: "" }) as ReadingSection);
    expect(orderSections(secs, "work").map((s) => s.key).slice(0, 2)).toEqual(["job", "money"]);
    expect(orderSections(secs, undefined)[0].key).toBe("nature");
  });

  it("개발용 생성기로 맛보기 12개, 깊은 풀이(월별 12달)가 나온다", async () => {
    const taste = await generateTaste(saju, "유남영", "health", 2026);
    expect(taste.sections).toHaveLength(12);
    expect(taste.sections[0].key).toBe("health");
    const monthly = await generateDeep(saju, "유남영", "monthly", 2026);
    expect(monthly.parts).toHaveLength(12);
  });
});

describe("저장 키·머리말", () => {
  it("사람 키는 관심 분야와 무관, 맛보기 키는 관심 분야별", () => {
    expect(personKey(saju, "유남영")).toBe(personKey(saju, " 유남영 "));
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
    expect((await handleYeopjeonSummary(undefined)).status).toBe(401);
    expect((await handleCreatePerson(undefined, { resultId: "x" })).status).toBe(401);
    expect((await handlePurchase(undefined, "x", { mode: "deep" })).status).toBe(401);
    expect((await handleTopic(undefined, "x", "money", false)).status).toBe(401);
  });
});

describe("오류 알림 문구", () => {
  it("어디서·무슨 오류인지만, 길면 자른다", () => {
    const t = formatAlert("맛보기", new Error("x".repeat(2000)));
    expect(t.startsWith("[류결사주 오류] 맛보기")).toBe(true);
    expect(t.length).toBeLessThanOrEqual(900);
  });
});
