"use client";
import type { FaceMapResult, SamJeong } from "@/lib/faceMap";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { FaceResultResponse, FaceApiErrorResponse } from "@/server/face/types";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { FaceFeatureTable } from "@/components/FaceFeatureTable";
import { faceTypeName } from "@/lib/faceType";

type LoadState = { status: "loading" } | { status: "error"; message: string } | { status: "done"; data: FaceResultResponse };



function FaceResultBody() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [faceMap, setFaceMap] = useState<FaceMapResult | null>(null);

  useEffect(() => {
    // 사진은 서버에서 받아오는 게 아니라, 촬영 직후 같은 브라우저 탭의
    // sessionStorage에 잠깐 저장해둔 것을 읽어올 뿐이다 (없으면 그냥 생략 -
    // 예: 결과 링크를 다른 기기에서 열었거나 탭을 새로 연 경우).
    if (!id) return;
    try {
      setPhotoDataUrl(sessionStorage.getItem(`face_photo_${id}`));
      try {
        const raw = sessionStorage.getItem(`face_map_${id}`);
        setFaceMap(raw ? (JSON.parse(raw) as FaceMapResult) : null);
      } catch {
        setFaceMap(null);
      }
    } catch {
      setPhotoDataUrl(null);
    }
  }, [id]);

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
        <div className="flex items-center gap-4">
          {photoDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- 서버를 거치지 않는 브라우저 로컬 데이터 URL이라 next/image 최적화 대상이 아니다.
            <img
              src={photoDataUrl}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full object-cover"
              style={{ border: "2px solid var(--color-line)" }}
            />
          )}
          <div>
            <h1 className="text-[26px] font-bold leading-snug">{nickname}님의 관상</h1>
            <span
              className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              관상 유형 · {faceTypeName(buckets)}
            </span>
          </div>
        </div>
      </header>

      {faceMap && (
        <section className="mb-8">
          <p className="section-label mb-1">관상도</p>
          <h2 className="mb-3 text-lg font-bold">{nickname}님의 얼굴 지도</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 만든 로컬 data URL */}
          <img src={faceMap.dataUrl} alt="관상도" className="w-full rounded-xl" style={{ border: "1px solid var(--color-line)" }} />
          {faceMap.samjeong ? (
            <SamJeongBar s={faceMap.samjeong} />
          ) : (
            <p className="mt-2 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              이마 위쪽(머리카락 경계)을 찾지 못해 상정은 재지 못했어요. 앞머리를 올리고 이마가 보이게 찍으면 삼정 비율도 볼 수 있어요.
            </p>
          )}
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            사진을 이 기기 안에서 스케치로 바꾼 그림이에요. 사진과 그림은 서버로 보내지 않고, 이 창을 닫으면 사라져요. 부위 위치는 얼굴 점 기준의 참고용이에요.
          </p>
        </section>
      )}

      {/* 얼굴 특징 - 만세력과 같은 표 형식 (부위 · 3단계 눈금 · 키워드, 누르면 풀이) */}
      <section className="mb-8">
        <p className="section-label mb-1">얼굴 특징</p>
        <h2 className="mb-3 text-lg font-bold">
          {faceTypeName(buckets)} 얼굴이에요
        </h2>
        <FaceFeatureTable buckets={buckets} texts={result.features} />
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

      <p className="mt-8 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        {result.disclaimer}
      </p>
    </main>
  );
}

function SamJeongBar({ s }: { s: SamJeong }) {
  const rows: Array<[string, string, number]> = [
    ["상정", "이마 · 초년", s.upper],
    ["중정", "눈썹~코 · 중년", s.middle],
    ["하정", "인중~턱 · 말년", s.lower],
  ];
  const max = Math.max(s.upper, s.middle, s.lower);
  return (
    <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
      <div className="mb-2 text-[14px] font-semibold">삼정(三停) 비율</div>
      {rows.map(([name, desc, v]) => (
        <div key={name} className="mb-1.5 flex items-center gap-2 text-[13px]">
          <span className="w-9 font-semibold">{name}</span>
          <span className="w-[92px] shrink-0 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
            {desc}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
            <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: v === max ? "var(--color-accent)" : "var(--color-ink-faint)" }} />
          </div>
          <span className="w-9 text-right tabular-nums">{v}%</span>
        </div>
      ))}
      <p className="mt-1 text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
        전통 관상에서는 세 구간이 고르게 1:1:1에 가까울수록 균형 잡힌 얼굴로 봐요.
      </p>
    </div>
  );
}

export default function FaceResultPage() {
  return (
    <Suspense fallback={<LoadingState message="불러오는 중..." />}>
      <FaceResultBody />
    </Suspense>
  );
}
