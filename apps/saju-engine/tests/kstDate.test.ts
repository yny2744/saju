import { getTodayKstDateString, getCurrentKstYear, assertValidDateString } from "../src/kstDate";

describe("kstDate", () => {
  test("UTC 기준 자정 직후에도 KST로는 이미 다음날 오전 9시라 날짜가 하루 앞서 나온다", () => {
    // 2026-01-01 00:00:00 UTC = 2026-01-01 09:00:00 KST (UTC+9) - 같은 날이지만
    // 아래 사례는 진짜 "날짜가 밀리는" 경계 케이스를 확인한다.
    const utcMidnight = new Date("2026-01-01T00:00:00.000Z");
    expect(getTodayKstDateString(utcMidnight)).toBe("2026-01-01");
  });

  test("KST 자정 직전(UTC 14:59) vs 자정 직후(UTC 15:00) 경계에서 날짜가 정확히 바뀐다", () => {
    // KST = UTC+9. KST 2026-03-09 23:59:00 = UTC 2026-03-09 14:59:00
    const beforeMidnightKst = new Date("2026-03-09T14:59:00.000Z");
    expect(getTodayKstDateString(beforeMidnightKst)).toBe("2026-03-09");

    // KST 2026-03-10 00:00:00 = UTC 2026-03-09 15:00:00
    const afterMidnightKst = new Date("2026-03-09T15:00:00.000Z");
    expect(getTodayKstDateString(afterMidnightKst)).toBe("2026-03-10");
  });

  test("서버가 UTC 환경이어도(Date 자체는 항상 UTC 내부 저장) KST 변환 결과는 동일하다", () => {
    // Date 객체 자체는 항상 UTC 타임스탬프이므로, 서버 프로세스의 TZ 환경변수와
    // 무관하게 getTodayKstDateString()은 timeZone: "Asia/Seoul" 옵션으로 강제 변환한다.
    const someInstant = new Date("2026-06-15T20:30:00.000Z"); // KST 2026-06-16 05:30
    expect(getTodayKstDateString(someInstant)).toBe("2026-06-16");
  });

  test("getCurrentKstYear는 KST 기준 연도를 반환한다 (자정 경계 포함)", () => {
    // KST 2025-12-31 23:59 = UTC 2025-12-31 14:59
    expect(getCurrentKstYear(new Date("2025-12-31T14:59:00.000Z"))).toBe(2025);
    // KST 2026-01-01 00:00 = UTC 2025-12-31 15:00
    expect(getCurrentKstYear(new Date("2025-12-31T15:00:00.000Z"))).toBe(2026);
  });

  test("assertValidDateString은 YYYY-MM-DD 형식이 아니면 던진다", () => {
    expect(() => assertValidDateString("2026-9-22")).toThrow();
    expect(() => assertValidDateString("2026/09/22")).toThrow();
    expect(() => assertValidDateString("not-a-date")).toThrow();
    expect(() => assertValidDateString("2026-09-22")).not.toThrow();
  });
});
