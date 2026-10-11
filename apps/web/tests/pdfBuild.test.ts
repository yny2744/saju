import fs from "fs";
import { calculateSaju } from "saju-engine";
import { buildPdf, pdfTitle } from "@/server/pdf/buildPdf";
import { TOPICS, TOPIC_KEYS, EXTRA_KEYS } from "@/lib/topics";
import { readingHeader } from "@/server/readings/readings";

describe("수정안 38 - 사주 책자 PDF", () => {
  it("표지 문구", () => {
    expect(pdfTitle([...TOPIC_KEYS, ...EXTRA_KEYS])).toBe("12가지 운세 전부 보기");
    expect(pdfTitle(["love"])).toBe("연애 깊게 보기");
  });
  it("전부 보기 14편으로 PDF가 만들어진다", async () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" } as never, 2026);
    const para = "유남영님은 정화(丁火) 일간으로 촛불처럼 따뜻한 기운을 타고났어요. 묘유충(卯酉沖)이 있어 변화가 잦지만 그만큼 길을 바꿔 새 기회를 여는 힘이 있어요. ".repeat(8);
    const readings = [...TOPIC_KEYS, ...EXTRA_KEYS].map((t) => ({
      topic: t,
      content: { topic: t, title: TOPICS[t].title, summary: "참 좋은 사주예요. 딱 하나, 토(土)의 기운이 아쉬워요.", parts: [1, 2, 3, 4, 5].map((i) => ({ heading: `소제목 ${i}`, body: `${para}\n${para}` })), model: "test" },
    }));
    const buf = await buildPdf({ nickname: "유남영", header: readingHeader(saju, "유남영", "柳南榮"), saju, readings, issuedAt: new Date("2026-10-12T00:00:00Z") });
    expect(buf.slice(0, 4).toString()).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(50_000);
    fs.writeFileSync("/tmp/claude-0/-home-claude/b7ce53b4-0040-5eda-8b75-0a53ef7f4b81/scratchpad/sample.pdf", buf);
  }, 60000);
});
