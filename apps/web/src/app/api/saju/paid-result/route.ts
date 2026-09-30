import { NextRequest, NextResponse } from "next/server";
import { handleGetPaidResult } from "@/server/paymentRequestHandlers";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const entitlement = request.nextUrl.searchParams.get("entitlement");
  const { status, body } = await handleGetPaidResult(entitlement);
  return NextResponse.json(body, { status });
}
