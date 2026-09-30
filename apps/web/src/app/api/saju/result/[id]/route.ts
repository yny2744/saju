import { NextRequest, NextResponse } from "next/server";
import { handleGetResult } from "@/server/requestHandlers";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const { status, body } = handleGetResult(params.id);
  return NextResponse.json(body, { status });
}
