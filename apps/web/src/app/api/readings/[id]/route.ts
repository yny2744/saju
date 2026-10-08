import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleGetReading } from "@/server/readings/readingHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 저장된 맛보기 (본인 것만) */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "맛보기 보기", (token) => handleGetReading(token, params.id));
}
