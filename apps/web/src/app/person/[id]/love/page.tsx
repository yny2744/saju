"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { formatWon } from "@/lib/pricingList";
import { LOVE_CAL, LOVE_CAL_PAIR, LOVE_PAIR, loveOn, type LoveMode } from "@/lib/love/loveProducts";
import type { CoupleReading, CoupleCalRow, SoloCalRow } from "@/lib/love/love";
import type { LoveCal } from "@/server/love/love";

/**
 * 짧은 궁합(990원) · 2027 연애 달력(9,900원) (2026-11-09 유샘 지시서 4·5번) - 크리스마스 연애운 상품 사다리에서 오는 화면.
 *   ?show=pair&partner=<상대> : 짧은 궁합 (2-2 회원 결과와 같은 수준, 엔진 문장)
 *   ?show=cal[&partner=<상대>] : 2027 연애 달력 (솔로: 인연이 오는 달 / 커플: 좋은 달·조심할 달) - 엔진이 판정, 글은 AI
 *   ?open=1 : 들어오면 그 상품을 한 번 연다 (가진 것으로 모자라면 결제 창). 가격은 원으로만, 엽전·냥은 쓰지 않는다.
 */

type Data = {
  nickname: string;
  partner: string | null;
  owned: { pair: boolean; cal: boolean };
  prices: { pair: number; cal: number };
  pair: CoupleReading | null;
  calRows: Array<SoloCalRow | CoupleCalRow> | null;
  cal: LoveCal | null;
};
type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Data);

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;

