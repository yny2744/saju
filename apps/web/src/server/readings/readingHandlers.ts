import { getCurrentKstYear } from "saju-engine";
import { getUserBySessionToken } from "@/server/auth/session";
import { getResult } from "@/server/resultStore";
import { ensureRefCode, getBalance, grant, inviteStats, listLedger, InsufficientYeopjeonError } from "@/server/yeopjeon/ledger";
import { CURRENCY_NAME, PRICE, WELCOME_GIFT } from "@/lib/yeopjeon";
import { isAnyTopicKey, isTopicKey } from "@/lib/topics";
import { notifyError } from "@/server/alert";
import { generateBasic, generateDeep, generateTaste } from "./generateReading";
import {
  PurchaseError,
  createPerson,
  findReadingByKey,
  getPersonRow,
  getPersonSummary,
  getReading,
  getTopicBasic,
  getTopicReading,
  isUnlocked,
  listPersons,
  purchaseTaste,
  purchaseTopics,
  readingSourceKey,
  saveTopicBasic,
  saveTopicReading,
  type PurchaseMode,
} from "./readings";

type ErrBody = { error: { code: string; message: string } };
type Result<T> = { status: number; body: T | ErrBody };

const err = (status: number, code: string, message: string): { status: number; body: ErrBody } => ({ status, body: { error: { code, message } } });
const SHORT = () => err(402, "INSUFFICIENT_YEOPJEON", `${CURRENCY_NAME}이 부족해요.`);

async function member(token: string | undefined) {
  const user = await getUserBySessionToken(token);
  if (!user) return { error: err(401, "LOGIN_REQUIRED", "로그인 후 이용할 수 있어요.") } as const;
  if (!user.termsAgreed) return { error: err(403, "CONSENT_REQUIRED", "약관 동의 후 이용할 수 있어요.") } as const;
  return { user } as const;
}

function resultFrom(rawBody: unknown) {
  const resultId = typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>).resultId : undefined;
  if (typeof resultId !== "string" || !resultId) return { error: err(400, "INVALID_INPUT", "결과 정보가 없어요.") } as const;
  const result = getResult(resultId);
  if (!result) return { error: err(410, "RESULT_EXPIRED", "결과 보관 시간이 지났어요. 사주를 다시 입력해 주세요.") } as const;
  return { result } as const;
}

/** 내 엽전·이용내역·초대 정보·풀이한 사람들 */
export async function handleYeopjeonSummary(token: string | undefined): Promise<Result<unknown>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  // 이 기능 전에 가입한 회원도 가입 선물을 받게 한다 (멱등 - 이미 받았으면 아무 일 없음)
  await grant(m.user.id, WELCOME_GIFT, "welcome", `회원가입 축하 ${CURRENCY_NAME}`);
  const [balance, ledger, refCode, stats, persons] = await Promise.all([
    getBalance(m.user.id),
    listLedger(m.user.id),
    ensureRefCode(m.user.id),
    inviteStats(m.user.id),
    listPersons(m.user.id),
  ]);
  return { status: 200, body: { balance, ledger, refCode, invited: stats.invited, persons } };
}

/**
 * 맛보기(990냥). 무료 결과 id(resultId)를 받아:
 *  1) 같은 사람·관심 분야로 이미 산 맛보기가 있으면 그것을 돌려줌(재차감·AI 재호출 없음)
 *  2) 잔액 확인 → AI 풀이 → 사람 저장 + 엽전 차감 + 풀이 저장(한 트랜잭션)
 */
export async function handleCreateReading(token: string | undefined, rawBody: unknown): Promise<Result<{ id: string; personId: string | null }>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const r = resultFrom(rawBody);
  if ("error" in r) return r.error!;
  const { result } = r;

  const existing = await findReadingByKey(m.user.id, readingSourceKey(result.saju, result.nickname, result.focus));
  if (existing) return { status: 200, body: existing };

  // AI 비용을 쓰기 전에 잔액부터 확인 (최종 확인은 저장 트랜잭션에서 한 번 더)
  if ((await getBalance(m.user.id)) < PRICE.TASTE) return SHORT();

  let content;
  try {
    content = await generateTaste(result.saju, result.nickname, result.focus, getCurrentKstYear());
  } catch (e) {
    notifyError("맛보기 풀이 생성 실패", e);
    return err(502, "READING_FAILED", `풀이를 만드는 중 문제가 생겼어요. ${CURRENCY_NAME}은 빠지지 않았어요. 잠시 후 다시 시도해 주세요.`);
  }

  try {
    const saved = await purchaseTaste({
      userId: m.user.id,
      saju: result.saju,
      nickname: result.nickname,
      hanjaName: result.hanjaName,
      focus: result.focus,
      content,
    });
    return { status: 200, body: saved };
  } catch (e) {
    if (e instanceof InsufficientYeopjeonError) return SHORT();
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

/** 풀이 대상(사람) 만들기 - 결제 없음. 무료 결과에서 바로 몰아보기·전부 보기로 갈 때 쓴다. */
export async function handleCreatePerson(token: string | undefined, rawBody: unknown): Promise<Result<{ id: string }>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const r = resultFrom(rawBody);
  if ("error" in r) return r.error!;
  const id = await createPerson({
    userId: m.user.id,
    saju: r.result.saju,
    nickname: r.result.nickname,
    hanjaName: r.result.hanjaName,
    focus: r.result.focus,
  });
  return { status: 200, body: { id } };
}

