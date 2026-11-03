import { calculateSaju } from "saju-engine";
import { NY_GIFT_BUTTON, NY_SALE_END, NY_YEAR, nyFullButton, nySaleLine } from "@/lib/newyear2027";
import { buildNyFullPrompt, composeNyTotal, nyPreview, parseNyFull, withNyYear } from "@/server/newyear/newyear";
import { monthPillarsOfYear } from "@/lib/monthPillars";
import { isPurchaseMode, planPurchase } from "@/server/readings/readings";
import mgml from "@/tenants/mgml";
import { ryugyeol } from "@/tenants/ryugyeol";
import { TENANT } from "@/tenants";

// 2026-11-03 유샘 지시서: 2027 신년운 (/go/newyear2027)
describe("2027 신년운", () => {
  const saju = calculateSaju({ calendarType: "solar", date: "1990-05-15", time: "09:30", gender: "female" }, 2026);

  it("세운만 2027 정미년으로 바꾸고 원국은 그대로 (엔진 계산 그대로)", () => {
    const s = withNyYear(saju);
    expect(s.seun.year).toBe(2027);
    expect(`${s.seun.pillar.stem}${s.seun.pillar.branch}`).toBe("정미");
    expect(s.pillars).toEqual(saju.pillars);
    expect(saju.seun.year).toBe(2026); // 원본은 건드리지 않는다
  });

  it("열두 달은 입춘 기준 인월(2월)부터 축월(다음 해 1월)까지", () => {
    const m = monthPillarsOfYear(NY_YEAR);
    expect(m).toHaveLength(12);
    expect(m[0].ganzhi).toBe("임인");
    expect(m[11].ganzhi).toBe("계축");
  });

  it("총운은 2027년 문장이고, 무료 맛보기는 한 단락만 보이고 나머지는 소제목만", () => {
    const total = composeNyTotal(saju, "하늘");
    expect(total.title).toBe("2027년 정미년 총운");
    expect(total.sections.map((s) => s.body).join(" ")).toContain("2027년은 정미");
    expect(JSON.stringify(total)).not.toContain("올해"); // 지금 해(2026)로 읽히지 않게
    expect(JSON.stringify(total)).not.toMatch(/2027년(와|는|가|를)[^가-힣]/); // 조사도 받침에 맞게
    const p = nyPreview(total);
    expect(p.free.body).toContain("2027년");
    expect(p.locked).toHaveLength(total.sections.length);
    expect(JSON.stringify(p)).not.toContain(total.lack.body);
  });

  it("전체 보기 요청에는 확정 사실과 2027년 열두 달 월건이 들어간다 (손님 이름은 보내지 않음)", () => {
    const prompt = buildNyFullPrompt(saju);
    expect(prompt).toContain("2027년 세운: 정미");
    for (const m of monthPillarsOfYear(NY_YEAR)) expect(prompt).toContain(`${m.label}: ${m.ganzhi}월`);
    expect(prompt).toContain("재물 흐름");
    expect(prompt).not.toContain("하늘");
  });

  it("AI 응답: 소제목이 모자라거나 없는 대운을 쓰면 거절", () => {
    const part = (h: string) => ({ heading: h, body: "이 해의 흐름을 차분히 살피며 한 걸음씩 나아가면 좋아요." });
    const ok = JSON.stringify({ summary: "요약", parts: Array.from({ length: 16 }, (_, i) => part(`소제목 ${i}`)) });
    expect(parseNyFull(ok, []).parts).toHaveLength(16);
    expect(() => parseNyFull(JSON.stringify({ summary: "", parts: [part("a")] }), [])).toThrow();
  });

  it("화면 문구는 지시서 그대로 (줄 그은 정가·할인율 없음)", () => {
    expect(nySaleLine(9900)).toBe("2027 신년운 오픈 특가 9,900원 · 2월 28일까지");
    expect(nyFullButton(9900)).toBe("2027 신년운 전체 보기 · 오픈 특가 9,900원");
    expect(NY_GIFT_BUTTON).toBe("로그인하고 선물 엽전으로 총운 끝까지 보기");
    expect(NY_SALE_END).toBe("2027-02-28");
  });

  it("가격: 명견만리만 9,900원, 류결사주는 이 상품이 없다", () => {
    expect(mgml.prices.NEWYEAR).toBe(9900);
    expect(ryugyeol.prices.NEWYEAR).toBeUndefined();
    // 가격이 있는 고객사에서만 살 수 있다 (시험 기본 고객사 류결사주에서는 못 산다)
    const sells = typeof TENANT.prices.NEWYEAR === "number";
    expect(isPurchaseMode("ny2027")).toBe(sells);
    expect(isPurchaseMode("ny2027_full")).toBe(sells);
    expect(planPurchase("ny2027", [], []).price).toBe(990);
  });
});
