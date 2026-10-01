/**
 * 60갑자 순환 계산용 공통 테이블/유틸.
 * 천간 10개 + 지지 12개가 각각 독립적으로 1씩 진행하면서 맞물려 60갑자를 이룬다.
 */
export declare const STEM_ORDER: string[];
export declare const STEM_INDEX: Record<string, number>;
export interface Ganzhi {
    stem: string;
    branch: string;
    ganzhi: string;
}
/**
 * 주어진 간지에서 60갑자 순환상 다음(step=+1) 또는 이전(step=-1) 간지를 구한다.
 * 천간은 mod 10, 지지는 mod 12로 각각 독립 순환하며 동시에 1칸씩 이동한다
 * (이렇게 해야 실제 60갑자 순서와 일치한다 - 예: 갑자 다음은 을축, 그 다음은 병인...).
 */
export declare function shiftGanzhi(stem: string, branch: string, step: number): Ganzhi;
