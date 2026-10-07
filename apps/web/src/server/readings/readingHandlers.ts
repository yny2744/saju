import { getCurrentKstYear } from "saju-engine";
import { getUserBySessionToken } from "@/server/auth/session";
import { getResult } from "@/server/resultStore";
import { ensureRefCode, getBalance, grant, inviteStats, listLedger, InsufficientBokchaeError } from "@/server/bokchae/ledger";
import { SAJU_READING_PRICE, WELCOME_GIFT } from "@/lib/bokchae";
import { generateSajuReading } from "./generateReading";
import {
  PRODUCT_SAJU_990,
  findReadingByKey,
  getReading,
  listReadings,
  purchaseAndSave,
  readingHeader,
  readingSourceKey,
} from "./readings";

type Result<T> = { status: number; body: T | { error: { code: string; message: string } } };

const err = (status: number, code: string, message: string) => ({ status, body: { error: { code, message } } });

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

/** 내 복채·이용내역·초대 정보·저장된 풀이 */
export async function handleBokchaeSummary(token: string | undefined): Promise<Result<unknown>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  // 이 기능 전에 가입한 회원도 가입 선물을 받게 한다 (멱등 - 이미 받았으면 아무 일 없음)
  await grant(m.user.id, WELCOME_GIFT, "welcome", "회원가입 축하 복채");
  const [balance, ledger, refCode, stats, readings] = await Promise.all([
    getBalance(m.user.id),
    listLedger(m.user.id),
    ensureRefCode(m.user.id),
    inviteStats(m.user.id),
    listReadings(m.user.id),
  ]);
  return { status: 200, body: { balance, ledger, refCode, invited: stats.invited, readings } };
}

/**
 * 990원 사주보기 만들기. 무료 결과 id(resultId)를 받아:
 *  1) 이미 같은 사람·관심 분야로 산 풀이가 있으면 그것을 돌려줌(재결제·AI 재호출 없음)
 *  2) 잔액 확인 → AI 풀이 생성 → 복채 차감 + 저장(한 트랜잭션)
 */
export async function handleCreateReading(token: string | undefined, rawBody: unknown): Promise<Result<{ id: string }>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const resultId = typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>).resultId : undefined;
  if (typeof resultId !== "string" || !resultId) return err(400, "INVALID_INPUT", "결과 정보가 없어요.");

  const result = getResult(resultId);
  if (!result) return err(410, "RESULT_EXPIRED", "결과 보관 시간이 지났어요. 사주를 다시 입력해 주세요.");

  const sourceKey = readingSourceKey(result.saju, result.nickname, result.focus);
  const existing = await findReadingByKey(m.user.id, PRODUCT_SAJU_990, sourceKey);
  if (existing) return { status: 200, body: { id: existing } };

  // AI 비용을 쓰기 전에 잔액부터 확인 (최종 확인은 저장 트랜잭션에서 한 번 더)
  const balance = await getBalance(m.user.id);
  if (balance < SAJU_READING_PRICE) return err(402, "INSUFFICIENT_BOKCHAE", "복채가 부족해요.");

  let content;
  try {
    content = await generateSajuReading(result.saju, result.nickname, result.focus, getCurrentKstYear());
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[reading] AI 풀이 생성 실패:", e);
    return err(502, "READING_FAILED", "풀이를 만드는 중 문제가 생겼어요. 복채는 빠지지 않았어요. 잠시 후 다시 시도해 주세요.");
  }

  try {
    const id = await purchaseAndSave({
      userId: m.user.id,
      sourceKey,
      nickname: result.nickname,
      focus: result.focus,
      header: readingHeader(result.saju, result.nickname, result.hanjaName),
      content,
    });
    return { status: 200, body: { id } };
  } catch (e) {
    if (e instanceof InsufficientBokchaeError) return err(402, "INSUFFICIENT_BOKCHAE", "복채가 부족해요.");
    throw e;
  }
}

export async function handleGetReading(token: string | undefined, id: string): Promise<Result<unknown>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const reading = await getReading(m.user.id, id);
  if (!reading) return err(404, "NOT_FOUND", "풀이를 찾을 수 없어요.");
  return { status: 200, body: { reading } };
}
