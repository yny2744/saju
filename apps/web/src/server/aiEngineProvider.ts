import {
  AIInterpretationEngine,
  createAnthropicInterpretationEngine,
  createGeminiInterpretationEngine,
} from "saju-engine";
import type { CompletionProvider } from "saju-engine";

/**
 * 지시서 16조/17조: 웹/API 계층은 특정 LLM API를 직접 호출하지 않고,
 * Phase 3에서 이미 만들어진 CompletionProvider 추상화 + AIInterpretationEngine을
 * 그대로 사용한다. API Key는 서버 환경변수(ANTHROPIC_API_KEY/GEMINI_API_KEY)로만
 * 관리하고 프론트엔드에는 절대 전달하지 않는다.
 *
 * Provider 우선순위: ANTHROPIC_API_KEY가 있으면 Anthropic을 쓴다(기존 동작 그대로
 * 유지 - 이미 배포된 환경이 있다면 그 동작이 바뀌면 안 되므로). ANTHROPIC_API_KEY가
 * 없고 GEMINI_API_KEY가 있으면 Gemini를 쓴다 (Gemini 무료 티어로 AI 해석 품질을
 * 비용 없이 테스트하기 위한 용도 - CompletionProvider 인터페이스만 구현하면
 * AIInterpretationEngine의 검증 파이프라인은 그대로 적용된다).
 *
 * ⚠️ 로컬/테스트 환경 예외 (지시서 27조 근거):
 *   두 Key가 모두 없으면 실제 LLM을 호출할 수 없다. 이 경우에도 사용자 흐름 자체
 *   (입력 → API → 계산 → 해석 → 결과 화면)는 끝까지 동작해야 하므로, 두 Key가
 *   모두 없을 때만 아래 DevFallbackProvider로 대체한다.
 *
 *   DevFallbackProvider는 실제 LLM이 아니다. buildSajuPrompt()가 생성하는
 *   고정된 텍스트 포맷(예: "일간(day master): 갑")에서 Saju Engine이 이미
 *   계산해둔 값을 그대로 다시 읽어와 InterpretationResult 스키마에 맞는
 *   응답을 구성할 뿐, 어떤 것도 새로 계산하거나 추정하지 않는다. 이렇게 하면
 *   checkDataConsistency 검증도 정상적으로 통과한다.
 *
 *   실제 서비스 배포 환경에는 반드시 ANTHROPIC_API_KEY 또는 GEMINI_API_KEY를
 *   설정해서 진짜 LLM이 해석을 생성하도록 해야 한다 - 최종 보고서에 이 예외를
 *   명확히 남긴다.
 */
