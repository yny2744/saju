/**
 * 지시서 5조: "특정 PG에 종속되지 않는 구조로 설계한다 ... PG 관련 코드는 별도
 * Provider/Adapter 구조로 분리한다."
 *
 * 이번 단계에서 실제로 연동할 PG로 Toss Payments를 선택했다 (테스트 키 발급이
 * 쉽고 국내에서 가장 널리 쓰이는 결제위젯/API 문서가 공개되어 있어 선택).
 *
 * ⚠️ 실제 네트워크 검증 관련 투명성 고지: 이 실행 환경(샌드박스)은
 * api.tosspayments.com 으로 나가는 아웃바운드 네트워크가 허용되어 있지 않아
 * TossPaymentProvider의 실제 API 응답을 이 세션에서 직접 호출해 검증하지
 * 못했다 (Phase 3/4에서 ANTHROPIC_API_KEY가 없어 실제 LLM을 호출하지 못했던
 * 것과 같은 종류의 제약이다). 요청/응답 형태는 Toss의 공개 문서 스펙을 따라
 * 작성했지만, 실제 배포 전에는 반드시 Toss 테스트(샌드박스) 키로 한 번은
 * 직접 승인 흐름을 확인해야 한다 - "남아있는 문제"에도 동일하게 기재한다.
 */
export interface ConfirmPaymentInput {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface ConfirmPaymentResult {
  approved: boolean;
  /** PG가 실제로 확정한 승인 금액. approved된 경우에만 의미 있음. */
  approvedAmount?: number;
  /** PG가 이미 승인 처리된 결제라고 응답한 경우 (동일 paymentKey 재승인 요청) */
  alreadyProcessed?: boolean;
  /** 사용자에게 보여줄 수 있는 안전한 실패 사유 (PG 원문 오류를 그대로 노출하지 않음) */
  failureReason?: string;
}

export interface PaymentProvider {
  readonly providerName: string;
  confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult>;
}

/**
 * 실제 Toss Payments 결제 승인 API 연동.
 * 공식 문서 기준 엔드포인트: POST https://api.tosspayments.com/v1/payments/confirm
 * 인증: `Authorization: Basic base64(PAYMENT_SECRET_KEY + ":")`
 */
export class TossPaymentProvider implements PaymentProvider {
  readonly providerName = "toss";

  private readonly secretKey: string;

  constructor(secretKey: string) {
    this.secretKey = secretKey;
  }

  async confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
    const authHeader = `Basic ${Buffer.from(`${this.secretKey}:`).toString("base64")}`;

    let res: Response;
    try {
      res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(input),
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[phase5] Toss 결제 승인 API 호출 자체가 실패했습니다:", err);
      return { approved: false, failureReason: "결제 서버와 통신하지 못했습니다." };
    }

    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return { approved: false, failureReason: "결제 서버 응답을 해석하지 못했습니다." };
    }

    if (!res.ok) {
      const code = typeof data.code === "string" ? data.code : "";
      // eslint-disable-next-line no-console
      console.error("[phase5] Toss 결제 승인 실패:", code, data.message);

      // Toss는 이미 승인 처리된 paymentKey로 재요청하면 별도 에러 코드를 준다.
      // (정확한 코드명은 배포 전 Toss 공식 문서로 재확인 필요 - 아래는 통상적으로
      // 쓰이는 명칭을 방어적으로 함께 검사한다.)
      if (code === "ALREADY_PROCESSED_PAYMENT" || code === "ALREADY_COMPLETED_PAYMENT") {
        return { approved: false, alreadyProcessed: true, failureReason: "이미 처리된 결제입니다." };
      }
      return { approved: false, failureReason: "결제 승인에 실패했습니다." };
    }

    const totalAmount = typeof data.totalAmount === "number" ? data.totalAmount : undefined;
    const status = typeof data.status === "string" ? data.status : "";

    if (status !== "DONE") {
      return { approved: false, failureReason: "결제가 완료 상태가 아닙니다." };
    }

    return { approved: true, approvedAmount: totalAmount };
  }
}

/**
 * 지시서 24조: "Mock 결제 성공 ≠ 실제 PG 결제 성공으로 명확히 구분한다.
 * 운영환경에서 Mock Provider가 자동으로 사용되지 않도록 한다."
 *
 * 로컬/테스트 전용. amount > 0이면 항상 승인하되, 동일한 paymentKey로 두 번째
 * confirmPayment가 들어오면 두 번째부터는 alreadyProcessed로 응답해서 중복 승인
 * 방지 테스트(지시서 10조/21조)를 이 Provider 하나로도 검증할 수 있게 한다.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly providerName = "mock";

  private readonly processedPaymentKeys = new Set<string>();

  async confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
    if (this.processedPaymentKeys.has(input.paymentKey)) {
      return { approved: false, alreadyProcessed: true, failureReason: "이미 처리된 결제입니다. (mock)" };
    }

    if (!input.paymentKey || input.amount <= 0) {
      return { approved: false, failureReason: "잘못된 결제 요청입니다. (mock)" };
    }

    this.processedPaymentKeys.add(input.paymentKey);
    return { approved: true, approvedAmount: input.amount };
  }
}

let cachedProvider: PaymentProvider | null = null;

/**
 * 지시서 8조/16조/24조: Secret Key는 서버 환경변수로만 관리하고, 운영 환경에서
 * Key가 없다고 조용히 Mock으로 넘어가지 않는다 (aiEngineProvider.ts의
 * ANTHROPIC_API_KEY 처리와 동일한 원칙).
 */
export function getPaymentProvider(): PaymentProvider {
  if (cachedProvider) return cachedProvider;

  const secretKey = process.env.PAYMENT_SECRET_KEY;
  if (secretKey) {
    cachedProvider = new TossPaymentProvider(secretKey);
    return cachedProvider;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("PAYMENT_SECRET_KEY가 설정되지 않았습니다. 운영 환경에서는 Mock 결제를 사용할 수 없습니다.");
  }

  // eslint-disable-next-line no-console
  console.warn(
    "[phase5] PAYMENT_SECRET_KEY 미설정 - 로컬 개발용 MockPaymentProvider로 대체합니다. 실제 결제가 아닙니다."
  );
  cachedProvider = new MockPaymentProvider();
  return cachedProvider;
}

/** 테스트 전용: 캐시된 provider를 초기화한다 (환경변수를 바꿔가며 테스트할 때 사용). */
export function resetPaymentProviderCacheForTesting(): void {
  cachedProvider = null;
}
