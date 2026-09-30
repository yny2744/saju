import { StatelessFaceResultStore, saveFaceResult, getFaceResult } from "../../src/server/face/faceResultStore";
import type { FaceResultResponse } from "../../src/server/face/types";

function fakeResult(overrides: Partial<FaceResultResponse> = {}): FaceResultResponse {
  return {
    nickname: "관상테스트",
    buckets: { faceShape: "mid", forehead: "mid", eyeSpacing: "mid", nose: "mid", mouth: "mid", jaw: "mid" },
    result: {
      features: { faceShape: "설명", forehead: "설명", eyes: "설명", nose: "설명", mouth: "설명", jaw: "설명" },
      idealPartnerPreview: "미리보기",
      disclaimer: "문화 콘텐츠",
    },
    relationshipPreference: null,
    ...overrides,
  };
}

describe("faceResultStore (Phase 9 지시서 4조/7조 - 무상태 암호화 토큰)", () => {
  test("저장 후 같은 id로 조회하면 그대로 돌아온다", () => {
    const value = fakeResult();
    const { id } = saveFaceResult(value);
    expect(getFaceResult(id)).toEqual(value);
  });

  test("id에는 원본 데이터(닉네임 등)가 평문으로 포함되지 않는다", () => {
    const { id } = saveFaceResult(fakeResult({ nickname: "노출되면안됨" }));
    expect(id).not.toContain("노출되면안됨");
  });

  test("존재하지 않는 id를 조회하면 null을 반환한다", () => {
    expect(getFaceResult("not.a.validtoken")).toBeNull();
    expect(getFaceResult("")).toBeNull();
  });

  test("토큰이 위변조되면 조회에 실패한다", () => {
    const { id } = saveFaceResult(fakeResult());
    // resultStore.test.ts와 동일한 이유로 맨 끝이 아니라 첫 글자(IV 세그먼트,
    // 12바이트 고정이라 base64url 패딩 경계 문제가 없음)를 변조한다.
    const tampered = (id[0] === "A" ? "B" : "A") + id.slice(1);
    expect(getFaceResult(tampered)).toBeNull();
  });

  test("서로 다른 저장은 서로 다른 id를 받는다", () => {
    const a = saveFaceResult(fakeResult());
    const b = saveFaceResult(fakeResult());
    expect(a.id).not.toBe(b.id);
  });

  test("만료 시각이 지난 토큰은 null을 반환한다", () => {
    const store = new StatelessFaceResultStore();
    const realNow = Date.now;
    try {
      const { id } = store.save(fakeResult());
      Date.now = () => realNow() + 31 * 60 * 1000; // TTL(30분) 초과
      expect(store.get(id)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });

  test("relationshipPreference를 포함해 왕복 저장/조회된다", () => {
    const value = fakeResult({ relationshipPreference: "차분한 성격 선호" });
    const { id } = saveFaceResult(value);
    expect(getFaceResult(id)?.relationshipPreference).toBe("차분한 성격 선호");
  });
});
