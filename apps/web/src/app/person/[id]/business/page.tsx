"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PersonHeader } from "@/components/yeopjeon/PersonHeader";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { ReviewBox } from "@/components/reviews/ReviewBox";
import { ReviewStrip } from "@/components/reviews/ReviewStrip";
import { BusinessChars, BusinessFacts } from "@/components/BusinessReadingCard";
import { notifyYeopjeonChanged, reportClientError, useYeopjeon } from "@/components/yeopjeon/useYeopjeon";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { BIZ_INFO, FEELINGS, INDUSTRIES, isBizKind, type BizKind, type FeelingKey } from "@/lib/businessName";
import { ELEMENT_HANJA } from "@/lib/manseView";
import type { ElementKo } from "@/lib/pillarView";
import type { BusinessReport } from "@/server/naming/business";
import type { ReadingHeader } from "@/server/readings/readings";

/**
 * 상호·기업·브랜딩 작명 화면 (2026-10-13 수정안 63, 2026-10-14 수정안 15: ?kind=business|corp|brand).
 *   잠김(상품 소개·사기) → 조건(업종·느낌) → 상호 후보 7개(뜻·이야기·풀이·영문) + 상호 작명서 PDF + 7일 안 1회 다시 추천
 */

type Base = { header: ReadingHeader; nickname: string; needed: ElementKo[]; price: number };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | (Base & { status: "locked" | "form" })
  | (Base & { status: "ready"; report: BusinessReport; redoLeft: number });

