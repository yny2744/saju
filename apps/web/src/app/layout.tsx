import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityInit } from "@/components/AccessibilityInit";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "류결사주",
  description: "류결사주 — 생년월일시를 입력하고 사주·오늘의 운세·관상 해석을 받아보세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <AccessibilityInit />
        {children}
        {/* 전자상거래법상 사업자 고지는 결제 화면을 포함한 모든 화면에 상시 노출한다 */}
        <Footer />
      </body>
    </html>
  );
}
