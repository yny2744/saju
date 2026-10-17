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
import { ELEMENT_TOKEN } from "@/lib/pillarView";
import type { ExamReading } from "@/lib/suneung";
import type { ExamDeep } from "@/server/exam/exam";

/**
 * 수능운 (2026-10-17 수정안 17) - 시즌에 따라 수능대박운 → 합격운 → 새 출발운.
 *   가볍게 보기 990냥 (엔진, 가입 선물 엽전으로 바로) → 깊게 보기 4,900냥 (AI)
 */

type Data = {
  nickname: string;
  owned: { light: boolean; deep: boolean };
  price: number;
  deepPrice: number;
  balance: number;
  reading: Omit<ExamReading, "kit"> & { kit: ExamReading["kit"] | null };
  deep: ExamDeep | null;
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
  const [pay, setPay] = useState<"exam" | "exam_deep" | null>(null);
  const wrote = useRef(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}/exam`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}/exam`)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState({ status: "ready", ...body });
  }, [id]);

  useEffect(() => {
    load();
    if (q.get("paid") === "1") setNotice("결제가 끝나 열렸어요.");
    // 처음 한 번만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  // 깊게 보기가 열렸는데 아직 안 썼으면 바로 쓴다 (25~30초 기다림 연출)
  useEffect(() => {
    if (state.status !== "ready" || !state.owned.deep || state.deep || wrote.current) return;
    wrote.current = true;
    (async () => {
      setWriting(true);
      const minWait = new Promise((r) => setTimeout(r, 25000 + Math.random() * 5000));
      try {
        const r = await fetch(`/api/persons/${encodeURIComponent(id)}/exam/write`, { method: "POST" });
        const body = await r.json().catch(() => ({}));
        await minWait;
        if (r.ok && body.deep) setState((s) => (s.status === "ready" ? { ...s, deep: body.deep } : s));
        else {
          wrote.current = false;
          setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
        }
      } catch (e) {
        wrote.current = false;
        reportClientError("수능운 깊게 보기", String(e));
        setNotice("연결이 끊겼어요. 새로고침해 주세요. 엽전은 그대로예요.");
      }
      setWriting(false);
    })();
  }, [state, id]);

  async function buy(mode: "exam" | "exam_deep") {
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
      reportClientError("수능운 열기", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref={`/person/${id}`} linkLabel="돌아가기" />;

  const r = state.reading;
  const open = state.owned.light || state.owned.deep;
  const kit = r.kit;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-10 sm:pt-14">
      {writing && <WritingOverlay title={`${r.title} 깊게 보기를 쓰고 있어요`} steps={["사주 여덟 글자를 펼치고 있어요", "시험날 기운과 견주고 있어요", "과목별 리듬을 살피고 있어요", "응원의 말을 고르고 있어요"]} durationMs={28000} />}

      <header className="rounded-2xl px-5 py-6 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
        <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
          류결사주
        </p>
        <h1 className="mt-1 text-[28px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
          {state.nickname}님의 {r.title}
        </h1>
        {r.dday !== null && (
          <p className="mt-3 inline-block rounded-full px-4 py-1 text-[15px] font-bold" style={{ backgroundColor: GOLD, color: NAVY }}>
            수능 {r.dday === 0 ? "D-DAY" : `D-${r.dday}`} · 11월 19일 (목)
          </p>
        )}
        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: GOLD_L }}>
          {r.summary}
        </p>
      </header>

      {notice && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {!open ? (
        <section className="mt-6 rounded-2xl p-5" style={CARD}>
          <p className="text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            이런 이야기를 담았어요
          </p>
          <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-[14.5px]">
            {r.sections.map((s) => (
              <li key={s.heading} className="flex gap-2">
                <span style={{ color: GOLD }}>◆</span>
                <span>{s.heading}</span>
              </li>
            ))}
            <li className="flex gap-2">
              <span style={{ color: GOLD }}>◆</span>
              <span>마음 한 줄</span>
            </li>
          </ul>
          <button type="button" disabled={busy} onClick={() => buy("exam")} className="btn-primary mt-5 disabled:opacity-50">
            {busy ? "여는 중..." : `가볍게 보기 · ${formatNyang(state.price)}`}
          </button>
          <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            내 {CURRENCY_NAME} {formatNyang(state.balance)}
            {state.balance >= state.price ? " · 가진 엽전으로 바로 열려요" : " · 모자란 만큼만 결제해요"}
          </p>
          <button type="button" disabled={busy} onClick={() => buy("exam_deep")} className="btn-secondary mt-3 block w-full text-center disabled:opacity-50">
            처음부터 깊게 보기 · {formatNyang(state.deepPrice)}
          </button>
        </section>
      ) : (
        <>
          <div className="mt-6 space-y-4">
            {r.sections.map((s) => (
              <section key={s.heading} className="rounded-2xl p-5" style={CARD}>
                <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {s.heading}
                </h2>
                <p className="mt-2 text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)" }}>
                  {s.body}
                </p>
              </section>
            ))}
          </div>

          {kit && (
            <section className="mt-4 rounded-2xl p-5" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
              <p className="text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)", color: GOLD_L }}>
                행운 꾸러미 · {kit.nature}({kit.hanja})의 기운
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center text-[13.5px]">
                {[
                  ["색", kit.colors],
                  ["숫자", kit.numbers],
                  ["방위", kit.direction],
                  ["주머니 속", kit.pocket],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl px-2 py-3" style={{ backgroundColor: "rgba(243,231,198,0.08)", border: "1px solid rgba(212,178,101,0.4)" }}>
                    <p style={{ color: GOLD }}>{k}</p>
                    <p className="mt-1 font-bold" style={{ color: GOLD_L }}>
                      {v}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-center text-[13px]" style={{ color: GOLD_L }}>
                <span className="inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: `var(--color-element-${ELEMENT_TOKEN[kit.element]})` }} /> 쉬는 시간엔 {kit.snack}
              </p>
            </section>
          )}

          {r.mind && (
            <section className="mt-4 rounded-2xl px-5 py-6 text-center" style={CARD}>
              <p className="text-[13px]" style={{ color: GOLD }}>
                마음 한 줄
              </p>
              <p className="mt-2 text-[18px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)" }}>
                “{r.mind}”
              </p>
            </section>
          )}

          {state.deep ? (
            <section className="mt-8">
              <h2 className="text-center text-[22px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {r.title} 깊게 보기
              </h2>
              {state.deep.summary && (
                <p className="mt-3 text-center text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                  {state.deep.summary}
                </p>
              )}
              <div className="mt-5 space-y-4">
                {state.deep.parts.map((p) => (
                  <section key={p.heading} className="rounded-2xl p-5" style={CARD}>
                    <h3 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                      {p.heading}
                    </h3>
                    <p className="mt-2 whitespace-pre-line text-[15px] leading-[1.85]" style={{ color: "var(--color-ink-soft)" }}>
                      {p.body}
                    </p>
                  </section>
                ))}
              </div>
            </section>
          ) : (
            !state.owned.deep && (
              <section className="mt-8 rounded-2xl p-5" style={CARD}>
                <p className="text-center text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  {r.title} 깊게 보기
                </p>
                <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-[14.5px]">
                  {r.deeper.map((d) => (
                    <li key={d} className="flex gap-2">
                      <span style={{ color: GOLD }}>◆</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={busy} onClick={() => buy("exam_deep")} className="btn-primary mt-5 disabled:opacity-50">
                  깊게 보기 · {formatNyang(state.deepPrice)}
                </button>
              </section>
            )
          )}
        </>
      )}

      <p className="mt-8 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        사주로 보는 응원과 마음가짐이에요. 결과를 미리 정하는 풀이가 아니에요.
      </p>
      <a href={`/person/${id}`} className="btn-secondary mt-4 block text-center">
        12가지 운세 보기
      </a>

      {pay && (
        <PayDialog
          personId={id}
          mode={pay}
          topics={[]}
          backTo={`/person/${id}/exam`}
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

export default function ExamPage({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="수능운" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body id={params.id} />
    </Suspense>
  );
}
