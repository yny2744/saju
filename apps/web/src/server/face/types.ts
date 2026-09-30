/**
 * Phase 9 - 관상(觀相) 서비스 공통 타입.
 *
 * 지시서 4조: "정밀 랜드마크 전체를 서버로 전송하지 않는다. 필요한 최소
 * 비율·특징값만 검증하여 전달한다." 그래서 여기서 서버가 받는 타입은
 * 478개 좌표가 아니라, 브라우저(FaceLandmarker)가 이미 계산해서 넘겨주는
 * "파생 비율 6개 + 얼굴 인식 신뢰도"뿐이다. 원본 사진도, 랜드마크 좌표도
 * 이 타입 어디에도 없다.
 */

/** 클라이언트(브라우저)가 MediaPipe Face Landmarker 결과로부터 계산해 서버로 보내는 값. */
export interface FaceFeatureInput {
  /** 얼굴 길이 ÷ 너비. 클수록 갸름한 얼굴형. */
  faceLengthToWidthRatio: number;
  /** 이마 높이 ÷ 얼굴 전체 높이. */
  foreheadHeightRatio: number;
  /** 미간 거리 ÷ 평균 눈 너비. */
  eyeSpacingRatio: number;
  /** 코 길이 ÷ 코 너비. */
  noseLengthToWidthRatio: number;
  /** 입 너비 ÷ 얼굴 너비. */
  mouthWidthRatio: number;
  /** 턱(하안) 너비 ÷ 광대 너비. */
  jawWidthRatio: number;
  /** MediaPipe 얼굴 감지 신뢰도 (0~1). 너무 낮으면 서버가 결과 생성을 거부한다. */
  detectionConfidence: number;
}

export type FeatureBucket = "low" | "mid" | "high";

/** 6개 비율을 각각 3단계로 분류한 값. 규칙 엔진과 AI 프롬프트 둘 다 이 버킷만 사용한다(원시 소수점 값을 해석에 직접 쓰지 않음). */
export interface FaceFeatureBuckets {
  faceShape: FeatureBucket;
  forehead: FeatureBucket;
  eyeSpacing: FeatureBucket;
  nose: FeatureBucket;
  mouth: FeatureBucket;
  jaw: FeatureBucket;
}

/** 무료 관상 결과 (규칙 기반, AI 미사용). */
export interface FaceRuleResult {
  features: {
    faceShape: string;
    forehead: string;
    eyes: string;
    nose: string;
    mouth: string;
    jaw: string;
  };
  /** 지시서 2-A조: "본인에게 어울리는 인연의 특징을 간략히 미리 보여준다." - 짧은 미리보기 1~2문장. */
  idealPartnerPreview: string;
  disclaimer: string;
}

/** 유료 관상 AI 심층 해석 (지시서 2-B조의 7개 항목에 대응). */
export interface FaceAiResult {
  selfAnalysis: {
    faceShape: string;
    forehead: string;
    eyes: string;
    nose: string;
    mouth: string;
    jaw: string;
    /** 전통 관상학에 따른 종합 해석 (2-B조 항목 2) */
    overallSummary: string;
  };
  relationshipInsight: {
    /** 연애 및 관계에서 참고할 수 있는 전통적 해석 (2-B조 항목 3) */
    traditionalLoveTendency: string;
    /** 본인에게 어울리는 인연의 관상적 특징 - 전통 관상학 기반 일반론 (2-B조 항목 4) */
    idealPartnerTraits: string;
    /** 상대방의 얼굴형 및 주요 특징에 관한 "전통적" 해석 - 실제 상대를 분석한 것이 아님 (2-B조 항목 5) */
    partnerFeatureNotes: string;
    /** 관계에서 조화롭게 살펴볼 수 있는 특징과 유의점 (2-B조 항목 6) */
    harmonyPoints: string;
    /** 사용자가 직접 입력한 연애/관계 선호를 반영한 코멘트. 입력이 없으면 생략. */
    userPreferenceNote: string | null;
  };
  disclaimer: string;
}

export interface FaceAnalyzeRequestBody {
  nickname?: unknown;
  consent?: unknown;
  features?: unknown;
  /** 지시서 2-C조: "사용자가 직접 입력한 연애 및 관계 선호". 선택 입력. */
  relationshipPreference?: unknown;
}

export interface ValidatedFaceInput {
  nickname: string;
  features: FaceFeatureInput;
  relationshipPreference: string | null;
}

/**
 * 기존 types.ts의 ApiErrorResponse.error.code 유니온을 그대로 확장하지 않고
 * 관상 전용 에러 코드 타입을 새로 둔다 - 기존 타입에 코드를 추가하는 것도
 * "기존 파일 수정"이라, Phase 9 지시서 3조(불필요한 기존 파일 변경 금지)에
 * 따라 완전히 분리했다.
 */
export interface FaceApiErrorResponse {
  error: {
    code:
      | "RATE_LIMITED"
      | "INVALID_INPUT"
      | "FACE_ANALYSIS_FAILED"
      | "RESULT_NOT_FOUND"
      | "ENTITLEMENT_INVALID"
      | "AI_INTERPRETATION_FAILED"
      | "INTERNAL_ERROR";
    message: string;
    issues?: string[];
  };
}

export interface FaceResultResponse {
  nickname: string;
  buckets: FaceFeatureBuckets;
  result: FaceRuleResult;
  /** 결제 시 유료 심층 해석에 그대로 이어서 사용된다 (재입력 요구하지 않음). */
  relationshipPreference: string | null;
}
