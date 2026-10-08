import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleCreateReading } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// AI 맛보기(4묶음 병렬)가 수십 초 걸릴 수 있다
export const maxDuration = 60;

/** 맛보기 990냥 */
export async function POST(request: NextRequest) {
  const rawBody = await request.json().catch(() => null);
  return memberRoute(request, "맛보기 만들기", (token) => handleCreateReading(token, rawBody));
}
