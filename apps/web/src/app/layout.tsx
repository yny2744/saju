import { BRAND, TENANT } from "@/tenants";
import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityInit } from "@/components/AccessibilityInit";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { HideOnGateHome } from "@/components/gate/HideOnGateHome";
import { SrcCapture } from "@/components/SrcCapture";
import { FloatingScrollTop } from "@/components/ScrollTop";
import { RefCapture } from "@/components/yeopjeon/RefCapture";
import { VisitBeacon } from "@/components/VisitBeacon";
import { BgmStarter } from "@/components/bgm/BgmPlayer";

export const metadata: Metadata = {
  title: BRAND,
  description: TENANT.brand.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <AccessibilityInit />
        <RefCapture />
        <SrcCapture />
        <VisitBeacon />
        <BgmStarter />
        {/* 사이트 액자: PC에서는 가운데 한 장, 폰에서는 화면 전체 (양옆 금색 뇌문 띠 포함) */}
        {/* 2026-10-30 유샘: 대문이 있는 고객사(명견만리)는 한지 질감 바탕 */}
        <div className={TENANT.gate ? "site-frame paper-hanji" : "site-frame"}>
          <HideOnGateHome>
            <div aria-hidden className="frame-edge" />
            <SiteHeader />
          </HideOnGateHome>
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
