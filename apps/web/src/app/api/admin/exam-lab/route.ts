import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleExamLab } from "@/server/exam/examLab";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** 관리자 시험 (2026-11-12 유샘): 수능 심층분석 풀이를 AI 모델별로 나란히 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "수능 풀이 시험", (token) => handleExamLab(token, body));
}
