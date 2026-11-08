import { calculateSaju, getCurrentKstYear } from "saju-engine";
import { isRateLimited } from "@/server/rateLimit";
import { TENANT } from "@/tenants";
import { PRICE } from "@/lib/yeopjeon";
import { numerologyResult } from "@/lib/fun/numerology";
import { zodiacResult } from "@/lib/fun/zodiac";
import { bloodResult } from "@/lib/fun/blood";
import { isMbtiType, mbtiResult } from "@/lib/fun/mbti";
import { flowerResult } from "@/lib/fun/flower";
import { birthstoneResult } from "@/lib/fun/birthstone";
import { tarotResult, isTarotQuestion, spreadLine, TAROT_CARDS, TAROT_QUESTIONS } from "@/lib/fun/tarot";
import { buildOverlay, type OverlayView } from "@/lib/fun/overlay";
import { isBloodType, isFunKind, type FunKind, type FunResult } from "@/lib/fun/types";

/**
 * 무료 묶음 (2026-10-26) - 수비학·별자리·혈액형·탄생화(+ 2026-10-31 탄생석·타로) + 사주 겹쳐 보기. AI 없음, 저장 없음.
 *
 *   요청: { kind, calendarType: "solar"|"lunar", date: "YYYY-MM-DD", isLeapMonth?, time?: "HH:mm", blood?, card?, question? }
 *   타로(kind "tarot")는 카드를 고객 기기에서 이미 골랐다 - card(0~21)와 question 을 받아 그 카드와 사주를 겹쳐 볼 뿐, 서버가 카드를 고르지 않는다.
 *   응답: { kind, solarDate, result: FunResult, overlay: OverlayView }
 *
 * 음력 생일도 받는다 - 별자리·탄생화·탄생석·인생 수는 양력 날짜로 보므로, 엔진이 계산한 양력 생일(solarBirthDate)로 바꿔 쓴다.
 * 성별: 일간과 오행 균형(부족한 기운)은 성별과 상관이 없다 (성별은 대운 방향에만 쓰임). 그래서 묻지 않고 엔진에는 정해진 값을 넘긴다.
 * 입력한 생년월일은 저장하지 않는다 (응답만 돌려준다).
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface FunResponse {
  kind: FunKind;
  solarDate: string;
  result: FunResult;
  overlay: OverlayView;
  /** 2026-11-01 겹쳐 보기가 잠겨 있으면 true - price 엽전으로 연다 */
  locked?: boolean;
  price?: number;
  /** 2026-11-09 타로 세 장 카드(과거·현재·미래) + 사주 겹쳐 보기 - 연 뒤에만 채운다 */
  three?: TarotThree[] | null;
  /** 세 장 상품 가격 (파는 고객사의 타로에만) */
  threePrice?: number;
}

type Out = { status: number; body: FunResponse | { error: { code: string; message: string } } };

function bad(message: string, code = "INVALID_INPUT"): Out {
  return { status: 400, body: { error: { code, message } } };
}

