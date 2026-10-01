import type {
  FaceAnalyzeRequestBody,
  FaceFeatureBuckets,
  FaceFeatureInput,
  FeatureBucket,
  ValidatedFaceInput,
} from "./types";

/**
 * 지시서 4조: "얼굴 특징 추출이 실패하거나 분석값이 유효하지 않으면 결과 생성을
 * 중단하고 재촬영 또는 재업로드를 안내한다."
 *
 * 여기서 검증하는 것은 "숫자 6개 + 신뢰도"뿐이다 (validateAnalyzeInput.ts와
 * 동일한 원칙 - 클라이언트 검증을 믿지 않고 서버에서 다시 검증). 원본 사진이나
 * 랜드마크 좌표는 애초에 이 함수의 입력에 존재하지 않는다 - 브라우저가
 * 전송 전에 이미 버렸기 때문이다.
 *
 * 각 비율의 [최소, 최대]는 사람 얼굴 형태학적으로 있을 법한 범위를 넉넉하게
 * 잡은 근사값이다 - 이 범위를 벗어나면 "얼굴이 아니거나 감지가 잘못된 경우"로
 * 보고 재촬영을 안내한다. 학술적으로 검증된 임계값이 아니라는 점을 명시한다.
 */
const NICKNAME_MAX_LENGTH = 20;
const UNSAFE_CHARS_RE = /[<>]/;
const MIN_DETECTION_CONFIDENCE = 0.5;

interface RatioSpec {
  key: keyof FaceFeatureInput;
  min: number;
  max: number;
  /** [low/mid 경계, mid/high 경계] */
  thresholds: [number, number];
}

/**
 * ⚠️ 2026-10 실기기 테스트 중 foreheadHeightRatio/noseLengthToWidthRatio가
 * 정상적인 얼굴 사진에서도 범위를 벗어나 거부되는 문제가 있었다 (원인은
 * faceRatios.ts의 랜드마크 선택 오류 - 그쪽을 먼저 수정했다). 같은 문제가
 * 재발해도 바로 재촬영을 요구하지 않도록, 두 항목은 범위를 더 넉넉하게
 * 넓혀뒀다 - 진짜 "얼굴이 아닌 사진"을 거르는 용도이지, 비율을 정교하게
 * 재단하는 용도가 아니기 때문이다.
 */
const RATIO_SPECS: RatioSpec[] = [
  { key: "faceLengthToWidthRatio", min: 0.8, max: 2.2, thresholds: [1.25, 1.5] },
  { key: "foreheadHeightRatio", min: 0.05, max: 0.65, thresholds: [0.28, 0.36] },
  { key: "eyeSpacingRatio", min: 0.4, max: 1.6, thresholds: [0.85, 1.05] },
  { key: "noseLengthToWidthRatio", min: 0.5, max: 4.5, thresholds: [1.8, 2.3] },
  { key: "mouthWidthRatio", min: 0.25, max: 0.65, thresholds: [0.4, 0.48] },
  { key: "jawWidthRatio", min: 0.4, max: 1.1, thresholds: [0.72, 0.85] },
];

