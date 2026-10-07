"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { focusLabel, isFocus } from "@/lib/focus";
import { InviteCard } from "@/components/bokchae/InviteCard";
import { useBokchae } from "@/components/bokchae/useBokchae";
import type { StoredReading } from "@/server/readings/readings";

/**
 * 990원 사주보기 결과 (저장된 풀이 - 내 사주함에서 언제든 다시 열람, AI 재호출 없음).
 * 각 주제 끝 "이어보기 4,900원"과 맨 아래 "전부 보기 29,500원"은 결제사 승인 후 연다(지금은 "곧 열려요").
 */

const GOLD = "#9a7a45";
const FOCUS_KEYS: Record<string, string[]> = { love: ["love"], work: ["career", "money"], health: ["health"], relationship: ["relationship"] };
const DEEP_PRICE = "4,900원";
const ALL_PRICE = "29,500원";

function ReadingBody({ id }: { id: string }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "done"; reading: StoredReading }>({
    status: "loading",
  });
  const { data: bokchae } = useBokchae(state.status === "done");

  useEffect(() => {
    fetch(`/api/readings/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(`/reading/${id}`)}`);
          return;
        }
        if (!r.ok) setState({ status: "error", message: body?.error?.message ?? "풀이를 불러오지 못했어요." });
        else setState({ status: "done", reading: body.reading });
      })
      .catch(() => setState({ status: "error", message: "연결이 끊겼어요." }));
  }, [id]);

  if (state.status === "loading") return <LoadingState message="풀이를 불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/mypage" linkLabel="내 사주함으로" />;

  const { header, content, focus, createdAt } = state.reading;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-8 text-center">
        <p className="text-[13px]" style={{ color: GOLD }}>
          류결사주 · 사주보기
        </p>
        <h1 className="mt-1 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {header.nickname}
          {header.hanjaName && <span className="font-normal" style={{ color: "var(--color-ink-faint)" }}>({header.hanjaName})</span>}
          님의 사주풀이
        </h1>
        <p className="mt-1.5 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          {header.birth}
          {focus && isFocus(focus) && ` · 관심 분야 ${focusLabel(focus)}`}
        </p>
        <div className="mx-auto mt-4 grid max-w-xs grid-cols-4 gap-2">
          {header.pillars.map((p) => (
            <div key={p.label} className="rounded-lg py-2" style={{ backgroundColor: "var(--color-paper-soft)" }}>
              <p className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                {p.label}
              </p>
              <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {p.ganzhi ?? "—"}
              </p>
            </div>
          ))}
        </div>
      </header>

      <div className="space-y-6">
        {content.sections.map((s) => (
          <section key={s.key} className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "#fffdf8" }}>
            <h2 className="flex items-center gap-2 text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
              {s.title}
              {focus && isFocus(focus) && FOCUS_KEYS[focus].includes(s.key) && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
                  관심 분야
                </span>
              )}
            </h2>
            <div className="mt-3 space-y-3 text-[15.5px] leading-[1.85]">
              {s.body.split(/\n+/).map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
            {s.deeper && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                <p className="text-[13px] leading-snug" style={{ color: "var(--color-ink-soft)" }}>
                  {s.deeper}
                </p>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px]" style={{ border: "1px solid var(--color-line)", color: "var(--color-ink-faint)" }}>
                  이어보기 {DEEP_PRICE} · 곧 열려요
                </span>
              </div>
            )}
          </section>
        ))}
      </div>

      <section className="mt-8 rounded-2xl p-5 text-center" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
        <p className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          평생 사주 리포트 · {ALL_PRICE}
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          모든 주제 깊게 + 평생 대운 흐름 · 월별 운세 · 개운법
        </p>
        <p className="mt-3 inline-block rounded-full px-3 py-1 text-[12px]" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
          곧 열려요
        </p>
      </section>

      {bokchae && (
        <section className="mt-8">
          <InviteCard refCode={bokchae.refCode} invited={bokchae.invited} />
        </section>
      )}

      <div className="mt-8 space-y-2.5">
        <a href="/mypage" className="btn-secondary block text-center">
          내 사주함
        </a>
        <a href="/start" className="block py-2 text-center text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          다른 사람 사주 보기
        </a>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        {new Date(createdAt).toLocaleDateString("ko-KR")} 풀이 · 전통 명리학을 바탕으로 한 참고용 풀이이며, 중요한 결정의 근거로 삼지 마십시오.
      </p>
    </main>
  );
}

export default function ReadingPage({ params }: { params: { id: string } }) {
  return isAuthEnabled() ? <ReadingBody id={params.id} /> : <ComingSoon title="사주풀이" />;
}
