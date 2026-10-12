"use client";

import { useCallback, useEffect, useState } from "react";
import { isAuthEnabled } from "@/lib/launchMode";
import { ComingSoon } from "@/components/ComingSoon";
import { LoadingState } from "@/components/StatusScreens";
import { formatNyang } from "@/lib/yeopjeon";
import type { AdminMember, AdminStats, PeriodStats } from "@/server/admin/adminData";
import type { AdminPayOrder, PayMode } from "@/server/pay/payOrders";
import type { AdminReview } from "@/server/reviews/reviews";

/**
 * 관리자 화면 (2026-10-10 수정안 26). Vercel 환경변수 ADMIN_USER_IDS 에 등록된 회원만 열린다.
 * 방문자 수는 여기서만 보이고 손님 화면에는 나오지 않는다.
 */

type Overview = {
  me: { id: string; nickname: string };
  stats: AdminStats;
  orders: AdminPayOrder[];
  errors: Array<{ place: string; message: string; createdAt: string }>;
  payMode: PayMode;
  needed: { total: number; rows: Array<{ element: string; count: number; percent: number }> };
  reviews: { list: AdminReview[]; angel: AdminReview | null; total: number };
};

type Denied = { kind: "login" } | { kind: "notAdmin"; myId?: string; configured?: boolean } | { kind: "error"; message: string };

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

const STATUS_LABEL: Record<string, string> = { pending: "결제창 열림(미결제)", paid: "결제 완료", paid_credit: "결제됨·구매 실패(엽전으로 남음)", failed: "승인 실패" };

