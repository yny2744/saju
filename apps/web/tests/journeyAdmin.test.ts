import { calculateSaju } from "saju-engine";
import { buildTenGodDistribution } from "@/lib/tenGodDistribution";
import { groupShares, recommendFromSaju, recommendTopics } from "@/lib/journey";
import { TOPIC_KEYS } from "@/lib/topics";
import { adminIds, isAdminUser } from "@/server/admin/admin";
import { cleanDepositor } from "@/server/admin/charges";
import { kstDay, VID_RE } from "@/server/admin/visits";
import { CHARGE_OPTIONS, isChargeOption } from "@/lib/yeopjeon";

const shares = (o: Partial<Record<"비겁" | "식상" | "재성" | "관성" | "인성", number>>) =>
  (["비겁", "식상", "재성", "관성", "인성"] as const).map((group) => ({ group, percent: o[group] ?? 0 })).sort((a, b) => b.percent - a.percent);

describe("수정안 27 - 내 사주로 고른 다음 운세", () => {
  it("가장 강한 기운의 운세가 먼저, 이유 문구와 함께", () => {
    const r = recommendTopics(shares({ 재성: 40, 관성: 30, 인성: 10, 비겁: 10, 식상: 10 }));
    expect(r.map((x) => x.topic)).toEqual(["money", "business", "promotion"]);
    expect(r[0].reason).toContain("재물의 별");
  });

  it("지금 보는 운세·이미 연 운세는 빼고, 관심 분야를 두 번째 기운보다 앞에", () => {
    const r = recommendTopics(shares({ 관성: 50, 재성: 20 }), { focus: "love", exclude: ["promotion"] });
    expect(r.map((x) => x.topic)).toEqual(["job", "love", "marriage"]);
  });

  it("거의 다 열었으면 남은 것만, 겹치지 않게", () => {
    const owned = TOPIC_KEYS.filter((t) => t !== "health" && t !== "year");
    const r = recommendTopics(shares({ 재성: 50 }), { exclude: owned });
    expect(r.map((x) => x.topic).sort()).toEqual(["health", "year"]);
  });

  it("실제 사주로 계산해도 3개, 서로 다름", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-03-11", time: "06:10", gender: "male" } as never, 2026);
    const g = groupShares(buildTenGodDistribution(saju));
    expect(g.reduce((s, x) => s + x.percent, 0)).toBeGreaterThan(90);
    const r = recommendFromSaju(saju, { exclude: ["money"] });
    expect(r).toHaveLength(3);
    expect(new Set(r.map((x) => x.topic)).size).toBe(3);
    expect(r.map((x) => x.topic)).not.toContain("money");
  });
});

describe("수정안 26 - 관리자", () => {
  it("ADMIN_USER_IDS 에 있는 회원만 (쉼표·공백·대소문자 무관)", () => {
    const id = "0a1b2c3d-0000-4000-8000-00000000abcd";
    expect(adminIds(` ${id.toUpperCase()} , other`).has(id)).toBe(true);
    expect(isAdminUser({ id }, `x,${id}`)).toBe(true);
    expect(isAdminUser({ id }, "")).toBe(false);
    expect(isAdminUser(null, id)).toBe(false);
  });

  it("방문 번호·한국 날짜", () => {
    expect(VID_RE.test("1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed")).toBe(true);
    expect(VID_RE.test("<script>")).toBe(false);
    expect(kstDay(new Date("2026-10-10T15:30:00Z"))).toBe("2026-10-11"); // 한국 00:30
    expect(kstDay(new Date("2026-10-10T14:59:00Z"))).toBe("2026-10-10");
  });
});

describe("계좌 입금 충전", () => {
  it("정해진 금액만", () => {
    for (const o of CHARGE_OPTIONS) expect(isChargeOption(o)).toBe(true);
    expect(isChargeOption(990)).toBe(false);
    expect(isChargeOption("9900")).toBe(false);
    expect(isChargeOption(-4900)).toBe(false);
  });
  it("입금자 이름 정리", () => {
    expect(cleanDepositor("  홍  길동 ")).toBe("홍 길동");
    expect(cleanDepositor("김")).toBeNull();
    expect(cleanDepositor("유남영(엔와이)")).toBe("유남영(엔와이)");
    expect(cleanDepositor("<b>x</b>")).toBeNull();
    expect(cleanDepositor(123)).toBeNull();
  });
});
