"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFortune = calculateFortune;
const kstDate_1 = require("../kstDate");
const dailyGanzhi_1 = require("./dailyGanzhi");
const fortuneRelations_1 = require("./fortuneRelations");
/**
 * @param saju 이미 계산된 사용자 Saju JSON (calculateSaju()의 결과를 그대로 전달 - 재계산하지 않음)
 * @param targetDate YYYY-MM-DD (KST 기준). 생략 시 "지금"의 KST 기준 오늘 날짜를 사용한다.
 *   이 KST 변환은 이 프로젝트에 없던 처리를 이번에 명시적으로 추가한 것이다
 *   (지시서 5조 - kstDate.ts 참고).
 */
function calculateFortune(saju, targetDate) {
    const resolvedDate = targetDate ?? (0, kstDate_1.getTodayKstDateString)();
    (0, kstDate_1.assertValidDateString)(resolvedDate);
    const dayGanzhi = (0, dailyGanzhi_1.calculateDailyGanzhi)(resolvedDate);
    const relationToday = (0, fortuneRelations_1.calculateFortuneRelations)(saju.pillars, dayGanzhi);
    return {
        date: resolvedDate,
        dayGanzhi,
        relationToday,
        calculationMeta: {
            timezone: "Asia/Seoul",
            resolvedDate,
        },
    };
}
