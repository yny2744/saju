import { getUserBySessionToken } from "@/server/auth/session";
import { getBalance } from "@/server/yeopjeon/ledger";
import { notifyAdmin } from "@/server/alert";
import { CHARGE_OPTIONS, formatNyang } from "@/lib/yeopjeon";
import { ChargeError, bankAccount, cancelCharge, createCharge, listMyCharges } from "./charges";

type Out = { status: number; body: unknown };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: { status: 401, body: { error: { code: "LOGIN_REQUIRED", message: "로그인 후 이용할 수 있어요." } } } } as const;
  if (!user.termsAgreed) return { error: { status: 403, body: { error: { code: "CONSENT_REQUIRED", message: "약관 동의 후 이용할 수 있어요." } } } } as const;
  return { user } as const;
}

/** 충전 화면: 계좌 안내 + 고를 수 있는 금액 + 내 신청 내역 + 잔액 */
export async function handleChargeInfo(token: string | undefined): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const [requests, balance] = await Promise.all([listMyCharges(m.user.id), getBalance(m.user.id)]);
  return { status: 200, body: { account: bankAccount(), options: CHARGE_OPTIONS, requests, balance, nickname: m.user.nickname } };
}

export async function handleCreateCharge(token: string | undefined, raw: unknown): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  if (!bankAccount()) return { status: 503, body: { error: { code: "NOT_READY", message: "계좌 입금 충전을 준비하고 있어요." } } };
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  try {
    const req = await createCharge(m.user.id, b.amount, b.depositor);
    notifyAdmin(`충전 신청 ${formatNyang(req.amount)} - 관리자 화면에서 입금 확인 후 승인해 주세요.`);
    return { status: 200, body: { request: req } };
  } catch (e) {
    if (e instanceof ChargeError) return { status: 400, body: { error: { code: e.code, message: e.message } } };
    throw e;
  }
}

export async function handleCancelCharge(token: string | undefined, id: string): Promise<Out> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  if (!UUID_RE.test(id)) return { status: 400, body: { error: { code: "INVALID_INPUT", message: "신청 번호가 올바르지 않아요." } } };
  try {
    await cancelCharge(m.user.id, id);
    return { status: 200, body: { ok: true } };
  } catch (e) {
    if (e instanceof ChargeError) return { status: 409, body: { error: { code: e.code, message: e.message } } };
    throw e;
  }
}
