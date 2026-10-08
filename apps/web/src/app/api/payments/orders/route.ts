import { NextRequest, NextResponse } from "next/server";
import { handleCreateOrder } from "@/server/paymentRequestHandlers";
import { clientKeyOf } from "@/server/httpUtils";

export const runtime = "nodejs";

/**
 * 2026-10-08 수정안 8번: 예전 상품(3,900/9,900/4,900원) 판매 종료 - 새 주문을 받지 않는다.
 * 결제사 승인 후 새 상품(맛보기·깊게 보기·몰아보기·전부 보기) 결제를 붙일 때 이 막음을 바꾼다.
 */
const LEGACY_SALES_CLOSED = true;

export async function POST(request: NextRequest) {
  if (LEGACY_SALES_CLOSED) {
    return NextResponse.json(
      { error: { code: "PRODUCT_CLOSED", message: "예전 상품은 판매를 마쳤어요. 새 상품은 엽전으로 이용해 주세요." } },
      { status: 410 }
    );
  }
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_INPUT", message: "요청 본문이 올바른 JSON이 아닙니다." } },
      { status: 400 }
    );
  }
  const { status, body } = await handleCreateOrder(rawBody, clientKeyOf(request));
  return NextResponse.json(body, { status });
}
