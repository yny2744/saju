import type { TenantPrices } from "@/tenants/types";
import { saleNote } from "@/lib/yeopjeon";

/** 오픈 특가 한 줄 (2026-10-29) - 예) "깊게 보기 오픈 특가 · 행사 후 11,000냥". 행사가 없으면 아무것도 그리지 않는다. */
export function SaleNote({ k, prefix, unit = "냥", className = "mt-1.5 text-center" }: { k: keyof TenantPrices; prefix?: string; unit?: "냥" | "원"; className?: string }) {
  const note = saleNote(k, unit);
  if (!note) return null;
  return (
    <span className={`block text-[12px] font-semibold ${className}`} style={{ color: "var(--color-danger)" }}>
      {prefix ? `${prefix} ` : ""}
      {note}
    </span>
  );
}
