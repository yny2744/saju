"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { HanjaPicker } from "@/components/HanjaPicker";
import { PersonHeader } from "@/components/yeopjeon/PersonHeader";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { WritingOverlay } from "@/components/yeopjeon/WritingOverlay";
import { ReviewBox } from "@/components/reviews/ReviewBox";
import { ReviewStrip } from "@/components/reviews/ReviewStrip";
import { notifyYeopjeonChanged, reportClientError, useYeopjeon } from "@/components/yeopjeon/useYeopjeon";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { ELEMENT_TOKEN, type ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA } from "@/lib/manseView";
import type { NameReadingResult } from "@/lib/nameReading";
import type { NamingReport } from "@/server/naming/naming";
import type { ReadingHeader } from "@/server/readings/readings";

/**
 * 아이 작명 · 개명 추천 화면 (2026-10-12 수정안 46).
 *   잠김(상품 소개·사기) → 조건 입력(성씨 한자·돌림자) → 이름 후보(뜻·수리·이름 이야기) + 작명서 PDF + 7일 안 1회 다시 추천
 */

type Kind = "naming" | "rename";
type Base = {
  kind: Kind;
  header: ReadingHeader;
  nickname: string;
  surname: string | null;
  surnameHanja: string | null;
  surnameChoices: string[];
  needed: ElementKo[];
  price: number;
};
type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | (Base & { status: "locked" | "form"; preview: NameReadingResult | null })
  | (Base & { status: "ready"; report: NamingReport; redoLeft: number });

