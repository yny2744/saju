import type { Metadata } from "next";
import "./globals.css";
import { AccessibilityInit } from "@/components/AccessibilityInit";

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
      </body>
    </html>
  );
}
