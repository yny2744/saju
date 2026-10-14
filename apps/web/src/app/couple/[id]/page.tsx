"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";
import { ElementDonut, HBars, ScoreRing } from "@/components/charts/MiniCharts";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import type { CoupleMatch } from "@/lib/coupleMatch";
import type { ElementKo } from "@/lib/pillarView";

/**
 * 연인 궁합 화면 (2026-10-14 수정안 10).
 *   무료: 궁합 점수 · 두 사람 오행 원형 도표 · 항목별 막대와 한 줄 풀이
 *   19,900냥: AI 긴 풀이 6장 (엔진 근거만)
 */

type Content = { sections: Array<{ title: string; body: string }> };
type Base = { id: string; price: number; match: CoupleMatch; birthA: string; birthB: string };
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | (Base & { status: "locked"; balance: number })
  | (Base & { status: "write" })
  | (Base & { status: "ready"; content: Content });

const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;
const GOLD = "var(--color-gold)";

function Body({ id }: { id: string }) {
  const q = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/couple/${encodeURIComponent(id)}`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/couple/${id}`)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState(body);
    return body as State;
  }, [id]);

  const write = useCallback(async () => {
    setWriting(true);
    const minWait = new Promise((r) => setTimeout(r, 15000));
    try {
      const r = await fetch(`/api/couple/${encodeURIComponent(id)}/write`, { method: "POST" });
      const body = await r.json().catch(() => ({}));
      await minWait;
      if (r.ok) setState(body);
      else setNotice(body?.error?.message ?? "잠시 후 다시 눌러 주세요.");
    } catch (e) {
      reportClientError("연인 궁합 쓰기", String(e));
      setNotice("연결이 끊겼어요. 다시 눌러 주세요. 엽전은 다시 빠지지 않아요.");
    }
    setWriting(false);
  }, [id]);

  useEffect(() => {
    load().then((s) => {
      if (s && s.status === "write") write();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buy() {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/couple/${encodeURIComponent(id)}/purchase`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await r.json().catch(() => ({}));
      if (r.ok || body?.error?.code === "ALREADY_OWNED") {
        notifyYeopjeonChanged();
        await write();
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") setPayOpen(true);
      else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("연인 궁합 열기", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  if (state.status === "loading") return <LoadingState message="두 사람의 사주를 맞춰 보고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/couple" linkLabel="연인 궁합 처음으로" />;
  if (writing)
    return (
      <WritingOverlay
        title="두 사람의 궁합을 깊게 풀고 있어요"
        steps={["두 사람의 본바탕을 맞춰 보고 있어요", "배우자 자리를 살피고 있어요", "서로 채워 주는 기운을 찾고 있어요", "함께하면 좋은 때를 보고 있어요", "두 분께 드릴 말을 고르고 있어요"]}
        durationMs={15000}
      />
    );

  const m = state.match;
  const shares = (p: Record<ElementKo, number>) => (["목", "화", "토", "금", "수"] as ElementKo[]).map((e) => ({ element: e, percent: p[e] }));

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <header className="mb-6 text-center">
        <p className="section-label">류결사주 · 연인 궁합</p>
        <h1 className="mt-1 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {m.a.name} <span style={{ color: GOLD }}>♡</span> {m.b.name}
        </h1>
        <p className="mt-1 text-[12.5px]" style={{ color: "var(--color-ink-faint)" }}>
          {state.birthA} · {state.birthB}
        </p>
      </header>

      {notice && (
        <p className="mb-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}
      {q.get("paid") === "1" && state.status !== "ready" && (
        <p className="mb-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          결제가 끝났어요. 궁합 풀이를 쓰고 있어요.
        </p>
      )}

      <section className="mb-5 rounded-2xl p-5 text-center" style={CARD}>
        <ScoreRing score={m.score} label="궁합 점수" />
        <p className="mt-3 text-[20px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {m.grade}
        </p>
        <p className="mt-2 text-left text-[14.5px] leading-[1.8]" style={{ color: "var(--color-ink-soft)" }}>
          {m.summary}
        </p>
        <div className="mt-4 text-left">
          <HBars rows={m.items.map((i) => ({ label: i.title, got: i.points, max: i.max, note: i.good ? "잘 맞음" : "맞춰 가요" }))} />
        </div>
      </section>

      <section className="mb-5 rounded-2xl p-5" style={CARD}>
        <h2 className="mb-3 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          두 사람의 다섯 기운
        </h2>
        <p className="mb-2 text-[14px] font-bold">
          {m.a.name} · {m.a.dayLabel}
        </p>
        <ElementDonut shares={shares(m.a.percents)} needed={m.a.needed} size={120} />
        <p className="mb-2 mt-5 text-[14px] font-bold">
          {m.b.name} · {m.b.dayLabel}
        </p>
        <ElementDonut shares={shares(m.b.percents)} needed={m.b.needed} size={120} />
      </section>

      <section className="mb-5 space-y-3">
        {m.items.map((i) => (
          <div key={i.key} className="flex gap-3 rounded-2xl p-4" style={CARD}>
            <span className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-xl px-2 text-[15px] font-bold" style={{ backgroundColor: i.good ? "var(--color-gold-soft)" : "var(--color-paper-soft)", fontFamily: "var(--font-serif)" }}>
              {i.mark}
            </span>
            <div>
              <p className="text-[15px] font-bold">{i.title}</p>
              <p className="mt-1 text-[14px] leading-[1.75]" style={{ color: "var(--color-ink-soft)" }}>
                {i.text}
              </p>
            </div>
          </div>
        ))}
      </section>

      {state.status === "locked" && (
        <section className="rounded-2xl p-5" style={CARD}>
          <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            깊은 궁합 풀이 · {CURRENCY_NAME} {formatNyang(state.price)}
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            <li>◆ 두 사람의 첫인상과 끌림 · 성격과 연애 방식</li>
            <li>◆ 자주 부딪히는 자리와 푸는 법</li>
            <li>◆ 서로 채워 주는 기운 · 함께하면 좋은 때</li>
            <li>◆ 두 사람에게 드리는 한마디 (약 4,000자)</li>
          </ul>
          <p className="mt-3 text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
            내 {CURRENCY_NAME} {formatNyang(state.balance)}
            {state.balance < state.price && " · 모자란 만큼만 카드·간편결제"}
          </p>
          <button type="button" disabled={busy} onClick={buy} className="btn-primary mt-4 disabled:opacity-50">
            {busy ? "여는 중..." : state.balance >= state.price ? `${CURRENCY_NAME}으로 열기` : "결제하고 열기"}
          </button>
        </section>
      )}

      {state.status === "write" && (
        <button type="button" onClick={write} className="btn-primary">
          궁합 풀이 받기
        </button>
      )}

      {state.status === "ready" && (
        <div className="space-y-4">
          {state.content.sections.map((s) => (
            <section key={s.title} className="rounded-2xl p-5" style={CARD}>
              <h3 className="mb-2 text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                {s.title}
              </h3>
              <p className="whitespace-pre-line text-[15px] leading-[1.9]">{s.body}</p>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-[11.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        전해 오는 명리 이론에 따른 재미와 참고용 풀이예요. 두 사람의 관계는 두 사람이 만들어 가요.
      </p>
      <a href="/couple" className="mt-4 block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
        다른 사람과 궁합 보기
      </a>

      {payOpen && (
        <PayDialog
          personId={id}
          mode="couple"
          topics={[]}
          backTo={`/couple/${id}`}
          checkoutUrl={`/api/couple/${encodeURIComponent(id)}/checkout`}
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

export default function CoupleResultPage({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="연인 궁합" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body id={params.id} />
    </Suspense>
  );
}
