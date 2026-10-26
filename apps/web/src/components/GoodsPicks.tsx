import type { ElementKo } from "@/lib/pillarView";
import { ELEMENT_HANJA, ELEMENT_NATURE } from "@/lib/manseView";
import { COUPANG_DISCLOSURE, goodsFor } from "@/lib/goods";

/**
 * 굿즈 추천 칸 (2026-10-26) - "나를 채우는 기운" 바로 아래.
 *
 * 링크는 고객사 설정(TENANT.goods.coupang)에서만 읽는다. 해당 오행에 링크가 하나도 없으면 칸 자체를 그리지 않는다
 * (류결사주에만 유샘 쿠팡 링크, 다른 고객사는 비워 둠).
 * ⚠️ 표현 원칙(유샘): 판매를 드러내지 않는다 - "곁에 두면 좋은 물건" 정도로 은근하게.
 * ⚠️ 쿠팡 파트너스 링크에는 대가 표시 문구가 법적으로 필수다 (공정위 추천·보증 심사지침) - 지우지 않는다.
 */

export function GoodsPicks({ elements, tone = "light" }: { elements: ElementKo[]; tone?: "light" | "dark" }) {
  const groups = goodsFor(elements);
  if (groups.length === 0) return null;
  const dark = tone === "dark";
  return (
    <div
      className="mt-3 rounded-xl px-4 py-3"
      style={dark ? { backgroundColor: "rgba(246,236,210,0.06)", border: "1px solid rgba(212,178,101,0.35)" } : { backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}
    >
      <p className="text-[12px]" style={{ color: dark ? "var(--color-gold-light)" : "var(--color-ink-faint)" }}>
        곁에 두면 좋은 물건
      </p>
      {groups.map((g) => (
        <div key={g.element} className="mt-2">
          {groups.length > 1 && (
            <p className="mb-1 text-[12px] font-semibold">
              {ELEMENT_NATURE[g.element]}({ELEMENT_HANJA[g.element]})의 기운
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {g.links.map((l) => (
              <a
                key={l.url}
                href={l.url}
                target="_blank"
                rel="sponsored noopener noreferrer"
                className="rounded-full px-3 py-1 text-[13px]"
                style={dark ? { border: "1px solid var(--color-gold-line)", color: "#f6ecd2" } : { border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      ))}
      <p className="mt-2 text-[11px] leading-relaxed" style={{ color: dark ? "rgba(246,236,210,0.6)" : "var(--color-ink-faint)" }}>
        {COUPANG_DISCLOSURE}
      </p>
    </div>
  );
}