function Body({ id }: { id: string }) {
  const q = useSearchParams();
  const show = q.get("show") === "pair" ? "pair" : "cal";
  const partnerId = q.get("partner");
  const mode: LoveMode = show === "pair" ? LOVE_PAIR : partnerId ? LOVE_CAL_PAIR : LOVE_CAL;
  const topics = mode === LOVE_CAL ? [] : [partnerId ?? ""];
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const opened = useRef(false);
  const wrote = useRef(false);
  const here = `/person/${id}/love?show=${show}${partnerId ? `&partner=${partnerId}` : ""}`;
  const api = `/api/persons/${encodeURIComponent(id)}/love${partnerId ? `?partner=${encodeURIComponent(partnerId)}` : ""}`;

  const load = useCallback(async (): Promise<Data | null> => {
    const r = await fetch(api).catch(() => null);
    if (!r) {
      setState({ status: "error", message: "연결이 끊겼어요." });
      return null;
    }
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(here)}`);
      return null;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
      return null;
    }
    setState({ status: "ready", ...body });
    return body as Data;
  }, [api, here]);

  const buy = useCallback(async () => {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, topics }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok || body?.error?.code === "ALREADY_OWNED") {
        notifyYeopjeonChanged();
        await load();
        window.scrollTo({ top: 0 });
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") setPay(true);
      else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("짧은 궁합·연애 달력 열기", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
    // topics 는 mode·partnerId 로 정해진다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, partnerId, load]);

  // 처음 한 번: 불러오고, 사다리에서 눌러 왔으면(?open=1) 아직 안 산 상품을 연다
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    (async () => {
      const d = await load();
      if (q.get("paid") === "1") setNotice("결제가 끝나 열렸어요.");
      if (!d || q.get("open") !== "1") return;
      if (show === "pair" ? !d.owned.pair : !d.owned.cal) await buy();
    })();
  }, [load, buy, q, show]);

  // 연애 달력이 열렸는데 아직 글이 없으면 바로 쓴다
  useEffect(() => {
    if (show !== "cal" || state.status !== "ready" || !state.owned.cal || state.cal || wrote.current) return;
    wrote.current = true;
    (async () => {
      setWriting(true);
      const minWait = new Promise((r) => setTimeout(r, 20000 + Math.random() * 4000));
      try {
        const r = await fetch(`/api/persons/${encodeURIComponent(id)}/love/write${partnerId ? `?partner=${encodeURIComponent(partnerId)}` : ""}`, { method: "POST" });
        const body = await r.json().catch(() => ({}));
        await minWait;
        if (r.ok && body.cal) setState((s) => (s.status === "ready" ? { ...s, cal: body.cal } : s));
        else {
          wrote.current = false;
          setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
        }
      } catch (e) {
        wrote.current = false;
        reportClientError("2027 연애 달력", String(e));
        setNotice("연결이 끊겼어요. 새로고침해 주세요.");
      }
      setWriting(false);
    })();
  }, [state, id, partnerId, show]);

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/go/gunghap" linkLabel="크리스마스 연애운으로" />;

  const names = state.partner ? `${state.nickname} ♡ ${state.partner}` : state.nickname;
  const title = show === "pair" ? "짧은 궁합" : "2027 연애 달력";
  const owned = show === "pair" ? state.owned.pair : state.owned.cal;
  const price = show === "pair" ? state.prices.pair : state.prices.cal;
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-10 sm:pt-14">
      {writing && <WritingOverlay title="2027 연애 달력을 쓰고 있어요" steps={["사주 여덟 글자를 펼치고 있어요", "배우자 자리와 배우자 별을 찾고 있어요", "2027년 열두 달의 기운과 견주고 있어요", "달마다 인연의 흐름을 쓰고 있어요"]} durationMs={22000} />}

      <header className="rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
        <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
          {title}
        </p>
        <h1 className="mt-1 text-[24px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
          {names}
        </h1>
        {show === "pair" && state.pair && (
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
            {state.pair.attraction}
          </p>
        )}
        {show === "cal" && state.cal?.summary && (
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
            {state.cal.summary}
          </p>
        )}
      </header>

      {notice && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {show === "pair" && state.pair && (
        <div className="mt-6 space-y-4">
          {state.pair.sections.map((s) => (
            <section key={s.heading} className="rounded-2xl p-5" style={CARD}>
              <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {s.heading}
              </h3>
              <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>
      )}

      {show === "cal" && state.cal && (
        <div className="mt-6 space-y-3">
          {state.cal.months.map((m) => (
            <section key={m.month} className="rounded-2xl p-5" style={m.good ? { ...CARD, boxShadow: `0 0 0 2px ${GOLD} inset` } : CARD}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <h3 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {m.month}월
                </h3>
                <span className="text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                  {m.ganzhi}월
                </span>
                {m.good && (
                  <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: NAVY, color: GOLD_L }}>
                    {state.cal!.kind === "solo" ? "인연이 오는 달" : "좋은 달"}
                  </span>
                )}
                {m.care && (
                  <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ backgroundColor: "var(--color-gold-soft)", color: "var(--color-ink)" }}>
                    조심할 달
                  </span>
                )}
              </div>
              {m.good && m.place && (
                <p className="mt-1 text-[13.5px] font-bold" style={{ color: GOLD }}>
                  만날 가능성이 큰 곳 · {m.place}
                </p>
              )}
              <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                {m.body}
              </p>
            </section>
          ))}
        </div>
      )}

      {!owned && (
        <section className="mt-8 rounded-2xl p-5 text-center" style={CARD}>
          <button type="button" disabled={busy} onClick={() => buy()} className="btn-primary disabled:opacity-50">
            {busy ? "여는 중..." : `${title} · ${formatWon(price)}`}
          </button>
        </section>
      )}

      <a href="/go/gunghap" className="btn-secondary mt-8 block text-center">
        크리스마스 연애운으로
      </a>

      {pay && (
        <PayDialog
          personId={id}
          mode={mode}
          topics={topics}
          backTo={here}
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

export default function LovePage({ params }: { params: { id: string } }) {
  if (!loveOn() || !isAuthEnabled()) return <ComingSoon title="크리스마스 연애운" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body id={params.id} />
    </Suspense>
  );
}
