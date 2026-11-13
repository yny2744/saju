"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BRAND } from "@/tenants";
import { isAuthEnabled, isSuneungOn } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { GuardianPayNote } from "@/components/yeopjeon/GuardianPayNote";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { formatWon } from "@/lib/pricingList";
import { EXAM_DEEP_SUB, EXAM_EXTRA_SUB, EXAM_EXTRA_TITLE, isExamExtraKind, type ExamExtraKind } from "@/lib/suneung";

/**
 * 수능 심층분석 2~4 · 네 가지 모두 보기 (2026-11-13 유샘 승인)
 *   /person/{id}/exam/x/goal|focus|calm : 한 가지 5,500원 - 결제 전엔 부제 세 줄, 산 뒤엔 풀이 (처음이면 쓰는 동안 기다림 화면)
 *   /person/{id}/exam/x/all             : 네 가지 모두 보기 16,500원(3+1) - 산 뒤엔 네 풀이로 가는 목록
 *   엽전이 있으면 엽전으로, 모자라면 모자란 만큼만 결제 (다른 상품과 같은 길). 수험생은 보호자 결제 안내.
 */

type Owned = { deep: boolean; goal: boolean; focus: boolean; calm: boolean };
type Reading = { title: string; summary: string; parts: Array<{ heading: string; body: string }> };
type Data = { nickname: string; owned: Owned; price: number | null; allPrice: number | null; onSale: boolean; balance: number; reading: Reading | null };
type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Data);

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;

const ALL_ITEMS: Array<{ key: keyof Owned; stamp: string; title: string; href: (id: string) => string }> = [
  { key: "deep", stamp: "試", title: "수능대박운 심층분석", href: (id) => `/person/${id}/exam` },
  { key: "goal", stamp: "志", title: EXAM_EXTRA_TITLE.goal, href: (id) => `/person/${id}/exam/x/goal` },
  { key: "focus", stamp: "集", title: EXAM_EXTRA_TITLE.focus, href: (id) => `/person/${id}/exam/x/focus` },
  { key: "calm", stamp: "安", title: EXAM_EXTRA_TITLE.calm, href: (id) => `/person/${id}/exam/x/calm` },
];

