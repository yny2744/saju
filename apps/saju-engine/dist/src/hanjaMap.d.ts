/**
 * lunar-javascript는 천간/지지를 한자(漢字)로 반환한다.
 * 한국 사주 서비스는 한글 표기가 기본이므로 변환 테이블을 둔다.
 *
 * 순서는 명리학 표준 순서(갑을병정무기경신임계 / 자축인묘진사오미신유술해)를 그대로 따른다.
 */
export declare const HEAVENLY_STEM_MAP: Record<string, string>;
export declare const EARTHLY_BRANCH_MAP: Record<string, string>;
export declare function hanjaStemToHangul(hanja: string): string;
export declare function hanjaBranchToHangul(hanja: string): string;
/**
 * 12절(節) 한자 → 한글 매핑. lunar-javascript의 getNextJie()/getPrevJie()가
 * 반환하는 절기명이 한자이므로 변환한다. (24절기 중 "절"에 해당하는 12개만 -
 * "기"는 대운 계산에서 쓰지 않으므로 이 표에 포함하지 않는다.)
 */
export declare const JIE_NAME_MAP: Record<string, string>;
export declare function hanjaJieToHangul(hanja: string): string;