const BUCKET_KEY_MAP: Record<string, keyof FaceFeatureBuckets> = {
  faceLengthToWidthRatio: "faceShape",
  foreheadHeightRatio: "forehead",
  eyeSpacingRatio: "eyeSpacing",
  noseLengthToWidthRatio: "nose",
  mouthWidthRatio: "mouth",
  jawWidthRatio: "jaw",
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function bucketOf(value: number, [lowMid, midHigh]: [number, number]): FeatureBucket {
  if (value < lowMid) return "low";
  if (value < midHigh) return "mid";
  return "high";
}

export type FaceValidationResult =
  | { ok: true; value: ValidatedFaceInput }
  | { ok: false; issues: string[] };

export function validateFaceAnalyzeInput(body: FaceAnalyzeRequestBody): FaceValidationResult {
  const issues: string[] = [];

  let nickname = "";
  if (typeof body.nickname !== "string" || body.nickname.trim().length === 0) {
    issues.push("nickname: 닉네임을 입력해주세요.");
  } else {
    const trimmed = body.nickname.trim();
    if (trimmed.length > NICKNAME_MAX_LENGTH) {
      issues.push(`nickname: 닉네임은 ${NICKNAME_MAX_LENGTH}자 이하로 입력해주세요.`);
    } else if (UNSAFE_CHARS_RE.test(trimmed)) {
      issues.push("nickname: 닉네임에 사용할 수 없는 문자가 포함되어 있습니다.");
    } else {
      nickname = trimmed;
    }
  }

  if (body.consent !== true) {
    issues.push("consent: 얼굴 사진 분석에 대한 동의가 필요합니다.");
  }

  if (typeof body.features !== "object" || body.features === null) {
    issues.push("features: 얼굴 특징 데이터가 없습니다. 다시 촬영하거나 업로드해주세요.");
    return { ok: false, issues };
  }

  const rawFeatures = body.features as Record<string, unknown>;

  for (const spec of RATIO_SPECS) {
    const value = rawFeatures[spec.key];
    if (!isFiniteNumber(value)) {
      issues.push(`features.${spec.key}: 숫자 값이 필요합니다.`);
    } else if (value < spec.min || value > spec.max) {
      // 디버깅 목적으로 실제 계산값을 메시지에 그대로 포함한다 (실기기 테스트
      // 중 랜드마크 지점 선택 오류를 두 차례 겪었다 - 추측 대신 실측값을 보고
      // 정확히 보정하기 위함). 서비스 안정화 후에는 더 간결한 문구로 정리한다.
      issues.push(
        `features.${spec.key}: 얼굴 인식 결과가 올바르지 않습니다 (실측값 ${value}, 허용 범위 ${spec.min}~${spec.max}). 정면 사진으로 다시 시도해주세요.`
      );
    }
  }

  const confidence = rawFeatures.detectionConfidence;
  if (!isFiniteNumber(confidence) || confidence < 0 || confidence > 1) {
    issues.push("features.detectionConfidence: 얼굴 인식 신뢰도 값이 올바르지 않습니다.");
  } else if (confidence < MIN_DETECTION_CONFIDENCE) {
    issues.push("features.detectionConfidence: 얼굴을 충분히 인식하지 못했습니다. 밝은 곳에서 정면으로 다시 촬영해주세요.");
  }

  const preferenceResult = validateRelationshipPreference(body.relationshipPreference);
  if (!preferenceResult.ok) {
    issues.push(preferenceResult.issue);
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      nickname,
      features: rawFeatures as unknown as FaceFeatureInput,
      relationshipPreference: preferenceResult.ok ? preferenceResult.value : null,
    },
  };
}

/** 검증된 비율 6개를 규칙 엔진/AI 프롬프트가 공통으로 쓰는 3단계 버킷으로 변환한다. */
export function bucketizeFeatures(features: FaceFeatureInput): FaceFeatureBuckets {
  const buckets = {} as FaceFeatureBuckets;
  for (const spec of RATIO_SPECS) {
    const bucketKey = BUCKET_KEY_MAP[spec.key];
    buckets[bucketKey] = bucketOf(features[spec.key], spec.thresholds);
  }
  return buckets;
}

const RELATIONSHIP_PREFERENCE_MAX_LENGTH = 200;

/** 결제 시점에 사용자가 직접 입력하는 연애/관계 선호 텍스트 검증 (선택 입력). */
export function validateRelationshipPreference(value: unknown): { ok: true; value: string | null } | { ok: false; issue: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: null };
  }
  if (typeof value !== "string") {
    return { ok: false, issue: "relationshipPreference: 문자열이어야 합니다." };
  }
  const trimmed = value.trim();
  if (trimmed.length > RELATIONSHIP_PREFERENCE_MAX_LENGTH) {
    return { ok: false, issue: `relationshipPreference: ${RELATIONSHIP_PREFERENCE_MAX_LENGTH}자 이하로 입력해주세요.` };
  }
  if (UNSAFE_CHARS_RE.test(trimmed)) {
    return { ok: false, issue: "relationshipPreference: 사용할 수 없는 문자가 포함되어 있습니다." };
  }
  return { ok: true, value: trimmed.length > 0 ? trimmed : null };
}
