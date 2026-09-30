"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LoadingState, ErrorState } from "@/components/StatusScreens";

interface FaceAiResult {
  selfAnalysis: {
    faceShape: string;
    forehead: string;
    eyes: string;
    nose: string;
    mouth: string;
    jaw: string;
    overallSummary: string;
  };
  relationshipInsight: {
    traditionalLoveTendency: string;
    idealPartnerTraits: string;
    partnerFeatureNotes: string;
    harmonyPoints: string;
    userPreferenceNote: string | null;
  };
  disclaimer: string;
}

interface FacePaidResultResponse {
  nickname: string;
  productType: "FACE_PREMIUM";
  result: FaceAiResult;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: FacePaidResultResponse };

const SELF_LABELS: Array<{ key: keyof FaceAiResult["selfAnalysis"]; label: string }> = [
  { key: "faceShape", label: "얼굴형" },
  { key: "forehead", label: "이마" },
  { key: "eyes", label: "눈매" },
  { key: "nose", label: "코" },
  { key: "mouth", label: "입매" },
  { key: "jaw", label: "턱선" },
  { key: "overallSummary", label: "종합 해석" },
];

/**
 * 지시서 2-C조: 아래 세 가지를 화면에서도 명확히 구분해서 보여준다 -
 *   1) 사용자 얼굴 특징에서 출발한 해석 (idealPartnerTraits)
 *   2) 전통 관상학에서 조화롭다고 말하는 "일반적" 상대 특징 (partnerFeatureNotes) - 실제 상대 아님을 라벨로 명시
 *   3) 사용자가 직접 입력한 선호 (userPreferenceNote) - 있을 때만 표시
 */
function FacePaidResultBody() {
  const searchParams = useSearchParams();
  const entitlement = searchParams.get("entitlement");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!entitlement) {
      setState({ status: "error", message: "잘못된 접근입니다." });
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/face/paid-result?entitlement=${encodeURIComponent(entitlement)}`);
        const data = await res.json();
        if (!res.ok) {
          setState({ status: "error", message: data?.error?.message ?? "결과를 불러오지 못했습니다." });
          return;
        }
        setState({ status: "done", data });
      } catch {
        setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
      }
    })();
  }, [entitlement]);

  if (state.status === "loading") return <LoadingState message="관상 심층 해석을 준비하고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/face" linkLabel="처음으로" />;

  const { nickname, result } = state.data;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="section-label mb-1.5">결제 완료 · 관상 심층 해석</p>
        <h1 className="text-[26px] font-bold leading-snug">{nickname}님의 관상 심층 해석</h1>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          {result.disclaimer}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          본인 관상 상세 분석
        </h2>
        <div className="space-y-6">
          {SELF_LABELS.map(({ key, label }, i) => (
            <div key={key}>
              {i > 0 && <div className="hairline mb-6" />}
              <h3 className="mb-1.5 text-[15px] font-semibold">{label}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {result.selfAnalysis[key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-1 text-lg font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          인연 관상 해석
        </h2>
        <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          아래 내용은 실제 상대방의 사진을 분석한 결과가 아니라, 전통 관상학에서 일반적으로 이야기되는 참고
          해석입니다.
        </p>
        <div className="space-y-6">
          <div>
            <h3 className="mb-1.5 text-[15px] font-semibold">연애·관계 전통적 해석</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {result.relationshipInsight.traditionalLoveTendency}
            </p>
          </div>
          <div className="hairline" />
          <div>
            <h3 className="mb-1.5 text-[15px] font-semibold">어울리는 인연의 관상적 특징</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {result.relationshipInsight.idealPartnerTraits}
            </p>
          </div>
          <div className="hairline" />
          <div>
            <h3 className="mb-1.5 text-[15px] font-semibold">
              상대방 특징에 대한 전통적 해석{" "}
              <span className="text-xs font-normal" style={{ color: "var(--color-ink-faint)" }}>
                (일반론 · 실제 상대 분석 아님)
              </span>
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {result.relationshipInsight.partnerFeatureNotes}
            </p>
          </div>
          <div className="hairline" />
          <div>
            <h3 className="mb-1.5 text-[15px] font-semibold">관계에서 살펴볼 조화 포인트</h3>
            <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              {result.relationshipInsight.harmonyPoints}
            </p>
          </div>
          {result.relationshipInsight.userPreferenceNote && (
            <>
              <div className="hairline" />
              <div className="rounded-lg p-3.5" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                <h3 className="mb-1.5 text-[15px] font-semibold">
                  입력하신 선호{" "}
                  <span className="text-xs font-normal" style={{ color: "var(--color-ink-faint)" }}>
                    (직접 입력 반영)
                  </span>
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                  {result.relationshipInsight.userPreferenceNote}
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      <a href="/" className="block py-2 text-center text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
        처음으로
      </a>
    </main>
  );
}

export default function FacePaidResultPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <FacePaidResultBody />
    </Suspense>
  );
}
