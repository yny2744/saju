/**
 * 미성년자 결제 취소 고지 (2026-10-26) - 「전자상거래법」 제13조 제3항.
 * 미성년자와 계약할 때 "법정대리인이 동의하지 않으면 본인 또는 법정대리인이 취소할 수 있다"는 내용을
 * 결제 전에 알려야 한다 (고지하지 않으면 과태료 대상). 이용약관 제8조의2와 같은 내용이다 - 함께 바꾼다.
 * 현금 결제가 일어나는 화면(결제 창·비회원 결제 시작)에 반드시 둔다.
 */
export const MINOR_NOTICE_TEXT = "만 19세 미만 미성년자가 법정대리인(부모 등)의 동의 없이 결제한 경우, 본인 또는 법정대리인이 결제를 취소할 수 있어요.";

export function MinorNotice({ className = "" }: { className?: string }) {
  return (
    <p className={`text-center text-[11.5px] leading-relaxed ${className}`} style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
      {MINOR_NOTICE_TEXT}{" "}
      <a href="/terms" className="underline underline-offset-2">
        이용약관 제8조의2
      </a>
    </p>
  );
}
