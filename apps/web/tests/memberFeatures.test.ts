import { calculateSaju } from "saju-engine";
import { neededEnergy, ENERGY_GUIDE } from "@/lib/neededEnergy";
import { ELEMENTS } from "@/lib/manseView";
import { safeNext } from "@/lib/safeNext";
import { parseProfileInput } from "@/server/auth/profiles";
import { readConsent } from "@/server/auth/authHandlers";
import { profileSummary } from "@/lib/profileView";

describe("수정안 1: 나에게 필요한 기운", () => {
  it("비어 있는 오행이 있으면 엔진의 lacking을 그대로 쓴다", () => {
    const saju = calculateSaju({ calendarType: "solar", date: "1967-04-03", time: "04:50", gender: "male" }, 2026);
    const need = neededEnergy(saju);
    const lacking = saju.elements.summary.lacking as string[];
    if (lacking.length > 0) {
      expect(need.reason).toBe("lacking");
      expect(need.elements).toEqual(lacking);
    } else {
      expect(need.reason).toBe("weakest");
      expect(need.elements).toHaveLength(1);
    }
  });

  it("비어 있는 오행이 없으면 점수가 가장 낮은 오행 하나", () => {
    for (const date of ["1990-01-15", "1985-07-21", "2001-11-02", "1975-03-30", "1960-09-09"]) {
      const saju = calculateSaju({ calendarType: "solar", date, time: "12:00", gender: "female" }, 2026);
      const need = neededEnergy(saju);
      if (need.reason === "weakest") {
        const counts = saju.elements.summary.counts as Record<string, number>;
        const min = Math.min(...ELEMENTS.map((e) => counts[e]));
        expect(counts[need.elements[0]]).toBe(min);
        expect(min).toBeGreaterThan(0);
      }
      for (const el of need.elements) expect(ENERGY_GUIDE[el]).toBeDefined();
    }
  });

  it("다섯 오행 모두 색·방위·숫자 표가 있다", () => {
    for (const el of ELEMENTS) {
      expect(ENERGY_GUIDE[el].colors.length).toBeGreaterThan(0);
      expect(ENERGY_GUIDE[el].direction).toBeTruthy();
      expect(ENERGY_GUIDE[el].numbers).toMatch(/\d/);
    }
  });
});

describe("수정안 2: 윤달", () => {
  it("윤달 여부에 따라 다른 날짜로 계산된다 (1987년 윤6월)", () => {
    const normal = calculateSaju({ calendarType: "lunar", date: "1987-06-10", time: "12:00", gender: "male" }, 2026);
    const leap = calculateSaju({ calendarType: "lunar", date: "1987-06-10", time: "12:00", gender: "male", isLeapMonth: true }, 2026);
    expect(leap.pillars.day.heavenlyStem + leap.pillars.day.earthlyBranch).not.toBe(
      normal.pillars.day.heavenlyStem + normal.pillars.day.earthlyBranch
    );
  });
});

describe("수정안 3: 로그인·동의·저장", () => {
  it("next 주소는 사이트 안 경로만 허용", () => {
    expect(safeNext("/start?next=fortune")).toBe("/start?next=fortune");
    expect(safeNext("//evil.com")).toBeNull();
    expect(safeNext("https://evil.com")).toBeNull();
    expect(safeNext("/\\evil.com")).toBeNull();
    expect(safeNext(null)).toBeNull();
  });

  it("필수 동의 3개가 모두 있어야 통과, 마케팅은 선택", () => {
    expect(readConsent({ agreeTerms: true, agreePrivacy: true, agreeAge: true })).toEqual({ marketing: false });
    expect(readConsent({ agreeTerms: true, agreePrivacy: true, agreeAge: true, agreeMarketing: true })).toEqual({ marketing: true });
    expect(readConsent({ agreeTerms: true, agreePrivacy: true })).toBeNull();
    expect(readConsent({ agreeTerms: true, agreePrivacy: "true", agreeAge: true })).toBeNull();
  });

  it("저장할 사람 정보 형식 검증", () => {
    const ok = parseProfileInput({ name: "유샘", gender: "male", calendarType: "lunar", isLeapMonth: true, date: "1967-02-24", time: "04:50" });
    expect(ok).toEqual({
      name: "유샘",
      hanjaName: null,
      gender: "male",
      calendarType: "lunar",
      isLeapMonth: true,
      date: "1967-02-24",
      time: "04:50",
      birthCity: null,
    });
    // 양력이면 윤달 값은 무시
    expect(parseProfileInput({ name: "a", gender: "female", calendarType: "solar", isLeapMonth: true, date: "2000-01-01" })?.isLeapMonth).toBe(false);
    expect(parseProfileInput({ name: "<b>", gender: "male", calendarType: "solar", date: "2000-01-01" })).toBeNull();
    expect(parseProfileInput({ name: "a", gender: "x", calendarType: "solar", date: "2000-01-01" })).toBeNull();
    expect(parseProfileInput({ name: "a", gender: "male", calendarType: "solar", date: "2000/01/01" })).toBeNull();
  });

  it("드롭다운 요약 문구", () => {
    expect(profileSummary({ date: "1967-04-03", time: "04:50", calendarType: "solar", isLeapMonth: false })).toBe("1967.4.3 04:50 양력");
    expect(profileSummary({ date: "1987-06-10", time: null, calendarType: "lunar", isLeapMonth: true })).toBe("1987.6.10 시간 모름 음력(윤달)");
  });
});
