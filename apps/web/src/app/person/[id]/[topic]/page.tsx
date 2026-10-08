"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { TOPICS, isAnyTopicKey } from "@/lib/topics";
import { PersonHeader } from "@/components/yeopjeon/PersonHeader";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";
import type { ReadingHeader } from "@/server/readings/readings";
import type { DeepContent } from "@/server/readings/generateReading";

/**
 * 깊은 풀이 한 주제 (2026-10-08). 처음 열 때 AI가 쓰고 저장 → 다음부터는 저장본을 바로 보여준다.
 * 이미 산 운이라 쓰다가 실패해도 다시 누르면 엽전은 빠지지 않는다.
 */

const GOLD = "#9a7a45";

type State =
  | { status: "loading" }
  | { status: "writing"; header: ReadingHeader | null }
  | { status: "ready"; content: DeepContent; header: ReadingHeader }
  | { status: "locked" }
  | { status: "error"; message: string; header: ReadingHeader | null };

function TopicBody({ id, topic }: { id: string; topic: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const started = useRef(false);
  const url = `/api/persons/${encodeURIComponent(id)}/topics/${encodeURIComponent(topic)}`;

  const write = useCallback(
    async (header: ReadingHeader | null) => {
      setState({ status: "writing", header });
      try {
        const r = await fetch(url, { method: "POST" });
        const body = await r.json().catch(() => ({}));
        if (r.ok && body.status === "ready") setState({ status: "ready", content: body.content, header: body.header });
        else setState({ status: "error", message: body?.error?.message ?? "풀이를 쓰지 못했어요.", header });
      } catch (e) {
        reportClientError("깊은 풀이 쓰기", String(e));
        setState({ status: "error", message: "연결이 끊겼어요. 다시 눌러 주세요. 엽전은 빠지지 않아요.", header });
      }
    },
    [url]
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch(url)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}/${topic}`)}`);
          return;
        }
        if (r.status === 403) return setState({ status: "locked" });
        if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요.", header: null });
        if (body.status === "ready") setState({ status: "ready", content: body.content, header: body.header });
        else write(body.header ?? null);
      })
      .catch(() => setState({ status: "error", message: "연결이 끊겼어요.", header: null }));
  }, [url, id, topic, write]);

  const title = isAnyTopicKey(topic) ? TOPICS[topic].title : "운";

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "locked") {
    return <ErrorState message="아직 열지 않은 운이에요." linkHref={`/person/${id}?buy=deep&topic=${topic}`} linkLabel="깊게 보기로 열기" />;
  }
  if (state.status === "writing") {
    return <WritingOverlay title={`${title} 풀이를 깊게 쓰고 있어요`} steps={["사주 여덟 글자를 다시 살피고 있어요", `${title}의 근거를 찾고 있어요`, "시기와 조언을 정리하고 있어요", "마지막으로 다듬고 있어요"]} />;
  }
  if (state.status === "error") {
    return (
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-16 text-center">
        <p className="text-[15px]" style={{ color: "var(--color-accent)" }}>
          {state.message}
        </p>
        <button type="button" onClick={() => write(state.header)} className="btn-primary mx-auto mt-6 block max-w-xs">
          다시 쓰기
        </button>
        <a href={`/person/${id}`} className="mt-4 block text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          12가지 운으로 돌아가기
        </a>
      </main>
    );
  }

  const { content, header } = state;
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <PersonHeader header={header} kicker="류결사주 · 깊게 보기" title={content.title} />

      {content.summary && (
        <p className="mb-6 rounded-2xl px-5 py-4 text-[16px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)", fontFamily: "var(--font-serif)" }}>
          {content.summary}
        </p>
      )}

      <div className="space-y-5">
        {content.parts.map((p, i) => (
          <section key={i} className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "#fffdf8" }}>
            <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD }}>
              {p.heading}
            </h2>
            <div className="mt-3 space-y-3 text-[15.5px] leading-[1.85]">
              {p.body.split(/\n+/).map((para, j) => (
                <p key={j}>{para}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-8 space-y-2.5">
        <a href={`/person/${id}`} className="btn-primary block text-center">
          12가지 운으로 돌아가기
        </a>
        <a href="/mypage" className="btn-secondary block text-center">
          내 복주머니
        </a>
      </div>

      <p className="mt-8 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        전통 명리학을 바탕으로 한 참고용 풀이이며, 중요한 결정의 근거로 삼지 마십시오.
      </p>
    </main>
  );
}

export default function TopicPage({ params }: { params: { id: string; topic: string } }) {
  return isAuthEnabled() ? <TopicBody id={params.id} topic={params.topic} /> : <ComingSoon title="깊게 보기" />;
}
