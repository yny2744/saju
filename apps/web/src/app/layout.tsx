import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityInit } from "@/components/AccessibilityInit";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { FloatingScrollTop } from "@/components/ScrollTop";
import { RefCapture } from "@/components/yeopjeon/RefCapture";
import { VisitBeacon } from "@/components/VisitBeacon";
import { BgmStarter } from "@/components/bgm/BgmPlayer";

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
        <VisitBeacon />
        <BgmStarter />
        {/* 사이트 액자: PC에서는 가운데 한 장, 폰에서는 화면 전체 (양옆 금색 뇌문 띠 포함) */}
        <div className="site-frame">
          <div aria-hidden className="frame-edge" />
          <SiteHeader />
          {children}
          {/* 전자상거래법상 사업자 고지는 결제 화면을 포함한 모든 화면에 상시 노출한다 */}
          <Footer />
          <div aria-hidden className="frame-edge frame-edge-bottom" />
        </div>
        {/* 화면을 내리면 오른쪽 아래에 "위로" 버튼 (수정안 25) */}
        <FloatingScrollTop />
      </body>
    </html>
  );
}
