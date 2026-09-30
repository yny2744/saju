"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaceCapture } from "@/components/FaceCapture";
import type { FaceFeatureResult } from "@/lib/faceLandmarks";

/**
 * Phase 9 지시서 3조: "관상 서비스는 사주 결과가 없어도 독립적으로 이용할 수
 * 있어야 한다." - 이 화면은 /result?id=... 같은 선행 조건 없이 바로 진입 가능하다.
 */
export default function FaceEntryPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [relationshipPreference, setRelationshipPreference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  async function handleFeatures(features: FaceFeatureResult) {
    if (!nickname.trim()) {
      setIssues(["닉네임을 입력해주세요."]);
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setIssues([]);

    try {
      const res = await fetch("/api/face/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nickname,
          consent: true, // FaceCapture는 동의 체크 후에만 features를 만들어낸다
          features,
          relationshipPreference: relationshipPreference || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setIssues(data?.error?.issues ?? [data?.error?.message ?? "분석 요청에 실패했습니다."]);
        setSubmitting(false);
        return;
      }

      router.push(`/face/result?id=${encodeURIComponent(data.id)}`);
    } catch {
      setIssues(["네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요."]);
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 pb-16 pt-12 sm:pt-16">
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {["무료", "회원가입 불필요", "사진 서버 전송 안 함"].map((badge) => (
            <span
              key={badge}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium"
              style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              {badge}
            </span>
          ))}
        </div>
        <h1 className="text-[26px] font-bold leading-snug">
          얼굴로 보는
          <br />
          전통 관상 풀이
        </h1>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          정면 사진 한 장으로 얼굴형·이마·눈·코·입·턱을 전통 관상학 관점에서 참고용으로 풀어드려요. 어울리는 인연의
          특징도 간략히 미리 볼 수 있어요.
        </p>
      </header>

      <div className="mb-6 space-y-4">
        <div>
          <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium">
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            required
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="field-input"
            placeholder="결과 화면에 표시될 이름"
          />
        </div>

        <div>
          <label htmlFor="preference" className="mb-1.5 block text-sm font-medium">
            연애·관계에서 중요하게 생각하는 점 <span style={{ color: "var(--color-ink-faint)" }}>(선택)</span>
          </label>
          <input
            id="preference"
            type="text"
            maxLength={200}
            value={relationshipPreference}
            onChange={(e) => setRelationshipPreference(e.target.value)}
            className="field-input"
            placeholder="예: 차분하고 배려심 있는 사람을 좋아해요"
          />
          <p className="mt-1 text-xs" style={{ color: "var(--color-ink-faint)" }}>
            입력하시면 유료 심층 해석에서 참고해 코멘트를 더해드려요.
          </p>
        </div>
      </div>

      <FaceCapture onFeaturesExtracted={handleFeatures} />

      {submitting && (
        <p className="mt-4 text-center text-sm" style={{ color: "var(--color-ink-soft)" }}>
          결과를 준비하고 있어요...
        </p>
      )}

      {issues.length > 0 && (
        <ul
          className="mt-4 rounded-lg px-3.5 py-3 text-sm"
          style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
        >
          {issues.map((issue) => (
            <li key={issue}>{issue}</li>
          ))}
        </ul>
      )}
    </main>
  );
}
