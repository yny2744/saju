import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleWriteFaceReading } from "@/server/face/faceReadings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 관상 심층 풀이 쓰기 - { photo?: dataURL, consent?: true }. 사진은 이 요청 안에서만 쓰고 저장하지 않는다 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "관상 심층 풀이 쓰기", (token) => handleWriteFaceReading(token, params.id, body));
}
