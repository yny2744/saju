"use client";

import { useState } from "react";

/**
 * 수능운 보호자 결제 안내 (2026-10-26 유샘 결정).
 *   가입 선물 엽전으로 보는 가볍게 보기는 학생도 그대로,
 *   깊게 보기·두 번째 사람부터(현금 결제)는 보호자(만 19세 이상)가 결제하도록 안내한다.
 * 학생이 [부모님께 부탁하기]를 누르면 수능운 시작 주소를 카카오톡 등으로 보낸다 → 부모가 자기 휴대폰에서
 * 자녀 생년월일로 들어와 결제한다 (성인의 결제라 미성년자 취소 문제가 생기지 않는다).
 * 보내는 것은 우리 사이트 주소일 뿐이라 PG 쪽 별도 신청(SMS·링크 결제 상품)과는 무관하다.
 */
export function GuardianPayNote({ title }: { title: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  async function share() {
    const url = `${window.location.origin}/go?exam=1`;
    const text = `수능 앞두고 내 ${title}를 같이 봐 주세요 🙏 아래 링크에서 제 생년월일로 깊게 보기를 볼 수 있어요.`;
    try {
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string; url?: string }) => Promise<void> };
      if (nav.share) {
        await nav.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setMsg("링크를 복사했어요. 카카오톡에 붙여 넣어 보내 주세요.");
    } catch (e) {
      // 공유 창을 닫은 경우는 조용히 넘어간다
      if (!(e instanceof Error && e.name === "AbortError")) setMsg(`이 주소를 보내 주세요: ${url}`);
    }
  }

  return (
    <div className="mt-3 rounded-xl px-4 py-3 text-center" style={{ backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}>
      <p className="text-[13px] leading-relaxed" style={{ wordBreak: "keep-all" }}>
        결제는 <b>보호자(만 19세 이상)</b>께 부탁드려요.
        <br />
        학생이라면 부모님께 링크를 보내 함께 보세요.
      </p>
      <button type="button" onClick={share} className="mt-2 rounded-full px-4 py-1.5 text-[13px] font-bold" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
        부모님께 부탁하기
      </button>
      {msg && (
        <p className="mt-2 break-all text-[12px]" style={{ color: "var(--color-ink-soft)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
