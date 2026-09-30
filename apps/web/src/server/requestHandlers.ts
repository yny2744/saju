import { validateAnalyzeInput } from "./validateAnalyzeInput";
import { analyzeSaju, AiInterpretationError, SajuCalculationError } from "./analyzeSaju";
import { saveResult, getResult } from "./resultStore";
import { isRateLimited } from "./rateLimit";
import type {
  AnalyzeAcceptedResponse,
  AnalyzeRequestBody,
  AnalyzeResultResponse,
  ApiErrorResponse,
} from "./types";

export interface HandlerResult<T> {
  status: number;
  body: T;
}

/**
 * 지시서 6조: "API는 연결과 요청/응답 관리 역할만 담당한다"를 실제로 지키기 위해,
 * Next.js의 Request/Response 타입에 의존하지 않는 순수 함수로 만든다.
 *
 * 장점:
 *   - Next.js 프레임워크 없이도(Jest 유닛 테스트) 그대로 검증할 수 있다.
 *   - route.ts는 이 함수를 호출해 HTTP 상태코드/바디를 그대로 얹기만 하면 된다.
 */
export async function handleAnalyzeRequest(
  rawBody: unknown,
  clientKey: string
): Promise<HandlerResult<AnalyzeAcceptedResponse | ApiErrorResponse>> {
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

  const validation = validateAnalyzeInput(rawBody as AnalyzeRequestBody);
  if (!validation.ok) {
    return {
      status: 400,
      body: {
        error: {
          code: "INVALID_INPUT",
          message: "입력값을 다시 확인해주세요.",
          issues: validation.issues,
        },
      },
    };
  }

  try {
    const result = await analyzeSaju(validation.value);
    const { id, expiresAt } = saveResult(result);
    return { status: 200, body: { id, expiresAt } };
  } catch (err) {
    if (err instanceof SajuCalculationError) {
      return {
        status: 422,
        body: { error: { code: "SAJU_CALCULATION_FAILED", message: err.message } },
      };
    }
    if (err instanceof AiInterpretationError) {
      return {
        status: 502,
        body: { error: { code: "AI_INTERPRETATION_FAILED", message: err.message } },
      };
    }
    // 지시서 25조: 서버 오류의 상세 정보(스택 트레이스 등)를 사용자에게 노출하지 않는다.
    // eslint-disable-next-line no-console
    console.error("[phase4] 예상하지 못한 오류:", err);
    return {
      status: 500,
      body: { error: { code: "INTERNAL_ERROR", message: "일시적인 오류가 발생했습니다. 다시 시도해주세요." } },
    };
  }
}

export function handleGetResult(id: string): HandlerResult<AnalyzeResultResponse | ApiErrorResponse> {
  if (!id || typeof id !== "string") {
    return {
      status: 400,
      body: { error: { code: "INVALID_INPUT", message: "잘못된 요청입니다." } },
    };
  }

  const result = getResult(id);
  if (!result) {
    return {
      status: 404,
      body: {
        error: {
          code: "RESULT_NOT_FOUND",
          message: "결과를 찾을 수 없습니다. 유효 시간이 지났거나 잘못된 접근입니다.",
        },
      },
    };
  }

  return { status: 200, body: result };
}
