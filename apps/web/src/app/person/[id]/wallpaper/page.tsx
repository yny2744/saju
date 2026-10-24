"use client";


import { BRAND } from "@/tenants";
import { useCallback, useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { LuckyWallpaper } from "@/components/LuckyWallpaper";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { CURRENCY_NAME, INVITE_REWARD, formatNyang } from "@/lib/yeopjeon";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import type { ElementKo } from "@/lib/pillarView";
import type { WallpaperSpec } from "@/lib/wallpaper";

/**
 * 나를 채우는 행운 배경화면 (2026-10-14 수정안 12, 990냥 시험판).
 * 시험 동안은 엽전으로만 받는다 (카드 결제 없음) - 친구 초대·로그인으로 모은 엽전으로 얼마나 받는지 본다.
 */

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "locked"; nickname: string; element: ElementKo; price: number; balance: number }
  | { status: "ready"; nickname: string; element: ElementKo; price: number; spec: WallpaperSpec };

const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;

function Body({ id }: { id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}/wallpaper`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}/wallpaper`)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState(body);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function buy() {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "wallpaper", topics: [] }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok || body?.error?.code === "ALREADY_OWNED") {
        notifyYeopjeonChanged();
        await load();
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") {
        setNotice(`${CURRENCY_NAME}이 모자라요. 친구를 초대하면 한 명마다 ${formatNyang(INVITE_REWARD)}을 받아요.`);
      } else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("행운 배경화면", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref={`/person/${id}`} linkLabel="돌아가기" />;

  const el = state.element;
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-6 text-center">
        <p className="section-label">{BRAND} · 행운 배경화면</p>
        <h1 className="mt-1 text-[24px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
          {state.nickname}님을 채우는
          <br />
          {ELEMENT_NATURE[el]}({ELEMENT_HANJA[el]})의 기운
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          사주에 아쉬운 기운의 색·문양·한자에 내 사주 여덟 글자와 이름을 담은,
          <br />
          세상에 하나뿐인 휴대폰 배경화면이에요.
        </p>
      </header>

      {notice && (
        <p className="mb-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}{" "}
          <a href="/mypage" className="underline underline-offset-4">
            초대 링크 받기
          </a>
        </p>
      )}

      {state.status === "locked" ? (
        <section className="rounded-2xl p-5 text-center" style={CARD}>
          <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            행운 배경화면 · {CURRENCY_NAME} {formatNyang(state.price)}
          </p>
          <ul className="mx-auto mt-3 max-w-xs space-y-1 text-left text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
            <li>◆ 부족한 기운의 색과 문양, 금박 한자</li>
            <li>◆ 내 사주 여덟 글자 · 띠 · 행운 숫자 · 방위</li>
            <li>◆ 내 이름이 새겨진 고화질 그림 (내 복주머니에서 언제든 다시)</li>
          </ul>
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            내 {CURRENCY_NAME} {formatNyang(state.balance)} · 지금은 {CURRENCY_NAME}으로만 받을 수 있어요
          </p>
          <button type="button" disabled={busy} onClick={buy} className="btn-primary mt-4 disabled:opacity-50">
            {busy ? "그리는 중..." : `${CURRENCY_NAME}으로 받기`}
          </button>
        </section>
      ) : (
        <LuckyWallpaper spec={state.spec} />
      )}

      <a href={`/person/${id}`} className="btn-secondary mt-8 block text-center">
        12가지 운세 보기
      </a>
    </main>
  );
}

export default function WallpaperPage({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="행운 배경화면" />;
  return <Body id={params.id} />;
}