function StatGrid({ title, s }: { title: string; s: PeriodStats }) {
  const items: Array<[string, string]> = [
    ["방문자", `${s.visitors}`],
    ["처음 온 사람", `${s.newVisitors}`],
    ["다시 온 사람", `${s.revisits}`],
    ["가입", `${s.signups}`],
    ["운세 구매", `${s.purchases}건`],
    ["엽전 사용", formatNyang(s.spent)],
    ["결제 매출", `${s.charged.toLocaleString("ko-KR")}원`],
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

  async function setReview(id: string, patch: { featured?: boolean; hidden?: boolean }) {
    setBusy(true);
    await fetch(`/api/admin/reviews/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }).catch(() => null);
    await load();
    setBusy(false);
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

  const PAY_MODE_LABEL: Record<PayMode, string> = {
    toss: "카드·간편결제 켜짐 (토스페이먼츠)",
    mock: "시험 결제 모드 - 실제 돈이 오가지 않아요",
    off: "결제 꺼짐 - Vercel에 TOSS_CLIENT_KEY·PAYMENT_SECRET_KEY 를 넣으면 켜져요",
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 px-5 pb-24 pt-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-[24px] font-bold">관리자</h1>
        <button type="button" onClick={() => { load(); search(q); }} className="text-[13px] underline underline-offset-4" style={{ color: "var(--color-ink-soft)" }}>
          새로 고침
        </button>
      </div>

      {/* 수정안 48: 아직 대문에 올리지도 숨기지도 않은 후기 */}
      {(() => {
        const fresh = data.reviews.list.filter((r) => !r.featured && !r.hidden).length;
        return fresh > 0 ? (
          <a href="#reviews" className="block rounded-2xl px-4 py-3 text-[15px] font-bold" style={{ backgroundColor: "var(--color-gold-soft)", border: "1px solid var(--color-gold-line)" }}>
            ✦ 새로 들어온 후기 {fresh}개 · 대문에 올릴지 골라 주세요 ↓
          </a>
        ) : null;
      })()}

      <StatGrid title="오늘" s={data.stats.today} />
      <StatGrid title="최근 7일" s={data.stats.week} />
      <p className="text-center text-[13px]" style={{ color: "var(--color-ink-faint)" }}>
        전체 회원 {data.stats.total.members}명 · 집계 시작 뒤 전체 방문자 {data.stats.total.visitors}명
      </p>

      {/* 회원들의 부족한 기운 (수정안 35) - 굿즈 제작 근거 */}
      <section className="gold-card rounded-2xl p-4">
        <h2 className="text-[16px] font-bold">회원들의 부족한 기운</h2>
        <p className="mt-1 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
          풀이를 본 사람 {data.needed.total}명 기준 · 어느 기운의 굿즈를 많이 만들지 정할 때 참고
        </p>
        <div className="mt-3 space-y-2">
          {data.needed.rows.map((r) => (
            <div key={r.element} className="flex items-center gap-2 text-[14px]">
              <span className="w-6 font-bold">{r.element}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full" style={{ backgroundColor: "var(--color-line)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(2, r.percent)}%`, backgroundColor: `var(--color-element-${({ 목: "wood", 화: "fire", 토: "earth", 금: "metal", 수: "water" } as Record<string, string>)[r.element]})` }}
                />
              </div>
              <span className="w-20 text-right tabular-nums">
                {r.count}명 · {r.percent}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 결제 (수정안 31) */}
      <section className="gold-card rounded-2xl p-4">
        <h2 className="text-[16px] font-bold">카드·간편결제</h2>
        <p
          className="mt-2 rounded-lg px-3 py-2 text-[13px]"
          style={{ backgroundColor: data.payMode === "toss" ? "#eef5ef" : "var(--color-danger-soft)", color: data.payMode === "toss" ? "var(--color-element-wood)" : "var(--color-danger)" }}
        >
          {PAY_MODE_LABEL[data.payMode]}
        </p>
        {data.orders.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
            결제 내역이 없어요.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.orders.map((o) => (
              <li key={o.id} className="rounded-xl px-3 py-2.5" style={{ border: "1px solid var(--color-line)" }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[14px] font-bold">
                    {o.nickname} · {o.orderName}
                  </span>
                  <span className="shrink-0 text-[12px]" style={{ color: o.status === "paid" ? "var(--color-element-wood)" : o.status === "paid_credit" ? "var(--color-danger)" : "var(--color-ink-faint)" }}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px]" style={{ color: "var(--color-ink-faint)" }}>
                  {formatNyang(o.price)} = 엽전 {formatNyang(o.useYeopjeon)} + 결제 {o.amount.toLocaleString("ko-KR")}원 · {fmtTime(o.paidAt ?? o.createdAt)}
                </p>
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

      {/* 수정안 47: 1004 천사의 한마디 - 대문에 올리기·숨기기 */}
      <section id="reviews" className="gold-card scroll-mt-4 rounded-2xl p-4">
        <h2 className="text-[16px] font-bold">1004 천사의 한마디 · 들어온 후기 {data.reviews.total}개</h2>
        {data.reviews.angel && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[13px]" style={{ backgroundColor: "var(--color-gold-soft)" }}>
            🎉 1,004번째 천사: <b>{data.reviews.angel.name}</b> ({data.reviews.angel.productLabel}) · 엽전 29,500냥 자동 지급됨 · 굿즈를 보내 주세요 · 회원 번호 {data.reviews.angel.userId}
          </p>
        )}
        {data.reviews.list.length === 0 ? (
          <p className="mt-3 text-[14px]" style={{ color: "var(--color-ink-faint)" }}>
            아직 들어온 후기가 없어요.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-[13px]">
            {data.reviews.list.map((r) => (
              <li key={r.id} className="rounded-lg px-3 py-2" style={{ backgroundColor: "var(--color-paper-soft)", opacity: r.hidden ? 0.5 : 1 }}>
                <p>
                  <span style={{ color: "var(--color-ink-faint)" }}>
                    #{r.seq} · {fmtTime(r.createdAt)}
                  </span>{" "}
                  <b>{r.name}</b> · {r.productLabel} · <span style={{ color: "var(--color-gold)" }}>{"★".repeat(r.rating)}</span>
                  {r.gifted && " · 990냥 지급"}
                  {r.featured && <b style={{ color: "var(--color-element-wood)" }}> · 대문에 올림</b>}
                  {r.hidden && " · 숨김"}
                </p>
                <p className="mt-1" style={{ color: "var(--color-ink-soft)" }}>
                  {r.body}
                </p>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={busy} onClick={() => setReview(r.id, { featured: !r.featured })} className="rounded-lg px-3 py-1.5 text-[12px] font-semibold" style={{ border: "1px solid var(--color-gold-line)" }}>
                    {r.featured ? "대문에서 내리기" : "대문에 올리기"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setReview(r.id, { hidden: !r.hidden })} className="rounded-lg px-3 py-1.5 text-[12px]" style={{ border: "1px solid var(--color-line)" }}>
                    {r.hidden ? "다시 보이기" : "숨기기"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

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
