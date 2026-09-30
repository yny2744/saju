// lunar-javascript는 공식 @types 패키지를 제공하지 않는다.
// Phase 1에서 실제로 사용하는 API 표면만 최소한으로 선언한다.
declare module "lunar-javascript" {
  export class EightChar {
    getYearGan(): string;
    getYearZhi(): string;
    getYear(): string;
    getMonthGan(): string;
    getMonthZhi(): string;
    getMonth(): string;
    getDayGan(): string;
    getDayZhi(): string;
    getDay(): string;
    getTimeGan(): string;
    getTimeZhi(): string;
    getTime(): string;
    /**
     * 자시(子時) 해석 방식 설정.
     * 1 = 23:00~23:59를 다음날 자시로 간주 (일주가 다음날로 이동)
     * 2 = 자정(00:00)에만 날짜 변경 (기본값)
     */
    setSect(sect: 1 | 2): void;
    getSect(): number;
  }

  export class Lunar {
    /**
     * 윤달은 month를 음수로 지정한다 (예: 윤5월 15일 -> fromYmd(year, -5, 15)).
     * 이는 lunar-javascript의 실제 구현 규약이며, 별도의 leap 파라미터는 없다.
     */
    static fromYmd(year: number, month: number, day: number): Lunar;
    getSolar(): Solar;
    getEightChar(): EightChar;
    /** 다음/이전 "절(節)" (24절기 중 월 경계에 해당하는 12개)을 반환. "기(氣)"는 제외됨. */
    getNextJie(): JieQi;
    getPrevJie(): JieQi;
    /** 다음/이전 절기 (절+기 24개 전체 대상) */
    getNextJieQi(): JieQi;
    getPrevJieQi(): JieQi;
  }

  export class JieQi {
    /** 절기명 (한자, 예: "芒种"). hanjaMap.ts의 JIE_NAME_MAP으로 한글 변환 필요. */
    getName(): string;
    getSolar(): Solar;
  }

  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): Lunar;
    /** "YYYY-MM-DD HH:mm:ss" 형식 문자열 반환 */
    toYmdHms(): string;
  }
}
