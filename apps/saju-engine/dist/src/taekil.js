"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZHI_XING = exports.TAEKIL_PURPOSES = void 0;
exports.judgeDay = judgeDay;
exports.recommendDays = recommendDays;
const lunar_javascript_1 = require("lunar-javascript");
const dailyGanzhi_1 = require("./fortune/dailyGanzhi");
const fiveElementTables_1 = require("./rules/fiveElementTables");
exports.TAEKIL_PURPOSES = {
    move: { name: "이사", verb: "이사하기", yi: ["移徙", "入宅"], good: ["成", "开", "定", "除"] },
    wedding: { name: "결혼", verb: "결혼하기", yi: ["嫁娶"], good: ["成", "开", "定", "满"] },
    opening: { name: "개업", verb: "개업하기", yi: ["开市"], good: ["开", "成", "满", "定"] },
    contract: { name: "계약", verb: "계약하기", yi: ["立券", "交易"], good: ["定", "成", "执", "开"] },
};
/** 건제12신 간체 → [한글, 한자(번체)] */
exports.ZHI_XING = {
    建: ["건", "建"], 除: ["제", "除"], 满: ["만", "滿"], 平: ["평", "平"], 定: ["정", "定"], 执: ["집", "執"],
    破: ["파", "破"], 危: ["위", "危"], 成: ["성", "成"], 收: ["수", "收"], 开: ["개", "開"], 闭: ["폐", "閉"],
};
const CLASH = { 자: "오", 오: "자", 축: "미", 미: "축", 인: "신", 신: "인", 묘: "유", 유: "묘", 진: "술", 술: "진", 사: "해", 해: "사" };
const BAD_ZHI_XING = new Set(["破", "闭"]);
const ELEMENT_LABEL = { 목: "나무(木)", 화: "불(火)", 토: "흙(土)", 금: "쇠(金)", 수: "물(水)" };
const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
const pad = (n) => String(n).padStart(2, "0");
/** 하루 판정 - 빠지면 null */
function judgeDay(input, date) {
    if (date <= input.after)
        return null;
    const [y, m, d] = date.split("-").map(Number);
    const lunar = lunar_javascript_1.Solar.fromYmd(y, m, d).getLunar();
    const g = (0, dailyGanzhi_1.calculateDailyGanzhi)(date);
    const p = exports.TAEKIL_PURPOSES[input.purpose];
    const zx = lunar.getZhiXing();
    const lunarDay = lunar.getDay();
    const sonEopta = lunarDay % 10 === 9 || lunarDay % 10 === 0;
    const yi = lunar.getDayYi();
    const ji = lunar.getDayJi();
    if (CLASH[input.yearBranch] === g.branch)
        return null;
    if (CLASH[input.dayBranch] === g.branch)
        return null;
    if (p.yi.some((w) => ji.includes(w)))
        return null;
    if (BAD_ZHI_XING.has(zx))
        return null;
    if (input.purpose === "move" && !sonEopta)
        return null;
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const parts = [];
    let score = 0;
    if (input.purpose === "move" || sonEopta) {
        if (input.purpose !== "move")
            score += 1;
        parts.push({ mid: "손 없는 날이며", end: "손 없는 날이에요" });
    }
    if (p.yi.some((w) => yi.includes(w))) {
        score += 3;
        parts.push({ mid: `황력에 ${p.verb} 좋은 날로 나오며`, end: `황력에 ${p.verb} 좋은 날로 나와요` });
    }
    const zxName = exports.ZHI_XING[zx] ?? [zx, zx];
    if (p.good.includes(zx)) {
        score += 2;
        parts.push({ mid: `건제 ${zxName[0]}(${zxName[1]})일이라 ${p.name}에 맞고`, end: `건제 ${zxName[0]}(${zxName[1]})일이라 ${p.name}에 맞아요` });
    }
    if (lunar.getDayTianShenLuck() === "吉") {
        score += 1;
        parts.push({ mid: "황도일이며", end: "황도일이에요" });
    }
    const dayEls = [fiveElementTables_1.STEM_ELEMENT[g.stem], fiveElementTables_1.BRANCH_ELEMENT[g.branch]];
    const need = (input.neededElements ?? []).find((el) => dayEls.includes(el));
    if (need) {
        score += 1;
        parts.push({ mid: `남은 작은 빈자리인 ${ELEMENT_LABEL[need]}의 기운이 도는 날이며`, end: `남은 작은 빈자리인 ${ELEMENT_LABEL[need]}의 기운이 도는 날이에요` });
    }
    if (input.purpose === "wedding" && (weekday === 0 || weekday === 6)) {
        score += 1;
        parts.push({ mid: "주말이며", end: "주말이에요" });
    }
    // 이유 한 줄: "본인 띠·일지와 부딪히지 않고" + 맞은 조건 (길어지지 않게 셋까지)
    const shown = parts.slice(0, 3);
    const reason = shown.length
        ? ["본인 띠·일지와 부딪히지 않고", ...shown.slice(0, -1).map((x) => x.mid), shown[shown.length - 1].end].join(", ")
        : "본인 띠·일지와 부딪히지 않는 날이에요";
    const lm = lunar.getMonth();
    return {
        date,
        weekday: WEEKDAY[weekday],
        lunar: `음력 ${lm < 0 ? "윤" : ""}${Math.abs(lm)}월 ${lunarDay}일`,
        ganzhi: g.ganzhi,
        zhiXing: `${zxName[0]}(${zxName[1]})`,
        score,
        reason: `${reason}.`.replace(/요\.$/, "요."),
    };
}
/** 그 달에서 좋은 날 3~5개 */
function recommendDays(input) {
    const last = new Date(Date.UTC(input.year, input.month, 0)).getUTCDate();
    const all = [];
    for (let d = 1; d <= last; d++) {
        const r = judgeDay(input, `${input.year}-${pad(input.month)}-${pad(d)}`);
        if (r)
            all.push(r);
    }
    const sorted = [...all].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));
    // 점수가 1점 이상인 날 중 다섯까지, 모자라면 통과한 날로 셋까지 채운다
    let days = sorted.filter((x) => x.score > 0).slice(0, 5);
    if (days.length < 3)
        days = sorted.slice(0, Math.max(days.length, Math.min(3, sorted.length)));
    days.sort((a, b) => a.date.localeCompare(b.date));
    return { purpose: input.purpose, year: input.year, month: input.month, days, passed: all.length };
}
