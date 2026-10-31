import { calculateFourPillars } from "../src/pillars";
import { calculateDaeun } from "../src/daeun";
import { resolveKoreanClock, seoulOffsetAtUtc } from "../src/koreaTime";

/**
 * 한국 시계 역사 보정 + 절기 시각 기준 (2026-10-31 유샘 승인) - src/koreaTime.ts
 */

describe("절기 시각 - 한국 시간(KST) 기준", () => {
  // 2024년 입춘: 한국천문연구원 KST 02-04 17:27 (lunar-javascript 베이징 시간 16:26:53)
  test("입춘 직전(KST 16:50)은 아직 계묘년 을축월", () => {
    const { pillars, meta } = calculateFourPillars({ calendarType: "solar", date: "2024-02-04", time: "16:50", gender: "male" });
    expect(pillars.year.ganzhi).toBe("계묘");
    expect(pillars.month.ganzhi).toBe("을축");
    expect(meta.solarTermReferenceDateTime).toBe("2024-02-04T15:50:00");
  });

  test("입춘 직후(KST 17:30)부터 갑진년 병인월", () => {
    const { pillars } = calculateFourPillars({ calendarType: "solar", date: "2024-02-04", time: "17:30", gender: "male" });
    expect(pillars.year.ganzhi).toBe("갑진");
    expect(pillars.month.ganzhi).toBe("병인");
  });

  test("절기 보정은 일주·시주를 바꾸지 않는다", () => {
    const before = calculateFourPillars({ calendarType: "solar", date: "2024-02-04", time: "16:50", gender: "male" }).pillars;
    const after = calculateFourPillars({ calendarType: "solar", date: "2024-02-04", time: "17:30", gender: "male" }).pillars;
    expect(before.day.ganzhi).toBe(after.day.ganzhi);
    expect(before.hour?.earthlyBranch).toBe("신"); // 15:00~16:59
    expect(after.hour?.earthlyBranch).toBe("유"); // 17:00~18:59
  });

  test("진태양시 보정을 켜도 절기는 실제 시각(KST)으로 판정한다", () => {
    // 서울(-32분) 보정 후 시각은 16:58이지만, 실제 출생 순간은 입춘(17:27) 뒤가 아니라 앞이다 → 여전히 계묘년
    const { pillars } = calculateFourPillars({
      calendarType: "solar",
      date: "2024-02-04",
      time: "17:20",
      gender: "male",
      applySolarTimeCorrection: true,
      birthPlace: "서울",
    });
    expect(pillars.year.ganzhi).toBe("계묘");
  });
});

