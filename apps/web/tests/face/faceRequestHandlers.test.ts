import {
  handleFaceAnalyzeRequest,
  handleGetFaceResult,
  handleGetFacePaidResult,
} from "../../src/server/face/faceRequestHandlers";
import { issueEntitlement } from "../../src/server/entitlement";
import { saveFaceResult } from "../../src/server/face/faceResultStore";
import type { FaceResultResponse } from "../../src/server/face/types";

function validFeatures() {
  return {
    faceLengthToWidthRatio: 1.35,
    foreheadHeightRatio: 0.3,
    eyeSpacingRatio: 0.95,
    noseLengthToWidthRatio: 2.0,
    mouthWidthRatio: 0.44,
    jawWidthRatio: 0.78,
    detectionConfidence: 0.9,
  };
}

describe("handleFaceAnalyzeRequest", () => {
  test("정상 요청이면 200과 id를 반환한다", () => {
    const res = handleFaceAnalyzeRequest(
      { nickname: "테스트", consent: true, features: validFeatures() },
      "client-face-1"
    );
    expect(res.status).toBe(200);
    expect((res.body as { id: string }).id).toBeTruthy();
  });

  test("본문이 객체가 아니면 400", () => {
    const res = handleFaceAnalyzeRequest("문자열입니다", "client-face-2");
    expect(res.status).toBe(400);
  });

  test("검증 실패(동의 없음)면 400과 issues를 반환한다", () => {
    const res = handleFaceAnalyzeRequest({ nickname: "테스트", consent: false, features: validFeatures() }, "client-face-3");
    expect(res.status).toBe(400);
    expect((res.body as { error: { issues: string[] } }).error.issues.length).toBeGreaterThan(0);
  });

  test("검증 실패 시 규칙 엔진을 호출하지 않고 즉시 반환한다 (임의 결과 생성 금지)", () => {
    const res = handleFaceAnalyzeRequest({ nickname: "테스트", consent: true, features: { detectionConfidence: 0.01 } }, "client-face-4");
    expect(res.status).toBe(400);
    expect((res.body as { id?: string }).id).toBeUndefined();
  });

  test("같은 clientKey로 과도하게 반복 요청하면 429를 반환한다", () => {
    const key = "client-face-rate-limit";
    let last;
    for (let i = 0; i < 15; i += 1) {
      last = handleFaceAnalyzeRequest({ nickname: "테스트", consent: true, features: validFeatures() }, key);
    }
    expect(last!.status).toBe(429);
  });
});

describe("handleGetFaceResult", () => {
  test("존재하는 id를 조회하면 200과 결과를 반환한다", () => {
    const submit = handleFaceAnalyzeRequest({ nickname: "조회테스트", consent: true, features: validFeatures() }, "client-face-get-1");
    const id = (submit.body as { id: string }).id;
    const res = handleGetFaceResult(id);
    expect(res.status).toBe(200);
    expect((res.body as FaceResultResponse).nickname).toBe("조회테스트");
  });

  test("존재하지 않는 id는 404", () => {
    const res = handleGetFaceResult("not.a.token");
    expect(res.status).toBe(404);
  });

  test("빈 id는 400", () => {
    const res = handleGetFaceResult("");
    expect(res.status).toBe(400);
  });
});

describe("handleGetFacePaidResult", () => {
  function fakeFaceResult(): FaceResultResponse {
    return {
      nickname: "유료테스트",
      buckets: { faceShape: "mid", forehead: "mid", eyeSpacing: "mid", nose: "mid", mouth: "mid", jaw: "mid" },
      result: {
        features: { faceShape: "x", forehead: "x", eyes: "x", nose: "x", mouth: "x", jaw: "x" },
        idealPartnerPreview: "x",
        disclaimer: "x",
      },
      relationshipPreference: null,
    };
  }

  test("유효한 entitlement면 200과 유료 결과를 반환한다 (DevFallback 경유)", async () => {
    const { id: resultId } = saveFaceResult(fakeFaceResult());
    const token = issueEntitlement({ resultId, productType: "FACE_PREMIUM", orderId: "order-1", paidAt: new Date().toISOString() });

    const res = await handleGetFacePaidResult(token);
    expect(res.status).toBe(200);
    expect((res.body as { productType: string }).productType).toBe("FACE_PREMIUM");
  });

  test("entitlement 토큰이 없으면 403", async () => {
    const res = await handleGetFacePaidResult(null);
    expect(res.status).toBe(403);
  });

  test("위조된 entitlement 토큰이면 403", async () => {
    const { id: resultId } = saveFaceResult(fakeFaceResult());
    const token = issueEntitlement({ resultId, productType: "FACE_PREMIUM", orderId: "order-2", paidAt: new Date().toISOString() });
    // 첫 글자(IV 세그먼트) 변조 - resultStore.test.ts와 동일한 이유로 맨 끝
    // 글자 변경 방식의 base64 패딩 경계 문제를 피한다.
    const tampered = (token[0] === "z" ? "y" : "z") + token.slice(1);
    const res = await handleGetFacePaidResult(tampered);
    expect(res.status).toBe(403);
  });

  test("사주 상품 entitlement로는 관상 유료 결과를 조회할 수 없다 (도메인 격리)", async () => {
    const { id: resultId } = saveFaceResult(fakeFaceResult());
    const token = issueEntitlement({ resultId, productType: "BASIC", orderId: "order-3", paidAt: new Date().toISOString() });
    const res = await handleGetFacePaidResult(token);
    expect(res.status).toBe(403);
  });

  test("기반 결과가 만료되었으면 404", async () => {
    const token = issueEntitlement({
      resultId: "존재하지-않는-결과-id",
      productType: "FACE_PREMIUM",
      orderId: "order-4",
      paidAt: new Date().toISOString(),
    });
    const res = await handleGetFacePaidResult(token);
    expect(res.status).toBe(404);
  });
});
