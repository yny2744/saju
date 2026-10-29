import { buildPartnerImagePrompt } from "@/server/face/partnerImage";
import { partnerBuckets, partnerSummary } from "@/lib/facePartner";
import { buildFaceDeepPrompt, parseFaceDeep, parsePhotoDataUrl, writeFaceDeep, MAX_PHOTO_BYTES } from "@/server/face/faceVision";
import { isPurchaseMode, planPurchase, productName } from "@/server/readings/readings";
import { parseProduct } from "@/server/reviews/reviews";
import { reviewProductLabel } from "@/lib/reviews";
import { PRICE } from "@/lib/yeopjeon";
import type { FaceFeatureBuckets } from "@/server/face/types";

const BUCKETS: FaceFeatureBuckets = { faceShape: "mid", forehead: "high", eyeSpacing: "low", nose: "mid", mouth: "high", jaw: "low" };

const AI = {
  selfAnalysis: { faceShape: "a", forehead: "b", eyes: "c", nose: "d", mouth: "e", jaw: "f", overallSummary: "g" },
  photoHighlights: "눈썹 결이 고르고 입꼬리가 올라가 있어요.",
  relationshipInsight: { traditionalLoveTendency: "h", idealPartnerTraits: "i", partnerFeatureNotes: "j", harmonyPoints: "k", userPreferenceNote: null },
  disclaimer: "z",
};

describe("수정안 53 - 관상 심층 풀이", () => {
  it("상품: 4,900냥 · 구매 종류 face", () => {
    expect(PRICE.FACE).toBe(5500);
    expect(isPurchaseMode("face")).toBe(true);
    expect(planPurchase("face", [], [])).toEqual({ topics: [], price: 5500 });
    expect(productName("face", [])).toBe("관상 심층 풀이 · 인연 궁합");
  });

  it("후기 상품 키·이름", () => {
    expect(parseProduct("face")).toEqual({ kind: "face" });
    expect(reviewProductLabel("face")).toBe("관상 심층 풀이");
  });

  it("사진 data URL 검사 - JPEG/PNG/WebP base64만, 너무 크면 거절", () => {
    expect(parsePhotoDataUrl("data:image/jpeg;base64,AAAA")).toEqual({ mime: "image/jpeg", data: "AAAA" });
    expect(parsePhotoDataUrl("data:image/gif;base64,AAAA")).toBeNull();
    expect(parsePhotoDataUrl("https://example.com/a.jpg")).toBeNull();
    expect(parsePhotoDataUrl(123)).toBeNull();
    const big = "A".repeat(Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 8);
    expect(parsePhotoDataUrl(`data:image/jpeg;base64,${big}`)).toBeNull();
  });

  it("프롬프트: 사진 있음/없음 안내, 선호는 있을 때만", () => {
    const withPhoto = buildFaceDeepPrompt(BUCKETS, "차분한 사람", true);
    expect(withPhoto).toContain("정면 사진이 함께");
    expect(withPhoto).toContain("이마 비율: 높음");
    expect(withPhoto).toContain("차분한 사람");
    const plain = buildFaceDeepPrompt(BUCKETS, null, false);
    expect(plain).toContain("photoHighlights는 null");
    expect(plain).not.toContain("선호");
  });

  it("AI 답 검사: 사진을 안 봤으면 사진 특징 칸은 버린다", () => {
    const withPhoto = parseFaceDeep(JSON.stringify(AI), true, "m");
    expect(withPhoto.photoHighlights).toContain("눈썹");
    expect(withPhoto.photoUsed).toBe(true);
    const plain = parseFaceDeep("```json\n" + JSON.stringify(AI) + "\n```", false, "m");
    expect(plain.photoHighlights).toBeNull();
    expect(plain.photoUsed).toBe(false);
    expect(() => parseFaceDeep(JSON.stringify({ ...AI, selfAnalysis: {} }), true, "m")).toThrow();
  });

  it("키가 없는 개발 환경: 사진이 있어도 AI에 보내지 않고 개발용 글 (photoUsed=false)", async () => {
    const keep = { a: process.env.ANTHROPIC_API_KEY, g: process.env.GEMINI_API_KEY };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const spy = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const r = await writeFaceDeep(BUCKETS, null, { mime: "image/jpeg", data: "AAAA" });
      expect(r.photoUsed).toBe(false);
      expect(r.photoHighlights).toBeNull();
      expect(r.selfAnalysis.overallSummary).toContain("개발 환경");
    } finally {
      spy.mockRestore();
      if (keep.a) process.env.ANTHROPIC_API_KEY = keep.a;
      if (keep.g) process.env.GEMINI_API_KEY = keep.g;
    }
  });
});

describe("수정안 56 - 인연 관상도", () => {
  it("음양 조화: 둥근 얼굴 ↔ 갸름한 얼굴, 이마·코는 한 단계 밝게", () => {
    const p = partnerBuckets(BUCKETS);
    expect(p).toEqual({ faceShape: "mid", forehead: "mid", eyeSpacing: "high", nose: "mid", mouth: "low", jaw: "high" });
    const q = partnerBuckets({ faceShape: "low", forehead: "low", eyeSpacing: "mid", nose: "low", mouth: "mid", jaw: "low" });
    expect(q).toEqual({ faceShape: "high", forehead: "high", eyeSpacing: "mid", nose: "high", mouth: "mid", jaw: "high" });
  });
  it("유료 풀이 프롬프트에 인연 관상도 특징이 들어가 그림과 글이 맞는다", () => {
    const text = buildFaceDeepPrompt(BUCKETS, null, false);
    expect(text).toContain(partnerSummary(partnerBuckets(BUCKETS)));
    expect(text).toContain("또렷한 턱선");
  });
});

describe("수정안 58 - 인연 얼굴 그리기 문장", () => {
  it("성별·특징·다른 사람·정면 조건이 들어간다", () => {
    const p = partnerBuckets(BUCKETS);
    const f = buildPartnerImagePrompt("female", p);
    expect(f).toContain("woman with long straight dark hair");
    expect(f).toContain("clearly DIFFERENT person");
    expect(f).toContain("a clearly defined jawline");
    expect(f).toContain("forehead fully visible");
    expect(buildPartnerImagePrompt("male", p)).toContain("man with short, neat dark hair");
  });
});
