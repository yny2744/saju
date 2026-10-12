import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleMyReview } from "@/server/reviews/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 내가 이 상품에 남긴 한마디 (?personId=&product=) */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  return memberRoute(request, "내 후기", (token) => handleMyReview(token, q.get("personId"), q.get("product")));
}
