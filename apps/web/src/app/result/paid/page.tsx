"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUCT_CATALOG, isCommerceProductType } from "@/server/products";
import { engineProductLabel } from "@/lib/analysisLabels";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { AnalysisSection } from "@/components/AnalysisSection";

interface PaidResultResponse {
  nickname: string;
  productType: "BASIC" | "PREMIUM";
  results: Record<string, { analysis: Record<string, unknown>; disclaimer: string }>;
}

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: PaidResultResponse };

/**
 * 지시서 13조: "URL의 단순 파라미터(?paid=true)를 믿고 권한을 부여하지 않는다."
 * 이 화면은 URL에 무엇이 있든 신경 쓰지 않는다 - entitlement 토큰을 서버에 보내
 * 서버가 서명을 검증해야만(GET /api/saju/paid-result) 실제 유료 콘텐츠를 받는다.
 *
 * Phase 8: 화면 표현만 개선 - entitlement 검증 흐름과 API 호출은 그대로다.
 */
function PaidResultBody() {
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
        const res = await fetch(`/api/saju/paid-result?entitlement=${encodeURIComponent(entitlement)}`);
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

  if (state.status === "loading") {
    return <LoadingState message="결제하신 심층 해석을 불러오고 있어요..." />;
  }
  if (state.status === "error") {
    return <ErrorState message={state.message} linkHref="/" linkLabel="처음으로" />;
  }

  const { nickname, productType, results } = state.data;
  const productLabel = isCommerceProductType(productType) ? PRODUCT_CATALOG[productType].name : productType;
  const sections = Object.entries(results);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="section-label mb-1.5">결제 완료 · 심층 해석</p>
        <h1 className="text-[26px] font-bold leading-snug">
          {nickname}님의 {productLabel}
        </h1>
        <p className="mt-2 text-xs" style={{ color: "var(--color-ink-faint)" }}>
          결제가 정상적으로 확인되어 심층 해석을 제공합니다.
        </p>
      </header>

      <div className="space-y-10">
        {sections.map(([engineProductType, result], sectionIndex) => {
          const entries = Object.entries(result.analysis);
          return (
            <section key={engineProductType}>
              {sectionIndex > 0 && <div className="hairline mb-8" />}
              <h2 className="mb-4 text-lg font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {engineProductLabel(engineProductType)}
              </h2>
              <div className="space-y-6">
                {entries.map(([key, value], i) => (
                  <div key={key}>
                    {i > 0 && <div className="hairline mb-6" />}
                    <AnalysisSection fieldKey={key} value={value} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <a href="/" className="mt-10 block py-2 text-center text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
        처음으로
      </a>
    </main>
  );
}

export default function PaidResultPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <PaidResultBody />
    </Suspense>
  );
}
