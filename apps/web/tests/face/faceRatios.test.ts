import { computeFaceRatios, InsufficientLandmarksError, type Point2D } from "../../src/lib/faceRatios";

/**
 * 478개 랜드마크 전부를 준비할 수 없으므로, 계산에 실제로 쓰이는 인덱스만
 * 의미 있는 좌표로 채우고 나머지는 (0,0) 더미로 채운 합성 픽스처를 사용한다.
 * 목적은 "실제 얼굴처럼 보이는가"가 아니라 "거리 계산 공식이 정확한가"이다.
 */
function fixtureLandmarks(): Point2D[] {
  const points: Point2D[] = Array.from({ length: 478 }, () => ({ x: 0, y: 0 }));
  const set = (index: number, x: number, y: number) => {
    points[index] = { x, y };
  };

  set(10, 0.5, 0.1); // foreheadTop
  set(152, 0.5, 0.9); // chin  -> faceLength = 0.8
  set(234, 0.3, 0.5); // cheekLeft
  set(454, 0.7, 0.5); // cheekRight -> faceWidth = 0.4
  set(33, 0.35, 0.4); // eyeLeftOuter
  set(133, 0.45, 0.4); // eyeLeftInner -> eyeWidthLeft = 0.1
  set(362, 0.55, 0.4); // eyeRightInner
  set(263, 0.65, 0.4); // eyeRightOuter -> eyeWidthRight = 0.1, eyeSpacing = 0.1
  set(6, 0.5, 0.45); // noseBridge
  set(2, 0.5, 0.6); // noseBase -> noseLength = 0.15
  set(1, 0.5, 0.62); // noseTip -> noseWidth = 0.02
  set(61, 0.4, 0.75); // mouthLeft
  set(291, 0.6, 0.75); // mouthRight -> mouthWidth = 0.2
  set(172, 0.32, 0.8); // jawLeft
  set(397, 0.68, 0.8); // jawRight -> jawWidth = 0.36
  set(9, 0.5, 0.42); // glabella -> foreheadHeight = 0.32

  return points;
}

describe("computeFaceRatios (지시서 4조 - 좌표 축약 계산)", () => {
  test("478개 미만이면 InsufficientLandmarksError를 던진다 (임의 값으로 채우지 않음)", () => {
    expect(() => computeFaceRatios([{ x: 0, y: 0 }])).toThrow(InsufficientLandmarksError);
  });

  test("주어진 좌표로부터 6개 비율을 정확히 계산한다", () => {
    const ratios = computeFaceRatios(fixtureLandmarks());

    expect(ratios.faceLengthToWidthRatio).toBeCloseTo(0.8 / 0.4, 5); // 2.0
    expect(ratios.foreheadHeightRatio).toBeCloseTo(0.32 / 0.8, 5); // 0.4
    expect(ratios.eyeSpacingRatio).toBeCloseTo(0.1 / 0.1, 5); // 1.0
    expect(ratios.noseLengthToWidthRatio).toBeCloseTo(0.15 / 0.02, 5); // 7.5
    expect(ratios.mouthWidthRatio).toBeCloseTo(0.2 / 0.4, 5); // 0.5
    expect(ratios.jawWidthRatio).toBeCloseTo(0.36 / 0.4, 5); // 0.9
  });

  test("계산 결과는 어떤 값도 NaN이나 Infinity가 아니다 (0으로 나누기 방어)", () => {
    const ratios = computeFaceRatios(fixtureLandmarks());
    for (const value of Object.values(ratios)) {
      expect(Number.isFinite(value)).toBe(true);
    }
  });
});
