import { BRAND, TENANT } from "@/tenants";
import { HeaderAuth } from "@/components/landing/HeaderAuth";
import { BgmToggle } from "@/components/bgm/BgmPlayer";

/**
 * 모든 화면 맨 위 머리줄 (2026-10-09 수정안 18).
 * 감청 바탕 + 은은한 뇌문, 금박 "류결사주", 아래 금색 이중선. 로고가 나오면 글자 대신 넣는다.
 */
export function SiteHeader() {
  return (
    <header className="band-bg relative" style={{ color: "#f6ecd2" }}>
      <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-3.5">
        {/* 2026-10-30 유샘: 대문이 있는 고객사(명견만리)는 그 엠블럼과 대문 이름으로 */}
        {TENANT.gate ? (
          <a href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- 엠블럼 */}
            <img src={TENANT.gate.emblem} alt="" width={34} height={34} className="h-[34px] w-[34px]" />
            <span className="foil-text min-w-0 text-[clamp(16px,5.2vw,19px)] font-black tracking-wide" style={{ fontFamily: "var(--font-serif)", wordBreak: "keep-all" }}>
              {TENANT.gate.title}
            </span>
          </a>
        ) : (
          <a href="/" className="foil-text text-[21px] font-black tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
            {BRAND}
          </a>
        )}
        <span className="flex items-center gap-3">
          <BgmToggle />
          <HeaderAuth />
        </span>
      </div>
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[4px]" style={{ borderTop: "1px solid var(--color-gold-line)", borderBottom: "1px solid var(--color-gold-line)" }} />
    </header>
  );
}
