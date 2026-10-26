import { TENANT } from "@/tenants";
import type { GoodsLink } from "@/tenants/types";
import type { ElementKo } from "@/lib/pillarView";

/**
 * 굿즈 추천 링크 고르기 (2026-10-26). 고객사 설정(TENANT.goods.coupang)에서만 읽는다.
 * 링크가 하나도 없는 오행은 빼고 돌려준다 - 결과가 비면 화면에 굿즈 칸을 그리지 않는다.
 */
export function goodsFor(elements: ElementKo[]): Array<{ element: ElementKo; links: GoodsLink[] }> {
  const coupang = TENANT.goods?.coupang ?? {};
  return elements
    .map((el) => ({ element: el, links: (coupang[el] ?? []).filter((l) => l.label.trim() && /^https:\/\//.test(l.url)) }))
    .filter((g) => g.links.length > 0);
}

/** 쿠팡 파트너스 대가 표시 (공정위 추천·보증 심사지침상 필수 - 지우지 않는다) */
export const COUPANG_DISCLOSURE = "이 링크는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.";
