import { calculateSaju } from "../../src/index";
import { buildSajuPrompt } from "../../src/prompts/promptBuilder";

describe("buildSajuPrompt - Phase 3: 전체 계산 데이터를 프롬프트에 포함", () => {
  const saju = calculateSaju(
    { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
    2025
  );

  test("사주 원국 8글자를 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain(saju.pillars.year.ganzhi);
    expect(user).toContain(saju.pillars.month.ganzhi);
    expect(user).toContain(saju.pillars.day.ganzhi);
  });

  test("엔진이 계산한 오행 우세/부족 값을 포함한다 (AI가 재계산하지 않도록)", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain(`우세 오행(dominant): ${saju.elements.summary.dominant}`);
  });

  test("엔진이 계산한 일간(십신 기준점)을 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain(`일간(day master): ${saju.tenGods.dayMaster.stem}`);
  });

  test("12운성 데이터를 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain("12운성");
    const dayStage = saju.twelveStages.stages.day;
    expect(user).toContain(String(dayStage));
  });

  test("세운 데이터를 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain(`세운 간지: ${saju.seun.pillar.ganzhi}`);
    expect(user).toContain(`일간 대비 세운 십신: ${saju.seun.tenGod}`);
  });

  test("대운 데이터를 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain("대운(大運)");
    expect(user).toContain(saju.daeun.direction === "forward" ? "순행" : "역행");
  });

  test("대운 목록 전체를 포함하고, 근사 나이로 '현재 대운'을 임의로 골라내지 않는다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    // 엔진이 계산한 대운 구간 각각이 전부 프롬프트에 그대로 등장해야 한다.
    for (const period of saju.daeun.periods) {
      expect(user).toContain(period.pillar.ganzhi);
    }
    // 이전 버전에 있던 "만 나이 근사" 문구가 더 이상 등장하지 않아야 한다
    // (AI Interpretation Layer가 대운을 임의로 추정/선택하지 않는다는 원칙).
    expect(user).not.toContain("만 나이 약");
    expect(user).not.toContain("참고 대운");
  });

  test("지장간(支藏干) 데이터를 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(user).toContain("지장간");
    const dayHiddenStems = saju.elements.hiddenStems.day!;
    for (const h of dayHiddenStems) {
      expect(user).toContain(h.stem);
    }
  });

  test("지장간 각각의 십신 정보를 포함한다", () => {
    const { user } = buildSajuPrompt(saju, "FREE_BASIC");
    const dayBranchTenGods = saju.tenGods.earthlyBranches.day!.hiddenStemTenGods;
    for (const h of dayBranchTenGods) {
      expect(user).toContain(h.tenGod);
    }
  });

  test("system 프롬프트는 AI에게 재계산을 명시적으로 금지한다", () => {
    const { system } = buildSajuPrompt(saju, "FREE_BASIC");
    expect(system).toContain("재계산");
    expect(system).toContain("오행");
    expect(system).toContain("십신");
    expect(system).toContain("대운");
    expect(system).toContain("세운");
  });

  test("출생시간이 없으면 시주 관련 경고 문구가 포함된다", () => {
    const noHourSaju = calculateSaju(
      { calendarType: "solar", date: "1990-05-20", gender: "female" },
      2025
    );
    const { user } = buildSajuPrompt(noHourSaju, "FREE_BASIC");
    expect(user).toContain("추측하지 말고");
  });

  test("존재하지 않는 상품 유형이면 에러를 던진다", () => {
    expect(() => buildSajuPrompt(saju, "NOT_A_REAL_PRODUCT" as never)).toThrow();
  });

  test("상품 유형에 따라 user 프롬프트의 요청 상품명이 달라진다", () => {
    const free = buildSajuPrompt(saju, "FREE_BASIC");
    const premium = buildSajuPrompt(saju, "PREMIUM_9900");
    expect(free.user).toContain("무료 기본 사주 분석");
    expect(premium.user).toContain("종합 사주 프리미엄 리포트");
  });
});