function Body({ id, kind }: { id: string; kind: ExamExtraKind | "all" }) {
  const q = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const wrote = useRef(false);
  const mode = kind === "all" ? "exam_all" : (`exam_${kind}` as const);
  const title = kind === "all" ? "심층분석 네 가지 모두 보기" : EXAM_EXTRA_TITLE[kind];
  const back = `/person/${id}/exam/x/${kind}`;

  const load = useCallback(async () => {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}/exam/x?kind=${kind}`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(back)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState({ status: "ready", ...body });
  }, [id, kind, back]);

  useEffect(() => {
    load();
    if (q.get("paid") === "1") setNotice("결제가 끝나 열렸어요.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // 산 뒤 아직 안 썼으면 바로 쓴다 (기다림 화면은 풀이가 끝날 때까지)
  useEffect(() => {
    if (kind === "all" || state.status !== "ready" || !state.owned[kind] || state.reading || wrote.current) return;
    wrote.current = true;
    (async () => {
      setWriting(true);
      const minWait = new Promise((r) => setTimeout(r, 20000));
      try {
        const r = await fetch(`/api/persons/${encodeURIComponent(id)}/exam/x`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind }),
        });
        const body = await r.json().catch(() => ({}));
        await minWait;
        if (r.ok && body.reading) setState((s) => (s.status === "ready" ? { ...s, reading: body.reading } : s));
        else {
          wrote.current = false;
          setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요. 결제는 그대로 남아 있어요.");
        }
      } catch (e) {
        wrote.current = false;
        reportClientError(`수능 ${title}`, String(e));
        setNotice("연결이 끊겼어요. 새로고침해 주세요. 결제는 그대로 남아 있어요.");
      }
      setWriting(false);
    })();
  }, [state, id, kind, title]);

  async function buy() {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, topics: [] }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok || body?.error?.code === "ALREADY_OWNED") {
        if (!r.ok) setNotice(body.error.message);
        notifyYeopjeonChanged();
        await load();
        window.scrollTo({ top: 0 });
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") setPay(true);
      else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError(`수능 ${title} 열기`, String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref={`/person/${id}/exam`} linkLabel="돌아가기" />;

  const price = kind === "all" ? state.allPrice : state.price;
  const ownedHere = kind === "all" ? ALL_ITEMS.every((i) => state.owned[i.key]) : state.owned[kind];
  const someOwned = kind === "all" && ALL_ITEMS.some((i) => state.owned[i.key]);

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-10 sm:pt-14">
      {writing && <WritingOverlay title={`${title}을 쓰고 있어요`} steps={["사주 여덟 글자를 펼치고 있어요", "올해와 시험날 기운을 견주고 있어요", "나에게 맞는 방법을 고르고 있어요", "응원의 말을 고르고 있어요"]} durationMs={28000} />}

      <header className="rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
        <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
          {BRAND} · 수능 심층분석
        </p>
        <h1 className="mt-1 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L, wordBreak: "keep-all" }}>
          {state.nickname}님의 {title}
        </h1>
        {state.reading?.summary && (
          <p className="mt-4 text-[15px] leading-relaxed" style={{ color: GOLD_L }}>
            {state.reading.summary}
          </p>
        )}
      </header>

      {notice && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {kind === "all" ? (
        <section className="mt-6 rounded-2xl p-5" style={CARD}>
          <ul className="space-y-2">
            {ALL_ITEMS.map((i) => (
              <li key={i.key}>
                <Link href={i.href(id)} className="flex items-center gap-3 rounded-xl px-3 py-3" style={{ border: "1px solid var(--color-gold-line)" }}>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-bold" style={{ backgroundColor: NAVY, color: "#f2d48a", border: `1.5px solid ${GOLD}`, fontFamily: "var(--font-serif)" }}>
                    {i.stamp}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15.5px] font-bold">{i.title}</span>
                    <span className="block truncate text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
                      {(i.key === "deep" ? EXAM_DEEP_SUB : EXAM_EXTRA_SUB[i.key as ExamExtraKind]).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-[12.5px] font-bold" style={{ color: state.owned[i.key] ? "var(--color-element-wood)" : "var(--color-ink-faint)" }}>
                    {state.owned[i.key] ? "열림 ›" : "›"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {!ownedHere &&
            (someOwned ? (
              <p className="mt-4 text-center text-[13.5px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                이미 연 심층분석이 있어서 네 가지 모두 보기는 열 수 없어요. 남은 것을 하나씩 열어 주세요.
              </p>
            ) : (
              <BuyBox busy={busy} onSale={state.onSale} price={price} label={`네 가지 모두 보기 · ${price ? formatWon(price) : ""}`} sub="세 가지 값으로 네 가지 (3+1)" onBuy={buy} />
            ))}
        </section>
      ) : state.reading ? (
        <div className="mt-6 space-y-4">
          {state.reading.parts.map((p) => (
            <section key={p.heading} className="rounded-2xl p-5" style={CARD}>
              <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {p.heading}
              </h2>
              <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)" }}>
                {p.body}
              </p>
            </section>
          ))}
        </div>
      ) : (
        !ownedHere && (
          <section className="mt-6 rounded-2xl p-5" style={CARD}>
            <p className="text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              이런 이야기를 담았어요
            </p>
            <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-[14.5px]">
              {EXAM_EXTRA_SUB[kind].map((s) => (
                <li key={s} className="flex gap-2">
                  <span style={{ color: GOLD }}>◆</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <BuyBox busy={busy} onSale={state.onSale} price={price} label={`${title} 열기 · ${price ? formatWon(price) : ""}`} onBuy={buy} />
          </section>
        )
      )}

      {kind !== "all" && !ownedHere && (
        <Link href={`/person/${id}/exam/x/all`} className="mt-3 block rounded-xl py-3 text-center text-[14px] font-bold" style={{ border: `1.5px dashed ${GOLD}` }}>
          네 가지 모두 보기 {state.allPrice ? formatWon(state.allPrice) : ""} (3+1) ›
        </Link>
      )}

      <p className="mt-8 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        사주로 보는 응원과 마음가짐이에요. 결과를 미리 정하는 풀이가 아니에요.
      </p>
      <Link href={`/person/${id}/exam`} className="btn-secondary mt-4 block text-center">
        수능대박운으로 돌아가기
      </Link>

      {pay && (
        <PayDialog
          personId={id}
          mode={mode}
          topics={[]}
          backTo={back}
          onEnough={() => {
            setPay(false);
            buy();
          }}
          onClose={() => setPay(false)}
        />
      )}
    </main>
  );
}

function BuyBox({ busy, onSale, price, label, sub, onBuy }: { busy: boolean; onSale: boolean; price: number | null; label: string; sub?: string; onBuy: () => void }) {
  if (!onSale || !price) {
    return (
      <p className="mt-5 rounded-xl py-3.5 text-center text-[15px] font-bold" style={{ border: "1px dashed var(--color-gold-line)", color: "var(--color-ink-soft)" }}>
        곧 열려요
      </p>
    );
  }
  return (
    <>
      <button type="button" disabled={busy} onClick={onBuy} className="btn-primary mt-5 disabled:opacity-50">
        {busy ? "여는 중..." : label}
      </button>
      {sub && (
        <p className="mt-1.5 text-center text-[12.5px]" style={{ color: "var(--color-ink-soft)" }}>
          {sub}
        </p>
      )}
      <GuardianPayNote title="수능대박운" />
    </>
  );
}

export default function ExamExtraPage({ params }: { params: { id: string; kind: string } }) {
  if (!isSuneungOn() || !isAuthEnabled()) return <ComingSoon title="수능대박운" />;
  const kind = params.kind === "all" || isExamExtraKind(params.kind) ? params.kind : null;
  if (!kind) return <ErrorState message="없는 상품이에요." linkHref={`/person/${params.id}/exam`} linkLabel="돌아가기" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body id={params.id} kind={kind} />
    </Suspense>
  );
}
