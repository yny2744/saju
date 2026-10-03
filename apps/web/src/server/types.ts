/**
 * Phase 4 - 웹/API 계층 공통 타입.
 *
 * 원칙(지시서 24조): API 응답을 `any`로 두지 않고, 이미 Phase 1~3에서 정의된
 * SajuJson / InterpretationResult 타입을 그대로 재사용한다. 여기서 새로
 * 정의하는 것은 "웹 서비스 계층에만 필요한" 요청/응답 봉투(envelope) 타입뿐이다.
 */
import type {
  CalendarType,
  Gender,
  ProductType,
  SajuInput,
  SajuJson,
  ZiHourMethod,
  InterpretationResult,
  FortuneJson,
  FortuneResultJson,
} from "saju-engine";

/** 웹 입력 화면에서 서버로 보내는 원본 요청 바디 (검증 전, 아직 unknown 취급) */
export interface AnalyzeRequestBody {
  nickname?: unknown;
  /** 선택 입력. 결과 화면 표시용일 뿐, 사주 계산에는 전혀 관여하지 않는다 (nickname과 동일한 원칙). */
  hanjaName?: unknown;
  gender?: unknown;
  calendarType?: unknown;
  date?: unknown;
  time?: unknown;
  birthCity?: unknown;
  longitude?: unknown;
  applySolarTimeCorrection?: unknown;
  ziHourMethod?: unknown;
  isLeapMonth?: unknown;
  productType?: unknown;
}

/** 검증을 통과한 뒤의 안전한 입력값 */
export interface ValidatedAnalyzeInput {
  /** 결과 화면 표시용. 사주 계산에는 관여하지 않는다 (명세서 8조: 닉네임과 계산 데이터 분리). */
  nickname: string;
  /** 선택 입력, 있으면 결과 화면에 "이름(漢字)"처럼 같이 표시한다. 계산에는 관여하지 않는다. */
  hanjaName?: string;
  sajuInput: SajuInput;
  productType: ProductType;
}

/** POST /api/saju/analyze 성공 응답 - 결과 자체가 아니라 조회용 id만 돌려준다 (URL 개인정보 노출 방지, 명세서 10조) */
export interface AnalyzeAcceptedResponse {
  id: string;
  expiresAt: string;
}

/** GET /api/saju/result/[id] 성공 응답 */
export interface AnalyzeResultResponse {
  nickname: string;
  hanjaName?: string;
  saju: SajuJson;
  interpretation: InterpretationResult;
}

/**
 * Fortune Engine(오늘의 운세) 웹/API 계층 타입.
 *
 * 지시서 11조: 입력은 "이미 검증된 Saju JSON을 재사용"하는 방식을 택한다.
 * 기존 /api/saju/analyze 흐름에서 이미 계산·저장된 결과의 id(resultStore 토큰)를
 * 받아서 그 안의 saju(SajuJson)를 그대로 재사용하고, Saju Engine을 다시 호출하지
 * 않는다(중복 계산 방지, 지시서 6조).
 */
export interface FortuneRequestBody {
  /** 기존 POST /api/saju/analyze 응답으로 받은 결과 id (resultStore 토큰) */
  resultId?: unknown;
  /** YYYY-MM-DD (KST 기준). 생략 시 서버가 KST 기준 오늘 날짜를 사용한다 */
  targetDate?: unknown;
}

export interface ValidatedFortuneInput {
  resultId: string;
  targetDate?: string;
}

/** POST /api/fortune/today 성공 응답 */
export interface FortuneResultResponse {
  nickname: string;
  /** Fortune Engine의 원본 계산 데이터 (개발/향후 AI 연동용) */
  fortune: FortuneJson;
  /** Fortune Rule Engine이 생성한, 사용자에게 보여줄 최종 오늘의 운세 (AI 미사용) */
  result: FortuneResultJson;
}

/** 모든 에러 응답의 공통 형태. 서버 내부 스택/원인은 절대 포함하지 않는다 (명세서 18조/25조). */
export interface ApiErrorResponse {
  error: {
    code:
      | "INVALID_INPUT"
      | "UNSUPPORTED_PRODUCT_TYPE"
      | "SAJU_CALCULATION_FAILED"
      | "AI_INTERPRETATION_FAILED"
      | "RESULT_NOT_FOUND"
      | "RATE_LIMITED"
      | "INTERNAL_ERROR"
      // Phase 5 결제 기능 추가 (지시서 25조: 기존 코드에 대한 최소 수정 - 에러 코드
      // 유니온 타입에 결제 관련 코드 4종만 추가함. 기존 코드/의미는 변경하지 않음)
      | "AMOUNT_MISMATCH"
      | "ALREADY_PROCESSED"
      | "PAYMENT_DECLINED"
      | "ENTITLEMENT_INVALID"
      // Fortune Engine 추가 (오늘의 운세 지시서 - 기존 에러 코드는 변경하지 않고 1종만 추가)
      | "FORTUNE_CALCULATION_FAILED";
    message: string;
    issues?: string[];
  };
}

export type {
  CalendarType,
  Gender,
  ProductType,
  SajuInput,
  SajuJson,
  ZiHourMethod,
  InterpretationResult,
  FortuneJson,
  FortuneResultJson,
};
