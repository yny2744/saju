import type { CompletionProvider } from "../CompletionProvider";
import { AIProviderError } from "../errors";

/**
 * Anthropic Messages API를 호출하는 CompletionProvider 구현체.
 *
 * 명세서 9조: "API Key 등 민감한 정보는 소스코드에 직접 작성하지 않는다.
 * 환경변수 기반으로 처리한다." 를 그대로 따른다 - API Key와 모델명은
 * 생성자 인자로 주입하거나, 주입하지 않으면 환경변수에서 읽는다.
 * 소스코드 어디에도 실제 키 값을 하드코딩하지 않는다.
 */
export interface AnthropicProviderConfig {
  /** 생략 시 process.env.ANTHROPIC_API_KEY 사용 */
  apiKey?: string;
  /** 생략 시 process.env.SAJU_AI_MODEL, 그것도 없으면 기본값(claude-sonnet-5) 사용 */
  model?: string;
  /** 응답 최대 토큰 수. 기본 2000 */
  maxTokens?: number;
}

const DEFAULT_MODEL = "claude-sonnet-5";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export class AnthropicCompletionProvider implements CompletionProvider {
  readonly providerName = "anthropic";
  readonly modelName: string;

  private readonly apiKey?: string;
  private readonly maxTokens: number;

  constructor(config: AnthropicProviderConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.ANTHROPIC_API_KEY;
    this.modelName = config.model ?? process.env.SAJU_AI_MODEL ?? DEFAULT_MODEL;
    this.maxTokens = config.maxTokens ?? 2000;
  }

  async complete(system: string, user: string): Promise<string> {
    if (!this.apiKey) {
      throw new AIProviderError(
        "ANTHROPIC_API_KEY 환경변수가 설정되어 있지 않습니다. .env 또는 배포 환경변수에 설정하세요."
      );
    }

    let response: Response;
    try {
      response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.modelName,
          max_tokens: this.maxTokens,
          system,
          messages: [{ role: "user", content: user }],
        }),
      });
    } catch (err) {
      throw new AIProviderError("Anthropic API 호출 중 네트워크 오류가 발생했습니다.", err);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      throw new AIProviderError(
        `Anthropic API가 오류를 반환했습니다 (status ${response.status}): ${bodyText}`
      );
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (err) {
      throw new AIProviderError("Anthropic API 응답을 JSON으로 파싱하지 못했습니다.", err);
    }

    const textBlock = (data as { content?: Array<{ type?: string; text?: string }> })?.content?.find(
      (block) => block?.type === "text" && typeof block.text === "string"
    );

    if (!textBlock?.text) {
      throw new AIProviderError("Anthropic API 응답에서 text 블록을 찾을 수 없습니다.");
    }

    return textBlock.text;
  }
}
