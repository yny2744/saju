import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAttachFaceSaju } from "@/server/face/faceReadings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관상 심층 풀이 - 누구의 사주로 볼지 (수정안 59): { profileId } | { personId } | { resultId } */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "관상 사주 정하기", (token) => handleAttachFaceSaju(token, params.id, body));
}
