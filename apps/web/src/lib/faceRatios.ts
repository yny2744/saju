/**
 * Phase 9 지시서 4조: "정밀 랜드마크 전체를 서버로 전송하지 않는다. 필요한
 * 최소 비율·특징값만 검증하여 전달한다."
 *
 * 이 파일은 그 "축약" 단계를 담당한다 - MediaPipe FaceLandmarker가 반환하는
 * 478개 좌표(NormalizedLandmark[])를 입력받아, 서버로 보낼 6개 비율만 계산해서
 * 반환한다. 순수 함수라 MediaPipe/브라우저 없이도(Jest, Node 환경) 그대로
 * 테스트할 수 있다 - 실제 WASM 모델 로딩은 faceLandmarks.ts가 별도로 담당한다.
 *
 * 인덱스 출처: MediaPipe Face Mesh의 공개된 468/478포인트 표준 토폴로지에서
 * 널리 쓰이는 지점들이다 (예: 10=이마 상단, 152=턱 끝, 234/454=좌우 광대,
 * 33/133/362/263=좌우 눈 안쪽·바깥쪽 모서리, 1=코끝, 61/291=입 양끝).
 * ⚠️ 실기기 카메라로 직접 검증하지는 못했다 - 최종 보고서에 "실제 브라우저에서
 * 확인하지 못한 항목"으로 명시한다. 좌표가 어긋나 보이면 이 인덱스 상수만
 * 조정하면 된다(로직 자체는 바꿀 필요 없음).
 */
export interface Point2D {
  x: number;
  y: number;
}

const LANDMARK = {
  foreheadTop: 10,
  chin: 152,
  cheekLeft: 234,
  cheekRight: 454,
  eyeLeftOuter: 33,
  eyeLeftInner: 133,
  eyeRightInner: 362,
  eyeRightOuter: 263,
  noseTip: 1,
  noseBridge: 6,
  noseBase: 2,
  mouthLeft: 61,
  mouthRight: 291,
  jawLeft: 172,
  jawRight: 397,
  /** 눈썹 사이(미간) 지점 - 이마 비율 계산의 기준점 */
  glabella: 9,
} as const;

export interface FaceRatios {
  faceLengthToWidthRatio: number;
  foreheadHeightRatio: number;
  eyeSpacingRatio: number;
  noseLengthToWidthRatio: number;
  mouthWidthRatio: number;
  jawWidthRatio: number;
}

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** MediaPipe FaceLandmarker가 요구하는 최소 랜드마크 개수 (478포인트 모델 기준). */
export const MIN_REQUIRED_LANDMARKS = 468;

export class InsufficientLandmarksError extends Error {
  constructor() {
    super("얼굴 랜드마크를 충분히 인식하지 못했습니다.");
    this.name = "InsufficientLandmarksError";
  }
}

/**
 * 478개 정규화 좌표(0~1 범위, 이미지 너비/높이 기준 상대 좌표)로부터
 * 서버에 전달할 6개 비율을 계산한다. 좌표가 부족하면(얼굴 인식 실패)
 * 예외를 던진다 - 임의의 기본값으로 채우지 않는다 (지시서 2-A조 원칙).
 */
export function computeFaceRatios(landmarks: Point2D[]): FaceRatios {
  if (landmarks.length < MIN_REQUIRED_LANDMARKS) {
    throw new InsufficientLandmarksError();
  }

  const p = (index: number): Point2D => landmarks[index];

  const faceLength = dist(p(LANDMARK.foreheadTop), p(LANDMARK.chin));
  const faceWidth = dist(p(LANDMARK.cheekLeft), p(LANDMARK.cheekRight));
  const eyeWidthLeft = dist(p(LANDMARK.eyeLeftOuter), p(LANDMARK.eyeLeftInner));
  const eyeWidthRight = dist(p(LANDMARK.eyeRightInner), p(LANDMARK.eyeRightOuter));
  const eyeSpacing = dist(p(LANDMARK.eyeLeftInner), p(LANDMARK.eyeRightInner));
  const noseLength = dist(p(LANDMARK.noseBridge), p(LANDMARK.noseBase));
  const noseWidth = dist(p(LANDMARK.noseTip), p(LANDMARK.noseBase)) || 1e-6;
  const mouthWidth = dist(p(LANDMARK.mouthLeft), p(LANDMARK.mouthRight));
  const jawWidth = dist(p(LANDMARK.jawLeft), p(LANDMARK.jawRight));
  const foreheadHeight = dist(p(LANDMARK.foreheadTop), p(LANDMARK.glabella));

  const avgEyeWidth = (eyeWidthLeft + eyeWidthRight) / 2 || 1e-6;

  return {
    faceLengthToWidthRatio: faceLength / (faceWidth || 1e-6),
    foreheadHeightRatio: foreheadHeight / (faceLength || 1e-6),
    eyeSpacingRatio: eyeSpacing / avgEyeWidth,
    noseLengthToWidthRatio: noseLength / noseWidth,
    mouthWidthRatio: mouthWidth / (faceWidth || 1e-6),
    jawWidthRatio: jawWidth / (faceWidth || 1e-6),
  };
}
