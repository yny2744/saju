"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { NY_FULL, NY_LIGHT, NY_YEAR, nyFullButton, nyOn, nySaleLine, nySellOn, type NyMode } from "@/lib/newyear2027";
import type { BasicReadingV2 } from "@/lib/basic/compose";
import type { NyFull } from "@/server/newyear/newyear";

/**
 * 2027 신년운 (2026-11-03 유샘 지시서) - 링크 대문(/go/newyear2027)에서 로그인·결제 뒤 오는 화면.
 *   ?open=light : 가입 선물 엽전으로 총운 끝까지 (990) / ?open=full : 전체 보기 (오픈 특가 9,900)
 *   들어오면 그 상품을 한 번 연다 (엽전이 모자라면 같은 결제 창). 전체 보기가 열렸는데 아직 안 썼으면 바로 쓴다.
 */

type Preview = { title: string; summary: string; keywords: string[]; free: { heading: string; body: string }; locked: string[] };
type Data = {
  nickname: string;
  owned: { light: boolean; full: boolean };
  lightPrice: number;
  fullPrice: number;
  balance: number;
  total: BasicReadingV2 | null;
  preview: Preview | null;
  full: NyFull | null;
};
type State = { status: "loading" } | { status: "error"; message: string } | ({ status: "ready" } & Data);

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;

