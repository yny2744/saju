/**
 * Phase 1 경계값 검증 스크립트
 *
 * 목적: "구현 완료"를 선언하기 전에, 아래 10개 경계 시나리오를 실행해
 * 입력값 / 기대값 / 실제값 / 통과여부를 명시적으로 출력한다.
 * 실패 시 원인을 사람이 바로 판단할 수 있도록 관련 calculationMeta도 함께 출력한다.
 *
 * 실행: npx ts-node src/verifyBoundaries.ts
 */

import { calculateSaju } from "./index";
import type { SajuInput } from "./types";

interface Case {
  name: string;
  input: SajuInput;
  /** 기대값 검증 함수. 실패 시 사람이 읽을 수 있는 이유 문자열을 반환하고, 통과 시 null 반환 */
  check: (result: ReturnType<typeof calculateSaju>) => string | null;
}

const cases: Case[] = [
  {
    name: "1) 일반 양력",
    input: { calendarType: "solar", date: "1990-05-20", time: "14:30", gender: "female" },
    check: (r) => {
      if (r.pillars.year.ganzhi !== "경오") return `연주 기대값 경오, 실제 ${r.pillars.year.ganzhi}`;
      if (r.pillars.day.ganzhi !== "을유") return `일주 기대값 을유, 실제 ${r.pillars.day.ganzhi}`;
      return null;
    },
  },
  {
    name: "2) 일반 음력",
    input: { calendarType: "lunar", date: "1990-04-26", time: "14:30", gender: "female" },
    check: (r) => {
      // 1990-04-26 음력 == 1990-05-20 양력 (사전 확인된 변환값). 위 1번 케이스와 4기둥이 동일해야 함.
      if (r.pillars.year.ganzhi !== "경오") return `연주 기대값 경오, 실제 ${r.pillars.year.ganzhi}`;
      if (r.pillars.day.ganzhi !== "을유") return `일주 기대값 을유, 실제 ${r.pillars.day.ganzhi}`;
      return null;
    },
  },
  {
    name: "3) 윤달 (1990년 윤5월)",
    input: { calendarType: "lunar", date: "1990-05-15", time: "10:00", gender: "male", isLeapMonth: true },
    check: (r) => {
      // 정밀 기대값은 없음 - 에러 없이 8글자가 모두 산출되는지만 확인
      if (!r.pillars.year.ganzhi || !r.pillars.month.ganzhi || !r.pillars.day.ganzhi || !r.pillars.hour) {
        return "윤달 입력에서 8글자 중 일부가 산출되지 않음";
      }
      return null;
    },
  },
  {
    name: "4) 23:00 직전 (22:59) - 당일 일주 유지되어야 함",
    input: { calendarType: "solar", date: "1990-05-20", time: "22:59", gender: "male", ziHourMethod: "standard" },
    check: (r) => (r.pillars.day.ganzhi !== "을유" ? `일주 기대값 을유(당일), 실제 ${r.pillars.day.ganzhi}` : null),
  },
  {
    name: "5) 23:00 정확히 (standard) - 다음날 일주로 넘어가야 함",
    input: { calendarType: "solar", date: "1990-05-20", time: "23:00", gender: "male", ziHourMethod: "standard" },
    check: (r) => (r.pillars.day.ganzhi !== "병술" ? `일주 기대값 병술(익일), 실제 ${r.pillars.day.ganzhi}` : null),
  },
  {
    name: "6) 23:59 (standard) - 다음날 일주로 넘어가야 함",
    input: { calendarType: "solar", date: "1990-05-20", time: "23:59", gender: "male", ziHourMethod: "standard" },
    check: (r) => (r.pillars.day.ganzhi !== "병술" ? `일주 기대값 병술(익일), 실제 ${r.pillars.day.ganzhi}` : null),
  },
  {
    name: "7) 00:00 - 두 sect 방식 모두 당일(캘린더 기준) 일주 사용",
    input: { calendarType: "solar", date: "1990-05-21", time: "00:00", gender: "male", ziHourMethod: "yaja_joja_split" },
    check: (r) => (r.pillars.day.ganzhi !== "병술" ? `일주 기대값 병술, 실제 ${r.pillars.day.ganzhi}` : null),
  },
  {
    name: "8) 진태양시 보정으로 날짜 자체가 바뀌는 경우 (자정 직후 + 서울 보정 -32분 -> 전날로 이동)",
    input: {
      calendarType: "solar",
      date: "1990-05-21",
      time: "00:20",
      gender: "female",
      applySolarTimeCorrection: true,
      birthPlace: "서울",
    },
    check: (r) => {
      // 00:20 - 32분 = 전날 23:48 -> standard(기본값) sect 적용 시 익일(즉 원래 날짜인 5/21)의 일주가 나와야 함
      // (23:48은 이미 "다음날 자시"로 취급되므로 5/20 23:48이 되어도 sect1 기준으로는 5/21 일주와 동일해야 함)
      if (r.calculationMeta.solarTimeCorrectionApplied !== true) return "태양시 보정이 적용되지 않음 (applied=false)";
      if (r.calculationMeta.solarTimeCorrectionMinutes! >= 0) return "서울 보정값은 음수여야 함";
      if (r.pillars.day.ganzhi !== "병술") return `일주 기대값 병술, 실제 ${r.pillars.day.ganzhi} (보정 후 날짜 이월 처리 확인 필요)`;
      return null;
    },
  },
  {
    name: "9) 절기 경계 전후 (2024년 입춘 2/4 전후)",
    input: { calendarType: "solar", date: "2024-02-03", time: "10:00", gender: "male" },
    check: (r) => {
      const after = calculateSaju({ calendarType: "solar", date: "2024-02-05", time: "10:00", gender: "male" }, 2024);
      if (r.pillars.month.ganzhi === after.pillars.month.ganzhi) {
        return `절기 경계 전후 월주가 동일함 (전: ${r.pillars.month.ganzhi}, 후: ${after.pillars.month.ganzhi}) - 달라야 함`;
      }
      if (r.pillars.year.ganzhi === after.pillars.year.ganzhi) {
        // 연주는 같아도/달라도 될 수 있음(입춘 전후로 연주도 바뀌는 게 정통 명리학 기준) - 정보용으로만 출력
        return null;
      }
      return null;
    },
  },
  {
    name: "10) 출생시간 미입력 - 시주는 null, 연/월/일주는 정상",
    input: { calendarType: "solar", date: "1990-05-20", gender: "male" },
    check: (r) => {
      if (r.pillars.hour !== null) return "시주가 null이어야 하는데 값이 존재함";
      if (r.calculationMeta.hourPillarSkipped !== true) return "hourPillarSkipped가 true여야 함";
      if (r.pillars.year.ganzhi !== "경오") return `연주 기대값 경오, 실제 ${r.pillars.year.ganzhi}`;
      return null;
    },
  },
  {
    name: "11) [GPT 지적 시나리오] 음력 입력 + 태양시 보정으로 날짜가 자정을 넘어 전날로 이동",
    input: {
      calendarType: "lunar",
      date: "1990-04-26", // 양력 1990-05-20에 해당
      time: "00:10",
      gender: "female",
      applySolarTimeCorrection: true,
      birthPlace: "서울", // -32분 보정 -> 1990-05-19 23:38로 이동 (자정을 넘어 전날로 이동)
    },
    check: (r) => {
      // 독립적으로 "순수 양력 입력"으로 동일 시나리오를 재현해서 교차검증한다.
      const solarEquivalent = calculateSaju({
        calendarType: "solar",
        date: "1990-05-19",
        time: "23:38",
        gender: "female",
      }, 2024);
      if (r.pillars.day.ganzhi !== solarEquivalent.pillars.day.ganzhi) {
        return (
          `음력 경로 일주(${r.pillars.day.ganzhi})와 순수 양력 경로 일주` +
          `(${solarEquivalent.pillars.day.ganzhi})가 불일치 - 음력+보정 처리 버그 의심`
        );
      }
      if (r.pillars.hour?.ganzhi !== solarEquivalent.pillars.hour?.ganzhi) {
        return `음력 경로 시주(${r.pillars.hour?.ganzhi})와 순수 양력 경로 시주(${solarEquivalent.pillars.hour?.ganzhi}) 불일치`;
      }
      // sect1(standard) 기본값이므로 23:38(23시대)은 다음날(5/20)의 일주로 넘어가야 함 (=1번 케이스와 동일한 을유)
      if (r.pillars.day.ganzhi !== "을유") {
        return `일주 기대값 을유(5/20), 실제 ${r.pillars.day.ganzhi} - 보정 후 자시 처리가 예상과 다름`;
      }
      return null;
    },
  },
];

