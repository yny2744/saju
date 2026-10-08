import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityInit } from "@/components/AccessibilityInit";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { RefCapture } from "@/components/yeopjeon/RefCapture";

export const metadata: Metadata = {
  title: "류결사주",
  description: "류결사주 — 생년월일시를 입력하고 사주·오늘의 운세·관상 해석을 받아보세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <AccessibilityInit />
        <RefCapture />
        {/* 사이트 액자: PC에서는 가운데 한 장, 폰에서는 화면 전체 (양옆 금색 뇌문 띠 포함) */}
        <div className="site-frame">
          <SiteHeader />
          {children}
          {/* 전자상거래법상 사업자 고지는 결제 화면을 포함한 모든 화면에 상시 노출한다 */}
          <Footer />
        </div>
      </body>
    </html>
  );
}
