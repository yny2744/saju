"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState, ErrorState } from "@/components/StatusScreens";
import { EXTRA_KEYS, TOPICS, TOPIC_KEYS, isTopicKey, type AnyTopicKey, type TopicKey } from "@/lib/topics";
import { CURRENCY_NAME, PRICE, formatNyang } from "@/lib/yeopjeon";
import { PersonHeader } from "@/components/yeopjeon/PersonHeader";
import { InviteCard } from "@/components/yeopjeon/InviteCard";
import { reportClientError, useYeopjeon } from "@/components/yeopjeon/useYeopjeon";
import type { PersonSummary } from "@/server/readings/readings";

/**
 * 풀이 대상 한 사람의 "12가지 운" 화면 (2026-10-08).
 *  - 열린 운은 눌러서 깊은 풀이 보기 (처음 누를 때 AI가 쓰고 저장)
 *  - 잠긴 운: 깊게 보기 4,900냥 / 3가지 골라 몰아보기 9,900냥 / 전부 보기 29,500냥 (엽전 차감)
 *  - 주소 ?buy=deep&topic=money, ?buy=bundle3, ?buy=bundle12 로 들어오면 그 구매 창을 바로 연다.
 */

const GOLD = "#9a7a45";
type Mode = "deep" | "bundle3" | "bundle12";

interface Confirm {
  mode: Mode;
  topics: TopicKey[];
}