function validSolar(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  if (y < 1900 || y > getCurrentKstYear() || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * 무료 결과 + 겹쳐 보기 (2026-11-01: 유료 겹쳐 보기 관은 풀이 문장을 빼고 보낸다 - 화면 코드를 열어 봐도 안 보이게).
 * 잠긴 응답에는 locked: true 와 price 가 붙는다. 여는 것은 funUnlock.ts (엽전 차감 후 같은 계산으로 전체를 돌려준다).
 */
export function handleFun(raw: unknown, clientKey: string): Out {
  if (isRateLimited(`fun:${clientKey}`)) return { status: 429, body: { error: { code: "RATE_LIMITED", message: "잠시 후 다시 시도해 주세요." } } };
  // 무료 보기에서는 세 장 풀이를 만들지 않는다 (세 장은 유료 열기에서만)
  const out = computeFun(stripThree(raw));
  if (out.status !== 200 || !("overlay" in out.body) || !isOverlayPaid(out.body.kind)) return out;
  const b = out.body as FunResponse;
  return {
    status: 200,
    body: { ...b, overlay: lockOverlay(b.overlay), locked: true, price: OVERLAY_PRICE, ...(b.kind === "tarot" && TAROT3_PRICE > 0 ? { threePrice: TAROT3_PRICE } : {}) },
  };
}

/** 2026-11-09: 타로 세 장 상품 가격 (고객사 설정 prices.TAROT3, 없으면 0 = 팔지 않음) */
export const TAROT3_PRICE = PRICE.TAROT3 ?? 0;

/** 세 장 요청인가: spread "three" + 서로 다른 카드 세 장, 가운데(현재)가 card */
export function isThreeRequest(raw: unknown): boolean {
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return b.kind === "tarot" && b.spread === "three";
}
function stripThree(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const { spread: _s, cards: _c, ...rest } = raw as Record<string, unknown>;
  return rest;
}

/** 세 장 카드 한 자리 */
export interface TarotThree {
  position: string;
  no: number;
  head: string;
  body: string;
  relation?: { head: string; body: string };
}

/** 이 재미관의 겹쳐 보기가 유료인가 (고객사 설정 features.paidOverlay) */
export function isOverlayPaid(kind: FunKind): boolean {
  return (TENANT.features.paidOverlay ?? []).includes(kind) && OVERLAY_PRICE > 0;
}

export const OVERLAY_PRICE = PRICE.OVERLAY ?? 0;

/** 잠긴 겹쳐 보기: 일간 이름·그림과 게이지(남은 작은 빈자리 기운)만 남기고 풀이 문장은 비운다 */
export function lockOverlay(o: OverlayView): OverlayView {
  return { ...o, dayCore: "", relation: undefined, needLine: "", fillFlowers: undefined, fillStones: undefined };
}

/** 계산만 (요청 횟수 제한·잠금 없음) - 무료 보기와 유료 열기가 같이 쓴다 */
export function computeFun(raw: unknown): Out {
  const b = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  if (!isFunKind(b.kind)) return bad("무엇을 볼지 골라 주세요.");
  const kind = b.kind;
  const calendarType = b.calendarType === "lunar" ? "lunar" : "solar";
  const date = typeof b.date === "string" ? b.date : "";
  if (!DATE_RE.test(date)) return bad("생년월일을 확인해 주세요.");
  if (calendarType === "solar" ? !validSolar(date) : !(Number(date.slice(8, 10)) <= 30 && Number(date.slice(0, 4)) >= 1900)) return bad("생년월일을 확인해 주세요.");
  const time = typeof b.time === "string" && TIME_RE.test(b.time) ? b.time : undefined;
  if (kind === "blood" && !isBloodType(b.blood)) return bad("혈액형을 골라 주세요.");
  if (kind === "mbti" && !isMbtiType(b.mbti)) return bad("MBTI 유형을 골라 주세요.");
  const card = Number(b.card);
  if (kind === "tarot" && (!Number.isInteger(card) || card < 0 || card >= TAROT_CARDS.length || !isTarotQuestion(b.question)))
    return bad("카드를 먼저 골라 주세요.");
  // 2026-11-09 세 장: 과거·현재·미래 서로 다른 카드, 가운데가 오늘 뽑은 카드
  const threeCards = kind === "tarot" && b.spread === "three" ? (Array.isArray(b.cards) ? b.cards.map(Number) : []) : null;
  if (
    threeCards &&
    (threeCards.length !== 3 || threeCards.some((n) => !Number.isInteger(n) || n < 0 || n >= TAROT_CARDS.length) || new Set(threeCards).size !== 3 || threeCards[1] !== card)
  )
    return bad("세 장 카드를 다시 골라 주세요.");

  let saju;
  try {
    saju = calculateSaju(
      { calendarType, date, time, gender: "male", isLeapMonth: calendarType === "lunar" ? b.isLeapMonth === true : undefined },
      getCurrentKstYear()
    );
  } catch {
    return bad("없는 날짜예요. 생년월일(양력·음력·윤달)을 다시 확인해 주세요.", "SAJU_CALCULATION_FAILED");
  }

  // 2026-10-31: 엔진이 서머타임 등 시각 보정을 하면 resolvedSolarDateTime 날짜가 하루 바뀔 수 있어, 달력상 양력 생일(solarBirthDate)을 먼저 쓴다
  const meta = saju.calculationMeta;
  const solarDate = calendarType === "solar" ? date : meta.solarBirthDate ?? meta.resolvedSolarDateTime.slice(0, 10);
  const result =
    kind === "numerology"
      ? numerologyResult(solarDate)
      : kind === "zodiac"
        ? zodiacResult(solarDate)
        : kind === "flower"
          ? flowerResult(solarDate)
          : kind === "birthstone"
            ? birthstoneResult(solarDate)
            : kind === "tarot"
              ? tarotResult(card, b.question as Parameters<typeof tarotResult>[1])
              : kind === "mbti"
                ? mbtiResult(b.mbti as Parameters<typeof mbtiResult>[0])
                : bloodResult(b.blood as Parameters<typeof bloodResult>[0]);
  const topic = kind === "tarot" ? TAROT_QUESTIONS.find((q) => q.key === b.question)?.topic : undefined;

  // 2026-11-09 세 장 카드 + 사주 겹쳐 보기: 자리마다 카드 풀이 한 줄과 그 카드의 기운 × 나의 일간 (엔진 값, AI 없음)
  const three: TarotThree[] | null = threeCards
    ? threeCards.map((no, i) => {
        const line = spreadLine(no, i as 0 | 1 | 2, b.question as Parameters<typeof spreadLine>[2]);
        const rel = buildOverlay(kind, saju, tarotResult(no, b.question as Parameters<typeof tarotResult>[1]), topic).relation;
        return { position: ["과거", "현재", "미래"][i], no, head: line.head, body: line.body, ...(rel ? { relation: { head: rel.head, body: rel.body } } : {}) };
      })
    : null;

  return { status: 200, body: { kind, solarDate, result, overlay: buildOverlay(kind, saju, result, topic), ...(three ? { three } : {}) } };
}
