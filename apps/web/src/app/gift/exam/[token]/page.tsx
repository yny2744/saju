"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND } from "@/tenants";
import { isAuthEnabled, isSuneungOn } from "@/lib/launchMode";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import { ComingSoon } from "@/components/ComingSoon";
import { ErrorState, LoadingState } from "@/components/StatusScreens";
import { PayDialog } from "@/components/yeopjeon/PayDialog";
import { notifyYeopjeonChanged, reportClientError } from "@/components/yeopjeon/useYeopjeon";

/**
 * 수능운 깊게 보기 - 부모님 선물 화면 (2026-10-30 유샘).
 *   수험생이 보낸 링크를 부모님이 연다 → 본인 계정으로 로그인 → 선물하기(엽전, 모자라면 모자란 만큼 카드 결제)
 *   → 수험생 화면에 깊게 보기가 열린다. 부모님 쪽에는 결제 내역만 남는다 (풀이는 수험생 화면에서).
 */
type Data = {
  nickname: string;
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

  const load = useCallback(async () => {
    const r = await fetch(`/api/gift/exam/${encodeURIComponent(token)}`).catch(() => null);
    if (!r) return setError("연결이 끊겼어요.");
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setError(b?.error?.message ?? "선물 링크를 찾을 수 없어요.");
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
      reportClientError("수능운 선물", String(e));
      setNotice("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  if (error) return <ErrorState message={error} linkHref="/" linkLabel={`${BRAND} 처음 화면으로`} />;
  if (!data) return <LoadingState message="불러오고 있어요..." />;

  const next = encodeURIComponent(here);
  const done = data.owned;

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-20 pt-10 sm:pt-14">
      <header className="rounded-2xl px-5 py-7 text-center" style={{ backgroundColor: NAVY, border: `1px solid ${GOLD}` }}>
        <p className="text-[13px] tracking-[0.2em]" style={{ color: GOLD }}>
          {BRAND} · 선물
        </p>
        <h1 className="mt-2 text-[24px] font-bold leading-snug" style={{ fontFamily: "var(--font-serif)", color: GOLD_L, wordBreak: "keep-all" }}>
          {done ? `${data.nickname}님께 선물이 전해졌어요` : `${data.nickname}님이 ${data.title} 깊게 보기를 선물해 달라고 부탁했어요`}
        </h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: GOLD_L, wordBreak: "keep-all" }}>
          {done
            ? `${data.nickname}님 화면에서 깊게 보기가 바로 열려요. 시험날 응원 한마디도 함께 건네 주세요.`
            : "사주로 보는 시험날 흐름과 응원이에요. 합격·불합격을 점치지 않아요."}
        </p>
      </header>

      {q.get("paid") === "1" && done && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          결제가 끝나 선물이 전해졌어요.
        </p>
      )}
      {notice && (
        <p className="mt-5 rounded-xl px-4 py-3 text-center text-[14px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
          {notice}
        </p>
      )}

      {!done && (
        <section className="mt-6 rounded-2xl p-5" style={CARD}>
          <p className="text-center text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
            깊게 보기에 담긴 것
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
                이 링크를 부모님께 보내 주세요. 부모님이 열어서 선물해 주시면 내 화면에서 바로 열려요.
              </p>
            ) : !data.me ? (
              <>
                <a href={`/api/auth/kakao/start?next=${next}`} className="block rounded-xl py-4 text-center text-[17px] font-bold" style={{ backgroundColor: "#fee500", color: "#191600" }}>
                  카카오로 로그인하고 선물하기
                </a>
                <a href={`/login?next=${next}`} className="mt-2 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
                  이메일로 로그인하기
                </a>
              </>
            ) : !data.me.termsAgreed ? (
              <a href={`/consent?next=${next}`} className="btn-primary block text-center">
                약관 동의하고 선물하기
              </a>
            ) : (
              <>
                <button type="button" disabled={busy} onClick={give} className="btn-primary disabled:opacity-50">
                  {busy ? "선물하는 중..." : `선물하기 · ${formatNyang(data.price)}`}
                </button>
                <p className="mt-2 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
                  내 {CURRENCY_NAME} {formatNyang(data.me.balance)}
                  {data.me.balance >= data.price ? " · 가진 엽전으로 바로 선물해요" : " · 모자란 만큼만 결제해요"}
                </p>
              </>
            )}
            {!data.isChild && (
              <p className="mt-3 text-center text-[12px] leading-relaxed" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
                결제는 만 19세 이상 보호자께서 해 주세요. 풀이는 {data.nickname}님 화면에서 열려요.
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
          mode="exam_deep"
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
  if (!isSuneungOn() || !isAuthEnabled()) return <ComingSoon title="수능운 선물" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <Body token={params.token} />
    </Suspense>
  );
}
