import { calculateFortune, interpretFortune } from "saju-engine";
import { getResult } from "./resultStore";
import { validateFortuneInput } from "./validateFortuneInput";
import { isRateLimited } from "./rateLimit";
import type { FortuneRequestBody, FortuneResultResponse, ApiErrorResponse } from "./types";
import type { HandlerResult } from "./requestHandlers";

/**
 * 지시서 6조/11조: 기존 /api/saju/analyze와 완전히 분리된 새 엔드포인트.
 * 기존 analyzeSaju/requestHandlers 코드는 전혀 수정하지 않는다.
 *
 * 흐름: resultId로 이미 저장된 AnalyzeResultResponse(saju 포함)를 조회 →
 *       Saju Engine을 다시 호출하지 않고 그 saju를 그대로 Fortune Engine에 전달.
 *
 * 배포 전 최종 수정 지시서 5조: 새 RateLimiter를 만들지 않고, /api/saju/analyze와
 * 동일한 기존 rateLimit.ts(isRateLimited, 10회/1분, clientKey 기준)를 그대로 재사용한다.
 */
export function handleFortuneRequest(
  rawBody: unknown,
  clientKey: string
): HandlerResult<FortuneResultResponse | ApiErrorResponse> {
  if (isRateLimited(clientKey)) {
    return {
      status: 429,
      body: {
        error: {
          code: "RATE_LIMITED",
          message: "요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.",
        },
      },
    };
  }

  if (typeof rawBody !== "object" || rawBody === null) {
    return {
      status: 400,
      body: { error: { code: "INVALID_INPUT", message: "요청 본문이 올바르지 않습니다." } },
    };
  }

  const validation = validateFortuneInput(rawBody as FortuneRequestBody);
  if (!validation.ok) {
    return {
      status: 400,
      body: { error: { code: "INVALID_INPUT", message: "입력값을 다시 확인해주세요.", issues: validation.issues } },
    };
  }

  const { resultId, targetDate } = validation.value;
  const stored = getResult(resultId);
  if (!stored) {
    return {
      status: 404,
      body: {
        error: {
          code: "RESULT_NOT_FOUND",
          message: "사주 결과를 찾을 수 없습니다. 먼저 사주 분석을 완료해주세요.",
        },
      },
    };
  }

  try {
    const fortune = calculateFortune(stored.saju, targetDate);
    const result = interpretFortune(fortune);
    return { status: 200, body: { nickname: stored.nickname, fortune, result } };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[fortune] Fortune Engine 계산 실패:", err);
    return {
      status: 422,
      body: {
        error: {
          code: "FORTUNE_CALCULATION_FAILED",
          message: "오늘의 운세 계산에 실패했습니다. 입력값을 다시 확인해주세요.",
        },
      },
    };
  }
}
