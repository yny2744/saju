"use client";

import { useState } from "react";
import { CURRENCY_NAME, INVITEE_GIFT, INVITE_MILESTONES, INVITE_REWARD, formatNyang, inviteProgress } from "@/lib/yeopjeon";
import { inviteUrl, shareInvite } from "./useYeopjeon";

/** 친구 초대 카드 - 내 복주머니·풀이 화면에서 같이 쓴다 */
export function InviteCard({ refCode, invited }: { refCode: string; invited: number }) {
  const [msg, setMsg] = useState("");
  const p = inviteProgress(invited);

  async function onShare() {
    const r = await shareInvite(refCode);
    setMsg(r === "copied" ? "초대 링크를 복사했어요. 카카오톡에 붙여 넣어 보내 주세요." : r === "failed" ? `링크: ${inviteUrl(refCode)}` : "");
  }

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
      <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        친구 초대하고 {CURRENCY_NAME} 받기
      </p>
      <ul className="mt-2 space-y-1 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        <li>
          · 친구 한 명마다 나에게 <b>{formatNyang(INVITE_REWARD)}</b>, 친구에게도 <b>{formatNyang(INVITEE_GIFT)}</b>
        </li>
        {INVITE_MILESTONES.filter((m) => m.n > 1).map((m) => (
          <li key={m.n}>
            · 친구 {m.n}명이면 {formatNyang(m.n * INVITE_REWARD)} ({m.label})
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[14px]">
        지금까지 <b>{invited}명</b> 초대 · {formatNyang(p.earned)}
        {p.next && (
          <span style={{ color: "var(--color-ink-faint)" }}>
            {" "}
            · {p.next.remaining}명 더 모이면 {p.next.label}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={onShare}
        className="mt-4 block w-full rounded-xl py-3.5 text-[16px] font-bold"
        style={{ backgroundColor: "#fee500", color: "#191600" }}
      >
        카카오톡으로 초대 링크 보내기
      </button>
      {msg && (
        <p className="mt-2 break-all text-center text-[13px]" style={{ color: "var(--color-ink-soft)" }}>
          {msg}
        </p>
      )}
    </div>
  );
}
