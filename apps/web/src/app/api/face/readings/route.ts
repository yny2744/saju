import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleCreateFaceReading } from "@/server/face/faceReadings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 무료 관상 결과 → 내 관상 풀이로 옮기기 (수정안 53, 결제 전) */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "관상 풀이 만들기", (token) => handleCreateFaceReading(token, body));
}
