"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ELEMENT_OVERCOMES = exports.ELEMENT_GENERATES = exports.BRANCH_POLARITY = exports.STEM_POLARITY = void 0;
exports.determineTenGod = determineTenGod;
/** 천간의 음양 - 모든 유파가 동일하게 쓰는 확립된 기준 (이견 없음) */
exports.STEM_POLARITY = {
    갑: "양",
    을: "음",
    병: "양",
    정: "음",
    무: "양",
    기: "음",
    경: "양",
    신: "음",
    임: "양",
    계: "음",
};
/**
 * 지지의 음양.
 * ⚠️ DECISION REQUIRED: 지지 음양은 두 가지 견해가 있다.
 *   (1) 통상적으로 널리 쓰이는 방식: 자인진오신술=양, 축묘사미유해=음
 *   (2) 일부 유파(특히 십이운성 계산에서)는 지지의 음양을 그 지지에 대응하는
 *       "정기 지장간의 음양"과 일치시켜야 한다고 봄 (예: 사(巳)의 정기는 병(丙,양)인데
 *       사 자체는 통상 음으로 분류되어 모순처럼 보이는 지점 - 이를 "음양 착종설"이라 부름)
 *   Phase 2-2(십신)에서는 (1) 통상 방식을 채택한다. 12운성(Phase 2-4)에서 이 문제를
 *   다시 다뤄야 할 수 있다.
 */
exports.BRANCH_POLARITY = {
    자: "양",
    축: "음",
    인: "양",
    묘: "음",
    진: "양",
    사: "음",
    오: "양",
    미: "음",
    신: "양",
    유: "음",
    술: "양",
    해: "음",
};
/** 오행 상생(相生) 관계: key가 value를 생(生)한다. 확립된 기준, 이견 없음. */
exports.ELEMENT_GENERATES = {
    목: "화",
    화: "토",
    토: "금",
    금: "수",
    수: "목",
};
/** 오행 상극(相剋) 관계: key가 value를 극(剋)한다. 확립된 기준, 이견 없음. */
exports.ELEMENT_OVERCOMES = {
    목: "토",
    토: "수",
    수: "화",
    화: "금",
    금: "목",
};
/**
 * 일간 대비 다른 글자의 오행/음양을 받아 십신을 판정한다.
 * 오행 5개 간의 관계는 "같음/상생(정방향)/상생(역방향)/상극(정방향)/상극(역방향)"
 * 5가지로 완전히 분류되므로, 이 함수는 모든 입력 조합에 대해 반드시 하나의
 * 십신을 반환한다 (누락되는 경우가 없음).
 */
function determineTenGod(dayElement, dayPolarity, otherElement, otherPolarity) {
    const samePolarity = dayPolarity === otherPolarity;
    if (otherElement === dayElement) {
        return samePolarity ? "비견" : "겁재";
    }
    if (exports.ELEMENT_GENERATES[otherElement] === dayElement) {
        // 상대가 나(일간)를 생함 = 인성(印星)
        return samePolarity ? "편인" : "정인";
    }
    if (exports.ELEMENT_GENERATES[dayElement] === otherElement) {
        // 내(일간)가 상대를 생함 = 식상(食傷)
        return samePolarity ? "식신" : "상관";
    }
    if (exports.ELEMENT_OVERCOMES[dayElement] === otherElement) {
        // 내(일간)가 상대를 극함 = 재성(財星)
        return samePolarity ? "편재" : "정재";
    }
    if (exports.ELEMENT_OVERCOMES[otherElement] === dayElement) {
        // 상대가 나(일간)를 극함 = 관성(官星)
        return samePolarity ? "편관" : "정관";
    }
    // 5행 관계상 도달 불가능한 분기 - 데이터 오류를 즉시 드러내기 위해 명시적으로 에러
    throw new Error(`십신 판정 불가능한 오행 조합: 일간=${dayElement}, 대상=${otherElement} (데이터 오류 의심)`);
}