const TITLE: Record<Kind, string> = { naming: "신생아 작명", rename: "개명 추천" };
const GOLD = "var(--color-gold)";
const elColor = (e: string) => (e ? `var(--color-element-${ELEMENT_TOKEN[e as ElementKo]})` : "var(--color-ink-faint)");
const CARD = { border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" } as const;

function NameBody({ id }: { id: string }) {
  const q = useSearchParams();
  const kind: Kind = q.get("kind") === "rename" ? "rename" : "naming";
  const [state, setState] = useState<State>({ status: "loading" });
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [surnameHanja, setSurnameHanja] = useState("");
  const [dollimOn, setDollimOn] = useState(false);
  const [dollim, setDollim] = useState<{ hangul: string; hanja: string; position: 1 | 2 }>({ hangul: "", hanja: "", position: 2 });
  const [picker, setPicker] = useState(false);
  const { data: wallet, reload: reloadWallet } = useYeopjeon(state.status === "locked");

  const load = useCallback(async () => {
    const r = await fetch(`/api/persons/${encodeURIComponent(id)}/naming?kind=${kind}`).catch(() => null);
    if (!r) return setState({ status: "error", message: "연결이 끊겼어요." });
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}/name?kind=${kind}`)}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setState({ status: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setState(body);
  }, [id, kind]);

  useEffect(() => {
    load();
    if (q.get("paid") === "1") setNotice("결제가 끝나 열렸어요. 아래에서 조건을 고르고 이름 후보를 받아 보세요.");
    // 처음 한 번만
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
      reportClientError("작명 열기", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  async function generate(redo = false) {
    if (state.status !== "form" && state.status !== "ready") return;
    setNotice(null);
    setWriting(true);
    const minWait = new Promise((r) => setTimeout(r, redo ? 6000 : 9000)); // 너무 뚝딱 나오지 않게 (수정안 32와 같은 뜻)
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/naming`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          redo,
          surnameHanja: state.surnameHanja ?? surnameHanja,
          dollim: dollimOn ? dollim : null,
        }),
      });
      const body = await r.json().catch(() => ({}));
      await minWait;
      if (r.ok) {
        setState({ ...(state as Base), status: "ready", report: body.report, redoLeft: body.redoLeft });
        window.scrollTo({ top: 0 });
      } else setNotice(body?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("작명 후보", String(e));
      setNotice("연결이 끊겼어요. 다시 눌러 주세요. 엽전은 빠지지 않아요.");
    }
    setWriting(false);
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(id)}/naming/pdf?kind=${kind}`);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "작명서를 만들지 못했어요.");
      }
      const blob = await r.blob();
      const m = (r.headers.get("Content-Disposition") ?? "").match(/filename\*=UTF-8''([^;]+)/);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = m ? decodeURIComponent(m[1]) : "작명서.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "작명서를 만들지 못했어요.");
    }
    setBusy(false);
  }

  if (state.status === "loading") return <LoadingState message="불러오고 있어요..." />;
  if (state.status === "error") return <ErrorState message={state.message} linkHref="/name" linkLabel="이름 풀이 · 작명으로" />;
  if (writing)
    return (
      <WritingOverlay
        title={kind === "naming" ? "아기에게 꼭 맞는 이름을 고르고 있어요" : "사주에 맞는 새 이름을 고르고 있어요"}
        steps={["사주의 아쉬운 기운을 찾고 있어요", "그 기운을 품은 한자를 고르고 있어요", "수리 네 격을 맞춰 보고 있어요", "소리의 흐름을 살피고 있어요", "이름 이야기를 쓰고 있어요"]}
        durationMs={9000}
      />
    );

  const needText = state.needed.map((e) => `${e}(${ELEMENT_HANJA[e]})`).join("·");

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-12 sm:pt-16">
      <PersonHeader header={state.header} kicker={`류결사주 · ${TITLE[kind]}`} title={kind === "naming" ? "이름 짓기" : "새 이름"} />

      {notice && (
        <p className="mb-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      <section className="gold-card mb-6 rounded-2xl px-5 py-5 text-center">
        <p className="text-[16px] font-bold leading-relaxed" style={{ fontFamily: "var(--font-serif)" }}>
          참 좋은 사주예요. 딱 하나, {needText}의 기운이 아쉬워요.
        </p>
        <p className="mt-2 text-[13.5px]" style={{ color: "var(--color-ink-soft)" }}>
          이 기운을 품은 한자로 이름을 지어 평생 곁에서 채워 드려요.
        </p>
      </section>

      {(state.status === "locked" || state.status === "form") && kind === "rename" && <CurrentName reading={state.preview} name={state.nickname} />}

      {state.status === "locked" && (
        <section className="rounded-2xl p-5" style={CARD}>
          <h2 className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            {TITLE[kind]} · {CURRENCY_NAME} {formatNyang(state.price)}
          </h2>
          <ul className="mt-3 space-y-1.5 text-[14px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
            {kind === "rename" && <li>◆ 지금 이름 진단 (수리 네 격 · 소리 · 음양 · 사주 보완)</li>}
            <li>◆ 아쉬운 {needText}의 기운을 채우는 이름 후보 {kind === "naming" ? 7 : 5}개</li>
            <li>◆ 수리 네 격이 모두 길한 수 · 소리가 부딪히지 않는 이름만</li>
            <li>◆ 후보마다 한자 뜻과 이름 이야기{kind === "naming" ? " · 돌림자 반영" : ""}</li>
            <li>◆ {kind === "naming" ? "작명서" : "개명 추천서"} PDF · 7일 안에 1회 다시 추천</li>
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

      {state.status === "form" && (
        <section className="space-y-5 rounded-2xl p-5" style={CARD}>
          <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            이름 지을 조건
          </h2>
          {!state.surnameHanja && (
            <div>
              <p className="mb-2 text-sm font-medium">성씨 한자 ({state.surname})</p>
              <div className="flex flex-wrap gap-2">
                {state.surnameChoices.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setSurnameHanja(h)}
                    className="rounded-xl px-4 py-2 text-[20px]"
                    style={{ fontFamily: "var(--font-serif)", border: surnameHanja === h ? "2px solid var(--color-accent)" : "1px solid var(--color-line)" }}
                  >
                    {h}
                  </button>
                ))}
              </div>
              {state.surnameChoices.length === 0 && (
                <p className="text-[13px]" style={{ color: "var(--color-danger)" }}>
                  성씨 한자를 찾지 못했어요. 처음 화면에서 성씨 한자를 골라 다시 입력해 주세요.
                </p>
              )}
            </div>
          )}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={dollimOn} onChange={(e) => setDollimOn(e.target.checked)} className="h-4 w-4" />
              돌림자가 있어요
            </label>
            {dollimOn && (
              <div className="mt-3 space-y-3">
                <div className="flex gap-2">
                  <input
                    aria-label="돌림자 한글"
                    value={dollim.hangul}
                    maxLength={1}
                    onChange={(e) => setDollim({ ...dollim, hangul: e.target.value.trim(), hanja: "" })}
                    className="field-input w-20 text-center"
                    placeholder="예: 연"
                  />
                  <button
                    type="button"
                    disabled={!/^[가-힣]$/.test(dollim.hangul)}
                    onClick={() => setPicker(true)}
                    className="field-input flex-1 text-left disabled:opacity-50"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {dollim.hanja || "돌림자 한자 고르기"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {([1, 2] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDollim({ ...dollim, position: p })}
                      className="rounded-xl py-2.5 text-[14px] font-semibold"
                      style={{ border: dollim.position === p ? "2px solid var(--color-accent)" : "1px solid var(--color-line)" }}
                    >
                      이름 {p === 1 ? "첫" : "끝"} 글자
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            disabled={(!state.surnameHanja && !surnameHanja) || (dollimOn && !dollim.hanja)}
            onClick={() => generate(false)}
            className="btn-primary disabled:opacity-50"
          >
            이름 후보 받기
          </button>
        </section>
      )}

      {state.status === "locked" && <ReviewStrip naming variant="mini" title="작명·개명을 받은 분들의 한마디" />}

      {state.status === "ready" && (
        <Report
          report={state.report}
          redoLeft={state.redoLeft}
          busy={busy}
          onPdf={downloadPdf}
          onRedo={() => {
            if (window.confirm("지금 후보는 빼고 새 후보를 받아요. 다시 추천은 한 번만 받을 수 있어요. 받을까요?")) generate(true);
          }}
        />
      )}

      {state.status === "ready" && <ReviewBox personId={id} product={kind} />}

      <div className="mt-8 space-y-2.5">
        <a href={`/person/${id}`} className="btn-secondary block text-center">
          {kind === "naming" ? "이 아기의 12가지 운세 보기" : "12가지 운세 보기"}
        </a>
        <a href="/name" className="block text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
          이름 풀이 · 작명 처음으로
        </a>
      </div>

      {payOpen && (
        <PayDialog
          personId={id}
          mode={kind}
          topics={[]}
          backTo={`/person/${id}/name?kind=${kind}`}
          onEnough={() => {
            setPayOpen(false);
            buy();
          }}
          onClose={() => setPayOpen(false)}
        />
      )}
      {picker && (
        <HanjaPicker
          name={dollim.hangul}
          value={dollim.hanja}
          onClose={() => setPicker(false)}
          onDone={(h) => {
            setDollim({ ...dollim, hanja: /\p{Script=Han}/u.test(h) ? h : "" });
            setPicker(false);
          }}
        />
      )}
    </main>
  );
}

function CurrentName({ reading, name }: { reading: NameReadingResult | null; name: string }) {
  if (!reading) return null;
  const lucky = reading.suri.filter((s) => s.lucky).length;
  return (
    <section className="mb-6 rounded-2xl p-5" style={CARD}>
      <p className="section-label mb-1">지금 이름 진단 · 무료</p>
      <h2 className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {name} {reading.chars.map((c) => c.hanja ?? c.hangul).join("")}
      </h2>
      <ul className="mt-3 space-y-1 text-[14px]">
        {reading.complete ? <li>수리 네 격 중 길한 수 {lucky}개</li> : <li>한자를 모두 알지 못해 수리는 보지 못했어요</li>}
        {reading.yinYangBalanced !== null && <li>음양 {reading.yinYangBalanced ? "고루 갖춤" : "한쪽으로 치우침"}</li>}
        <li>소리 흐름 {reading.sound.clashes === 0 ? "부딪힘 없음" : `부딪힘 ${reading.sound.clashes}곳`}</li>
        <li>사주 보완 {reading.supports.length ? `${reading.supports.join("·")} 기운을 채워 줌` : "아쉬운 기운을 채우는 글자 없음"}</li>
      </ul>
    </section>
  );
}

function Report({ report, redoLeft, busy, onPdf, onRedo }: { report: NamingReport; redoLeft: number; busy: boolean; onPdf: () => void; onRedo: () => void }) {
  return (
    <div className="space-y-5">
      {report.current?.reading && <CurrentName reading={report.current.reading} name={report.current.name} />}
      {report.dollim && (
        <p className="text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          돌림자 {report.dollim.hangul}({report.dollim.hanja}) · 이름 {report.dollim.position === 1 ? "첫" : "끝"} 글자
        </p>
      )}
      {report.candidates.map((c, i) => (
        <section key={c.hangul} className="rounded-2xl p-5" style={CARD}>
          <p className="text-[12px] font-semibold" style={{ color: GOLD }}>
            후보 {i + 1}
          </p>
          <div className="mt-2 flex items-end gap-3">
            <p className="text-[34px] font-bold leading-none" style={{ fontFamily: "var(--font-serif)" }}>
              {report.surnameHanja}
              {c.hanja}
            </p>
            <p className="pb-1 text-[18px] font-semibold">
              {report.surname}
              {c.hangul}
            </p>
          </div>
          <div className="mt-3 space-y-1.5">
            {c.chars.map((x) => (
              <p key={x.hanja} className="flex items-center gap-2 text-[14px]">
                <span className="flex h-7 w-7 items-center justify-center rounded-md text-[15px] text-white" style={{ backgroundColor: elColor(x.element), fontFamily: "var(--font-serif)" }}>
                  {x.hanja}
                </span>
                <span>
                  {x.meaning} {x.hangul} · {x.strokes}획 · {x.element || "—"}
                  {x.element && report.needed.includes(x.element as ElementKo) && (
                    <b className="ml-1" style={{ color: "var(--color-danger)" }}>
                      아쉬운 기운을 채움
                    </b>
                  )}
                </span>
              </p>
            ))}
          </div>
          <p className="mt-3 text-[15px] leading-[1.85]">{c.story}</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center">
            {c.suri.map((s) => (
              <div key={s.name} className="rounded-lg py-1.5" style={{ backgroundColor: s.lucky ? "var(--color-gold-soft)" : "var(--color-paper-soft)" }}>
                <p className="text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                  {s.name}
                </p>
                <p className="text-[15px] font-bold">{s.value}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
      <p className="text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)" }}>
        이름은 소리 내어 여러 번 불러 보고, 가족과 함께 정해 주세요. 전해 오는 작명 이론에 따른 참고용이에요.
      </p>
      <button type="button" disabled={busy} onClick={onPdf} className="block w-full rounded-xl py-3.5 text-[16px] font-bold disabled:opacity-60" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-gold-soft)", fontFamily: "var(--font-serif)" }}>
        {report.kind === "naming" ? "작명서" : "개명 추천서"} PDF로 받기
      </button>
      {redoLeft > 0 && (
        <button type="button" onClick={onRedo} className="btn-secondary">
          마음에 드는 이름이 없어요 · 다시 추천받기 (1회)
        </button>
      )}
    </div>
  );
}

export default function NamingPage({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="이름 풀이 · 작명" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <NameBody id={params.id} />
    </Suspense>
  );
}
