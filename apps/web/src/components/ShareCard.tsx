"use client";

import { useRef, useState } from "react";
import { ElementRadarChart } from "@/components/ElementRadarChart";

/**
 * 공유 카드에 찍히는 사이트 주소. 도메인이 바뀌면 Vercel 환경변수 NEXT_PUBLIC_SITE_HOST만 바꾸고 재배포하면 된다
 * (NEXT_PUBLIC_ 값은 빌드 시점에 박힘). 값이 없으면 현재 Vercel 기본 주소를 쓴다.
 */
const SITE_HOST = process.env.NEXT_PUBLIC_SITE_HOST || "saju-web-khaki.vercel.app";

/**
 * "공유용 결과 카드" — SNS에 올려도 되는 정보만 따로 모아 이미지로 저장한다.
 *
 * 개인정보 원칙(지시서 10조와 동일한 원칙을 공유 기능에도 그대로 적용):
 * 생년월일·출생시간·출생도시는 이 카드 어디에도 넣지 않는다. 오행 분포(숫자)와
 * 우세 오행, 닉네임만 사용한다 — 전부 사용자가 이미 결과 화면에서 본 것과
 * 같은 데이터의 부분집합일 뿐, 새로 계산하거나 추가로 수집하지 않는다.
 *
 * "저장" 버튼을 직접 눌러야만 이미지가 생성된다 - 자동 생성/자동 공유는 하지 않는다.
 */
export function ShareCard({
  nickname,
  dominant,
  counts,
  tagline,
}: {
  nickname: string;
  dominant: string;
  counts: Record<string, number>;
  tagline: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!cardRef.current) return;
    setSaving(true);
    setError(null);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement("a");
      link.download = `류결사주-${nickname}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("이미지 저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div
        ref={cardRef}
        className="mx-auto w-full max-w-[320px] rounded-2xl p-6"
        style={{ backgroundColor: "var(--color-paper)", border: "1px solid var(--color-line)" }}
      >
        <p className="mb-4 text-center text-xs font-semibold tracking-wide" style={{ fontFamily: "var(--font-serif)", color: "var(--color-accent)" }}>
          류결사주
        </p>
        <p className="mb-1 text-center text-lg font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {nickname}님의 사주
        </p>
        <div className="mx-auto my-3 aspect-square w-full max-w-[200px]">
          <ElementRadarChart counts={counts} />
        </div>
        <p className="text-center text-sm font-semibold" style={{ color: "var(--color-ink)" }}>
          우세 오행 · {dominant}
        </p>
        <p className="mt-1.5 text-center text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {tagline}
        </p>
        <p className="mt-4 text-center text-[10px]" style={{ color: "var(--color-ink-faint)" }}>
          {SITE_HOST}
        </p>
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="btn-secondary mt-3">
        {saving ? "저장 중..." : "결과 카드 이미지로 저장"}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs" style={{ color: "var(--color-accent)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