function PersonBody({ id }: { id: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const [data, setData] = useState<{ person: PersonSummary; balance: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<TopicKey[] | null>(null); // 몰아보기 고르는 중
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState<{ kind: "short" | "error" | "done"; text: string } | null>(null);
  const { data: wallet, reload: reloadWallet } = useYeopjeon(data !== null);

  const load = useCallback(() => {
    return fetch(`/api/persons/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (r.status === 401) {
          window.location.replace(`/login?next=${encodeURIComponent(`/person/${id}`)}`);
          return null;
        }
        if (!r.ok) {
          setError(body?.error?.message ?? "불러오지 못했어요.");
          return null;
        }
        setData(body);
        return body as { person: PersonSummary; balance: number };
      })
      .catch(() => {
        setError("연결이 끊겼어요.");
        return null;
      });
  }, [id]);

  // 처음 열 때: 불러오고, 주소에 담긴 구매 창을 연다
  useEffect(() => {
    load().then((d) => {
      if (!d) return;
      const buy = search.get("buy");
      const topic = search.get("topic");
      const owned = new Set(d.person.unlocked);
      if (buy === "deep" && isTopicKey(topic) && !owned.has(topic)) setConfirm({ mode: "deep", topics: [topic] });
      else if (buy === "bundle3") setPicking([]);
      else if (buy === "bundle12" && TOPIC_KEYS.some((t) => !owned.has(t))) setConfirm({ mode: "bundle12", topics: [] });
    });
    // 주소 쿼리는 처음 한 번만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  if (error) return <ErrorState message={error} linkHref="/mypage" linkLabel="내 복주머니로" />;
  if (!data) return <LoadingState message="불러오고 있어요..." />;

  const { person, balance } = data;
  const owned = new Set<AnyTopicKey>(person.unlocked);
  const lockedTopics = TOPIC_KEYS.filter((t) => !owned.has(t));
  const priceOf = (m: Mode) => (m === "deep" ? PRICE.DEEP : m === "bundle3" ? PRICE.BUNDLE3 : PRICE.BUNDLE12);

  function togglePick(t: TopicKey) {
    setPicking((cur) => {
      if (!cur) return cur;
      if (cur.includes(t)) return cur.filter((x) => x !== t);
      return cur.length >= 3 ? cur : [...cur, t];
    });
  }

  async function buy(c: Confirm) {
    setBuying(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/persons/${encodeURIComponent(id)}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: c.mode, topics: c.topics }),
      });
      const body = await res.json().catch(() => ({}));
      setConfirm(null);
      setPicking(null);
      if (res.ok) {
        reloadWallet();
        if (c.mode === "deep") {
          router.push(`/person/${id}/${c.topics[0]}`);
          return;
        }
        await load();
        setNotice({ kind: "done", text: "운이 열렸어요. 아래에서 하나씩 눌러 보세요." });
      } else if (body?.error?.code === "INSUFFICIENT_YEOPJEON") {
        setNotice({ kind: "short", text: `${CURRENCY_NAME}이 부족해요. 결제는 곧 열려요. 친구를 초대하면 ${CURRENCY_NAME}을 받을 수 있어요.` });
      } else {
        setNotice({ kind: "error", text: body?.error?.message ?? "잠시 후 다시 시도해 주세요." });
      }
    } catch (e) {
      reportClientError("운 열기", String(e));
      setNotice({ kind: "error", text: "연결이 끊겼어요. 잠시 후 다시 시도해 주세요." });
    }
    setBuying(false);
  }

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-24 pt-12 sm:pt-16">
      <PersonHeader header={person.header} kicker="류결사주 · 12가지 운" title="12가지 운" />

      <div className="mb-5 flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
        <span className="text-[14px]">
          내 {CURRENCY_NAME} <b style={{ color: GOLD }}>{formatNyang(balance)}</b>
        </span>
        {person.tasteReadingId && (
          <a href={`/reading/${person.tasteReadingId}`} className="text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
            맛보기 다시 보기
          </a>
        )}
      </div>

      {notice && (
        <div className="mb-5">
          <p
            className="rounded-xl px-4 py-3 text-center text-[14px]"
            style={{ backgroundColor: notice.kind === "done" ? "#eef5ef" : "var(--color-accent-soft)", color: notice.kind === "done" ? "var(--color-element-wood)" : "var(--color-accent)" }}
          >
            {notice.text}
          </p>
          {notice.kind === "short" && wallet && (
            <div className="mt-3">
              <InviteCard refCode={wallet.refCode} invited={wallet.invited} />
            </div>
          )}
        </div>
      )}

      {picking && (
        <p className="mb-3 rounded-xl px-4 py-3 text-center text-[14px] font-semibold" style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}>
          몰아볼 운 3가지를 골라 주세요 ({picking.length}/3)
        </p>
      )}

      {/* 12가지 운 */}
      <ul className="grid grid-cols-2 gap-2.5">
        {TOPIC_KEYS.map((t) => {
          const open = owned.has(t);
          const picked = picking?.includes(t) ?? false;
          const info = TOPICS[t];
          const inner = (
            <>
              <span className="flex items-center gap-2">
                <span className="text-[18px]" style={{ fontFamily: "var(--font-serif)", color: open ? GOLD : "var(--color-ink-faint)" }}>
                  {info.hanja}
                </span>
                <span className="text-[15px] font-bold">{info.title}</span>
              </span>
              <span className="mt-1 block text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                {open ? "열림 · 눌러서 보기" : picking ? (picked ? "✓ 골랐어요" : "누르면 고르기") : `깊게 보기 ${formatNyang(PRICE.DEEP)}`}
              </span>
            </>
          );
          const style = {
            border: picked ? "2px solid var(--color-accent)" : `1px solid ${open ? "#d8c49a" : "var(--color-line)"}`,
            backgroundColor: open ? "#fffdf8" : "var(--color-paper-soft)",
          };
          if (open) {
            return (
              <li key={t}>
                <a href={`/person/${id}/${t}`} className="block rounded-xl px-3.5 py-3" style={style}>
                  {inner}
                </a>
              </li>
            );
          }
          return (
            <li key={t}>
              <button
                type="button"
                onClick={() => (picking ? togglePick(t) : setConfirm({ mode: "deep", topics: [t] }))}
                className="block w-full rounded-xl px-3.5 py-3 text-left"
                style={style}
              >
                {inner}
              </button>
            </li>
          );
        })}
      </ul>

      {/* 전부 보기에만 있는 풀이 */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {EXTRA_KEYS.map((t) =>
          owned.has(t) ? (
            <a key={t} href={`/person/${id}/${t}`} className="block rounded-xl px-3.5 py-3" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
              <span className="text-[15px] font-bold">{TOPICS[t].title}</span>
              <span className="mt-1 block text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                열림 · 눌러서 보기
              </span>
            </a>
          ) : (
            <div key={t} className="rounded-xl px-3.5 py-3" style={{ border: "1px dashed var(--color-line)" }}>
              <span className="text-[15px] font-bold" style={{ color: "var(--color-ink-soft)" }}>
                {TOPICS[t].title}
              </span>
              <span className="mt-1 block text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                전부 보기에 포함
              </span>
            </div>
          )
        )}
      </div>

      {/* 묶음 상품 */}
      {lockedTopics.length > 0 && !picking && (
        <section className="mt-8 grid grid-cols-1 gap-3">
          {lockedTopics.length >= 3 && (
            <button type="button" onClick={() => setPicking([])} className="rounded-2xl p-5 text-left" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
              <span className="flex items-baseline justify-between">
                <span className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  3가지 몰아보기
                </span>
                <span className="text-[18px] font-bold" style={{ color: GOLD }}>
                  {formatNyang(PRICE.BUNDLE3)}
                </span>
              </span>
              <span className="mt-1 block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
                따로 보면 {formatNyang(PRICE.DEEP * 3)} · 가장 궁금한 세 가지를 골라 깊게
              </span>
            </button>
          )}
          <button type="button" onClick={() => setConfirm({ mode: "bundle12", topics: [] })} className="rounded-2xl p-5 text-left" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
            <span className="flex items-baseline justify-between">
              <span className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                12가지 전부 보기
              </span>
              <span className="text-[18px] font-bold" style={{ color: GOLD }}>
                {formatNyang(PRICE.BUNDLE12)}
              </span>
            </span>
            <span className="mt-1 block text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
              따로 보면 {formatNyang(PRICE.DEEP * TOPIC_KEYS.length)} · 12가지 운 + 월별 운세 · 개운법
            </span>
          </button>
        </section>
      )}

      {picking && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t px-5 py-3" style={{ backgroundColor: "var(--color-paper)", borderColor: "var(--color-line)" }}>
          <div className="mx-auto flex max-w-xl gap-2">
            <button type="button" onClick={() => setPicking(null)} className="btn-secondary flex-1">
              취소
            </button>
            <button
              type="button"
              disabled={picking.length !== 3}
              onClick={() => setConfirm({ mode: "bundle3", topics: picking })}
              className="btn-primary flex-[2] disabled:opacity-40"
            >
              3가지 몰아보기 {formatNyang(PRICE.BUNDLE3)}
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 space-y-2.5">
        <a href="/mypage" className="btn-secondary block text-center">
          내 복주머니
        </a>
      </div>

      {/* 구매 확인 창 */}
      {confirm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center px-3 pb-3 sm:items-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-sm rounded-2xl p-5" style={{ backgroundColor: "var(--color-paper)" }}>
            <p className="text-center text-[13px]" style={{ color: GOLD }}>
              {confirm.mode === "deep" ? "깊게 보기" : confirm.mode === "bundle3" ? "3가지 몰아보기" : "12가지 전부 보기"}
            </p>
            <p className="mt-1 text-center text-[19px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {confirm.mode === "bundle12" ? "12가지 운 + 월별 운세 · 개운법" : confirm.topics.map((t) => TOPICS[t].title).join(", ")}
            </p>
            {confirm.mode === "bundle12" && owned.size > 0 && (
              <p className="mt-2 text-center text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                이미 연 운이 {[...owned].filter((t) => isTopicKey(t)).length}개 있어도 가격은 같아요.
              </p>
            )}
            <p className="mt-4 text-center text-[15px]">
              {CURRENCY_NAME} <b style={{ color: GOLD }}>{formatNyang(priceOf(confirm.mode))}</b>을 쓸까요?
            </p>
            <p className="mt-1 text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
              남은 {CURRENCY_NAME} {formatNyang(balance)}
              {balance < priceOf(confirm.mode) && " · 부족해요"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirm(null)} className="btn-secondary">
                취소
              </button>
              <button type="button" disabled={buying} onClick={() => buy(confirm)} className="btn-primary disabled:opacity-50">
                {buying ? "여는 중..." : `${CURRENCY_NAME}으로 열기`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function PersonPage({ params }: { params: { id: string } }) {
  if (!isAuthEnabled()) return <ComingSoon title="12가지 운" />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <PersonBody id={params.id} />
    </Suspense>
  );
}
