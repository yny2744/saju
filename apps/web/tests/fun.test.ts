import { lifePathNumber, lifePathElement, numerologyResult } from "../src/lib/fun/numerology";
import { zodiacSign, zodiacResult, ZODIAC_SIGNS } from "../src/lib/fun/zodiac";
import { flowerResult, monthFlower, FILL_FLOWER } from "../src/lib/fun/flower";
import { bloodResult } from "../src/lib/fun/blood";
import { birthstoneResult, monthStone, FILL_STONE, STONE_NOTE } from "../src/lib/fun/birthstone";
import { relationOfElements } from "../src/lib/fun/overlay";
import { handleFun } from "../src/server/fun/funService";
import { goodsFor } from "../src/lib/goods";
import { TENANT } from "../src/tenants";
import fs from "fs";
import path from "path";
import type { TenantConfig } from "../src/tenants/types";

/** 2026-10-26 무료 묶음 (수비학·별자리·혈액형·탄생화) + 사주 겹쳐 보기 + 굿즈 칸 */
describe("수비학 인생 수", () => {
  it("숫자를 모두 더해 한 자리로, 11·22·33은 그대로", () => {
    expect(lifePathNumber("1967-05-12")).toBe(4); // 1+9+6+7+0+5+1+2 = 31 → 4
    expect(lifePathNumber("1990-01-01")).toBe(3); // 1+9+9+0+0+1+0+1 = 21 → 3
  });
  it("마스터 넘버", () => {
    expect(lifePathNumber("1982-01-08")).toBe(11); // 1+9+8+2+0+1+0+8 = 29 → 11
    expect(lifePathNumber("1999-12-29")).toBe(6); // 1+9+9+9+1+2+2+9 = 42 → 6
  });
  it("하도 배속", () => {
    expect(lifePathElement(1)).toBe("수");
    expect(lifePathElement(7)).toBe("화");
    expect(lifePathElement(11)).toBe("화");
    expect(lifePathElement(22)).toBe("금");
    expect(lifePathElement(33)).toBe("수");
    expect(numerologyResult("1982-01-08").subtitle).toContain("마스터 넘버");
  });
});

describe("별자리", () => {
  it("열두 별자리가 1년 365일을 빈틈없이 한 번씩 덮는다", () => {
    const seen = new Map<string, number>();
    for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2025, 0, 1); t += 86400000) {
      const d = new Date(t).toISOString().slice(0, 10);
      const hits = ZODIAC_SIGNS.filter((s) => s.key === zodiacSign(d).key);
      expect(hits).toHaveLength(1);
      seen.set(zodiacSign(d).key, (seen.get(zodiacSign(d).key) ?? 0) + 1);
    }
    expect(seen.size).toBe(12);
  });
  it("경계일", () => {
    expect(zodiacSign("1970-03-21").name).toBe("양자리");
    expect(zodiacSign("1970-03-20").name).toBe("물고기자리");
    expect(zodiacSign("1970-12-25").name).toBe("염소자리");
    expect(zodiacSign("1970-01-19").name).toBe("염소자리");
    expect(zodiacSign("1970-01-20").name).toBe("물병자리");
    expect(zodiacResult("1970-08-01").element).toBe("화"); // 사자자리 = 불
    expect(zodiacResult("1970-06-01").element).toBe("목"); // 쌍둥이자리 = 바람 → 목
  });
});

describe("탄생화 · 혈액형", () => {
  it("달마다 꽃 하나, 채우는 꽃은 오행마다 하나", () => {
    for (let m = 1; m <= 12; m++) expect(monthFlower(`2000-${String(m).padStart(2, "0")}-15`).name.length).toBeGreaterThan(0);
    expect(flowerResult("1967-11-03").title).toContain("국화");
    expect(Object.keys(FILL_FLOWER).sort()).toEqual(["금", "목", "수", "토", "화"]);
  });
  it("탄생석 (2026-10-31): 달마다 돌 하나, 채우는 돌은 오행마다 하나, 효능을 약속하지 않는다", () => {
    for (let m = 1; m <= 12; m++) {
      const s = monthStone(`2000-${String(m).padStart(2, "0")}-15`);
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.body.join(" ")).not.toMatch(/건강해|병을|낫|치유|효능|부자가 된/);
    }
    expect(birthstoneResult("1967-04-03").title).toBe("4월의 탄생석 · 다이아몬드");
    expect(birthstoneResult("2000-06-10").subtitle).toContain("문스톤");
    expect(birthstoneResult("2000-06-10").element).toBe("금");
    expect(Object.keys(FILL_STONE).sort()).toEqual(["금", "목", "수", "토", "화"]);
    expect(STONE_NOTE).toContain("상징");
  });
  it("혈액형은 재미로 보는 이야기라고 밝히고, 오행은 붙이지 않는다", () => {
    const r = bloodResult("AB");
    expect(r.subtitle).toContain("재미로");
    expect(r.element).toBeUndefined();
  });
});

