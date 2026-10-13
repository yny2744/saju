import { requireAdmin } from "@/server/admin/admin";
import { notifyError } from "@/server/alert";
import { partnerBuckets, partnerSummary } from "@/lib/facePartner";
import { bucketizeFeatures, validateFaceAnalyzeInput } from "./validateFaceFeatures";
import { parsePhotoDataUrl } from "./faceVision";
import type { FaceFeatureBuckets, FeatureBucket } from "./types";

/**
 * 인연 얼굴 그리기 (2026-10-13 수정안 58 - 관리자 시험 단계).
 *   손님 사진을 "분위기·나이대·사진 느낌"만 참고해, 다른 사람인 가상의 인연 얼굴 사진을 AI(Gemini 이미지 모델)가 한 장 그린다.
 *   화면은 그 사진을 무료 관상과 같은 기능(analyzeFace → drawFaceMap)으로 연필 스케치 관상도로 바꿔 보여 준다.
 *   사진·그림은 저장하지 않는다. 지금은 관리자만 쓸 수 있다 - 품질을 확인한 뒤 4,900냥 심층 풀이에 붙인다.
 */

export type PartnerGender = "female" | "male";

const EN: Record<keyof FaceFeatureBuckets, Record<FeatureBucket, string>> = {
  faceShape: { low: "a soft, rounded full face", mid: "a balanced oval face", high: "a long, slender, elegant face" },
  forehead: { low: "a modest forehead", mid: "a smooth, even forehead", high: "a broad, bright forehead" },
  eyeSpacing: { low: "eyes set slightly close together, clear and focused", mid: "well-balanced eyes", high: "gentle eyes set comfortably apart" },
  nose: { low: "a small soft nose", mid: "a straight, well-proportioned nose", high: "a straight, defined nose bridge" },
  mouth: { low: "a small, neat mouth", mid: "a soft, balanced mouth", high: "a generous, expressive mouth" },
  jaw: { low: "a soft, gentle jawline", mid: "a neat jawline", high: "a clearly defined jawline" },
};

export function buildPartnerImagePrompt(gender: PartnerGender, partner: FaceFeatureBuckets): string {
  const who = gender === "female" ? "woman with long straight dark hair, neatly pulled back behind the shoulders" : "man with short, neat dark hair";
  const traits = (Object.keys(EN) as Array<keyof FaceFeatureBuckets>).map((k) => EN[k][partner[k]]).join(", ");
  return [
    `Create a NEW photorealistic portrait photo of a fictional Korean ${who}.`,
    "This must be a clearly DIFFERENT person from the one in the reference photo - do not copy their identity, face or features.",
    "Use the reference photo only for the overall age range, mood and photo style.",
    `The new person should have: ${traits}.`,
    "Composition: ID-photo style, facing the camera straight on, head and shoulders, calm and warm expression with mouth closed,",
    "forehead fully visible (no bangs), both ears visible, no glasses, no hat, no jewelry,",
    "soft even studio lighting, plain light beige background, exactly one person, sharp focus, natural skin, no text, no watermark.",
  ].join(" ");
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export async function generatePartnerImage(
  photo: { mime: string; data: string },
  gender: PartnerGender,
  partner: FaceFeatureBuckets
): Promise<{ mime: string; data: string; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY가 없어 그림을 만들 수 없어요.");
  const model = process.env.FACE_IMAGE_MODEL || "gemini-2.5-flash-image";
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ inline_data: { mime_type: photo.mime, data: photo.data } }, { text: buildPartnerImagePrompt(gender, partner) }] }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });
  let last: unknown;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${key}`, { method: "POST", headers: { "content-type": "application/json" }, body });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`Gemini 그림 오류 (status ${res.status}): ${t.slice(0, 400)}`);
      }
      const json = (await res.json()) as {
        candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } }> } }>;
      };
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      for (const p of parts) {
        const d = p.inlineData ?? (p.inline_data ? { mimeType: p.inline_data.mime_type, data: p.inline_data.data } : undefined);
        if (d?.data) return { mime: d.mimeType || "image/png", data: d.data, model };
      }
      const said = parts.map((p) => p.text).filter(Boolean).join(" ").slice(0, 300);
      throw new Error(`그림이 오지 않았어요 (${json.candidates?.[0]?.finishReason ?? "이유 없음"})${said ? `: ${said}` : ""}`);
    } catch (e) {
      last = e;
      if (!/status (429|500|502|503|504)|fetch failed|ECONNRESET/i.test(String(e))) break;
      await new Promise((r) => setTimeout(r, 2500));
    }
  }
  throw last;
}

type Out = { status: number; body: unknown };
const err = (status: number, code: string, message: string): Out => ({ status, body: { error: { code, message } } });

/** 관리자 시험: { photo: dataURL, gender, features } → { image: dataURL, partner: 특징 글, model, ms } */
export async function handleAdminPartnerFace(token: string | undefined, raw: unknown): Promise<Out> {
  const a = await requireAdmin(token);
  if (!a.ok) return a;
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const photo = parsePhotoDataUrl(b.photo);
  if (!photo) return err(400, "INVALID_PHOTO", "사진을 읽지 못했어요.");
  const gender: PartnerGender = b.gender === "male" ? "male" : "female";
  const v = validateFaceAnalyzeInput({ nickname: "관리자", consent: true, features: b.features });
  if (!v.ok) return err(400, "INVALID_FEATURES", v.issues.join(" "));
  const partner = partnerBuckets(bucketizeFeatures(v.value.features));
  const t0 = Date.now();
  try {
    const img = await generatePartnerImage(photo, gender, partner);
    return { status: 200, body: { image: `data:${img.mime};base64,${img.data}`, partner: partnerSummary(partner), model: img.model, ms: Date.now() - t0 } };
  } catch (e) {
    notifyError("인연 얼굴 그리기(관리자 시험)", e);
    return err(502, "IMAGE_FAILED", e instanceof Error ? e.message : String(e));
  }
}
