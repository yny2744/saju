import { NextRequest } from "next/server";
import { memberRoute } from "@/server/routeHelpers";
import { handleCheckout } from "@/server/pay/payHandlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 연인 궁합 - 엽전이 모자랄 때 모자란 만큼 결제할 주문 만들기 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return memberRoute(request, "연인 궁합 결제 주문 만들기", (token) => handleCheckout(token, params.id, { mode: "couple", topics: [] }));
}
