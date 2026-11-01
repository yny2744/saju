import type { Metadata } from "next";
import { BRAND } from "@/tenants";
import { TaekilTool } from "@/components/fun/TaekilTool";

export const metadata: Metadata = { title: `택일 · 좋은 날 고르기 · ${BRAND}`, description: "이사·결혼·개업·계약에 맞는 좋은 날을 내 띠와 사주에 맞춰 골라 드려요." };

/** 택일관 (2026-11-01 유샘 지시서) - 로그인 없음, AI 없음, 지금은 무료 */
export default function TaekilPage() {
  return <TaekilTool />;
}
