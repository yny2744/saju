import { calculateSaju } from "saju-engine";
import { buildPillarColumns, STEM_HANJA, BRANCH_HANJA, ELEMENT_TOKEN } from "../src/lib/pillarView";

const input = { calendarType: "solar" as const, date: "1967-04-03", time: "04:50", gender: "male" as const };

describe("buildPillarColumns - 사주 원국 카드용 데이터 (새 계산 없이 엔진 값을 그대로 변환)", () => {
  const cols = buildPillarColumns(calculateSaju(input, 2026));
  const by = (key: string) => cols.find((c) => c.key === key)!;

  test("왼쪽부터 시주·일주·월주·년주 순서다 (한국 만세력 표준 배열)", () => {
    expect(cols.map((c) => c.label)).toEqual(["시주", "일주", "월주", "년주"]);
  });

  test("년주: 정미 → 丁未, 오행(화·토)과 십신(비견/식신)이 엔진 값과 같다", () => {
    const y = by("year");
    expect(y.stem).toMatchObject({ hangul: "정", hanja: "丁", element: "화", tenGod: "비견" });
    expect(y.branch).toMatchObject({ hangul: "미", hanja: "未", element: "토", tenGod: "식신" });
  });

  test("일주 천간은 십신 대신 '본인'으로 표시한다", () => {
    expect(by("day").stem?.tenGod).toBe("본인");
    expect(by("day").stem?.hanja).toBe("丁");
    expect(by("day").branch?.hanja).toBe("酉");
  });

  test("지장간은 엔진이 준 순서(여기→중기→정기) 그대로다: 미 = 정·을·기", () => {
    expect(by("year").hiddenStems).toEqual(["정", "을", "기"]);
  });

  test("출생 시간을 모르면 시주만 비고, 나머지 세 기둥은 정상 표시된다", () => {
    const unknown = buildPillarColumns(calculateSaju({ calendarType: "solar", date: "1967-04-03", gender: "male" }, 2026));
    expect(unknown.find((c) => c.key === "hour")?.empty).toBe(true);
    expect(unknown.filter((c) => !c.empty).map((c) => c.key).sort()).toEqual(["day", "month", "year"]);
  });

  test("오행 5개 모두 디자인 토큰 이름으로 연결된다", () => {
    expect(Object.keys(ELEMENT_TOKEN).sort()).toEqual(["금", "목", "수", "토", "화"]);
  });
});

describe("한자 표기표 완전성 - 어떤 날짜가 와도 한자가 비지 않는다", () => {
  test("1900~2100년 사이 다양한 날짜·시간을 돌려도 모든 천간·지지가 한자로 변환된다", () => {
    const hours = ["00:30", "03:00", "05:30", "08:00", "10:30", "13:00", "15:30", "18:00", "20:30", "23:30"];
    let checked = 0;
    for (let y = 1900; y <= 2100; y += 7) {
      for (let m = 1; m <= 12; m += 3) {
        for (const t of hours) {
          const date = `${y}-${String(m).padStart(2, "0")}-${String(10 + (checked % 15)).padStart(2, "0")}`;
          const cols = buildPillarColumns(calculateSaju({ calendarType: "solar", date, time: t, gender: "female" }, 2026));
          for (const c of cols) {
            if (c.empty) continue;
            expect(STEM_HANJA[c.stem!.hangul]).toBeDefined();
            expect(BRANCH_HANJA[c.branch!.hangul]).toBeDefined();
            expect(c.stem!.element).toBeTruthy();
            expect(c.branch!.element).toBeTruthy();
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(300);
  });
});
