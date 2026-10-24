import { BRAND } from "@/tenants";
import type { Metadata } from "next";

export const metadata: Metadata = { title: `관리자 · ${BRAND}`, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
