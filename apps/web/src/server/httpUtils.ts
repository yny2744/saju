import type { NextRequest } from "next/server";

export function clientKeyOf(request: NextRequest): string {
  return request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
}
