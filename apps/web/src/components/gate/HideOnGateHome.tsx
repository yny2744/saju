"use client";

import { usePathname } from "next/navigation";
import { TENANT } from "@/tenants";

/**
 * 세 길·일곱 운 대문(gate)을 쓰는 고객사의 첫 화면에서는 대문이 자기 머리줄(로고·로그인)을 갖고 있어
 * 공통 머리줄을 숨긴다. 다른 화면·다른 고객사에서는 그대로 보인다.
 */
export function HideOnGateHome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  // 2026-11-10: 소개 화면(/about)도 대문과 같은 화면이라 대문 머리줄을 쓴다
  // 2026-11-11: 정문(/)은 새 대문 뒤에 공통 머리줄을 쓴다 - 대문 장면 머리줄은 소개 화면(/about)에만
  if (TENANT.gate && path === "/about") return null;
  return <>{children}</>;
}
