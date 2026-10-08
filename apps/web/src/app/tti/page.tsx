import type { Metadata } from "next";
import { ttiTodayAndTomorrow } from "@/server/ttiService";
import { TtiBoard } from "@/components/TtiBoard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "띠별 운세 · 류결사주",
  description: "오늘과 내일의 띠별 운세 - 열두 띠와 그날 일진의 합·충으로 보는 하루의 흐름",
};

/** 띠별 운세 (무료·로그인 없음, 2026-10-08 수정안 12번) */
export default function TtiPage() {
  const { today, tomorrow } = ttiTodayAndTomorrow();
  return <TtiBoard today={today} tomorrow={tomorrow} />;
}
