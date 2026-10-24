import { BRAND } from "@/tenants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `상호 풀이 · 상호 작명 · ${BRAND}`,
  description: "가게·회사 이름이 업종의 기운과 대표자 사주에 맞는지 무료로 풀어 보고, 사주에 맞는 상호를 추천받으세요.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
