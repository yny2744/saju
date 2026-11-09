import { calculateSaju } from "saju-engine";
import { WINTER_MONTH, composeCouple, composeSolo, coupleCalendar, loveBase, lovePaths, months2027, soloCalendar } from "@/lib/love/love";
import { LOVE_CAL, LOVE_CAL_PAIR, LOVE_PAIR, loveCalTopic } from "@/lib/love/loveProducts";
import { buildCoupleCalPrompt, buildSoloCalPrompt, parseLoveCal } from "@/server/love/love";
import { isPurchaseMode, planForPerson } from "@/server/readings/readings";
import mgml from "@/tenants/mgml";
import { ryugyeol } from "@/tenants/ryugyeol";
import { TENANT } from "@/tenants";

// 2026-11-09 유샘 지시서: 크리스마스 연애운 + 연애 상품 사다리
describe("크리스마스 연애운 (엔진 문장)", () => {
  const her = calculateSaju({ calendarType: "solar", date: "1993-07-21", time: "14:30", gender: "female" }, 2026);
  const him = calculateSaju({ calendarType: "solar", date: "1991-02-03", time: "09:10", gender: "male" }, 2026);

  it("이번 겨울 = 2026년 12월 경자월 (엔진 월건 그대로)", () => {
    expect(WINTER_MONTH.ganzhi).toBe("경자");
  });

  it("배우자 별: 여자는 관성(나를 극하는 오행), 남자는 재성(내가 극하는 오행)", () => {
    const a = loveBase(her); // 계수 일간
    expect(a.spouseGroup).toBe("관성");
    expect(a.spouseEl).toBe("토");
    const b = loveBase(him); // 갑목 일간
    expect(b.spouseGroup).toBe("재성");
    expect(b.spouseEl).toBe("토");
  });

  it("인연이 오는 길: 기준을 넘는 길을 강한 순서로, 없으면 가장 강한 하나", () => {
    const paths = lovePaths(loveBase(her));
    expect(paths[0]).toBe("work"); // 관성 47%
    const none = lovePaths({ ...loveBase(her), yeokma: 0, spousePct: 5, groupPct: { 비겁: 10, 식상: 10, 재성: 5, 관성: 5, 인성: 70 } });
    expect(none).toHaveLength(1);
    const many = lovePaths({ ...loveBase(her), yeokma: 2, spousePct: 22, groupPct: { 비겁: 30, 식상: 10, 재성: 10, 관성: 22, 인성: 28 } });
    expect(many).toEqual(["travel", "social", "work"]);
  });

  it("솔로: 네 소제목, 비회원 맛보기는 인연이 오는 길 첫 부분만", () => {
    const s = composeSolo(her, "지은");
    expect(s.sections.map((x) => x.heading)).toEqual(["인연이 오는 길", "다가오는 사람의 모습", "이번 겨울의 인연 기운", "연말부터 내년까지의 흐름"]);
    expect(s.preview.heading).toBe("인연이 오는 길");
    expect(s.sections[0].body.startsWith(s.preview.body)).toBe(true);
    expect(JSON.stringify(s)).not.toMatch(/\{이름\}|엽전|냥/);
    expect(s.sections[2].body).toContain("경자(庚子)월");
  });

  it("커플: 끌림 한 줄 + 서로 끌린 이유 + 이번 겨울 두 사람의 기운", () => {
    const c = composeCouple("지은", her, "민준", him);
    expect(c.attraction).toContain("지은");
    expect(c.sections.map((x) => x.heading)).toEqual(["서로 끌린 이유", "이번 겨울 두 사람의 기운"]);
    expect(JSON.stringify(c)).not.toMatch(/\{A\}|\{B\}|엽전|냥/);
  });

  it("고비(충·원진)를 말할 때는 지나가는 방법을 함께", () => {
    // 일지 오(午)는 12월 자(子)와 충
    let chung = her;
    for (let d = 1; d <= 12 && chung.pillars.day.earthlyBranch !== "오"; d++) {
      chung = calculateSaju({ calendarType: "solar", date: `1990-06-${String(d).padStart(2, "0")}`, time: "12:00", gender: "female" }, 2026);
    }
    expect(chung.pillars.day.earthlyBranch).toBe("오");
    const w = composeSolo(chung, "가람").sections[2].body;
    expect(w).toMatch(/충/);
    expect(w).toMatch(/이어 가면/);
    const c = composeCouple("가람", chung, "민준", him).sections[1].body;
    expect(c).toMatch(/충/);
    expect(c).toMatch(/잘 지나가요/);
  });

  it("2027 연애 달력: 1월은 축월, 2~12월은 2027년 인월~자월 / 솔로는 강한 달 표시, 커플은 좋은 달·조심할 달", () => {
    const m = months2027();
    expect(m.map((x) => x.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(m[0].ganzhi).toBe("신축");
    expect(m[1].ganzhi).toBe("임인");
    expect(m[11].ganzhi).toBe("임자");
    const solo = soloCalendar(her);
    expect(solo.filter((r) => r.strong).length).toBeGreaterThanOrEqual(1);
    expect(solo.filter((r) => r.strong).length).toBeLessThanOrEqual(4);
    const couple = coupleCalendar(her, him);
    expect(couple.every((r) => !(r.good && r.care))).toBe(true);
    expect(couple.some((r) => r.care)).toBe(true);
  });

  it("연애 달력 AI 요청: 엔진 판정을 그대로 넣고 이름은 보내지 않는다", () => {
    const p = buildSoloCalPrompt(her, soloCalendar(her));
    expect(p).toContain("# 요청: 깊게 보기");
    expect(p).toContain("10월 (경술월): 인연 기운이 강한 달");
    expect(p).not.toContain("지은");
    const c = buildCoupleCalPrompt(her, him, coupleCalendar(her, him));
    expect(c).toContain("조심할 달");
    expect(c).toContain("{A}님");
    const part = { heading: "1월", body: "이달에는 마음을 열고 천천히 사람을 알아 가면 좋아요." };
    expect(parseLoveCal(JSON.stringify({ summary: "요약", parts: Array(12).fill(part) }), []).parts).toHaveLength(12);
    expect(() => parseLoveCal(JSON.stringify({ summary: "", parts: [part] }), [])).toThrow();
  });
});

describe("연애 상품 (짧은 궁합 990 · 연애 달력 9,900 · 연인 궁합 19,800)", () => {
  it("가격: 명견만리만 새 상품, 연인 궁합은 명견만리만 19,800 (류결사주는 그대로)", () => {
    expect(mgml.prices.LOVE_PAIR).toBe(990);
    expect(mgml.prices.LOVE_CAL).toBe(9900);
    expect(mgml.prices.COUPLE).toBe(19800);
    expect(ryugyeol.prices.COUPLE).toBe(19900);
    expect(ryugyeol.prices.LOVE_PAIR).toBeUndefined();
    // 다른 가격은 그대로
    const { LOVE_PAIR: _a, LOVE_CAL: _b, COUPLE: _c, OVERLAY: _d, NEWYEAR: _e, TAROT3: _f, ...rest } = mgml.prices;
    const { COUPLE: _g, ...base } = ryugyeol.prices;
    expect(rest).toEqual(base);
  });

  it("파는 고객사에서만 구매 종류로 받는다", () => {
    const sells = typeof TENANT.prices.LOVE_PAIR === "number";
    for (const m of [LOVE_PAIR, LOVE_CAL, LOVE_CAL_PAIR]) expect(isPurchaseMode(m)).toBe(sells);
  });

  it("열람 표시: 솔로 달력 love2027, 커플 달력 love2027c:<상대>", () => {
    expect(loveCalTopic()).toBe("love2027");
    expect(loveCalTopic("p1")).toBe("love2027c:p1");
  });

  if (typeof TENANT.prices.LOVE_PAIR === "number") {
    const me = "00000000-0000-4000-8000-000000000001";
    const you = "00000000-0000-4000-8000-000000000002";
    const fakeQ = (owned: boolean) =>
      ({
        query: jest.fn(async (sql: string) => {
          if (sql.includes("FROM persons")) return { rows: [{ nickname: sql.includes("$1") ? "나" : "너" }], rowCount: 1 };
          return { rows: owned ? [{}] : [], rowCount: owned ? 1 : 0 };
        }),
      }) as unknown as Parameters<typeof planForPerson>[0];

    it("짧은 궁합: 상대 번호로 990원, 같은 상대는 다시 사지 않는다, 상대가 없으면 거절", async () => {
      const plan = await planForPerson(fakeQ(false), { userId: "u", personId: me, mode: LOVE_PAIR, topics: [you] });
      expect(plan.price).toBe(990);
      expect(plan.topics).toEqual([you]);
      await expect(planForPerson(fakeQ(true), { userId: "u", personId: me, mode: LOVE_PAIR, topics: [you] })).rejects.toMatchObject({ code: "ALREADY_OWNED" });
      await expect(planForPerson(fakeQ(false), { userId: "u", personId: me, mode: LOVE_PAIR, topics: [] })).rejects.toMatchObject({ code: "INVALID_TOPICS" });
      await expect(planForPerson(fakeQ(false), { userId: "u", personId: me, mode: LOVE_PAIR, topics: [me] })).rejects.toMatchObject({ code: "INVALID_TOPICS" });
    });

    it("연애 달력: 솔로·커플 모두 9,900원", async () => {
      expect((await planForPerson(fakeQ(false), { userId: "u", personId: me, mode: LOVE_CAL, topics: [] })).price).toBe(9900);
      expect((await planForPerson(fakeQ(false), { userId: "u", personId: me, mode: LOVE_CAL_PAIR, topics: [you] })).price).toBe(9900);
    });
  }
});
