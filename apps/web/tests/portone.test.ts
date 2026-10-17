import { createHmac } from "crypto";
import { payMode, verifyPortOneWebhook } from "@/server/pay/payOrders";
import { PortOnePaymentProvider } from "@/server/paymentProvider";

describe("포트원 V2 (2026-10-17)", () => {
  it("환경변수 세 개가 있으면 포트원이 먼저", () => {
    const env = { PORTONE_STORE_ID: "store-1", PORTONE_CHANNEL_KEY: "channel-key-1", PORTONE_API_SECRET: "s", TOSS_CLIENT_KEY: "t", PAYMENT_SECRET_KEY: "p", NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv;
    expect(payMode(env)).toBe("portone");
    expect(payMode({ ...env, PORTONE_API_SECRET: undefined } as unknown as NodeJS.ProcessEnv)).toBe("toss");
    expect(payMode({ NODE_ENV: "production" } as unknown as NodeJS.ProcessEnv)).toBe("off");
  });

  it("웹훅 서명 확인 (Standard Webhooks)", () => {
    const secret = "whsec_" + Buffer.from("test-secret-key").toString("base64");
    const body = JSON.stringify({ type: "Transaction.Paid", data: { paymentId: "ryg_x" } });
    const ts = "1760000000";
    const sig = createHmac("sha256", Buffer.from("test-secret-key")).update(`msg_1.${ts}.${body}`).digest("base64");
    expect(verifyPortOneWebhook({ id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, body, secret, 1760000010)).toBe(true);
    expect(verifyPortOneWebhook({ id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, body + " ", secret, 1760000010)).toBe(false);
    expect(verifyPortOneWebhook({ id: "msg_1", timestamp: ts, signature: `v1,${sig}` }, body, secret, 1760009999)).toBe(false);
    expect(verifyPortOneWebhook({ id: null, timestamp: ts, signature: `v1,${sig}` }, body, secret, 1760000010)).toBe(false);
  });

  it("결제 확인: 결제 ID가 주문 번호와 다르면 거절, PAID·금액 확인", async () => {
    const p = new PortOnePaymentProvider("secret", "store-1");
    expect((await p.confirmPayment({ paymentKey: "other", orderId: "ryg_1", amount: 990 })).approved).toBe(false);
    const orig = global.fetch;
    global.fetch = (async () => new Response(JSON.stringify({ status: "PAID", storeId: "store-1", amount: { total: 990 } }), { status: 200 })) as typeof fetch;
    try {
      expect(await p.confirmPayment({ paymentKey: "ryg_1", orderId: "ryg_1", amount: 990 })).toEqual({ approved: true, approvedAmount: 990 });
      global.fetch = (async () => new Response(JSON.stringify({ status: "READY", storeId: "store-1", amount: { total: 990 } }), { status: 200 })) as typeof fetch;
      expect((await p.confirmPayment({ paymentKey: "ryg_1", orderId: "ryg_1", amount: 990 })).approved).toBe(false);
    } finally {
      global.fetch = orig;
    }
  });
});
