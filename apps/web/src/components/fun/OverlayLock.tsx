"use client";

import { useEffect, useState } from "react";
import { formatWon } from "@/lib/pricingList";
import { notifyYeopjeonChanged } from "@/components/yeopjeon/useYeopjeon";
import { AppGiftLink } from "@/components/app/AppGiftLink";
import { PayDialog } from "@/components/yeopjeon/PayDialog";

/** 결제하러 나갔다 돌아오면 이 입력으로 바로 연다 (2026-11-01) - FunTool 이 ?paid=1 로 돌아왔을 때 읽는다 */
export const OVERLAY_PENDING_KEY = "ryugyeol_overlay_pending";
export function saveOverlayPending(req: unknown): void {
  try {
    localStorage.setItem(OVERLAY_PENDING_KEY, JSON.stringify({ req, at: Date.now() }));
  } catch {
    /* 무시 */
  }
}
/** 1시간 안에 저장한 것만 (그 뒤엔 버린다) */
export function takeOverlayPending(kind: string): unknown | null {
  try {
    const raw = localStorage.getItem(OVERLAY_PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { req?: { kind?: string }; at?: number };
    if (p.req?.kind !== kind || !p.at || Date.now() - p.at > 3600_000) return null;
    localStorage.removeItem(OVERLAY_PENDING_KEY);
    return p.req;
  } catch {
    return null;
  }
}

/**
 * 잠긴 사주 겹쳐 보기 (2026-11-01 유샘: 겹쳐 보기는 유료, 궁금증이 생기게).
 *   일간·게이지는 위에서 무료로 보이고, 여기서는 풀이 문장 자리를 흐리게 보여 주며 엽전으로 연다.
 *   흐린 글은 진짜 풀이가 아니라 자리만 채운 글이다 (진짜 풀이는 결제 뒤에 서버가 보낸다).
 */

const TEASE = [
  "내 일간과 이 카드가 어떻게 만나는지",
  "지금 마음에 걸린 물음에 사주가 보태는 한마디",
  "남은 작은 빈자리를 무엇으로 채우면 좋은지",
];

/**
 * 2026-11-09 유샘: 화면에는 엽전(냥) 이야기를 꺼내지 않고 원으로 보여 준다 (안에서는 지금처럼 엽전으로 처리).
 * tease·label 을 주면 다른 상품(타로 세 장 카드 + 사주 겹쳐 보기)에도 같은 틀을 쓴다.
 */
export function OverlayLock<T>({ req, price, onOpen, tease = TEASE, label }: { req: unknown; price: number; onOpen: (full: T) => void; tease?: string[]; label?: string }) {
  const [me, setMe] = useState<"loading" | null | { nickname: string }>("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // 2026-11-01 유샘: 엽전이 모자라면 다른 상품과 같은 결제창(카드·계좌이체)
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMe(d?.user?.termsAgreed ? d.user : null))
      .catch(() => setMe(null));
  }, []);

  async function open() {
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/fun/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
      const b = await r.json().catch(() => ({}));
      if (r.ok) {
        notifyYeopjeonChanged();
        onOpen(b as T);
        return;
      }
      if (r.status === 402) {
        saveOverlayPending(req);
        setPaying(true);
      }
      else if (r.status === 401) setMe(null);
      else setMsg(b?.error?.message ?? "잠시 후 다시 시도해 주세요.");
    } catch {
      setMsg("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  const here = typeof window !== "undefined" ? location.pathname : "/";
  return (
    <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: "rgba(246,236,210,0.06)", border: "1px solid rgba(212,178,101,0.45)" }}>
      <ul className="space-y-1.5 text-[14px]" style={{ wordBreak: "keep-all" }}>
        {tease.map((t) => (
          <li key={t} className="flex gap-2">
            <span aria-hidden style={{ color: "var(--color-gold-light)" }}>
              ◆
            </span>
            {t}
          </li>
        ))}
      </ul>
      <div aria-hidden className="relative mt-3 select-none overflow-hidden rounded-lg px-3 py-2 text-[14px] leading-relaxed" style={{ filter: "blur(5px)", opacity: 0.55 }}>
        당신의 기운은 이 카드와 만나 한 방향으로 모이고, 오늘은 마음에 걸린 일을 서두르기보다 한 걸음 물러서 흐름을 보는 편이 좋아요. 남은 작은 빈자리는 가까운 곳에서 채워져요.
      </div>
      {me === "loading" ? (
        <div className="mt-3 h-[52px]" />
      ) : me ? (
        <button
          type="button"
          onClick={open}
          disabled={busy}
          className="mt-3 block w-full rounded-xl py-3.5 text-[16px] font-bold disabled:opacity-60"
          style={{ background: "linear-gradient(180deg,#fff1c4,#d9b25a 45%,#a77b25)", color: "#1a1408", fontFamily: "var(--font-serif)" }}
        >
          {busy ? "여는 중..." : label ? `${label} · ${formatWon(price)}` : `${formatWon(price)}으로 겹쳐 본 풀이 열기`}
        </button>
      ) : (
        <>
          <a
            href={`/api/auth/kakao/start?next=${encodeURIComponent(here)}`}
            className="mt-3 block rounded-xl py-3.5 text-center text-[16px] font-bold"
            style={{ backgroundColor: "#fee500", color: "#191600" }}
          >
            카카오로 로그인하고 열기 · {formatWon(price)}
          </a>
          <a href={`/login?next=${encodeURIComponent(here)}`} className="mt-1.5 block text-center text-[12px] underline underline-offset-4" style={{ color: "var(--color-gold-light)" }}>
            이메일로 로그인하기
          </a>
        </>
      )}
      {msg && (
        <p className="mt-2 text-center text-[13px]" role="status" style={{ color: "#f3dc9a" }}>
          {msg}
        </p>
      )}
      {paying && (
        <PayDialog
          personId=""
          mode="overlay"
          topics={[]}
          checkoutUrl="/api/fun/checkout"
          checkoutBody={{ req }}
          backTo={here}
          onEnough={() => {
            setPaying(false);
            void open();
          }}
          onClose={() => setPaying(false)}
        />
      )}
      <AppGiftLink color="var(--color-gold-light)" />
      <p className="mt-2 text-center text-[11.5px]" style={{ color: "rgba(246,236,210,0.65)" }}>
        오늘 연 풀이는 같은 날 다시 열어도 또 결제하지 않아요
      </p>
    </div>
  );
}