export function getInterpretationEngine(): AIInterpretationEngine {
  if (process.env.ANTHROPIC_API_KEY) {
    return createAnthropicInterpretationEngine();
  }

  if (process.env.GEMINI_API_KEY) {
    // eslint-disable-next-line no-console
    console.warn(
      "[phase7] GEMINI_API_KEY로 Gemini Provider를 사용합니다. 무료 티어 사용 시 " +
        "입력 데이터가 Google 제품 개선에 활용될 수 있다는 점을 감안하세요."
    );
    return createGeminiInterpretationEngine();
  }

  if (process.env.NODE_ENV === "production") {
    // 배포 전 최종 수정 지시서 2조: Production 빌드에서 AI API 없이 사용자 흐름을
    // 테스트할 수 있도록, 정확히 문자열 "true"인 ALLOW_MOCK_IN_PRODUCTION이
    // 명시적으로 설정된 경우에만 DevFallbackProvider를 허용한다. "false"/"1"/"yes"
    // 등 다른 값은 전부 거부하며(엄격한 문자열 비교), 이 변수가 없으면 기존과
    // 동일하게 즉시 실패한다 - 이 예외 경로가 운영 안전장치를 영구적으로
    // 약화시키지 않는다.
    if (process.env.ALLOW_MOCK_IN_PRODUCTION === "true") {
      // eslint-disable-next-line no-console
      console.warn(
        "[phase7] ALLOW_MOCK_IN_PRODUCTION=true - Production 환경에서 DevFallbackProvider를 사용합니다. " +
          "이 설정은 로컬 사용자 흐름 테스트 전용이며, 실제 운영 배포 환경에는 절대 설정하면 안 됩니다."
      );
      return new AIInterpretationEngine(createDevFallbackProvider());
    }

    // 실제 배포 환경에서 Key 없이 조용히 mock으로 넘어가면 "가짜 AI 해석"이
    // 서비스로 나갈 수 있으므로, production에서는 명시적으로 실패시킨다.
    throw new Error(
      "ANTHROPIC_API_KEY/GEMINI_API_KEY가 모두 설정되지 않았습니다. 운영 환경에서는 mock provider를 사용할 수 없습니다."
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    "[phase4] ANTHROPIC_API_KEY/GEMINI_API_KEY 미설정 - 로컬 개발용 DevFallbackProvider로 대체합니다. 실제 LLM 응답이 아닙니다."
  );
  return new AIInterpretationEngine(createDevFallbackProvider());
}

function extractField(user: string, label: string): string | null {
  const line = user.split("\n").find((l) => l.trim().startsWith(label));
  if (!line) return null;
  return line.slice(line.indexOf(":") + 1).trim();
}

const DEV_NOTE = "(개발 환경 - 실제 LLM 응답 아님)";

/**
 * 상품별 analysis 필드 shape을 만든다.
 *
 * Phase 5 수정 사유(지시서 25조 최소 수정 원칙에 따라 기록):
 * Phase 5에서 BASIC/PREMIUM 결제 상품을 추가하면서, 결제 완료 후 Saju Engine을
 * LOVE_3900/MONEY_3900/CAREER_3900/YEARLY_3900/PREMIUM_9900 등 FREE_BASIC이
 * 아닌 productType으로도 호출하게 되었다. 각 productType은
 * validateInterpretationResult에서 서로 다른 analysis 스키마를 요구하므로
 * (src/prompts/productTemplates.ts 참고), DevFallbackProvider도 요청받은
 * productType에 맞는 analysis shape을 돌려줘야 실제 검증을 통과한다.
 * 어떤 계산도 새로 하지 않고 여전히 "고정 문구 + 이미 계산된 값(dayMaster/
 * dominant/lacking)"만 채운다 - AI 로직/검증 로직 자체는 건드리지 않는다.
 *
 * productType은 CompletionProvider.complete(system, user) 시그니처에 직접
 * 전달되지 않으므로(saju-engine의 기존 인터페이스를 변경하지 않기 위해),
 * user 프롬프트 안에 각 상품 템플릿만의 고유한 JSON 키 이름이 등장한다는 점을
 * 이용해 어떤 상품인지 추론한다 (productTemplates.ts의 instruction 문자열 기준).
 */
function buildAnalysisForPrompt(user: string): Record<string, unknown> {
  if (user.includes('"loveStyle"')) {
    return {
      loveStyle: `연애 스타일에 대한 참고용 설명 ${DEV_NOTE}`,
      idealPartnerType: `이상적인 상대 유형 참고용 설명 ${DEV_NOTE}`,
      currentFlow: `현재 연애운 흐름 참고용 설명 ${DEV_NOTE}`,
      challenges: `연애에서 주의할 점 참고용 설명 ${DEV_NOTE}`,
      actionGuide: `연애운 실천 가이드 참고용 설명 ${DEV_NOTE}`,
    };
  }
  if (user.includes('"wealthStructure"')) {
    return {
      wealthStructure: `재성 구조 참고용 설명 ${DEV_NOTE}`,
      incomeStyle: `수입 스타일 참고용 설명 ${DEV_NOTE}`,
      currentFlow: `현재 재물운 흐름 참고용 설명 ${DEV_NOTE}`,
      riskAreas: `재물 관리 주의점 참고용 설명 ${DEV_NOTE}`,
      actionGuide: `재물운 실천 가이드 참고용 설명 ${DEV_NOTE}`,
    };
  }
  if (user.includes('"careerAptitude"')) {
    return {
      careerAptitude: `커리어 적성 참고용 설명 ${DEV_NOTE}`,
      suitableFields: `어울리는 분야 참고용 설명 ${DEV_NOTE}`,
      currentFlow: `현재 커리어운 흐름 참고용 설명 ${DEV_NOTE}`,
      challenges: `커리어 주의점 참고용 설명 ${DEV_NOTE}`,
      actionGuide: `커리어운 실천 가이드 참고용 설명 ${DEV_NOTE}`,
    };
  }
  if (user.includes('"yearOverview"')) {
    return {
      yearOverview: `올해 세운 종합 해석 참고용 설명 ${DEV_NOTE}`,
      quarterlyFlow: { q1: "1~3월", q2: "4~6월", q3: "7~9월", q4: "10~12월" },
      keyMonths: `중요 시기 참고용 설명 ${DEV_NOTE}`,
      actionGuide: `연간 실천 가이드 참고용 설명 ${DEV_NOTE}`,
    };
  }
  if (user.includes('"sajuOverview"')) {
    return {
      sajuOverview: `사주 원국 종합 해석 참고용 설명 ${DEV_NOTE}`,
      temperament: `성향 참고용 설명 ${DEV_NOTE}`,
      wealth: `재물 참고용 설명 ${DEV_NOTE}`,
      career: `직업 참고용 설명 ${DEV_NOTE}`,
      love: `연애 참고용 설명 ${DEV_NOTE}`,
      relationship: `인간관계 참고용 설명 ${DEV_NOTE}`,
      yearlyFlow: `올해 흐름 참고용 설명 ${DEV_NOTE}`,
      monthlyFlow: `월별 흐름 참고용 설명 ${DEV_NOTE}`,
      importantPeriods: `중요 시기 참고용 설명 ${DEV_NOTE}`,
      actionGuide: `종합 실천 가이드 참고용 설명 ${DEV_NOTE}`,
    };
  }
  // 기본값: FREE_BASIC 모양
  return {
    temperament: `성향에 대한 참고용 설명 ${DEV_NOTE}`,
    career: `직업운에 대한 참고용 설명 ${DEV_NOTE}`,
    wealth: `재물운에 대한 참고용 설명 ${DEV_NOTE}`,
    love: `연애운에 대한 참고용 설명 ${DEV_NOTE}`,
    relationship: `대인관계에 대한 참고용 설명 ${DEV_NOTE}`,
    yearlyFlow: `올해 흐름에 대한 참고용 설명 ${DEV_NOTE}`,
    caution: `주의점에 대한 참고용 설명 ${DEV_NOTE}`,
    opportunity: `기회 요인에 대한 참고용 설명 ${DEV_NOTE}`,
  };
}

/**
 * 실제 LLM을 호출하지 않는 개발용 CompletionProvider.
 * buildSajuPrompt()가 만든 user 프롬프트 텍스트에서 이미 계산되어 있는 값만
 * 다시 읽어 그대로 되돌려준다 (새로운 계산 없음).
 *
 * export하는 이유: Phase4 최종 수정 지시서 2조/14조 - "DevFallbackProvider가
 * validateInterpretationResult/checkDataConsistency 검증을 우회하지 않는지"를
 * 테스트에서 직접 검증할 수 있어야 하기 때문이다 (tests/aiEngineProvider.test.ts).
 */
export function createDevFallbackProvider(): CompletionProvider {
  return {
    providerName: "dev-fallback",
    modelName: "dev-fallback-no-llm",
    async complete(_system: string, user: string): Promise<string> {
      const dayMaster = extractField(user, "일간(day master)")?.split(" ")[0] ?? "";
      const dominant = extractField(user, "우세 오행(dominant)") ?? "";
      const lackingRaw = extractField(user, "부족 오행(lacking)") ?? "없음";
      const lacking = lackingRaw === "없음" ? null : lackingRaw.split(",")[0].trim();

      const body = {
        elements: {
          wood: `오행 분포를 바탕으로 한 참고용 설명입니다 ${DEV_NOTE}.`,
          fire: `오행 분포를 바탕으로 한 참고용 설명입니다 ${DEV_NOTE}.`,
          earth: `오행 분포를 바탕으로 한 참고용 설명입니다 ${DEV_NOTE}.`,
          metal: `오행 분포를 바탕으로 한 참고용 설명입니다 ${DEV_NOTE}.`,
          water: `오행 분포를 바탕으로 한 참고용 설명입니다 ${DEV_NOTE}.`,
          dominant,
          lacking,
        },
        tenGods: {
          dayMaster,
          summary: `십신 구성에 대한 참고용 요약입니다 ${DEV_NOTE}.`,
        },
        analysis: buildAnalysisForPrompt(user),
        disclaimer: `이 결과는 개발 환경 DevFallbackProvider가 생성한 참고용 텍스트이며, 실제 AI(LLM) 해석이 아닙니다.`,
      };

      return JSON.stringify(body);
    },
  };
}
