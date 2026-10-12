import fs from "fs";
import path from "path";
import { recommendNames, templateStory, goodHanjaFor, type MeaningDict } from "@/lib/naming";
import type { NameHanjaDict } from "@/lib/nameReading";

const names = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/hanja/name-hanja.json"), "utf8")) as NameHanjaDict;
const meanings = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/hanja/dict.json"), "utf8")) as MeaningDict;

describe("수정안 46 - 작명 후보", () => {
  it("한자 후보는 뜻이 궂은 글자를 뺀다", () => {
    const c = goodHanjaFor("민", meanings, names).map((x) => `${x.hanja}${x.meaning}`);
    expect(c.length).toBeGreaterThan(2);
    expect(c.join(",")).not.toMatch(/번민|불쌍/);
  });
  it("김씨 남자아이, 토가 부족 → 후보 7개, 수리 모두 길, 토를 채움", () => {
    const r = recommendNames({ surname: "김", surnameHanja: "金", gender: "male", needed: ["토"], count: 7 }, meanings, names);
    console.log(r.map((c) => `${c.hangul} ${c.hanja} ${c.chars.map((x) => x.meaning + "/" + x.element + x.strokes).join(" ")} ${c.score.toFixed(1)}\n  ${templateStory(c, ["토"])}`).join("\n"));
    expect(r.length).toBe(7);
    for (const c of r) {
      expect(c.suri.every((s) => s.lucky)).toBe(true);
      expect(c.fills).toBeGreaterThan(0);
    }
  });
  it("유씨 여자, 수 부족, 돌림자 끝 '연(延)'은 무시하고 '연(姸)'", () => {
    const r = recommendNames({ surname: "유", surnameHanja: "柳", gender: "female", needed: ["수"], count: 5, dollim: { hangul: "연", hanja: "姸", position: 2 } }, meanings, names);
    console.log(r.map((c) => `${c.hangul} ${c.hanja} ${c.chars.map((x) => x.meaning + "/" + x.element).join(" ")}`).join("\n"));
    for (const c of r) expect(c.hanja.endsWith("姸")).toBe(true);
  });
  it("다시 추천받으면 이전 후보는 빠진다", () => {
    const a = recommendNames({ surname: "박", surnameHanja: "朴", gender: "female", needed: ["화"], count: 5 }, meanings, names);
    const b = recommendNames({ surname: "박", surnameHanja: "朴", gender: "female", needed: ["화"], count: 5, exclude: a.map((c) => c.hangul) }, meanings, names);
    console.log(a.map((c) => c.hangul + c.hanja).join(" "), "|", b.map((c) => c.hangul + c.hanja).join(" "));
    expect(b.some((c) => a.some((x) => x.hangul === c.hangul))).toBe(false);
  });
  it("서버: 성 알아내기·성씨 한자", () => {
    const { surnameOf, resolveSurnameHanja } = jest.requireActual("@/server/naming/naming");
    expect(surnameOf("naming", "김○○")).toBe("김");
    expect(surnameOf("naming", "남궁○○")).toBe("남궁");
    expect(surnameOf("rename", "유남영")).toBe("유");
    expect(resolveSurnameHanja("유", "柳南榮", null, names)).toBe("柳");
    expect(resolveSurnameHanja("김", null, "金", names)).toBe("金");
    expect(resolveSurnameHanja("김", null, "木", names)).toBeNull();
  });
  it("작명서·개명 추천서 PDF", async () => {
    const { buildReport } = jest.requireActual("@/server/naming/naming");
    const { buildNamePdf } = jest.requireActual("@/server/pdf/buildNamePdf");
    const { calculateSaju } = jest.requireActual("saju-engine");
    const { readingHeader } = jest.requireActual("@/server/readings/readings");
    const saju = calculateSaju({ calendarType: "solar", date: "2026-09-01", time: "10:20", gender: "female" }, 2026);
    const report = await buildReport({ kind: "naming", saju, nickname: "김○○", surname: "김", surnameHanja: "金", savedHanja: "金", dollim: null, exclude: [], round: 1 });
    expect(report.candidates.length).toBe(7);
    const buf = await buildNamePdf({ report, nickname: "김○○", header: readingHeader(saju, "김○○", "金"), saju });
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    fs.writeFileSync("/tmp/claude-0/-home-claude/b7ce53b4-0040-5eda-8b75-0a53ef7f4b81/scratchpad/naming.pdf", buf);
    const sajuR = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);
    const rr = await buildReport({ kind: "rename", saju: sajuR, nickname: "유남영", surname: "유", surnameHanja: "柳", savedHanja: "柳南榮", dollim: null, exclude: [], round: 1 });
    expect(rr.candidates.length).toBe(5);
    expect(rr.current?.reading?.complete).toBe(true);
    expect(rr.candidates.some((c: { hangul: string }) => c.hangul === "남영")).toBe(false);
    const b2 = await buildNamePdf({ report: rr, nickname: "유남영", header: readingHeader(sajuR, "유남영", "柳南榮"), saju: sajuR });
    fs.writeFileSync("/tmp/claude-0/-home-claude/b7ce53b4-0040-5eda-8b75-0a53ef7f4b81/scratchpad/rename.pdf", b2);
  }, 60000);
});
