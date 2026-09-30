import { calculateSaju } from "../src/index";

describe("기본 사주 계산 - 정상 케이스", () => {
  test("양력 생일시 입력 시 4기둥이 모두 계산된다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "14:30",
      gender: "female",
    }, 2024);

    expect(result.pillars.year.ganzhi).toBe("경오");
    expect(result.pillars.month.ganzhi).toBe("신사");
    expect(result.pillars.day.ganzhi).toBe("을유");
    expect(result.pillars.hour).not.toBeNull();
    expect(result.calculationMeta.hourPillarSkipped).toBe(false);
  });

  test("출생시간 미입력 시 hour는 null이고 hourPillarSkipped가 true다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      gender: "male",
    }, 2024);

    expect(result.pillars.hour).toBeNull();
    expect(result.calculationMeta.hourPillarSkipped).toBe(true);
    // 시간 미입력이어도 연/월/일주는 정상 계산되어야 한다
    expect(result.pillars.year.ganzhi).toBe("경오");
    expect(result.pillars.day.ganzhi).toBe("을유");
  });

  test("표준 출력 JSON에 birthPlace가 포함되지 않는다 (개인정보 최소화)", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "14:30",
      gender: "female",
      birthPlace: "서울",
    }, 2024);

    expect((result.birth as any).birthPlace).toBeUndefined();
  });
});

describe("경계값 테스트 - 자시(子時) 처리", () => {
  test("standard 방식: 23시 출생은 일주가 다음날로 넘어간다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "23:30",
      gender: "male",
      ziHourMethod: "standard",
    }, 2024);
    // 5/21의 일주(丙戌 -> 병술)로 넘어가야 함
    expect(result.pillars.day.ganzhi).toBe("병술");
    expect(result.pillars.hour?.earthlyBranch).toBe("자");
  });

  test("yaja_joja_split 방식: 23시 출생은 그날(당일) 일주를 유지한다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "23:30",
      gender: "male",
      ziHourMethod: "yaja_joja_split",
    }, 2024);
    // 5/20의 일주(乙酉 -> 을유)를 유지해야 함
    expect(result.pillars.day.ganzhi).toBe("을유");
    expect(result.pillars.hour?.earthlyBranch).toBe("자");
  });

  test("00시대(조자시) 출생은 두 방식 모두 당일 날짜의 일주를 사용한다", () => {
    const standard = calculateSaju({
      calendarType: "solar",
      date: "1990-05-21",
      time: "00:30",
      gender: "male",
      ziHourMethod: "standard",
    }, 2024);
    const split = calculateSaju({
      calendarType: "solar",
      date: "1990-05-21",
      time: "00:30",
      gender: "male",
      ziHourMethod: "yaja_joja_split",
    }, 2024);
    expect(standard.pillars.day.ganzhi).toBe("병술");
    expect(split.pillars.day.ganzhi).toBe("병술");
    expect(standard.pillars.hour?.earthlyBranch).toBe("자");
  });

  test("자시가 연도 경계에 걸쳐도(12/31 23시) 정상적으로 다음 해로 넘어간다 (standard)", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1999-12-31",
      time: "23:10",
      gender: "female",
      ziHourMethod: "standard",
    }, 2024);
    // 2000-01-01로 날짜가 넘어가야 하므로 연주가 바뀔 수 있음 - 정확한 값은
    // 절입일(입춘) 기준이므로 연주 자체가 반드시 바뀐다고 단정하지 않고,
    // 최소한 에러 없이 계산되는지와 시지가 자(子)인지만 검증한다.
    expect(result.pillars.hour?.earthlyBranch).toBe("자");
    expect(result.pillars.year.ganzhi).toHaveLength(2);
  });
});

describe("경계값 테스트 - 시주(時柱) 2시간 경계", () => {
  test("12:59는 오시(午), 13:01은 미시(未)로 갈린다", () => {
    const before = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "12:59",
      gender: "male",
    }, 2024);
    const after = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "13:01",
      gender: "male",
    }, 2024);
    expect(before.pillars.hour?.earthlyBranch).toBe("오");
    expect(after.pillars.hour?.earthlyBranch).toBe("미");
  });
});

