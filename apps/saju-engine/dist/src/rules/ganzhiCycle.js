"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STEM_INDEX = exports.STEM_ORDER = void 0;
exports.shiftGanzhi = shiftGanzhi;
const twelveStageTables_1 = require("./twelveStageTables");
/**
 * 60갑자 순환 계산용 공통 테이블/유틸.
 * 천간 10개 + 지지 12개가 각각 독립적으로 1씩 진행하면서 맞물려 60갑자를 이룬다.
 */
exports.STEM_ORDER = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
exports.STEM_INDEX = Object.fromEntries(exports.STEM_ORDER.map((s, i) => [s, i]));
const BRANCH_INDEX = Object.fromEntries(twelveStageTables_1.BRANCH_ORDER.map((b, i) => [b, i]));
/**
 * 주어진 간지에서 60갑자 순환상 다음(step=+1) 또는 이전(step=-1) 간지를 구한다.
 * 천간은 mod 10, 지지는 mod 12로 각각 독립 순환하며 동시에 1칸씩 이동한다
 * (이렇게 해야 실제 60갑자 순서와 일치한다 - 예: 갑자 다음은 을축, 그 다음은 병인...).
 */
function shiftGanzhi(stem, branch, step) {
    const stemIdx = exports.STEM_INDEX[stem];
    const branchIdx = BRANCH_INDEX[branch];
    if (stemIdx === undefined)
        throw new Error(`알 수 없는 천간: ${stem}`);
    if (branchIdx === undefined)
        throw new Error(`알 수 없는 지지: ${branch}`);
    const newStemIdx = (((stemIdx + step) % 10) + 10) % 10;
    const newBranchIdx = (((branchIdx + step) % 12) + 12) % 12;
    const newStem = exports.STEM_ORDER[newStemIdx];
    const newBranch = twelveStageTables_1.BRANCH_ORDER[newBranchIdx];
    return { stem: newStem, branch: newBranch, ganzhi: `${newStem}${newBranch}` };
}
