"use client";

import { useCallback, useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState } from "@/components/StatusScreens";
import { formatNyang } from "@/lib/yeopjeon";
import type { AdminMember, AdminStats, PeriodStats } from "@/server/admin/adminData";
import type { AdminCharge } from "@/server/admin/charges";

/**
 * 관리자 화면 (2026-10-10 수정안 26). Vercel 환경변수 ADMIN_USER_IDS 에 등록된 회원만 열린다.
 * 방문자 수는 여기서만 보이고 손님 화면에는 나오지 않는다.
 */

type Overview = {
  me: { id: string; nickname: string };
  stats: AdminStats;
  charges: AdminCharge[];
  errors: Array<{ place: string; message: string; createdAt: string }>;
  bankAccountSet: boolean;
};

type Denied = { kind: "login" } | { kind: "notAdmin"; myId?: string; configured?: boolean } | { kind: "error"; message: string };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_LABEL: Record<AdminCharge["status"], string> = { pending: "확인 대기", approved: "승인", rejected: "거절", cancelled: "손님 취소" };

function StatGrid({ title, s }: { title: string; s: PeriodStats }) {
  const items: Array<[string, string]> = [
    ["방문자", `${s.visitors}`],
    ["처음 온 사람", `${s.newVisitors}`],
    ["다시 온 사람", `${s.revisits}`],
    ["가입", `${s.signups}`],
    ["운세 구매", `${s.purchases}건`],
    ["엽전 사용", formatNyang(s.spent)],
    ["충전(입금)", formatNyang(s.charged)],
  ];
  return (
    <section className="gold-card rounded-2xl p-4">
      <h2 className="text-[16px] font-bold">{title}</h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="rounded-xl px-3 py-2" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <dt className="text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
              {k}
            </dt>
            <dd className="text-[17px] font-bold tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function AdminBody() {
  const [data, setData] = useState<Overview | null>(null);
  const [denied, setDenied] = useState<Denied | null>(null);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Array<{ amount: number; kind: string; label: string; createdAt: string }> | null>(null);
  const [grant, setGrant] = useState({ amount: "", reason: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAllCharges, setShowAllCharges] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin").catch(() => null);
    if (!r) return setDenied({ kind: "error", message: "연결이 끊겼어요." });
    const body = await r.json().catch(() => ({}));
    if (r.status === 401) return setDenied({ kind: "login" });
    if (r.status === 403 || body.denied) return setDenied({ kind: "notAdmin", myId: body.myId, configured: body.configured });
    if (!r.ok) return setDenied({ kind: "error", message: body?.error?.message ?? "불러오지 못했어요." });
    setData(body);
  }, []);

  const search = useCallback(async (term: string) => {
    const r = await fetch(`/api/admin/members?q=${encodeURIComponent(term)}`).catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    setMembers(body.members ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // 관리자로 확인된 뒤에만 회원 목록을 부른다
  useEffect(() => {
    if (data) search("");
  }, [Boolean(data), search]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openMember(id: string) {
    if (open === id) {
      setOpen(null);
      return;
    }
    setOpen(id);
    setLedger(null);
    setGrant({ amount: "", reason: "" });
    setMsg(null);
    const r = await fetch(`/api/admin/members/${id}`).catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    setLedger(body.ledger ?? []);
  }

  async function doGrant(userId: string) {
    const amount = Number(grant.amount.replace(/[,\s]/g, ""));
    if (!Number.isInteger(amount) || amount === 0) return setMsg("금액을 숫자로 넣어 주세요 (빼려면 -1000 처럼).");
    if (!window.confirm(`${formatNyang(amount)}을 ${amount > 0 ? "지급" : "회수"}할까요?`)) return;
    setBusy(true);
    const r = await fetch("/api/admin/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount, reason: grant.reason }),
    }).catch(() => null);
    const body = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) return setMsg(body?.error?.message ?? "처리하지 못했어요.");
    setMsg("처리했어요.");
    setGrant({ amount: "", reason: "" });
    const lr = await fetch(`/api/admin/members/${userId}`);
    setLedger((await lr.json().catch(() => ({}))).ledger ?? []);
    search(q);
  }

  async function decide(c: AdminCharge, action: "approve" | "reject") {
    const text = action === "approve" ? `${c.depositor} 님 입금 ${formatNyang(c.amount)}을 확인했나요? 승인하면 엽전이 들어가요.` : `이 신청을 거절할까요? (엽전 지급 없음)`;
    if (!window.confirm(text)) return;
    setBusy(true);
    const r = await fetch(`/api/admin/charges/${c.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    }).catch(() => null);
    setBusy(false);
    if (!r?.ok) {
      const body = r ? await r.json().catch(() => ({})) : {};
      window.alert(body?.error?.message ?? "처리하지 못했어요.");
    }
    load();
    search(q);
  }

  if (denied?.kind === "login") {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p>관리자 화면은 로그인 후 볼 수 있어요.</p>
        <a href={`/login?next=${encodeURIComponent("/admin")}`} className="btn-primary mx-auto mt-6 block max-w-xs">
          로그인
        </a>
      </main>
    );
  }
  if (denied?.kind === "notAdmin") {
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-center">
        <p className="text-[17px] font-bold">관리자만 볼 수 있어요</p>
        {denied.myId && (
          <div className="mt-6 rounded-2xl p-4 text-left text-[14px] leading-relaxed" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            <p>이 계정을 관리자로 쓰려면 Vercel → Settings → Environment Variables 에</p>
            <p className="mt-2">
              이름 <b>ADMIN_USER_IDS</b>
              <br />값 <b className="break-all">{denied.myId}</b>
            </p>
            <p className="mt-2">을 넣고 다시 배포(Redeploy)하세요.{denied.configured ? " (이미 다른 번호가 있으면 쉼표로 이어 붙이면 돼요.)" : ""}</p>
          </div>
        )}
      </main>
    );
  }
  if (denied?.kind === "error") return <main className="mx-auto max-w-xl px-5 py-16 text-center">{denied.message}</main>;
  if (!data) return <LoadingState message="불러오고 있어요..." />;

  const pending = data.charges.filter((c) => c.status === "pending");
  const shownCharges = showAllCharges ? data.charges : pending;

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 px-5 pb-24 pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[24px] font-bold">관리자</h1>
        <button type="button" onClick={() => { load(); search(q); }} className="text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          새로 고침
        </button>
      </div>

      <StatGrid title="오늘" s={data.stats.today} />
      <StatGrid title="최근 7일" s={data.stats.week} />
      <p className="text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        전체 회원 {data.stats.total.members}명 · 집계 시작 뒤 전체 방문자 {data.stats.total.visitors}명
      </p>

      {/* 충전 신청 */}
      <section className="gold-card rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[16px] font-bold">계좌 입금 충전 신청 {pending.length > 0 && <span style={{ color: "var(--color-danger)" }}>· 확인 대기 {pending.length}</span>}</h2>
          <button type="button" onClick={() => setShowAllCharges((v) => !v)} className="text-[12px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
            {showAllCharges ? "대기만 보기" : "전체 보기"}
          </button>
        </div>
        {!data.bankAccountSet && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "var(--color-danger-soft)", color: "var(--color-danger)" }}>
            입금 계좌가 아직 없어요. Vercel 환경변수 BANK_ACCOUNT 에 &quot;은행 계좌번호 예금주&quot;를 넣어야 손님이 충전을 신청할 수 있어요.
          </p>
        )}
        {shownCharges.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
            {showAllCharges ? "신청이 없어요." : "확인할 신청이 없어요."}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {shownCharges.map((c) => (
              <li key={c.id} className="rounded-xl px-3 py-3" style={{ border: "1px solid var(--color-line)" }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-bold">
                    입금자 {c.depositor} · {formatNyang(c.amount)}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color: c.status === "pending" ? "var(--color-danger)" : "var(--color-ink-faint)" }}>
                    {STATUS_LABEL[c.status]}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                  회원 {c.nickname} · 신청 {fmtTime(c.createdAt)}
                  {c.decidedAt ? ` · 처리 ${fmtTime(c.decidedAt)}` : ""}
                </p>
                {c.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <button type="button" disabled={busy} onClick={() => decide(c, "approve")} className="btn-band flex-[2] rounded-lg py-2 text-[14px] font-bold">
                      입금 확인 · 승인
                    </button>
                    <button type="button" disabled={busy} onClick={() => decide(c, "reject")} className="btn-secondary flex-1 py-2 text-[14px]">
                      거절
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 회원 */}
      <section className="gold-card rounded-2xl p-4">
        <h2 className="text-[16px] font-bold">회원 · 엽전</h2>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            search(q);
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름(닉네임)으로 찾기" className="min-w-0 flex-1 rounded-lg px-3 py-2 text-[14px]" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }} />
          <button type="submit" className="btn-secondary !w-auto shrink-0 px-4 py-2 text-[14px]">
            찾기
          </button>
        </form>
        {!members ? (
          <p className="mt-3 text-[14px]">불러오는 중...</p>
        ) : members.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
            회원이 없어요.
          </p>
        ) : (
          <ul className="mt-3 divide-y" style={{ borderColor: "var(--color-line)" }}>
            {members.map((m) => (
              <li key={m.id} className="py-2.5">
                <button type="button" onClick={() => openMember(m.id)} className="flex w-full items-baseline justify-between gap-2 text-left">
                  <span className="min-w-0">
                    <b className="text-[15px]">{m.nickname}</b>
                    <span className="ml-1.5 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                      {m.login === "kakao" ? "카카오" : "이메일"} · {fmtTime(m.createdAt)} 가입 · 사람 {m.persons}
                      {m.marketing ? " · 수신동의" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] font-bold tabular-nums" style={{ color: "var(--color-gold)" }}>
                    {formatNyang(m.balance)}
                  </span>
                </button>
                {open === m.id && (
                  <div className="mt-2 rounded-xl p-3" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                    <p className="break-all text-[11px]" style={{ color: "var(--color-ink-faint)" }}>
                      회원 번호 {m.id}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input value={grant.amount} onChange={(e) => setGrant((g) => ({ ...g, amount: e.target.value }))} inputMode="numeric" placeholder="금액 (빼기는 -)" className="w-32 rounded-lg px-2 py-1.5 text-[14px]" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }} />
                      <input value={grant.reason} onChange={(e) => setGrant((g) => ({ ...g, reason: e.target.value }))} placeholder="사유 (손님에게 보임)" className="min-w-0 flex-1 rounded-lg px-2 py-1.5 text-[14px]" style={{ border: "1px solid var(--color-line)", backgroundColor: "var(--color-card)" }} />
                      <button type="button" disabled={busy} onClick={() => doGrant(m.id)} className="btn-band rounded-lg px-4 py-1.5 text-[14px] font-bold">
                        엽전 넣기
                      </button>
                    </div>
                    {msg && <p className="mt-1.5 text-[13px]">{msg}</p>}
                    <ul className="mt-3 space-y-1 text-[13px]">
                      {!ledger ? (
                        <li>불러오는 중...</li>
                      ) : ledger.length === 0 ? (
                        <li style={{ color: "var(--color-ink-faint)" }}>이용 내역이 없어요.</li>
                      ) : (
                        ledger.map((l, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="min-w-0">
                              <span style={{ color: "var(--color-ink-faint)" }}>{fmtTime(l.createdAt)}</span> {l.label}
                            </span>
                            <span className="shrink-0 tabular-nums" style={{ color: l.amount < 0 ? "var(--color-danger)" : "var(--color-element-wood)" }}>
                              {l.amount > 0 ? "+" : ""}
                              {formatNyang(l.amount)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 후기 관리: 후기 기능이 생기면 여기에 */}

      {/* 최근 오류 */}
      <section className="gold-card rounded-2xl p-4">
        <h2 className="text-[16px] font-bold">최근 오류</h2>
        {data.errors.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
            최근 오류가 없어요.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-[13px]">
            {data.errors.map((e, i) => (
              <li key={i} className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--color-paper-soft)" }}>
                <p>
                  <span style={{ color: "var(--color-ink-faint)" }}>{fmtTime(e.createdAt)}</span> <b>{e.place}</b>
                </p>
                <p className="mt-0.5 break-all" style={{ color: "var(--color-ink-soft)" }}>
                  {e.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function AdminPage() {
  return isAuthEnabled() ? <AdminBody /> : <ComingSoon title="관리자" />;
}
