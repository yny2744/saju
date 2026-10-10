"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState } from "@/components/StatusScreens";
import { BUSINESS_INFO } from "@/lib/businessInfo";
import { CURRENCY_NAME, formatNyang } from "@/lib/yeopjeon";
import type { ChargeRequest } from "@/server/admin/charges";

/**
 * 엽전 충전 - 계좌 입금 (2026-10-10).
 * 금액·입금자 이름으로 신청 → 안내된 계좌로 입금 → 관리자가 통장 확인 후 승인하면 엽전이 들어온다.
 * 주소 ?next= 로 들어오면 (운세 화면에서 엽전이 모자라 온 경우) 다 끝난 뒤 돌아갈 버튼을 보여 준다.
 */

type Info = { account: string | null; options: number[]; requests: ChargeRequest[]; balance: number; nickname: string };

const STATUS: Record<ChargeRequest["status"], { label: string; color: string }> = {
  pending: { label: "입금 확인 중", color: "var(--color-accent)" },
  approved: { label: "충전 완료", color: "var(--color-element-wood)" },
  rejected: { label: "입금 확인 안 됨", color: "var(--color-danger)" },
  cancelled: { label: "취소함", color: "var(--color-ink-faint)" },
};

const fmt = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

/** 안전한 내부 주소만 돌아가기로 쓴다 */
function safeNext(v: string | null): string | null {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

function ChargeBody() {
  const search = useSearchParams();
  const next = safeNext(search.get("next"));
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [depositor, setDepositor] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/charge").catch(() => null);
    if (!r) return setError("연결이 끊겼어요.");
    if (r.status === 401) {
      window.location.replace(`/login?next=${encodeURIComponent(`/charge${next ? `?next=${encodeURIComponent(next)}` : ""}`)}`);
      return;
    }
    if (r.status === 403) {
      window.location.replace(`/consent?next=${encodeURIComponent("/charge")}`);
      return;
    }
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return setError(body?.error?.message ?? "불러오지 못했어요.");
    setInfo(body);
    setDepositor((d) => d || body.nickname || "");
  }, [next]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!amount) return setNotice({ ok: false, text: "충전할 금액을 골라 주세요." });
    setBusy(true);
    setNotice(null);
    const r = await fetch("/api/charge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, depositor }),
    }).catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setNotice({ ok: false, text: body?.error?.message ?? "신청하지 못했어요. 잠시 후 다시 시도해 주세요." });
    setNotice({ ok: true, text: `신청했어요. 아래 계좌로 ${formatNyang(amount)}(원)을 "${depositor.trim()}" 이름으로 보내 주세요.` });
    setAmount(null);
    load();
  }

  async function cancel(id: string) {
    if (!window.confirm("이 충전 신청을 취소할까요? 이미 입금하셨다면 취소하지 말고 기다려 주세요.")) return;
    await fetch(`/api/charge/${id}`, { method: "DELETE" }).catch(() => null);
    load();
  }

  async function copyAccount(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 복사 못 하면 손으로 */
    }
  }

  if (error) return <main className="mx-auto max-w-xl px-5 py-16 text-center">{error}</main>;
  if (!info) return <LoadingState message="불러오고 있어요..." />;

  const pending = info.requests.filter((r) => r.status === "pending");

  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-24 pt-10">
      <div className="text-center">
        <div className="gold-ornament" aria-hidden>
          <i />
        </div>
        <h1 className="mt-2 text-[24px] font-bold">{CURRENCY_NAME} 충전</h1>
        <p className="mt-1 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
          계좌 입금 · 1냥 = 1원
        </p>
        <p className="mt-3 text-[15px]">
          내 {CURRENCY_NAME} <b style={{ color: "var(--color-gold)" }}>{formatNyang(info.balance)}</b>
        </p>
      </div>

      {!info.account ? (
        <p className="mt-8 rounded-2xl px-5 py-6 text-center text-[15px]" style={{ backgroundColor: "var(--color-paper-soft)" }}>
          계좌 입금 충전을 준비하고 있어요. 조금만 기다려 주세요.
        </p>
      ) : (
        <>
          {/* 1. 금액 */}
          <section className="gold-card mt-8 rounded-2xl p-5">
            <h2 className="text-[16px] font-bold">1. 충전할 금액</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {info.options.map((o) => {
                const on = amount === o;
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setAmount(o)}
                    aria-pressed={on}
                    className="rounded-xl px-3 py-3.5 text-[17px] font-bold tabular-nums"
                    style={{
                      border: on ? "2px solid var(--color-accent)" : "1px solid var(--color-gold-line)",
                      backgroundColor: on ? "var(--color-accent-soft)" : "var(--color-card)",
                      fontFamily: "var(--font-serif)",
                    }}
                  >
                    {formatNyang(o)}
                  </button>
                );
              })}
            </div>

            <h2 className="mt-6 text-[16px] font-bold">2. 입금자 이름</h2>
            <input
              value={depositor}
              onChange={(e) => setDepositor(e.target.value)}
              maxLength={20}
              placeholder="통장에 찍힐 이름"
              className="mt-2 w-full rounded-xl px-4 py-3 text-[16px]"
              style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }}
            />
            <p className="mt-1.5 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              보내는 분 이름이 다르면 확인이 늦어질 수 있어요
            </p>

            <button type="button" disabled={busy || !amount} onClick={submit} className="btn-band mt-5 block w-full rounded-xl py-4 text-[17px] font-bold disabled:opacity-50" style={{ fontFamily: "var(--font-serif)" }}>
              {amount ? `${formatNyang(amount)} 충전 신청` : "금액을 골라 주세요"}
            </button>
          </section>

          {notice && (
            <p
              className="mt-4 rounded-xl px-4 py-3 text-center text-[14px]"
              style={{ backgroundColor: notice.ok ? "#eef5ef" : "var(--color-danger-soft)", color: notice.ok ? "var(--color-element-wood)" : "var(--color-danger)" }}
            >
              {notice.text}
            </p>
          )}

          {/* 3. 계좌 */}
          <section className="mt-4 rounded-2xl p-5" style={{ backgroundColor: "var(--color-accent-soft)" }}>
            <h2 className="text-[16px] font-bold">3. 입금할 계좌</h2>
            <p className="mt-2 break-all text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
              {info.account}
            </p>
            <button type="button" onClick={() => copyAccount(info.account!)} className="btn-secondary mt-3 w-full py-2.5 text-[14px]">
              {copied ? "복사했어요" : "계좌번호 복사"}
            </button>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              <li>신청한 금액과 똑같이 보내 주세요.</li>
              <li>입금을 확인하면 {CURRENCY_NAME}이 들어와요. 확인은 사람이 직접 하므로 몇 시간 걸릴 수 있어요.</li>
              <li>사용하지 않은 {CURRENCY_NAME}은 충전일로부터 7일 안에 문의({BUSINESS_INFO.csEmail})하시면 전액 돌려드려요.</li>
            </ul>
          </section>
        </>
      )}

      {/* 내 신청 내역 */}
      {info.requests.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[16px] font-bold">충전 신청 내역</h2>
          <ul className="mt-3 space-y-2">
            {info.requests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl px-4 py-3" style={{ border: "1px solid var(--color-line)" }}>
                <span className="min-w-0">
                  <b className="tabular-nums">{formatNyang(r.amount)}</b>
                  <span className="ml-1.5 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                    {r.depositor} · {fmt(r.createdAt)}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-[13px] font-bold" style={{ color: STATUS[r.status].color }}>
                    {STATUS[r.status].label}
                  </span>
                  {r.status === "pending" && (
                    <button type="button" onClick={() => cancel(r.id)} className="text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
                      취소
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {pending.length > 0 && (
            <button type="button" onClick={load} className="mt-3 block w-full text-center text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
              확인됐는지 다시 보기
            </button>
          )}
        </section>
      )}

      <div className="mt-10 space-y-2.5">
        {next && (
          <a href={next} className="btn-primary block text-center">
            보던 운세로 돌아가기
          </a>
        )}
        <a href="/mypage" className="btn-secondary block text-center">
          내 복주머니
        </a>
      </div>
    </main>
  );
}

export default function ChargePage() {
  if (!isAuthEnabled()) return <ComingSoon title={`${CURRENCY_NAME} 충전`} />;
  return (
    <Suspense fallback={<LoadingState message="불러오고 있어요..." />}>
      <ChargeBody />
    </Suspense>
  );
}