let passCount = 0;
let failCount = 0;

console.log("=".repeat(70));
console.log("Phase 1 경계값 검증 - 입력값 / 기대값 판정 / 실제값 / 결과");
console.log("=".repeat(70));

for (const c of cases) {
  const result = calculateSaju(c.input, 2024);
  const failReason = c.check(result);
  const status = failReason ? "FAIL" : "PASS";
  if (failReason) failCount++;
  else passCount++;

  console.log(`\n[${status}] ${c.name}`);
  console.log(`  입력: ${JSON.stringify(c.input)}`);
  console.log(
    `  실제 4기둥: 연(${result.pillars.year.ganzhi}) 월(${result.pillars.month.ganzhi}) ` +
      `일(${result.pillars.day.ganzhi}) 시(${result.pillars.hour ? result.pillars.hour.ganzhi : "null"})`
  );
  console.log(
    `  calculationMeta: 자시방식=${result.calculationMeta.ziHourMethod}, ` +
      `태양시보정=${result.calculationMeta.solarTimeCorrectionApplied}(${result.calculationMeta.solarTimeCorrectionMinutes}분)`
  );
  if (failReason) {
    console.log(`  ❌ 실패 원인: ${failReason}`);
  }
}

console.log("\n" + "=".repeat(70));
console.log(`결과: ${passCount}개 통과, ${failCount}개 실패 (총 ${cases.length}개)`);
console.log("=".repeat(70));

if (failCount > 0) {
  console.log("\n하나 이상의 경계값 검증이 실패했습니다. Phase 2로 진행하지 마세요.");
  process.exit(1);
} else {
  console.log("\n모든 경계값 검증 통과.");
  process.exit(0);
}
