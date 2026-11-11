/**
 * 결제수단 (2026-10-21). KCP 에서 열린 수단만 둔다 - 신용카드, 실시간 계좌이체.
 * 간편결제(카카오페이·네이버페이 등)는 KCP 심사가 끝나 승인된 뒤에 여기에 한 줄씩 더한다.
 * 서버(server/pay/payOrders.ts)는 결제수단과 상관없이 포트원에서 "PAID" 인지만 확인하므로 수단을 더해도 서버는 그대로다.
 */
export type PayMethodId = "CARD" | "TRANSFER" | EasyPayId;

/** 2026-11-12 유샘: 간편결제 바로 열기 - 포트원 V2 EASY_PAY + easyPayProvider (KCP 목록을 거치지 않고 그 결제 화면이 바로 열림) */
export type EasyPayId = "KAKAOPAY" | "NAVERPAY" | "TOSSPAY";
export const EASY_PAYS: Array<{ id: EasyPayId; label: string; bg: string; fg: string }> = [
  { id: "KAKAOPAY", label: "카카오페이", bg: "#FEE500", fg: "#191919" },
  { id: "NAVERPAY", label: "네이버페이", bg: "#03C75A", fg: "#ffffff" },
  { id: "TOSSPAY", label: "토스페이", bg: "#0064FF", fg: "#ffffff" },
];
export function isEasyPay(id: PayMethodId): id is EasyPayId {
  return id === "KAKAOPAY" || id === "NAVERPAY" || id === "TOSSPAY";
}

export interface PayMethodOption {
  id: PayMethodId;
  /** 버튼에 보이는 이름 */
  label: string;
  /** 버튼 아래 짧은 안내 */
  hint: string;
}

export const PAY_METHODS: PayMethodOption[] = [
  { id: "CARD", label: "신용카드 · 다른 간편결제", hint: "삼성페이·페이코·애플페이 등" },
  { id: "TRANSFER", label: "계좌이체", hint: "은행 인증 후 바로 결제" },
];

export const DEFAULT_PAY_METHOD: PayMethodId = "CARD";

/** 화면 문구용 (예: "모자란 만큼만 카드·계좌이체") */
export const PAY_METHODS_TEXT = PAY_METHODS.map((m) => (m.id === "CARD" ? "카드" : m.label)).join("·");

/** 포트원 V2 requestPayment 의 payMethod 값 */
export function portonePayMethod(id: PayMethodId): "CARD" | "TRANSFER" | "EASY_PAY" {
  if (isEasyPay(id)) return "EASY_PAY";
  return id === "TRANSFER" ? "TRANSFER" : "CARD";
}

/** 토스 직접 연동(결제 SDK v2)의 method 값 - 포트원이 꺼져 있을 때만 쓰인다 */
export function tossPayMethod(id: PayMethodId): "CARD" | "TRANSFER" {
  return id === "TRANSFER" ? "TRANSFER" : "CARD";
}

export function isPayMethodId(v: unknown): v is PayMethodId {
  return PAY_METHODS.some((m) => m.id === v) || EASY_PAYS.some((m) => m.id === v);
}
