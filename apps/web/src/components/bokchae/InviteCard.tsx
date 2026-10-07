"use client";

import { useState } from "react";
import { BOKCHAE_NAME, INVITE_REWARD, INVITE_MILESTONES, formatWon, nextMilestone } from "@/lib/bokchae";
import { inviteUrl, shareInvite } from "./useBokchae";

/** 친구 초대 카드 - 내 사주함·풀이 화면에서 같이 쓴다 */
export function InviteCard({ refCode, invited }: { refCode: string; invited: number }) {
  const [msg, setMsg] = useState("");
  const next = nextMilestone(invited);

  async function onShare() {
    const r = await shareInvite(refCode);
    setMsg(r === "copied" ? "초대 링크를 복사했어요. 카카오톡에 붙여 넣어 보내 주세요." : r === "failed" ? `링크: ${inviteUrl(refCode)}` : "");
  }

  return (
    <div className="rounded-2xl p-5" style={{ border: "1px solid #d8c49a", backgroundColor: "#fffdf8" }}>
      <p className="text-[17px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        친구 초대하고 {BOKCHAE_NAME} 받기
      </p>
      <ul className="mt-2 space-y-1 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        <li>· 친구가 가입할 때마다 {formatWon(INVITE_REWARD)}</li>
        {INVITE_MILESTONES.map((m) => (
          <li key={m.count}>
            · {m.count}명 달성 보너스 {formatWon(m.bonus)} <span style={{ color: "var(--color-ink-faint)" }}>({m.label})</span>
          </li>
        ))}
        <li>· 친구도 가입 선물 {BOKCHAE_NAME}를 받아요</li>
      </ul>
      <p className="mt-3 text-[14px]">
        지금까지 <b>{invited}명</b> 초대
        {next && (
          <span style={{ color: "var(--color-ink-faint)" }}>
            {" "}
            · {next.remaining}명 더 초대하면 {formatWon(next.bonus)}
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
