"use client";

import { FaceLandmarker, FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { computeFaceRatios, InsufficientLandmarksError, type FaceRatios } from "./faceRatios";
import { drawFaceMap, type FaceMapResult } from "./faceMap";

/**
 * Phase 9 조사 보고서(승인됨)의 결론에 따라 @mediapipe/tasks-vision(Apache-2.0,
 * Google 1st-party)을 채택했다. 이 파일은 브라우저에서만 동작한다 - WASM과
 * 모델 파일을 fetch()로 받아 클라이언트 메모리에서 얼굴을 분석하고, 사진도
 * 랜드마크 좌표도 이 함수 밖으로(서버로) 내보내지 않는다. 서버로 나가는 것은
 * faceRatios.ts가 계산한 비율 6개 + 아래 detectionConfidence뿐이다.
 *
 * ⚠️ 투명성 고지 (최종 보고서에도 동일하게 명시): 이 실행 환경에는 실제
 * 카메라/브라우저가 없어 FaceLandmarker.createFromOptions()와 detect() 호출이
 * 실제 기기에서 정상 동작하는지 이 세션에서 직접 확인하지 못했다. 아래 코드는
 * @mediapipe/tasks-vision 공식 문서의 IMAGE 모드 사용법을 그대로 따른 것이며,
 * 배포 전 실제 기기 테스트가 필요하다.
 *
 * WASM/모델 파일은 기본적으로 Google CDN에서 받아온다(코드에 URL만 있을 뿐
 * 사용자 데이터가 그쪽으로 가는 것은 아니다 - 정적 라이브러리 파일 다운로드일
 * 뿐이다). 운영 환경에서 외부 CDN 의존을 없애고 싶다면 이 파일들을
 * public/mediapipe/ 아래에 자체 호스팅하도록 경로만 바꾸면 된다(다음 단계 제안).
 */
const WASM_BASE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const FACE_LANDMARKER_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const FACE_DETECTOR_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";

export class FaceDetectionError extends Error {
  constructor(
    message: string,
    public readonly reason: "NO_FACE" | "MULTIPLE_FACES" | "LOW_CONFIDENCE" | "LANDMARKS_FAILED" | "MODEL_LOAD_FAILED"
  ) {
    super(message);
    this.name = "FaceDetectionError";
  }
}

export interface FaceFeatureResult extends FaceRatios {
  detectionConfidence: number;
}

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
let detectorPromise: Promise<FaceDetector> | null = null;

async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL },
        runningMode: "IMAGE",
        numFaces: 1,
        // 나이/성별/감정 등 민감한 속성 추론 기능은 애초에 이 태스크에 없다 -
        // FaceLandmarker는 기하학적 랜드마크만 반환한다 (지시서 4조 준수).
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    })().catch(() => {
      landmarkerPromise = null;
      throw new FaceDetectionError("얼굴 분석 모델을 불러오지 못했습니다.", "MODEL_LOAD_FAILED");
    });
  }
  return landmarkerPromise;
}

async function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL);
      return FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: FACE_DETECTOR_MODEL_URL },
        runningMode: "IMAGE",
      });
    })().catch(() => {
      detectorPromise = null;
      throw new FaceDetectionError("얼굴 감지 모델을 불러오지 못했습니다.", "MODEL_LOAD_FAILED");
    });
  }
  return detectorPromise;
}

const MIN_CONFIDENCE = 0.5;

/**
 * 정면 사진(HTMLImageElement) 한 장에서 얼굴 특징 비율을 추출한다.
 *
 * 처리 순서:
 *   1) FaceDetector로 먼저 얼굴 개수와 신뢰도를 확인한다 (없음/여러 명/저신뢰도면 여기서 중단 - 지시서 4조).
 *   2) 조건을 통과하면 FaceLandmarker로 478개 랜드마크를 얻는다.
 *   3) faceRatios.ts(순수 함수)로 6개 비율만 계산해서 반환한다.
 *
 * 원본 이미지와 478개 좌표 배열은 이 함수 스코프를 벗어나지 않는다 - 반환값에는
 * 비율 6개 + 신뢰도 1개만 있다.
 */
export async function extractFaceFeatures(image: HTMLImageElement): Promise<FaceFeatureResult> {
  return (await analyzeFace(image)).features;
}

/**
 * extractFaceFeatures와 같은 분석에 더해, 같은 얼굴 점으로 관상도(스케치 그림)를 브라우저 안에서 그린다.
 * features(서버로 가는 값)와 faceMap(이 탭에만 보관하는 그림)을 반드시 따로 반환한다 -
 * faceMap을 features에 섞으면 그림이 서버로 전송되므로 절대 합치지 않는다.
 */
export async function analyzeFace(
  image: HTMLImageElement
): Promise<{ features: FaceFeatureResult; faceMap: FaceMapResult | null }> {
  const detector = await getFaceDetector();
  const detection = detector.detect(image);

  if (!detection.detections || detection.detections.length === 0) {
    throw new FaceDetectionError("사진에서 얼굴을 찾지 못했습니다. 정면을 밝게 비춰 다시 촬영해주세요.", "NO_FACE");
  }
  if (detection.detections.length > 1) {
    throw new FaceDetectionError("한 명의 얼굴만 나오도록 다시 촬영해주세요.", "MULTIPLE_FACES");
  }

  const confidence = detection.detections[0]?.categories?.[0]?.score ?? 0;
  if (confidence < MIN_CONFIDENCE) {
    throw new FaceDetectionError("얼굴을 충분히 인식하지 못했습니다. 밝은 곳에서 정면으로 다시 촬영해주세요.", "LOW_CONFIDENCE");
  }

  const landmarker = await getFaceLandmarker();
  const result = landmarker.detect(image);

  const landmarks = result.faceLandmarks?.[0];
  if (!landmarks) {
    throw new FaceDetectionError("얼굴 윤곽을 분석하지 못했습니다. 다시 촬영해주세요.", "LANDMARKS_FAILED");
  }

  try {
    const ratios = computeFaceRatios(landmarks);
    return { features: { ...ratios, detectionConfidence: confidence }, faceMap: drawFaceMap(image, landmarks) };
  } catch (err) {
    if (err instanceof InsufficientLandmarksError) {
      throw new FaceDetectionError("얼굴 윤곽을 충분히 분석하지 못했습니다. 다시 촬영해주세요.", "LANDMARKS_FAILED");
    }
    throw err;
  }
}
