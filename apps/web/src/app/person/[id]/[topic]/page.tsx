"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { TOPICS, isAnyTopicKey, isTopicKey } from "@/lib/topics";
import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";
import { PersonHeader } from "@/components/yeopjeon/PersonHeader";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { InviteCard } from "@/components/yeopjeon/InviteCard";
import { notifyYeopjeonChanged, reportClientError, useYeopjeon } from "@/components/yeopjeon/useYeopjeon";
import type { ReadingHeader } from "@/server/readings/readings";
import type { BasicContent, DeepContent } from "@/server/readings/generateReading";

/**
 * 운세 한 가지 화면 (2026-10-09 수정안 20).
 *
 *   아직 안 산 운세 → [○○ 운세 보기 990냥] (바로 깊게 보기 4,900냥도 가능)
 *   운세 보기로 산 운세 → 990냥 풀이 + 아래 [○○ 깊게 보기 4,900냥]
 *   깊게 보기가 열린 운세 → 깊은 풀이
 *
 * 풀이는 처음 열 때 AI가 쓰고 저장한다. 이미 산 운세라 쓰다가 실패해도 다시 누르면 엽전은 빠지지 않는다.
 */

const GOLD = "var(--color-gold)";

type Level = "basic" | "deep";
type State =
  | { status: "loading" }
  | { status: "writing"; level: Level }
  | { status: "basic"; content: BasicContent; header: ReadingHeader }
  | { status: "deep"; content: DeepContent; header: ReadingHeader }
  | { status: "locked"; header: ReadingHeader | null }
  | { status: "error"; message: string; level: Level | null };

