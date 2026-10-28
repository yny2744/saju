"use client";

import { usePathname } from "next/navigation";
import { TENANT } from "@/tenants";

/**
 * 세 길·일곱 운 대문(gate)을 쓰는 고객사의 첫 화면에서는 대문이 자기 머리줄(로고·로그인)을 갖고 있어
 * 공통 머리줄을 숨긴다. 다른 화면·다른 고객사에서는 그대로 보인다.
 */
export function HideOnGateHome({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  if (TENANT.gate && path === "/") return null;
  return <>{children}</>;
}
