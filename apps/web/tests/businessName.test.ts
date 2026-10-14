import fs from "fs";
import path from "path";
import { INDUSTRIES, acceptable, industryOf, readBusinessName, romanize, BUSINESS_POOL } from "@/lib/businessName";
import type { NameHanjaDict } from "@/lib/nameReading";
import { PRICE } from "@/lib/yeopjeon";
import { parseIntent, intentDestination } from "@/lib/intent";

const names = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/hanja/name-hanja.json"), "utf8")) as NameHanjaDict;

describe("수정안 63 - 상호 풀이 · 상호 작명", () => {
  it("재료 한자는 모두 사전에 있고 그 소리로 읽힌다", () => {
    for (const w of BUSINESS_POOL) {
      if (!w.hanja) continue;
      [...w.hanja].forEach((c, i) => expect(names[c]?.[2]).toContain([...w.hangul][i]));
    }
  });
  it("로마자 표기", () => {
    expect(romanize("다온")).toBe("Daon");
    expect(romanize("해솔")).toBe("Haesol");
    expect(romanize("윤슬")).toBe("Yunseul");
  });
  it("상호 풀이: 업종 오행 · 소리 흐름 · 총획 · 대표자 사주", () => {
    const food = industryOf("food")!;
    const r = readBusinessName("다온 식당", null, food, ["토"], names)!;
    expect(r.name).toBe("다온식당");
    const a = readBusinessName("다온", null, food, ["토"], names)!;
    expect(a.industry?.first).toBe("같음"); // ㄷ 화 = 음식점 화
    expect(a.sound.clashes).toBe(0); // 화 → 토 상생
    expect(a.suri).toBeNull();
    expect(a.supports).toEqual(["토"]);
    const h = readBusinessName("대성", "大成", food, null, names)!;
    expect(h.complete).toBe(true);
    expect(h.totalStrokes).toBe(10);
    expect(h.suri?.lucky).toBe(false);
    expect(acceptable(h)).toBe(false);
    expect(readBusinessName("", null, null, null, names)).toBeNull();
  });
  it("가격 · 들어오는 길", () => {
    expect(PRICE.BUSINESS).toBe(49900);
    const i = parseIntent(new URLSearchParams("name=business"))!;
    expect(i).toEqual({ kind: "name", mode: "business" });
    expect(intentDestination("abc", i)).toBe("/person/abc/business?kind=business");
  });
  it("후보 7개 (AI 없이 엔진만) + 상호 작명서 PDF", async () => {
    const { buildBusinessReport } = jest.requireActual("@/server/naming/business");
    const { buildBusinessPdf } = jest.requireActual("@/server/pdf/buildBusinessPdf");
    const { calculateSaju } = jest.requireActual("saju-engine");
    const { readingHeader } = jest.requireActual("@/server/readings/readings");
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);
    for (const ind of INDUSTRIES) {
      const rep = await buildBusinessReport({ saju, industry: ind, feelings: ["trust"], exclude: [], round: 1, useAi: false });
      expect(rep.candidates.length).toBe(7);
      for (const c of rep.candidates) expect(acceptable(c.reading)).toBe(true);
    }
    const rep = await buildBusinessReport({ saju, industry: industryOf("cafe")!, feelings: ["warm", "nature"], exclude: [], round: 1, useAi: false });
    const again = await buildBusinessReport({ saju, industry: industryOf("cafe")!, feelings: [], exclude: rep.candidates.map((c: { hangul: string }) => c.hangul), round: 2, useAi: false });
    expect(again.candidates.some((c: { hangul: string }) => rep.candidates.some((x: { hangul: string }) => x.hangul === c.hangul))).toBe(false);
    const buf = await buildBusinessPdf({ report: rep, nickname: "유남영", header: readingHeader(saju, "유남영", "柳南榮"), saju });
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    if (process.env.BUSINESS_PDF_OUT) fs.writeFileSync(process.env.BUSINESS_PDF_OUT, buf);
  }, 60000);
});

describe("수정안 15 - 기업·브랜딩 작명", () => {
  it("기업·브랜딩도 후보 7개, 재료 한자는 사전 소리와 맞는다", async () => {
    const { buildBusinessReport } = jest.requireActual("@/server/naming/business");
    const { calculateSaju } = jest.requireActual("saju-engine");
    const saju = calculateSaju({ calendarType: "solar", date: "1980-08-15", time: "09:30", gender: "female" }, 2026);
    for (const kind of ["corp", "brand"]) {
      const rep = await buildBusinessReport({ kind, saju, industry: industryOf("it")!, feelings: ["trust"], exclude: [], round: 1, useAi: false });
      expect(rep.kind).toBe(kind);
      expect(rep.candidates.length).toBe(7);
    }
    const i = parseIntent(new URLSearchParams("name=corp"))!;
    expect(intentDestination("abc", i)).toBe("/person/abc/business?kind=corp");
  });
});