const CARD = { border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" } as const;
const GOLD = "var(--color-gold)";

/** 화면 문구에 쓰는 이름: 상호 / 회사 이름 / 브랜드 이름 */
const NOUN: Record<BizKind, string> = { business: "상호", corp: "회사 이름", brand: "브랜드 이름" };

function Body({ id }: { id: string }) {
  const q = useSearchParams();
  const kindQ = q.get("kind");
  const kind: BizKind = isBizKind(kindQ) ? kindQ : "business";
  const T = BIZ_INFO[kind].title;
  const N = NOUN[kind];
  const DOC = BIZ_INFO[kind].doc;
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [industry, setIndustry] = useState("");
  const [feelings, setFeelings] = useState<FeelingKey[]>([]);
  const [redoForm, setRedoForm] = useState(false);
  const { data: wallet, reload: reloadWallet } = useYeopjeon(state.status === "locked");

  const load = useCallback(async () => {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}/business?kind=${kind}`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}/business?kind=${kind}`)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState(body);
  }, [id, kind]);

  useEffect(() => {
    load();
    if (q.get("paid") === "1") setNotice(`결제가 끝나 열렸어요. 아래에서 업종을 고르고 ${N} 후보를 받아 보세요.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  async function buy() {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: kind, topics: [] }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        reloadWallet();
        notifyYeopjeonChanged();
        await load();
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") setPayOpen(true);
      else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError(`${T} 열기`, String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  async function generate(redo = false) {
    if (state.status !== "form" && state.status !== "ready") return;
    setNotice(null);
    setWriting(true);
    const minWait = new Promise((r) => setTimeout(r, redo ? 6000 : 9000));
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/business`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, industry: industry || undefined, feelings, redo }),
      });
      const body = await r.json().catch(() => ({}));
      await minWait;
      if (r.ok) {
        setRedoForm(false);
        setState({ ...(state as Base), status: "ready", report: body.report, redoLeft: body.redoLeft });
        window.scrollTo({ top: 0 });
      } else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError(`${T} 후보`, String(e));
      setNotice("연결이 끊겼어요. 다시 눌러 주세요. 엽전은 빠지지 않아요.");
    }
    setWriting(false);
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/business/pdf?kind=${kind}`);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "작명서를 만들지 못했어요.");
      }
      const blob = await r.blob();
      const m = (r.headers.get("Content-Disposition") ?? "").match(/filename\*=UTF-8''([^;]+)/);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = m ? decodeURIComponent(m[1]) : `${DOC}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "작명서를 만들지 못했어요.");
    }
    setBusy(false);
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/name" linkLabel="이름 풀이 · 개명 · 작명으로" />;
  if (writing)
    return (
      <WritingOverlay
        title={`대표님 사주에 맞는 ${N}${N.endsWith("름") ? "을" : "를"} 고르고 있어요`}
        steps={["대표님 사주의 아쉬운 기운을 찾고 있어요", "업종의 오행을 살피고 있어요", "소리의 흐름을 맞춰 보고 있어요", "한자 총획을 셈하고 있어요", "이름 이야기를 쓰고 있어요"]}
        durationMs={9000}
      />
    );

  const needText = state.needed.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·");
  const form = (
    <section className="space-y-5 rounded-2xl p-5" style={CARD}>
      <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {N} 지을 조건
      </h2>
      <div>
        <label className="mb-1.5 block text-sm font-medium" htmlFor="biz-ind">
          업종
        </label>
        <select id="biz-ind" value={industry} onChange={(e) => setIndustry(e.target.value)} className="field-input">
          <option value="">업종을 골라 주세요</option>
          {INDUSTRIES.map((x) => (
            <option key={x.key} value={x.key}>
              {x.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">
          원하는 느낌 <span style={{ color: "var(--color-ink-faint)" }}>(두 가지까지, 선택)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {FEELINGS.map((f) => {
            const on = feelings.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFeelings(on ? feelings.filter((x) => x !== f.key) : feelings.length >= 2 ? [feelings[1], f.key] : [...feelings, f.key])}
                className="rounded-full px-3.5 py-1.5 text-[13.5px] font-semibold"
                style={{ border: on ? "2px solid var(--color-accent)" : "1px solid var(--color-line)", color: on ? "var(--color-accent)" : undefined }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>
      <button type="button" disabled={!industry} onClick={() => generate(state.status === "ready")} className="btn-primary disabled:opacity-50">
        {state.status === "ready" ? "이 조건으로 다시 추천받기 (1회)" : `${N} 후보 받기`}
      </button>
    </section>
  );

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <PersonHeader header={state.header} kicker={`류결사주 · ${T}`} title={N} />

      {notice && (
        <p className="mb-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      <section className="gold-card mb-6 rounded-2xl px-5 py-5 text-center">
        <p className="text-[16px] font-bold leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
          대표님 사주에는 {needText}의 기운이 아쉬워요.
        </p>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-ink-soft)" }}>
          날마다 불리는 {N}에 이 기운과 업종의 기운을 함께 담아 드려요.
        </p>
      </section>

      {state.status === "locked" && (
        <section className="rounded-2xl p-5" style={CARD}>
          <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {T} · {CURRENCY_NAME} {formatNyang(state.price)}
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <li>◆ 업종의 오행과 대표님 사주를 함께 맞춘 {N} 후보 7개</li>
            <li>◆ 한자 이름은 총획이 길한 수 · 소리가 부딪히지 않는 이름만</li>
            <li>◆ 후보마다 뜻 · 이름 이야기 · 영문 표기</li>
            <li>◆ {DOC} PDF · 7일 안에 1회 다시 추천 (조건을 바꿔도 돼요)</li>
          </ul>
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            내 {CURRENCY_NAME} {formatNyang(wallet?.balance ?? 0)}
            {(wallet?.balance ?? 0) < state.price && " · 모자란 만큼만 카드·간편결제"}
          </p>
          <button type="button" disabled={busy} onClick={buy} className="btn-primary mt-4 disabled:opacity-50">
            {busy ? "여는 중..." : (wallet?.balance ?? 0) >= state.price ? `${CURRENCY_NAME}으로 열기` : "결제하고 열기"}
          </button>
        </section>
      )}

      {state.status === "form" && form}
      {state.status === "locked" && <ReviewStrip naming variant="mini" title="작명을 받은 분들의 한마디" />}

      {state.status === "ready" && (
        <div className="space-y-5">
          <p className="text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
            {state.report.industry.label} · {state.report.industry.element}({ELEMENT_HANJA[state.report.industry.element]})의 기운
            {state.report.feelings.length > 0 && ` · ${state.report.feelings.map((f) => FEELINGS.find((x) => x.key === f)?.label).join(", ")}`}
          </p>
          {state.report.candidates.map((c, i) => (
            <section key={c.hangul} className="space-y-4 rounded-2xl p-5" style={CARD}>
              <p className="text-[12px] font-semibold" style={{ color: GOLD }}>
                후보 {i + 1}
              </p>
              <div className="text-center">
                <p className="text-[30px] font-bold leading-none" style={{ fontFamily: "var(--font-serif)" }}>
                  {c.hangul}
                  {c.hanja && <span className="ml-2 text-[24px]">{c.hanja}</span>}
                </p>
                <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
                  {c.meaning} · {c.english}
                </p>
              </div>
              <BusinessChars r={c.reading} />
              <p className="text-[15px] leading-[1.85]">{c.story}</p>
              <BusinessFacts r={c.reading} />
            </section>
          ))}
          <p className="text-center text-[12.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
            간판에는 업종 말을 붙여도 좋아요 (예: {state.report.candidates[0]?.hangul} {state.report.industry.suffix.split(" · ")[0]}).
            <br />
            같은 이름이 상표로 등록돼 있는지는{" "}
            <a href="https://www.kipris.or.kr" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              특허청 키프리스
            </a>
            에서 꼭 찾아보세요. 전해 오는 작명 이론에 따른 참고용이에요.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={downloadPdf}
            className="block w-full rounded-xl py-3.5 text-[16px] font-bold disabled:opacity-60"
            style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-gold-soft)", fontFamily: "var(--font-serif)" }}
          >
            {DOC} PDF로 받기
          </button>
          {state.redoLeft > 0 && !redoForm && (
            <button
              type="button"
              onClick={() => {
                setIndustry(state.report.industry.key);
                setFeelings(state.report.feelings);
                setRedoForm(true);
              }}
              className="btn-secondary"
            >
              마음에 드는 이름이 없어요 · 다시 추천받기 (1회)
            </button>
          )}
          {redoForm && form}
          <ReviewBox personId={id} product={kind} />
        </div>
      )}

      <div className="mt-8 space-y-2.5">
        <a href={`/person/${id}`} className="btn-secondary block text-center">
          대표님의 12가지 운세 보기
        </a>
        <a href="/name" className="block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          이름 풀이 · 개명 · 작명 처음으로
        </a>
      </div>

      {payOpen && (
        <PayDialog
          personId={id}
          mode={kind}
          topics={[]}
          backTo={`/person/${id}/business?kind=${kind}`}
          onEnough={() => {
            setPayOpen(false);
            buy();
          }}
          onClose={() => setPayOpen(false)}
        />
      )}
    </main>
  );
}

export default function BusinessNamingPage({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="작명" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body id={params.id} />
    </Suspense>
  );
}
