"use client";

import { useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { focusLabel, isFocus } from "@/lib/focus";
import { FOCUS_TOPICS, isTopicKey } from "@/lib/topics";
import { PRICE, formatNyang } from "@/lib/yeopjeon";
import { InviteCard } from "@/components/yeopjeon/InviteCard";
import { PersonHeader } from "@/components/yeopjeon/PersonHeader";
import { useYeopjeon } from "@/components/yeopjeon/useYeopjeon";
import type { StoredReading } from "@/server/readings/readings";

/**
 * 맛보기 결과 (990냥, 저장된 풀이 - 내 복주머니에서 언제든 다시 열람, AI 재호출 없음).
 * 주제마다 "깊게 보기 4,900냥", 아래에 "3가지 몰아보기 9,900냥"·"12가지 전부 보기 29,500냥"으로 이어진다.
 * (2026-10-06 이전 맛보기는 사람 정보가 없어 깊게 보기 버튼 대신 다시 보기 안내만 보인다.)
 */

const GOLD = "#9a7a45";
/** 10-06판 맛보기의 예전 주제 이름 → 지금 주제 */
const LEGACY_KEY: Record<string, string> = { career: "job" };

function ReadingBody({ id }: { id: string }) {
  const [state, setState] = useState<{ status: "loading" } | { status: "error"; message: string } | { status: "done"; reading: StoredReading }>({
    status: "loading",
  });
  const { data: wallet } = useYeopjeon(state.status === "done");

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
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/mypage" linkLabel="내 복주머니로" />;

  const { header, content, focus, createdAt, personId } = state.reading;
  const focusKeys: string[] = focus && isFocus(focus) ? FOCUS_TOPICS[focus] : [];

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <PersonHeader header={header} kicker={`류결사주 · 맛보기 ${formatNyang(PRICE.TASTE)}`} title="12가지 운 맛보기" sub={focus && isFocus(focus) ? `관심 분야 ${focusLabel(focus)}` : undefined} />

      <div className="space-y-5">
        {content.sections.map((s) => {
          const key = LEGACY_KEY[s.key] ?? s.key;
          return (
            <section key={s.key} className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "#fffdf8" }}>
              <h2 className="flex items-center gap-2 text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
                {s.title}
                {focusKeys.includes(key) && (
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
              {personId && isTopicKey(key) && (
                <a
                  href={`/person/${personId}?buy=deep&topic=${key}`}
                  className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                  style={{ backgroundColor: "var(--color-paper-soft)" }}
                >
                  <span className="text-[13px] leading-snug" style={{ color: "var(--color-ink-soft)" }}>
                    {s.deeper || "이 운을 더 깊게 풀어 드립니다."}
                  </span>
                  <span className="shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold text-white" style={{ backgroundColor: "var(--color-accent)" }}>
                    깊게 보기 {formatNyang(PRICE.DEEP)}
                  </span>
                </a>
              )}
            </section>
          );
        })}
      </div>

      {personId ? (
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a href={`/person/${personId}?buy=bundle3`} className="rounded-2xl p-5 text-center" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
            <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              3가지 몰아보기
            </p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              가장 궁금한 세 가지를 깊게
            </p>
            <p className="mt-2 text-[18px] font-bold" style={{ color: GOLD }}>
              {formatNyang(PRICE.BUNDLE3)}
            </p>
          </a>
          <a href={`/person/${personId}?buy=bundle12`} className="rounded-2xl p-5 text-center" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
            <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              12가지 전부 보기
            </p>
            <p className="mt-1 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              12가지 운 + 월별 운세 · 개운법
            </p>
            <p className="mt-2 text-[18px] font-bold" style={{ color: GOLD }}>
              {formatNyang(PRICE.BUNDLE12)}
            </p>
          </a>
        </section>
      ) : (
        <p className="mt-8 rounded-xl px-4 py-3 text-center text-[13px]" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-soft)" }}>
          깊게 보기는 무료 만세력을 다시 본 뒤 &quot;이어서 보기&quot;에서 열 수 있어요.
        </p>
      )}

      {wallet && (
        <section className="mt-8">
          <InviteCard refCode={wallet.refCode} invited={wallet.invited} />
        </section>
      )}

      <div className="mt-8 space-y-2.5">
        <a href="/mypage" className="btn-secondary block text-center">
          내 복주머니
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