describe("경계값 테스트 - 태양시 보정", () => {
  test("서울 출생 + 보정 적용 시, 표준시 대비 약 -32분 보정되어 시주가 바뀔 수 있는 경계 케이스", () => {
    // 13:00 표준시 입력 시 서울 보정(-32분)을 적용하면 12:28경이 되어
    // 미시(未)가 아닌 오시(午)로 바뀌어야 한다.
    const withoutCorrection = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "13:00",
      gender: "female",
      applySolarTimeCorrection: false,
    }, 2024);
    const withCorrection = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "13:00",
      gender: "female",
      applySolarTimeCorrection: true,
      birthPlace: "서울",
    }, 2024);

    expect(withoutCorrection.pillars.hour?.earthlyBranch).toBe("미");
    expect(withCorrection.pillars.hour?.earthlyBranch).toBe("오");
    expect(withCorrection.calculationMeta.solarTimeCorrectionApplied).toBe(true);
    expect(withCorrection.calculationMeta.solarTimeCorrectionMinutes).toBeLessThan(0);
  });

  test("보정 요청했지만 출생지 정보가 전혀 없으면 보정이 적용되지 않은 것으로 명시된다", () => {
    const result = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "13:00",
      gender: "female",
      applySolarTimeCorrection: true,
      // birthPlace, longitude 둘 다 없음
    }, 2024);
    expect(result.calculationMeta.solarTimeCorrectionApplied).toBe(false);
    expect(result.calculationMeta.solarTimeCorrectionMinutes).toBeNull();
  });
});

describe("경계값 테스트 - 음력/양력 변환 및 윤달", () => {
  test("음력 입력이 양력으로 정상 변환되어 계산된다", () => {
    // 1990-05-20 양력은 1990년 음력 4월 26일에 해당 (사전 확인된 변환값)
    const solarResult = calculateSaju({
      calendarType: "solar",
      date: "1990-05-20",
      time: "14:30",
      gender: "female",
    }, 2024);
    const lunarResult = calculateSaju({
      calendarType: "lunar",
      date: "1990-04-26",
      time: "14:30",
      gender: "female",
      isLeapMonth: false,
    }, 2024);
    expect(lunarResult.pillars.year.ganzhi).toBe(solarResult.pillars.year.ganzhi);
    expect(lunarResult.pillars.month.ganzhi).toBe(solarResult.pillars.month.ganzhi);
    expect(lunarResult.pillars.day.ganzhi).toBe(solarResult.pillars.day.ganzhi);
  });

  test("윤달 플래그(isLeapMonth)가 있는 입력도 에러 없이 계산된다", () => {
    // 1990년은 음력 5월에 윤달이 있었음 (윤5월)
    expect(() =>
      calculateSaju({
        calendarType: "lunar",
        date: "1990-05-15",
        time: "10:00",
        gender: "male",
        isLeapMonth: true,
      }, 2024)
    ).not.toThrow();
  });

  test("[회귀 테스트] 음력 입력 + 태양시 보정으로 자정을 넘어 전날로 이동해도 순수 양력 경로와 일치한다", () => {
    // 과거 버전 버그: 음력 입력의 연/월/일 숫자에 그레고리력 날짜 산술(addMinutes)을 직접 적용해서
    // 보정으로 날짜가 바뀌는 경우 잘못된 날짜가 나올 수 있었다.
    // 현재 버전: 음력 -> 양력 변환을 먼저 끝낸 뒤에만 날짜 산술을 하도록 구조를 통합했다.
    const lunarPath = calculateSaju({
      calendarType: "lunar",
      date: "1990-04-26", // 양력 1990-05-20에 해당
      time: "00:10",
      gender: "female",
      applySolarTimeCorrection: true,
      birthPlace: "서울", // -32분 보정 -> 1990-05-19 23:38로 이동
    }, 2024);
    const solarEquivalentPath = calculateSaju({
      calendarType: "solar",
      date: "1990-05-19",
      time: "23:38",
      gender: "female",
    }, 2024);

    expect(lunarPath.pillars.day.ganzhi).toBe(solarEquivalentPath.pillars.day.ganzhi);
    expect(lunarPath.pillars.hour?.ganzhi).toBe(solarEquivalentPath.pillars.hour?.ganzhi);
    // sect1(standard) 기본값이므로 23:38(23시대)은 다음날(5/20)의 일주로 넘어가야 함
    expect(lunarPath.pillars.day.ganzhi).toBe("을유");
  });
});

describe("경계값 테스트 - 절기(월주) 경계", () => {
  test("입춘 전후로 연주/월주가 달라질 수 있는 케이스가 에러 없이 처리된다", () => {
    // 입춘은 대략 2/4 전후. 2/3과 2/5를 비교해 월주가 달라지는지 확인만 하고
    // 정확한 절입 시각 자체는 라이브러리 계산값을 신뢰한다(자체 재계산하지 않음).
    const before = calculateSaju({
      calendarType: "solar",
      date: "2024-02-03",
      time: "10:00",
      gender: "male",
    }, 2024);
    const after = calculateSaju({
      calendarType: "solar",
      date: "2024-02-05",
      time: "10:00",
      gender: "male",
    }, 2024);
    expect(before.pillars.month.ganzhi).not.toBe(after.pillars.month.ganzhi);
  });
});