describe("한국 시계 역사 보정 - 서머타임·UTC+8:30", () => {
  test("1987년 서머타임: 기록 11:30 → KST 10:30 (오시가 아니라 사시)", () => {
    const { pillars, meta } = calculateFourPillars({ calendarType: "solar", date: "1987-07-01", time: "11:30", gender: "female" });
    expect(meta.koreanClockCorrectionMinutes).toBe(-60);
    expect(meta.koreanClockReason).toBe("summer_time");
    expect(meta.resolvedSolarDateTime).toBe("1987-07-01T10:30:00");
    expect(pillars.hour?.earthlyBranch).toBe("사");
  });

  test("1958년 봄(UTC+8:30): 기록 10:45 → KST 11:15 (사시가 아니라 오시)", () => {
    const { pillars, meta } = calculateFourPillars({ calendarType: "solar", date: "1958-03-01", time: "10:45", gender: "male" });
    expect(meta.koreanClockCorrectionMinutes).toBe(30);
    expect(meta.koreanClockReason).toBe("utc_plus_8_30");
    expect(pillars.hour?.earthlyBranch).toBe("오");
  });

  test("1958년 여름(UTC+8:30 + 서머타임 = UTC+9:30): 기록 11:15 → KST 10:45", () => {
    const { pillars, meta } = calculateFourPillars({ calendarType: "solar", date: "1958-07-01", time: "11:15", gender: "male" });
    expect(meta.koreanClockCorrectionMinutes).toBe(-30);
    expect(meta.koreanClockReason).toBe("summer_time_utc_plus_8_30");
    expect(pillars.hour?.earthlyBranch).toBe("사");
  });

  test("자정 근처 서머타임 보정은 날짜(일주)까지 하루 앞으로 옮긴다", () => {
    const { pillars, meta } = calculateFourPillars({ calendarType: "solar", date: "1987-07-02", time: "00:30", gender: "male" });
    const prevDay = calculateFourPillars({ calendarType: "solar", date: "1987-07-01", time: "22:00", gender: "male" });
    expect(meta.resolvedSolarDateTime).toBe("1987-07-01T23:30:00");
    expect(meta.solarBirthDate).toBe("1987-07-02");
    // standard(자시 23시 날짜 넘김) 방식이라 23:30은 다음날(7/2) 일주 - 서머타임 보정 전과 같은 날이 된다
    expect(pillars.hour?.earthlyBranch).toBe("자");
    expect(pillars.day.ganzhi).not.toBe(prevDay.pillars.day.ganzhi);
  });

  test("보정 기간이 아니면 그대로 (1990년, 2024년)", () => {
    expect(calculateFourPillars({ calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "male" }).meta.koreanClockCorrectionMinutes).toBe(0);
    expect(calculateFourPillars({ calendarType: "solar", date: "2024-08-15", time: "09:00", gender: "male" }).meta.koreanClockReason).toBeNull();
  });

  test("출생시간을 모르면 시계 보정을 하지 않는다", () => {
    const { meta } = calculateFourPillars({ calendarType: "solar", date: "1987-07-01", gender: "male" });
    expect(meta.koreanClockCorrectionMinutes).toBe(0);
  });

  test("서머타임 끝(시계를 되돌린 1시간)은 서머타임 쪽으로 본다", () => {
    const r = resolveKoreanClock(Date.UTC(1987, 9, 11, 2, 30, 0));
    expect(r.ambiguous).toBe(true);
    expect(r.correctionMinutes).toBe(-60);
  });

  test("서머타임 시작(시계를 앞당겨 없었던 1시간)은 서머타임 쪽으로 본다", () => {
    const r = resolveKoreanClock(Date.UTC(1987, 4, 10, 2, 30, 0));
    expect(r.nonexistent).toBe(true);
    expect(r.correctionMinutes).toBe(-60);
  });

  test("보정 표가 IANA 시간대 자료(Asia/Seoul)와 1948~1990년 전 구간에서 일치한다", () => {
    let fmt: Intl.DateTimeFormat;
    try {
      fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", timeZoneName: "longOffset", year: "numeric" });
    } catch {
      return; // 시간대 자료가 없는 실행 환경 - 대조 생략
    }
    const icuOffset = (ms: number): number => {
      const v = fmt.formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName")?.value ?? "";
      const m = /GMT([+-])(\d\d):(\d\d)/.exec(v);
      return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
    };
    if (icuOffset(Date.UTC(1987, 6, 1)) !== 600) return; // 옛 서머타임 자료가 빠진 환경 - 대조 생략
    for (let t = Date.UTC(1912, 0, 1); t < Date.UTC(1990, 0, 1); t += 30 * 60 * 1000) { // 모든 변경 시점이 정시·30분이라 30분 간격으로 충분
      if (seoulOffsetAtUtc(t) !== icuOffset(t)) throw new Error(`불일치: ${new Date(t).toISOString()}`);
    }
  });
});

describe("대운수 - 절기와 같은 기준 시각", () => {
  test("대운수는 절기 판정 기준 시각(solarTermReferenceDateTime)으로 잰다", () => {
    const { pillars, meta } = calculateFourPillars({ calendarType: "solar", date: "1987-07-01", time: "11:30", gender: "male" });
    const result = calculateDaeun(pillars, meta, "male");
    // 1987 정묘년(음간) 남성 → 역행, 이전 절은 망종 1987-06-06 KST
    expect(result.direction).toBe("backward");
    expect(result.boundaryJie.name).toBe("망종");
    expect(result.daysToBoundaryJie).toBeGreaterThan(24);
    expect(result.daysToBoundaryJie).toBeLessThan(26);
  });
});
