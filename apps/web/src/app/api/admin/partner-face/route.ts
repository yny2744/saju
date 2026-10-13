import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminPartnerFace } from "@/server/face/partnerImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 관리자 시험 (수정안 58): 사진 → AI가 그린 가상의 인연 얼굴 사진 (저장하지 않음) */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "인연 얼굴 시험", (token) => handleAdminPartnerFace(token, body));
}