export async function handleGetPerson(token: string | undefined, personId: string): Promise<Result<unknown>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const person = await getPersonSummary(m.user.id, personId);
  if (!person) return err(404, "NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  const balance = await getBalance(m.user.id);
  return { status: 200, body: { person, balance } };
}

/** 운세 보기(990) · 깊게 보기(4,900) · 몰아보기(9,900) · 전부 보기(29,500) - 열람권만 사고, 풀이는 열 때 쓴다 */
export async function handlePurchase(token: string | undefined, personId: string, rawBody: unknown): Promise<Result<{ unlocked: string[] }>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  const body = typeof rawBody === "object" && rawBody !== null ? (rawBody as Record<string, unknown>) : {};
  const mode = body.mode;
  if (mode !== "basic" && mode !== "deep" && mode !== "bundle3" && mode !== "bundle12") return err(400, "INVALID_INPUT", "상품 종류가 올바르지 않아요.");
  try {
    const unlocked = await purchaseTopics({ userId: m.user.id, personId, mode: mode as PurchaseMode, topics: body.topics });
    return { status: 200, body: { unlocked } };
  } catch (e) {
    if (e instanceof InsufficientYeopjeonError) return SHORT();
    if (e instanceof PurchaseError) return err(e.code === "NOT_FOUND" ? 404 : 400, e.code, e.message);
    throw e;
  }
}

/**
 * 운세 한 가지 보기. 깊게 보기가 열려 있으면 깊은 풀이(level "deep"), 아니면 운세 보기(990)로 산 풀이(level "basic").
 * 둘 다 아니면 status "locked" (화면이 구매 창을 보여 준다). generate=true 이면 아직 안 쓴 풀이를 지금 쓴다.
 */
export async function handleTopic(token: string | undefined, personId: string, topic: string, generate: boolean): Promise<Result<unknown>> {
  const m = await member(token);
  if ("error" in m) return m.error!;
  if (!isAnyTopicKey(topic)) return err(404, "NOT_FOUND", "없는 운세예요.");
  const person = await getPersonRow(m.user.id, personId);
  if (!person) return err(404, "NOT_FOUND", "풀이 대상을 찾을 수 없어요.");
  const year = getCurrentKstYear();

  if (await isUnlocked(personId, topic)) {
    const stored = await getTopicReading(personId, topic);
    if (stored) return { status: 200, body: { status: "ready", level: "deep", content: stored, header: person.header } };
    if (!generate) return { status: 200, body: { status: "pending", level: "deep", header: person.header } };
    try {
      const content = await generateDeep(person.saju, person.nickname, topic, year);
      if (topic === "year" || topic === "monthly") content.title = `${content.title} (${year}년)`;
      const saved = await saveTopicReading(personId, topic, content);
      return { status: 200, body: { status: "ready", level: "deep", content: saved, header: person.header } };
    } catch (e) {
      notifyError(`깊은 풀이 생성 실패 (${topic})`, e);
      return err(502, "READING_FAILED", "풀이를 쓰는 중 문제가 생겼어요. 이미 연 운세라 다시 눌러도 엽전은 빠지지 않아요.");
    }
  }

  if (isTopicKey(topic)) {
    const basic = await getTopicBasic(personId, topic);
    if (basic.owned) {
      if (basic.content) return { status: 200, body: { status: "ready", level: "basic", content: basic.content, header: person.header } };
      if (!generate) return { status: 200, body: { status: "pending", level: "basic", header: person.header } };
      try {
        const content = await generateBasic(person.saju, person.nickname, topic, year);
        if (topic === "year") content.title = `${content.title} (${year}년)`;
        const saved = await saveTopicBasic(personId, topic, content);
        return { status: 200, body: { status: "ready", level: "basic", content: saved, header: person.header } };
      } catch (e) {
        notifyError(`운세 보기 풀이 생성 실패 (${topic})`, e);
        return err(502, "READING_FAILED", "풀이를 쓰는 중 문제가 생겼어요. 이미 산 운세라 다시 눌러도 엽전은 빠지지 않아요.");
      }
    }
  }

  // 아직 안 산 운세 - 오류가 아니라 "구매 창을 보여 줄 상태"라서 200으로 돌려준다
  return { status: 200, body: { status: "locked", header: person.header } };
}
