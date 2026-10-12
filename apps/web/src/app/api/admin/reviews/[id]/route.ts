import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleAdminReview } from "@/server/reviews/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 관리자: 후기 대문에 올리기·내리기·숨기기 ({featured?, hidden?}) */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "관리자 후기", (token) => handleAdminReview(token, params.id, body));
}
