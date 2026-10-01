"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FaceResultResponse, FaceApiErrorResponse } from "@/server/face/types";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { faceTypeName } from "@/lib/faceType";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: FaceResultResponse };

const FEATURE_LABELS: Array<{ key: keyof FaceResultResponse["result"]["features"]; label: string }> = [
  { key: "faceShape", label: "얼굴형" },
  { key: "forehead", label: "이마" },
  { key: "eyes", label: "눈매" },
  { key: "nose", label: "코" },
  { key: "mouth", label: "입매" },
  { key: "jaw", label: "턱선" },
];

function FaceResultBody() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!id) {
      setState({ status: "error", message: "잘못된 접근입니다. 다시 분석을 시작해주세요." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/face/result/${encodeURIComponent(id)}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          const err = data as FaceApiErrorResponse;
          setState({ status: "error", message: err.error?.message ?? "결과를 불러오지 못했습니다." });
          return;
        }
        setState({ status: "done", data: data as FaceResultResponse });
      } catch {
        if (!cancelled) setState({ status: "error", message: "네트워크 오류가 발생했습니다." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === "loading") return <LoadingState message="관상 풀이를 준비하고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/face" linkLabel="다시 시작하기" />;

  const { nickname, result, buckets } = state.data;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8">
        <p className="section-label mb-1.5">관상 풀이 결과</p>
        <h1 className="text-[26px] font-bold leading-snug">{nickname}님의 관상</h1>
        <span
          className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
        >
          관상 유형 · {faceTypeName(buckets)}
        </span>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          {result.disclaimer}
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-4 text-base font-semibold">얼굴 특징 풀이</h2>
        <div className="space-y-6">
          {FEATURE_LABELS.map(({ key, label }, i) => (
            <div key={key}>
              {i > 0 && <div className="hairline mb-6" />}
              <h3 className="mb-1.5 text-[15px] font-semibold">{label}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                {result.features[key]}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 rounded-xl px-4 py-4" style={{ backgroundColor: "var(--color-ink)", color: "var(--color-paper)" }}>
        <h2 className="mb-1.5 text-sm font-medium" style={{ color: "var(--color-paper-soft)" }}>
          어울리는 인연 (미리보기)
        </h2>
        <p className="text-sm leading-relaxed">{result.idealPartnerPreview}</p>
      </section>

      <div className="space-y-2.5">
        {id && (
          <a href={`/face/products?resultId=${encodeURIComponent(id)}`} className="btn-primary block">
            인연 관상까지 깊게 보러가기 (유료)
          </a>
        )}
        <a href="/face" className="block py-2 text-center text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          다시 분석하기
        </a>
      </div>
    </main>
  );
}

export default function FaceResultPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <FaceResultBody />
    </Suspense>
  );
}
