import { HeaderAuth } from "@/components/landing/HeaderAuth";

/**
 * 모든 화면 맨 위 머리줄 (2026-10-09 수정안 18).
 * 감청 바탕 + 은은한 뇌문, 금박 "류결사주", 아래 금색 이중선. 로고가 나오면 글자 대신 넣는다.
 */
export function SiteHeader() {
  return (
    <header className="band-bg relative" style={{ color: "#f6ecd2" }}>
      <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-3.5">
        <a href="/" className="foil-text text-[21px] font-black tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
          류결사주
        </a>
        <HeaderAuth />
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[4px]" style={{ borderTop: "1px solid var(--color-gold-line)", borderBottom: "1px solid var(--color-gold-line)" }} />
    </header>
  );
}
