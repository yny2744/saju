import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 사주팔자 분석",
  description: "생년월일시를 입력하고 AI 사주 해석을 받아보세요.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
