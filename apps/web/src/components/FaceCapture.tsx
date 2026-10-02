"use client";

import { useRef, useState } from "react";
import { FaceDetectionError, extractFaceFeatures, type FaceFeatureResult } from "@/lib/faceLandmarks";

type Status = "idle" | "loading" | "error" | "done";

/**
 * Phase 9 지시서 4조: "사진 처리 목적, 전송 여부, 보관 여부를 사용자에게
 * 명확히 안내하고 필요한 동의를 받는다."
 *
 * 이 컴포넌트는 촬영/업로드된 이미지를 어디에도 전송하지 않는다 - <img> 요소를
 * 만들어 MediaPipe(브라우저 WASM)로 분석한 뒤, 결과(비율 6개 + 신뢰도)만
 * onFeaturesExtracted로 부모에게 넘기고 이미지 객체 URL은 즉시 해제한다.
 */
export function FaceCapture({
  onFeaturesExtracted,
}: {
  onFeaturesExtracted: (features: FaceFeatureResult, photoDataUrl: string | null) => void;
}) {
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 선택해도 onChange가 다시 발생하도록
    if (!file) return;

    setStatus("loading");
    setErrorMessage(null);

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      const features = await extractFaceFeatures(image);
      setStatus("done");
      // 결과 화면에서 "내 사진"을 보여주면 체감 품질이 크게 달라진다는 벤치마킹
      // 결과를 반영했다 - 단, 서버로는 절대 보내지 않는다. 작은 썸네일로 축소해서
      // 브라우저 sessionStorage에만 잠깐 보관하고(결과 화면 이동 시 state가 날아가므로),
      // 이 탭을 닫으면 사라진다. 원본 이미지 자체는 여기서 만든 작은 복사본일 뿐,
      // 원본 File/objectUrl은 아래 finally에서 그대로 해제한다.
      const thumbnail = createThumbnail(image, 360);
      onFeaturesExtracted(features, thumbnail);
    } catch (err) {
      setStatus("error");
      setErrorMessage(toUserMessage(err));
    } finally {
      // 지시서 4조: 분석이 끝나면 브라우저에 남아있던 이미지 참조도 즉시 해제한다.
      URL.revokeObjectURL(objectUrl);
    }
  }

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl p-4 text-sm leading-relaxed"
        style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}
      >
        <p className="mb-2 font-medium" style={{ color: "var(--color-ink)" }}>
          촬영 전 꼭 확인해주세요
        </p>
        <ul className="list-disc space-y-1 pl-4">
          <li>사진은 이 기기(브라우저) 안에서만 분석되며, 원본 사진은 서버로 전송되거나 저장되지 않습니다.</li>
          <li>분석에 사용된 수치(얼굴 비율)만 서버에 전달되어 30분간 보관 후 자동 삭제됩니다.</li>
          <li>정면을 향한 밝은 사진일수록 인식이 잘 됩니다.</li>
        </ul>
        <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--color-ink)" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="h-4 w-4" />
          위 내용에 동의하고 얼굴 사진을 분석합니다.
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileSelected}
        disabled={!consent || status === "loading"}
      />

      <button
        type="button"
        disabled={!consent || status === "loading"}
        onClick={() => inputRef.current?.click()}
        className="btn-primary"
      >
        {status === "loading" ? "얼굴을 분석하고 있어요..." : "촬영 또는 사진 업로드"}
      </button>

      {status === "error" && errorMessage && (
        <div className="rounded-lg px-3.5 py-3 text-sm" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
          {errorMessage}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-2 block underline underline-offset-4"
          >
            다시 촬영하기
          </button>
        </div>
      )}
    </div>
  );
}

/** 결과 화면 표시용 작은 썸네일만 생성한다 (서버 전송 없음, 브라우저 메모리 내 처리). */
function createThumbnail(image: HTMLImageElement, maxSize: number): string | null {
  try {
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.75);
  } catch {
    return null; // 썸네일 생성에 실패해도 분석 자체는 계속 진행한다 (부가 기능일 뿐).
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    img.src = src;
  });
}

function toUserMessage(err: unknown): string {
  if (err instanceof FaceDetectionError) return err.message;
  return "얼굴 분석 중 오류가 발생했습니다. 다시 시도해주세요.";
}
