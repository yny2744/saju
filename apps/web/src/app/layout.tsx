import { BRAND, TENANT } from "@/tenants";
import type { Metadata, Viewport } from "next";
import { APP_ICON_DIR, APP_SHORT_NAME, APP_THEME_COLOR } from "@/lib/appInfo";
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
import { AppInstallInit, InstallBar } from "@/components/app/AppInstall";

export const metadata: Metadata = {
  title: BRAND,
  description: TENANT.brand.description,
  // 2026-11-01 휴대폰 앱(PWA): 아이콘 · 아이폰 홈 화면 설정 (매니페스트는 app/manifest.ts)
  icons: { icon: `${APP_ICON_DIR}/icon-192.png`, apple: `${APP_ICON_DIR}/apple-180.png` },
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: APP_THEME_COLOR };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <AccessibilityInit />
        <RefCapture />
        <SrcCapture />
        <VisitBeacon />
        <BgmStarter />
        <AppInstallInit />
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
        {/* 2026-11-01 휴대폰 앱(PWA) 설치 안내 띠 - 설치 안 한 휴대폰 손님에게만 */}
        <InstallBar />
      </body>
    </html>
  );
}