function TopicBody({ id, topic }: { id: string; topic: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [buying, setBuying] = useState<"basic" | "deep" | null>(null);
  const [notice, setNotice] = useState<{ kind: "short" | "error"; text: string } | null>(null);
  const [confirmDeep, setConfirmDeep] = useState(false);
  const started = useRef(false);
  const url = `/api/persons/${encodeURIComponent(id)}/topics/${encodeURIComponent(topic)}`;
  const isLoggedView = state.status !== "loading";
  const { data: wallet, reload: reloadWallet } = useYeopjeon(isLoggedView);

  const title = isAnyTopicKey(topic) ? TOPICS[topic].title : "운세";
  const canBasic = isTopicKey(topic);

  const show = useCallback((body: { status: string; level: Level; content: unknown; header: ReadingHeader }) => {
    if (body.level === "deep") setState({ status: "deep", content: body.content as DeepContent, header: body.header });
    else setState({ status: "basic", content: body.content as BasicContent, header: body.header });
  }, []);

  const write = useCallback(
    async (level: Level) => {
      setState({ status: "writing", level });
      try {
        const r = await fetch(url, { method: "POST" });
        const body = await r.json().catch(() => ({}));
        if (r.ok && body.status === "ready") show(body);
        else setState({ status: "error", message: body?.error?.message ?? "풀이를 쓰지 못했어요.", level });
      } catch (e) {
        reportClientError("운세 풀이 쓰기", String(e));
        setState({ status: "error", message: `연결이 끊겼어요. 다시 눌러 주세요. ${CURRENCY_NAME}은 빠지지 않아요.`, level });
      }
    },
    [url, show]
  );

  const load = useCallback(() => {
    return fetch(url)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}/${topic}`)}`);
          return;
        }
        if (r.status === 403) {
          // 약관 동의 전
          window.location.replace(`/consent?next=${encodeURIComponent(`/person/${id}/${topic}`)}`);
          return;
        }
        if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요.", level: null });
        if (body.status === "locked") return setState({ status: "locked", header: body.header ?? null });
        if (body.status === "ready") show(body);
        else write(body.level === "deep" ? "deep" : "basic");
      })
      .catch(() => setState({ status: "error", message: "연결이 끊겼어요.", level: null }));
  }, [url, id, topic, show, write]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load();
  }, [load]);

  async function buy(mode: "basic" | "deep") {
    setBuying(mode);
    setNotice(null);
    try {
      const res = await fetch(`/api/persons/${encodeURIComponent(id)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, topics: [topic] }),
      });
      const body = await res.json().catch(() => ({}));
      setConfirmDeep(false);
      if (res.ok || body?.error?.code === "ALREADY_OWNED") {
        reloadWallet();
        notifyYeopjeonChanged();
        setBuying(null);
        await write(mode);
        return;
      }
      if (body?.error?.code === "INSUFFICIENT_YEOPJEON") {
        setNotice({ kind: "short", text: `${CURRENCY_NAME}이 부족해요. 결제는 곧 열려요. 친구를 초대하면 ${CURRENCY_NAME}을 받을 수 있어요.` });
      } else {
        setNotice({ kind: "error", text: body?.error?.message ?? "잠시 후 다시 시도해 주세요." });
      }
    } catch (e) {
      reportClientError("운세 사기", String(e));
      setNotice({ kind: "error", text: "연결이 끊겼어요. 잠시 후 다시 시도해 주세요." });
    }
    setBuying(null);
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "writing") {
    return (
      <WritingOverlay
        title={state.level === "deep" ? `${title} 운세를 깊게 쓰고 있어요` : `${title} 운세를 풀고 있어요`}
        steps={["사주 여덟 글자를 다시 살피고 있어요", `${title}의 근거를 찾고 있어요`, "흐름과 조언을 정리하고 있어요", "마지막으로 다듬고 있어요"]}
      />
    );
  }
  if (state.status === "error") {
    if (!state.level) return <ErrorState message={state.message} linkHref="/mypage" linkLabel="내 복주머니로" />;
    const level = state.level;
    return (
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-16 text-center">
        <p className="text-[15px]" style={{ color: "var(--color-danger)" }}>
          {state.message}
        </p>
        <button type="button" onClick={() => write(level)} className="btn-primary mx-auto mt-6 block max-w-xs">
          다시 쓰기
        </button>
        <a href={`/person/${id}`} className="mt-4 block text-sm underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          12가지 운세로 돌아가기
        </a>
      </main>
    );
  }

  const balance = wallet?.balance ?? null;
  const short = notice?.kind === "short";
  const noticeBox = notice && (
    <div className="mt-4">
      <p className="rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
        {notice.text}
      </p>
      {short && wallet && (
        <div className="mt-3">
          <InviteCard refCode={wallet.refCode} invited={wallet.invited} />
        </div>
      )}
    </div>
  );

  const deepConfirm = confirmDeep && (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3 sm:items-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: "var(--color-paper)" }}>
        <p className="text-center text-[13px]" style={{ color: GOLD }}>
          깊게 보기
        </p>
        <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {title} 운세 깊게 보기
        </p>
        <p className="mt-2 text-center text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
          {CURRENCY_NAME} {formatNyang(PRICE.DEEP)}이 빠져요{balance !== null ? ` · 남은 ${CURRENCY_NAME} ${formatNyang(balance)}` : ""}
        </p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={() => setConfirmDeep(false)} className="btn-secondary flex-1">
            취소
          </button>
          <button type="button" disabled={buying !== null} onClick={() => buy("deep")} className="btn-primary flex-[2]">
            {formatNyang(PRICE.DEEP)}으로 보기
          </button>
        </div>
      </div>
    </div>
  );

  // ── 아직 안 산 운세: 구매 창 ──
  if (state.status === "locked") {
    const info = isAnyTopicKey(topic) ? TOPICS[topic] : null;
    return (
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
        {state.header ? (
          <PersonHeader header={state.header} kicker="류결사주 · 12가지 운세" title={`${title} 운세`} />
        ) : (
          <h1 className="mb-8 text-center text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {title} 운세
          </h1>
        )}
        <section className="gold-card rounded-2xl px-5 py-6 text-center">
          {info && (
            <p className="foil-text text-[40px] font-bold leading-none" style={{ fontFamily: "var(--font-serif)" }}>
              {info.hanja}
            </p>
          )}
          <p className="mt-3 text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {title} 운세
          </p>
          {info && (
            <p className="mt-1 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
              {info.blurb}
            </p>
          )}
          {balance !== null && (
            <p className="mt-4 text-[14px]">
              내 {CURRENCY_NAME} <b style={{ color: GOLD }}>{formatNyang(balance)}</b>
            </p>
          )}
          {canBasic && (
            <button type="button" disabled={buying !== null} onClick={() => buy("basic")} className="btn-band mt-4 block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-60" style={{ fontFamily: "var(--font-serif)" }}>
              {title} 운세 보기 · {formatNyang(PRICE.BASIC)}
            </button>
          )}
          <button type="button" disabled={buying !== null} onClick={() => setConfirmDeep(true)} className="btn-secondary mt-2.5">
            바로 깊게 보기 · {formatNyang(PRICE.DEEP)}
          </button>
          {canBasic && (
            <p className="mt-3 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              운세 보기를 본 뒤에도 깊게 보기로 더 자세히 볼 수 있어요
            </p>
          )}
        </section>
        {noticeBox}
        <div className="mt-8 space-y-2.5">
          <a href={`/person/${id}`} className="btn-secondary block text-center">
            12가지 운세 모두 보기
          </a>
        </div>
        {deepConfirm}
      </main>
    );
  }

  // ── 운세 보기 (990) ──
  if (state.status === "basic") {
    const { content, header } = state;
    return (
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
        <PersonHeader header={header} kicker={`류결사주 · 운세 보기`} title={`${content.title} 운세`} />
        <section className="gold-card rounded-2xl p-5">
          <div className="space-y-3 text-[15.5px] leading-[1.85]">
            {content.body.split(/\n+/).map((para, j) => (
              <p key={j}>{para}</p>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: "var(--color-accent-soft)" }}>
          {content.deeper && (
            <p className="text-[15px] leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
              {content.deeper}
            </p>
          )}
          <button type="button" disabled={buying !== null} onClick={() => setConfirmDeep(true)} className="btn-band mt-4 block w-full rounded-xl py-4 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {content.title} 깊게 보기 · {formatNyang(PRICE.DEEP)}
          </button>
          <p className="mt-2 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
            소제목 3~4개로 시기와 처신까지 자세히 풀어 드려요
          </p>
        </section>
        {noticeBox}

        <div className="mt-8 space-y-2.5">
          <a href={`/person/${id}`} className="btn-secondary block text-center">
            다른 운세 보기
          </a>
          <a href="/mypage" className="btn-secondary block text-center">
            내 복주머니
          </a>
        </div>
        <p className="mt-8 text-center text-[11px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
          전통 명리학을 바탕으로 한 참고용 풀이이며, 중요한 결정의 근거로 삼지 마십시오.
        </p>
        {deepConfirm}
      </main>
    );
  }

  // ── 깊게 보기 ──
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
          <section key={i} className="rounded-2xl p-5" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}>
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
          12가지 운세로 돌아가기
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
  return isAuthEnabled() ? <TopicBody id={params.id} topic={params.topic} /> : <ComingSoon title="운세 보기" />;
}
