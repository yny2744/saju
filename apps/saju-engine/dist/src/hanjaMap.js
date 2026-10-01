"use strict";
/**
 * lunar-javascript는 천간/지지를 한자(漢字)로 반환한다.
 * 한국 사주 서비스는 한글 표기가 기본이므로 변환 테이블을 둔다.
 *
 * 순서는 명리학 표준 순서(갑을병정무기경신임계 / 자축인묘진사오미신유술해)를 그대로 따른다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JIE_NAME_MAP = exports.EARTHLY_BRANCH_MAP = exports.HEAVENLY_STEM_MAP = void 0;
exports.hanjaStemToHangul = hanjaStemToHangul;
exports.hanjaBranchToHangul = hanjaBranchToHangul;
exports.hanjaJieToHangul = hanjaJieToHangul;
exports.HEAVENLY_STEM_MAP = {
    "甲": "갑",
    "乙": "을",
    "丙": "병",
    "丁": "정",
    "戊": "무",
    "己": "기",
    "庚": "경",
    "辛": "신",
    "壬": "임",
    "癸": "계",
};
exports.EARTHLY_BRANCH_MAP = {
    "子": "자",
    "丑": "축",
    "寅": "인",
    "卯": "묘",
    "辰": "진",
    "巳": "사",
    "午": "오",
    "未": "미",
    "申": "신",
    "酉": "유",
    "戌": "술",
    "亥": "해",
};
function hanjaStemToHangul(hanja) {
    const result = exports.HEAVENLY_STEM_MAP[hanja];
    if (!result) {
        throw new Error(`알 수 없는 천간 한자: ${hanja}`);
    }
    return result;
}
function hanjaBranchToHangul(hanja) {
    const result = exports.EARTHLY_BRANCH_MAP[hanja];
    if (!result) {
        throw new Error(`알 수 없는 지지 한자: ${hanja}`);
    }
    return result;
}
/**
 * 12절(節) 한자 → 한글 매핑. lunar-javascript의 getNextJie()/getPrevJie()가
 * 반환하는 절기명이 한자이므로 변환한다. (24절기 중 "절"에 해당하는 12개만 -
 * "기"는 대운 계산에서 쓰지 않으므로 이 표에 포함하지 않는다.)
 */
exports.JIE_NAME_MAP = {
    "立春": "입춘",
    "惊蛰": "경칩",
    "清明": "청명",
    "立夏": "입하",
    "芒种": "망종",
    "小暑": "소서",
    "立秋": "입추",
    "白露": "백로",
    "寒露": "한로",
    "立冬": "입동",
    "大雪": "대설",
    "小寒": "소한",
};
function hanjaJieToHangul(hanja) {
    const result = exports.JIE_NAME_MAP[hanja];
    if (!result) {
        throw new Error(`알 수 없는 절기 한자: ${hanja}`);
    }
    return result;
}
