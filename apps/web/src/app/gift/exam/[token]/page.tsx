"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND } from "@/tenants";
import { isAuthEnabled, isSuneungOn } from "@/lib/launchMode";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { formatWon } from "@/lib/pricingList";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";

/**
 * 수능대박운 보호자(지인) 결제 부탁 화면 (2026-10-30 유샘, 2026-11-14 유샘: 2~4·네 가지 모두 보기까지).
 *   수험생이 보낸 링크를 받은 분이 연다 → 보낸 사람 이름·상품·가격 → [결제하기] → (로그인) → 결제창 바로
 *   → 수험생 화면에 그 풀이가 열린다. 결제한 분 쪽에는 결제 내역만 남는다 (풀이는 수험생 화면에서).
 *   로그인·약관 동의를 거쳐 돌아오면(?go=1) 결제를 저절로 이어 간다.
 */
type Data = {
  nickname: string;
  mode: "exam_deep" | "exam_goal" | "exam_focus" | "exam_calm" | "exam_all";
  title: string;
  points: string[];
  price: number;
  owned: boolean;
  paidByMe: boolean;
  isChild: boolean;
  me: { termsAgreed: boolean; balance: number } | null;
  personId: string;
};

const NAVY = "#16213a";
const GOLD = "#d4b265";
const GOLD_L = "#f3e7c6";
const CARD = { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" } as const;

function Body({ token }: { token: string }) {
  const q = useSearchParams();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const here = `/gift/exam/${token}`;
  const autoTried = useRef(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/gift/exam/${encodeURIComponent(token)}`).catch(() => null);
    if (!r) return setError("연결이 끊겼어요.");
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setError(b?.error?.message ?? "결제 부탁 링크를 찾을 수 없어요.");
    setData(b as Data);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function give() {
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch(`/api/gift/exam/${encodeURIComponent(token)}/buy`, { method: "POST" });
      const b = await r.json().catch(() => ({}));
      if (r.ok) {
        notifyYeopjeonChanged();
        await load();
      } else if (b?.error?.code === "INSUFFICIENT_YEOPJEON") setPay(true);
      else setNotice(b?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch (e) {
      reportClientError("수능대박운 결제 부탁", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  /** 결제한 분 → 학생: 열렸다는 소식과 학생 풀이 주소를 카카오톡 등으로 */
  async function tellChild() {
    if (!data) return;
    const path = data.mode === "exam_deep" ? `/person/${encodeURIComponent(data.personId)}/exam` : `/person/${encodeURIComponent(data.personId)}/exam/x/${data.mode === "exam_all" ? "all" : data.mode.replace(/^exam_/, "")}`;
    const url = `${window.location.origin}${path}`;
    const text = `${data.nickname}님, ${data.title} 결제했어요! 지금 열어 보세요 🙌 시험날까지 힘내요.`;
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
    try {
      if (nav.share) await nav.share({ title: data.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setNotice("알림 글을 복사했어요. 카카오톡에 붙여 넣어 보내 주세요.");
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError")) setNotice(`이 주소를 보내 주세요: ${url}`);
    }
  }

  // 로그인·약관 동의 뒤 돌아오면(?go=1) 결제를 바로 이어 간다 (한 번만)
  useEffect(() => {
    if (autoTried.current || !data || q.get("go") !== "1") return;
    if (data.owned || data.isChild || !data.me?.termsAgreed) return;
    autoTried.current = true;
    give();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, q]);

  if (error) return <ErrorState message={error} linkHref="/" linkLabel={`${BRAND} 처음 화면으로`} />;
  if (!data) return <LoadingState message="불러오고 있어요..." />;

  const next = encodeURIComponent(`${here}?go=1`);
  const done = data.owned;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-10 sm:pt-14">
      <header className="rounded-2xl px-5 py-7 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
        <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
          {BRAND} · 결제 부탁
        </p>
        <h1 className="mt-2 text-[24px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)", color: GOLD_L, wordBreak: "keep-all" }}>
          {done ? `${data.nickname}님께 전해졌어요` : `${data.nickname}님이 결제를 부탁했어요`}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
          {done
            ? `${data.nickname}님 화면에서 ${data.title}이 바로 열려요. 시험날 응원 한마디도 함께 건네 주세요.`
            : "사주로 보는 시험날 흐름과 응원이에요. 합격·불합격을 점치지 않아요."}
        </p>
      </header>

      {q.get("paid") === "1" && done && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          결제가 끝나 {data.nickname}님께 전해졌어요.
        </p>
      )}
      {/* 2026-11-14 유샘: 결제한 분이 학생에게 "열렸어" 하고 바로 알릴 수 있게 */}
      {done && (data.paidByMe || q.get("paid") === "1") && (
        <button type="button" onClick={tellChild} className="btn-primary mt-4 block w-full text-center">
          {data.nickname}님께 알리기
        </button>
      )}
      {notice && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {!done && (
        <section className="mt-6 rounded-2xl p-5" style={CARD}>
          <p className="text-center text-[12px] tracking-[0.2em]" style={{ color: GOLD }}>
            부탁한 상품
          </p>
          <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
            {data.title}
          </p>
          <p className="mt-1 text-center text-[17px] font-bold" style={{ color: "#b8913f" }}>
            {formatWon(data.price)}
          </p>
          <ul className="mx-auto mt-3 max-w-xs space-y-1.5 text-[14.5px]">
            {data.points.map((p) => (
              <li key={p} className="flex gap-2">
                <span style={{ color: GOLD }}>◆</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            {data.isChild ? (
              <p className="text-center text-[14px]" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
                이 링크를 보호자(지인)께 보내 주세요. 받은 분이 결제해 주시면 내 화면에서 바로 열려요.
              </p>
            ) : !data.me ? (
              <>
                <a href={`/api/auth/kakao/start?next=${next}`} className="block rounded-xl py-4 text-center text-[17px] font-bold" style={{ backgroundColor: "#fee500", color: "#191600" }}>
                  카카오로 로그인하고 결제하기
                </a>
                <a href={`/login?next=${next}`} className="mt-2 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
                  이메일로 로그인하기
                </a>
              </>
            ) : !data.me.termsAgreed ? (
              <a href={`/consent?next=${next}`} className="btn-primary block text-center">
                약관 동의하고 결제하기
              </a>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={give} className="btn-primary disabled:opacity-50">
                  {busy ? "결제하는 중..." : `결제하기 · ${formatWon(data.price)}`}
                </button>
                <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                  내 {CURRENCY_NAME} {formatNyang(data.me.balance)}
                  {data.me.balance >= data.price ? " · 가진 엽전으로 바로 결제돼요" : " · 모자란 만큼만 결제해요"}
                </p>
              </>
            )}
            {!data.isChild && (
              <p className="mt-3 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
                결제는 만 19세 이상 보호자(지인)께서 해 주세요. 풀이는 {data.nickname}님 화면에서 열려요.
              </p>
            )}
          </div>
        </section>
      )}

      <a href="/" className="btn-secondary mt-6 block text-center">
        {BRAND} 둘러보기
      </a>

      {pay && (
        <PayDialog
          personId={data.personId}
          mode={data.mode}
          topics={[]}
          backTo={here}
          checkoutUrl={`/api/gift/exam/${encodeURIComponent(token)}/checkout`}
          onEnough={() => {
            setPay(false);
            give();
          }}
          onClose={() => setPay(false)}
        />
      )}
    </main>
  );
}

export default function ExamGiftPage({ params }: { params: { token: string } }) {
  if (!isSuneungOn() || !isAuthEnabled()) return <ComingSoon title="수능대박운 결제 부탁" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body token={params.token} />
    </Suspense>
  );
}