function Body({ id }: { id: string }) {
  const q = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pay, setPay] = useState<NyMode | null>(null);
  const opened = useRef(false);
  const wrote = useRef(false);
  const here = `/person/${id}/newyear`;

  const load = useCallback(async (): Promise<Data | null> => {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}/newyear`).catch(() => null);
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
  }, [id, here]);

  const buy = useCallback(
    async (mode: NyMode) => {
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
          notifyYeopjeonChanged();
          await load();
          window.scrollTo({ top: 0 });
        } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") setPay(mode);
        else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
      } catch (e) {
        reportClientError("2027 신년운 열기", String(e));
        setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
      }
      setBusy(false);
    },
    [id, load]
  );

  // 처음 한 번: 불러오고, 대문에서 고른 상품(?open=)이 아직 안 열렸으면 연다
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    (async () => {
      const d = await load();
      if (q.get("paid") === "1") setNotice("결제가 끝나 열렸어요.");
      const want = q.get("open");
      if (!d || !nySellOn()) return;
      if (want === "full" && !d.owned.full) await buy(NY_FULL);
      else if (want === "light" && !d.owned.light && !d.owned.full) await buy(NY_LIGHT);
    })();
  }, [load, buy, q]);

  // 전체 보기가 열렸는데 아직 안 썼으면 바로 쓴다
  useEffect(() => {
    if (state.status !== "ready" || !state.owned.full || state.full || wrote.current) return;
    wrote.current = true;
    (async () => {
      setWriting(true);
      const minWait = new Promise((r) => setTimeout(r, 25000 + Math.random() * 5000));
      try {
        const r = await fetch(`/api/persons/${encodeURIComponent(id)}/newyear/write`, { method: "POST" });
        const body = await r.json().catch(() => ({}));
        await minWait;
        if (r.ok && body.full) setState((s) => (s.status === "ready" ? { ...s, full: body.full } : s));
        else {
          wrote.current = false;
          setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
        }
      } catch (e) {
        wrote.current = false;
        reportClientError("2027 신년운 전체 보기", String(e));
        setNotice("연결이 끊겼어요. 새로고침해 주세요. 엽전은 그대로예요.");
      }
      setWriting(false);
    })();
  }, [state, id]);

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref={`/person/${id}`} linkLabel="돌아가기" />;

  const t = state.total;
  const p = state.preview;
  // 2026-11-04 유샘: 판매가 끝나면(2028-01-01) 사는 단추를 두지 않는다 (이미 산 풀이는 그대로 보여 준다)
  const selling = nySellOn();
  const saleLine = nySaleLine();
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-10 sm:pt-14">
      {writing && <WritingOverlay title={`${NY_YEAR} 신년운 전체 보기를 쓰고 있어요`} steps={["사주 여덟 글자를 펼치고 있어요", `${NY_YEAR}년 정미년 기운과 견주고 있어요`, "열두 달의 흐름을 살피고 있어요", "재물·연애·건강 흐름을 쓰고 있어요"]} durationMs={28000} />}

      <header className="rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
        <h1 className="text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
          {state.nickname}님의 {NY_YEAR} 신년운
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
          {(t ?? p)?.summary}
        </p>
      </header>

      {notice && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {/* 총운 - 열렸으면 끝까지, 아니면 맛보기 */}
      <section className="mt-6">
        <h2 className="text-center text-[21px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {(t ?? p)?.title}
        </h2>
        <div className="mt-4 space-y-4">
          {t ? (
            <>
              {t.sections.map((s) => (
                <section key={s.heading} className="rounded-2xl p-5" style={CARD}>
                  <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                    {s.heading}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                    {s.body}
                  </p>
                </section>
              ))}
              <section className="rounded-2xl p-5" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
                <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
                  {t.lack.heading}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
                  {t.lack.body}
                </p>
              </section>
            </>
          ) : (
            p && (
              <>
                <section className="rounded-2xl p-5" style={CARD}>
                  <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                    {p.free.heading}
                  </h3>
                  <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                    {p.free.body}
                  </p>
                </section>
                <section className="rounded-2xl p-5" style={CARD}>
                  <ul className="space-y-3">
                    {p.locked.map((h) => (
                      <li key={h}>
                        <p className="text-[14.5px] font-bold">{h}</p>
                        <p className="mt-1 select-none text-[13.5px] leading-relaxed" aria-hidden="true" style={{ filter: "blur(5px)", color: "var(--color-ink-soft)" }}>
                          {state.nickname}님의 한 해는 이렇게 흐르고, 이 자리를 이렇게 채우면 한결 단단해져요.
                        </p>
                      </li>
                    ))}
                  </ul>
                  {selling && (
                    <>
                      <button type="button" disabled={busy} onClick={() => buy(NY_LIGHT)} className="btn-primary mt-5 disabled:opacity-50">
                        {busy ? "여는 중..." : `총운 끝까지 보기 · ${formatNyang(state.lightPrice)}`}
                      </button>
                      <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                        내 {CURRENCY_NAME} {formatNyang(state.balance)}
                        {state.balance >= state.lightPrice ? " · 가진 엽전으로 바로 열려요" : " · 모자란 만큼만 결제해요"}
                      </p>
                    </>
                  )}
                </section>
              </>
            )
          )}
        </div>
      </section>

      {/* 전체 보기 - 열렸으면 풀이, 아니면 단추 하나 */}
      {state.full ? (
        <section className="mt-8">
          <h2 className="text-center text-[21px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {state.full.title}
          </h2>
          {state.full.summary && (
            <p className="mt-3 text-center text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
              {state.full.summary}
            </p>
          )}
          <div className="mt-5 space-y-4">
            {state.full.parts.map((x, i) => (
              <section key={`${i}-${x.heading}`} className="rounded-2xl p-5" style={CARD}>
                <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {x.heading}
                </h3>
                <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                  {x.body}
                </p>
              </section>
            ))}
          </div>
        </section>
      ) : (
        !state.owned.full &&
        selling && (
          <section className="mt-8 rounded-2xl p-5 text-center" style={CARD}>
            <button type="button" disabled={busy} onClick={() => buy(NY_FULL)} className="btn-primary disabled:opacity-50">
              {busy ? "여는 중..." : nyFullButton()}
            </button>
            {saleLine && (
              <p className="mt-2 text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                {saleLine}
              </p>
            )}
          </section>
        )
      )}

      <a href={`/person/${id}`} className="btn-secondary mt-8 block text-center">
        12가지 운세 보기
      </a>

      {pay && (
        <PayDialog
          personId={id}
          mode={pay}
          topics={[]}
          backTo={here}
          onEnough={() => {
            const m = pay;
            setPay(null);
            buy(m);
          }}
          onClose={() => setPay(null)}
        />
      )}
    </main>
  );
}

export default function NewYearPage({ params }: { params: { id: string } }) {
  if (!nyOn() || !isAuthEnabled()) return <ComingSoon title={`${NY_YEAR} 신년운`} />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body id={params.id} />
    </Suspense>
  );
}
