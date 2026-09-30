import { AnthropicCompletionProvider, GeminiCompletionProvider } from "saju-engine";
import type { CompletionProvider } from "saju-engine";

/**
 * Phase 9 지시서 3조: "관상 전용 Provider 선택 로직은 별도 파일로 구현한다.
 * 기존 aiEngineProvider.ts는 수정하지 않는다."
 *
 * aiEngineProvider.ts의 우선순위 로직(Anthropic → Gemini → DevFallback)과
 * 정책상 동일하게 유지한다 - "기존 Gemini 설정과 API Key를 재사용하며 별도의
 * API Key 설정을 요구하지 않는다"(지시서 3조)를 만족해야 하므로, 같은
 * 환경변수(ANTHROPIC_API_KEY/GEMINI_API_KEY)를 그대로 읽는다. 다만 파일 자체는
 * 완전히 독립적이라 이 파일을 수정해도 사주 AI 해석 경로에는 영향이 없다.
 *
 * saju-engine의 AIInterpretationEngine(=SajuJson/InterpretationResult 전용
 * 스키마 검증까지 포함하는 상위 오케스트레이터)은 여기서 쓰지 않는다. 관상
 * 데이터는 SajuJson이 아니므로 그 검증 파이프라인과 맞지 않는다. 대신 그보다
 * 한 단계 아래에 있는, 완전히 벤더 중립적인 CompletionProvider(system/user
 * 문자열만 주고받는 인터페이스)만 재사용한다 - 이것이 saju-engine의 실제
 * "Gemini 연동 구조" 중 재사용 가능한 부분이다.
 */
export function getFaceCompletionProvider(): CompletionProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    return new AnthropicCompletionProvider();
  }

  if (process.env.GEMINI_API_KEY) {
    return new GeminiCompletionProvider();
  }

  if (process.env.NODE_ENV === "production") {
    if (process.env.ALLOW_MOCK_IN_PRODUCTION === "true") {
      // eslint-disable-next-line no-console
      console.warn(
        "[phase9] ALLOW_MOCK_IN_PRODUCTION=true - Production 환경에서 관상 DevFallbackProvider를 사용합니다. 로컬 흐름 테스트 전용입니다."
      );
      return createFaceDevFallbackProvider();
    }
    throw new Error(
      "ANTHROPIC_API_KEY/GEMINI_API_KEY가 모두 설정되지 않았습니다. 운영 환경에서는 mock provider를 사용할 수 없습니다."
    );
  }

  // eslint-disable-next-line no-console
  console.warn(
    "[phase9] ANTHROPIC_API_KEY/GEMINI_API_KEY 미설정 - 로컬 개발용 관상 DevFallbackProvider로 대체합니다. 실제 LLM 응답이 아닙니다."
  );
  return createFaceDevFallbackProvider();
}

const DEV_NOTE = "(개발 환경 - 실제 LLM 응답 아님)";

/**
 * 실제 LLM을 호출하지 않는 관상 전용 개발용 CompletionProvider.
 * faceAiInterpreter.ts가 만든 user 프롬프트 텍스트에서 버킷 라벨만 다시 읽어
 * 정해진 스키마 모양으로 되돌려줄 뿐, 새로운 내용을 생성하지 않는다.
 *
 * export하는 이유: aiEngineProvider.ts의 DevFallbackProvider와 동일하게,
 * "검증 파이프라인을 우회하지 않는지"를 테스트에서 직접 확인할 수 있어야 하기 때문.
 */
export function createFaceDevFallbackProvider(): CompletionProvider {
  return {
    providerName: "face-dev-fallback",
    modelName: "dev-fallback-no-llm",
    async complete(_system: string, user: string): Promise<string> {
      const hasPreference = user.includes("[사용자가 직접 입력한 선호]");

      const body = {
        selfAnalysis: {
          faceShape: `얼굴형 특징 참고용 설명 ${DEV_NOTE}`,
          forehead: `이마 특징 참고용 설명 ${DEV_NOTE}`,
          eyes: `눈매 특징 참고용 설명 ${DEV_NOTE}`,
          nose: `코 특징 참고용 설명 ${DEV_NOTE}`,
          mouth: `입매 특징 참고용 설명 ${DEV_NOTE}`,
          jaw: `턱선 특징 참고용 설명 ${DEV_NOTE}`,
          overallSummary: `전통 관상학 종합 해석 참고용 설명 ${DEV_NOTE}`,
        },
        relationshipInsight: {
          traditionalLoveTendency: `연애·관계 전통적 해석 참고용 설명 ${DEV_NOTE}`,
          idealPartnerTraits: `어울리는 인연의 관상적 특징 참고용 설명 ${DEV_NOTE}`,
          partnerFeatureNotes: `상대방 특징에 대한 전통적 해석(일반론) 참고용 설명 ${DEV_NOTE}`,
          harmonyPoints: `관계에서 조화롭게 살펴볼 특징과 유의점 참고용 설명 ${DEV_NOTE}`,
          userPreferenceNote: hasPreference ? `사용자 선호 반영 코멘트 참고용 설명 ${DEV_NOTE}` : null,
        },
        disclaimer:
          "이 결과는 개발 환경 DevFallbackProvider가 생성한 참고용 텍스트이며, 실제 AI(LLM) 해석이 아닙니다.",
      };

      return JSON.stringify(body);
    },
  };
}
