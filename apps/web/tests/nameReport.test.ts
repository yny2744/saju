import fs from "fs";
import path from "path";
import { calculateSaju } from "saju-engine";
import { buildNameReport } from "@/lib/nameReport";
import { SURI81, suriInfo } from "@/lib/suri81";

const names = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/hanja/name-hanja.json"), "utf8"));
const meanings = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/hanja/dict.json"), "utf8"));

describe("수정안 14 - 무료 이름 풀이 리포트", () => {
  it("81수리 표는 1~81을 모두 채운다", () => {
    expect(SURI81.length).toBe(82);
    for (let i = 1; i <= 81; i++) expect(SURI81[i][0]).toMatch(/격/);
    expect(suriInfo(85).name).toBe(SURI81[5][0]);
  });
  it("사주와 이름을 함께 푼다 (柳南榮)", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);
    const r = buildNameReport("유남영", "柳南榮", saju, names, meanings)!;
    console.log(r.score, r.headline, "\n", r.summary, "\n", r.chars.map((c) => c.text).join("\n"), "\n", r.boost.text, "\n", r.suriText, "\n", r.sound.text, "\n", r.yinYang.text, "\n", r.closing);
    expect(r.complete).toBe(true);
    expect(r.suri).toHaveLength(4);
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.chars[1].meaning).toContain("남");
    const len = [r.summary, r.relation, r.impression, r.base.dayText, r.base.lackText, ...r.chars.map((c) => c.text), r.boost.text, r.suriText, ...r.suri.map((s) => s.text), r.sound.text, r.yinYang.text, r.closing].join("").length;
    console.log("글자 수", len);
    expect(len).toBeGreaterThan(1200);
  });
  it("한자가 없으면 소리로만", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1990-05-05", gender: "female" }, 2026);
    const r = buildNameReport("김하늘", undefined, saju, names, meanings)!;
    expect(r.complete).toBe(false);
    expect(r.criteria.map((c) => c.key)).toEqual(["sound", "soundfill"]);
  });
});
