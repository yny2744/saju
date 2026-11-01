import type { GateRoom } from "@/tenants/types";
import { isSuneungOn } from "@/lib/launchMode";

/** 갈 곳이 지금 열려 있는지 - 수능대박운은 스위치(NEXT_PUBLIC_SUNEUNG)가 켜졌을 때만 */
export function roomHref(room: GateRoom): string | null {
  if (!room.href) return null;
  if (room.href.includes("exam=1") && !isSuneungOn()) return null;
  return room.href;
}

const CARD = {
  border: "1px solid var(--color-gold-line)",
  backgroundColor: "var(--color-card)",
  boxShadow: "inset 0 0 0 3px var(--color-card), inset 0 0 0 4px var(--color-gold-soft)",
} as const;

export function RoomCard({ room }: { room: GateRoom }) {
  const href = roomHref(room);
  const inner = (
    <>
      <span className="block text-[16px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        {room.name}
      </span>
      <span className="mt-0.5 block text-[12.5px] leading-snug" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
        {room.desc}
      </span>
      <span className="mt-2 block text-[12.5px] font-bold" style={{ color: href ? "var(--color-accent)" : "var(--color-ink-faint)" }}>
        {href ? "들어가기 ›" : "곧 열려요"}
      </span>
    </>
  );
  return href ? (
    <a href={href} className="block h-full rounded-xl px-3.5 py-3 transition-transform active:scale-[0.98]" style={CARD}>
      {inner}
    </a>
  ) : (
    <div className="block h-full rounded-xl px-3.5 py-3 opacity-70" style={CARD} aria-label={`${room.name} - 곧 열려요`}>
      {inner}
    </div>
  );
}

