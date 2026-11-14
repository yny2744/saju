"use client";

import { useState } from "react";
import { reportClientError } from "@/components/yeopjeon/useYeopjeon";

/**
 * 수능대박운 보호자(지인) 결제 안내 (2026-10-26 유샘 결정, 2026-11-14 유샘: 문구 "보호자(지인)" · 상품 전용 결제 부탁 링크).
 *   가입 선물 엽전으로 보는 가볍게 보기는 학생도 그대로,
 *   심층분석·2~4·네 가지 모두 보기(현금 결제)는 성인(보호자·지인)이 결제하도록 안내한다.
 * 학생이 [보호자(지인)께 결제 부탁하기]를 누르면 그 상품 전용 링크(/gift/exam/토큰)를 카카오톡 등으로 보낸다
 *   → 받은 사람이 링크를 열면 보낸 사람 이름·상품·가격이 보이고, 로그인 뒤 바로 결제창 → 학생 화면에 그 풀이가 열린다.
 * 보내는 것은 우리 사이트 주소일 뿐이라 PG 쪽 별도 신청(SMS·링크 결제 상품)과는 무관하다.
 */
export function GuardianPayNote({ personId, mode, product, noButton }: { personId?: string; mode?: string; product?: string; noButton?: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function share() {
    if (!personId || !mode) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/persons/${encodeURIComponent(personId)}/exam/gift`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const b = await r.json().catch(() => ({}));
      if (!r.ok || !b.url) {
        setMsg(b?.error?.message ?? "잠시 후 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
      const url: string = b.url;
      const text = `수능 앞두고 제 ${product ?? "수능대박운"} 결제를 부탁드려요 🙏 링크를 열면 바로 결제할 수 있어요.`;
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
      try {
        if (nav.share) {
          await nav.share({ title: product ?? "수능대박운", text, url });
        } else {
          await navigator.clipboard.writeText(`${text}\n${url}`);
          setMsg("링크를 복사했어요. 카카오톡에 붙여 넣어 보내 주세요.");
        }
      } catch (e) {
        // 공유 창을 닫은 경우는 조용히 넘어간다
        if (!(e instanceof Error && e.name === "AbortError")) setMsg(`이 주소를 보내 주세요: ${url}`);
      }
    } catch (e) {
      reportClientError("수능 결제 부탁 링크", String(e));
      setMsg("연결이 끊겼어요. 잠시 후 다시 시도해 주세요.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-3 rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}>
      <p className="text-[13px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
        결제는 <b>보호자(지인)</b>께 부탁드려요.
        {!noButton && personId && mode && (
          <>
            <br />
            링크를 보내면 받은 분이 바로 결제할 수 있어요.
          </>
        )}
      </p>
      {!noButton && personId && mode && (
        <button type="button" disabled={busy} onClick={share} className="mt-2 rounded-full px-4 py-1.5 text-[13px] font-bold disabled:opacity-50" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
          {busy ? "링크 만드는 중..." : "보호자(지인)께 결제 부탁하기"}
        </button>
      )}
      {msg && (
        <p className="mt-2 break-all text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
