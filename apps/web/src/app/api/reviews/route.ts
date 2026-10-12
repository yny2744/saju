import { NextRequest, NextResponse } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { notifyError } from "@/server/alert";
import { handleCreateReview, publicReviews } from "@/server/reviews/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 1004 천사의 한마디 (수정안 47) - GET: 관리자가 올린 후기 (?topic= / ?naming=1 / ?face=1 / ?limit=), POST: 후기 남기기 */
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams;
    const reviews = await publicReviews({ topic: q.get("topic"), naming: q.get("naming") === "1", face: q.get("face") === "1", limit: Number(q.get("limit")) || 30 });
    return NextResponse.json({ reviews }, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
  } catch (e) {
    notifyError("후기 불러오기", e);
    return NextResponse.json({ reviews: [] });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  return memberRoute(request, "후기 남기기", (token) => handleCreateReview(token, body));
}