describe("사주 겹쳐 보기", () => {
  it("오행 관계 다섯 가지", () => {
    expect(relationOfElements("목", "목")).toBe("same");
    expect(relationOfElements("수", "목")).toBe("funFeedsDay");
    expect(relationOfElements("화", "목")).toBe("dayFeedsFun"); // 일간 목이 화를 낳음
    expect(relationOfElements("금", "목")).toBe("funTamesDay");
    expect(relationOfElements("목", "금")).toBe("dayTamesFun");
  });

  it("API: 양력 생일 → 결과 + 일간 + 부족한 기운 + 이어지는 운세", () => {
    const { status, body } = handleFun({ kind: "numerology", calendarType: "solar", date: "1967-05-12" }, "t1");
    expect(status).toBe(200);
    if (!("result" in body)) throw new Error("no result");
    expect(body.result.title).toContain("인생 수");
    expect(body.overlay.dayStem).toMatch(/^[갑을병정무기경신임계]$/);
    expect(body.overlay.dayCore).not.toContain("{이름}");
    expect(body.overlay.need.elements.length).toBeGreaterThan(0);
    expect(body.overlay.next.href).toBe("/go?topic=nature");
    expect(body.overlay.relation).toBeDefined();
  });

  it("API: 음력 생일은 양력으로 바꿔 별자리·탄생화를 본다", () => {
    const { status, body } = handleFun({ kind: "flower", calendarType: "lunar", date: "1967-04-03" }, "t2");
    expect(status).toBe(200);
    if (!("result" in body)) throw new Error("no result");
    expect(body.solarDate).not.toBe("1967-04-03");
    expect(body.solarDate.startsWith("1967-05")).toBe(true);
    expect(body.overlay.fillFlowers?.length).toBeGreaterThan(0);
  });

  it("API: 탄생석 - 채우는 돌만 나오고 채우는 꽃은 없다, 이어지는 운세는 재물", () => {
    const { status, body } = handleFun({ kind: "birthstone", calendarType: "solar", date: "1990-12-25" }, "t4");
    expect(status).toBe(200);
    if (!("result" in body)) throw new Error("no result");
    expect(body.result.short).toBe("터키석");
    expect(body.overlay.fillStones?.length).toBeGreaterThan(0);
    expect(body.overlay.fillFlowers).toBeUndefined();
    expect(body.overlay.next.href).toBe("/go?topic=money");
  });

  it("API: 혈액형은 오행 비교 없이 일간만", () => {
    const { status, body } = handleFun({ kind: "blood", calendarType: "solar", date: "1980-02-29", blood: "O" }, "t3");
    expect(status).toBe(200);
    if (!("result" in body)) throw new Error("no result");
    expect(body.overlay.relation).toBeUndefined();
    expect(body.overlay.next.topic).toBe("relationship");
  });

  it("API: 잘못된 입력은 400", () => {
    expect(handleFun({ kind: "tarot", date: "1980-01-01" }, "t4").status).toBe(400);
    expect(handleFun({ kind: "zodiac", calendarType: "solar", date: "1981-02-29" }, "t4").status).toBe(400);
    expect(handleFun({ kind: "blood", calendarType: "solar", date: "1980-01-01" }, "t4").status).toBe(400);
    expect(handleFun({ kind: "zodiac", calendarType: "solar", date: "2999-01-01" }, "t4").status).toBe(400);
  });
});

describe("굿즈 칸 (고객사 설정)", () => {
  it("링크가 없는 오행은 칸이 생기지 않는다 (지금 류결사주는 모두 비어 있음)", () => {
    expect(goodsFor(["목", "수"])).toEqual(
      (["목", "수"] as const).filter((el) => (TENANT.goods.coupang[el] ?? []).length > 0).map((el) => expect.objectContaining({ element: el }))
    );
  });
  it("모든 고객사: 링크가 있다면 https, 인자사주는 비어 있다", () => {
    const dir = path.join(__dirname, "../src/tenants");
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".ts") && !x.endsWith(".d.ts") && !["index.ts", "types.ts"].includes(x))) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const t: TenantConfig = require(path.join(dir, f)).default;
      for (const links of Object.values(t.goods.coupang)) for (const l of links ?? []) expect(l.url).toMatch(/^https:\/\/(link\.coupang\.com|coupa\.ng|www\.coupang\.com)\//);
      if (t.id === "injasaju") expect(Object.values(t.goods.coupang).flat()).toHaveLength(0);
    }
  });
});
