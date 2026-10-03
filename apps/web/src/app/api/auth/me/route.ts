import { NextRequest, NextResponse } from "next/server";
import { handleMe } from "@/server/auth/authHandlers";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { status, body } = await handleMe(token);
  return NextResponse.json(body, { status });
}
