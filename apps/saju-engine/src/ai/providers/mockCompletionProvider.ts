import type { CompletionProvider } from "../CompletionProvider";

/**
 * 네트워크 호출 없이 AIInterpretationEngine을 테스트하기 위한 CompletionProvider.
 * 실제 서비스 코드에서는 사용하지 않는다 - tests/ai/*.test.ts 전용.
 *
 * responses에 순서대로 응답을 등록해두면 complete() 호출마다 하나씩 꺼내 쓴다.
 * - 문자열을 등록하면 그 텍스트를 그대로 반환한다.
 * - Error 인스턴스를 등록하면 그 에러를 throw한다 (재시도/오류 처리 테스트용).
 * responses를 모두 소진하면 마지막 항목을 계속 반환(또는 throw)한다.
 */
export class MockCompletionProvider implements CompletionProvider {
  readonly providerName = "mock";
  readonly modelName = "mock-model";

  private callCount = 0;

  constructor(private readonly responses: Array<string | Error>) {
    if (responses.length === 0) {
      throw new Error("MockCompletionProvider에는 최소 1개의 응답이 필요합니다.");
    }
  }

  get calls(): number {
    return this.callCount;
  }

  async complete(_system: string, _user: string): Promise<string> {
    const index = Math.min(this.callCount, this.responses.length - 1);
    const response = this.responses[index];
    this.callCount += 1;

    if (response instanceof Error) {
      throw response;
    }
    return response;
  }
}
