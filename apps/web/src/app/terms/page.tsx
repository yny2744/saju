import { BUSINESS_INFO } from "@/lib/businessInfo";

export const metadata = { title: `이용약관 | ${BUSINESS_INFO.serviceName}` };

/**
 * 전자상거래 등에서의 소비자보호에 관한 법률 기준 표준 약관 구조를 따르되,
 * 실제 서비스 동작과 다르게 쓰지 않는다 (예: "회원가입"이라는 단어를 쓰지
 * 않는다 - 지금 서비스엔 회원 시스템 자체가 없다. 디지털 콘텐츠 청약철회
 * 제한 조항도 실제 제공 방식(결제 즉시 웹 화면으로 결과 제공)에 맞춰 썼다).
 *
 * ⚠️ 이 페이지는 Claude가 표준 약관 구조를 참고해 초안으로 작성한 것으로,
 * 법률 자문을 대체하지 않는다. 실제 서비스 오픈 전 법률 전문가 검토를
 * 권장한다.
 */
export default function TermsPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-10 pt-12 sm:pt-16">
        <p className="section-label mb-1.5">법적 고지</p>
        <h1 className="mb-6 text-[26px] font-bold leading-snug">이용약관</h1>

        <div className="space-y-7 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제1조 (목적)
            </h2>
            <p>
              이 약관은 {BUSINESS_INFO.companyName}(이하 &quot;회사&quot;)가 운영하는 {BUSINESS_INFO.serviceName}
              (이하 &quot;서비스&quot;)의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항을 규정함을
              목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제2조 (용어의 정의)
            </h2>
            <p>
              1. &quot;서비스&quot;란 회사가 제공하는 사주·오늘의 운세·관상 등 명리학·관상학 기반 해석 콘텐츠
              제공 서비스를 말합니다.
              <br />
              2. &quot;이용자&quot;란 이 약관에 따라 서비스를 이용하는 자를 말합니다.
              <br />
              3. &quot;유료 콘텐츠&quot;란 이용자가 대금을 결제하고 열람하는 심층 해석 콘텐츠를 말합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제3조 (약관의 효력 및 변경)
            </h2>
            <p>
              1. 이 약관은 서비스 화면에 게시하여 공시합니다.
              <br />
              2. 회사는 관계 법령을 위배하지 않는 범위에서 이 약관을 개정할 수 있으며, 개정 시 적용일자 및
              개정사유를 명시하여 적용일 7일 전(이용자에게 불리한 변경의 경우 30일 전)부터 서비스 화면에
              공지합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제4조 (회원가입에 관한 사항)
            </h2>
            <p>
              서비스는 별도의 회원가입 절차 없이 이용할 수 있습니다. 서비스 이용을 위해 입력한 닉네임,
              생년월일시, 성별 등 정보의 처리에 관한 사항은 개인정보처리방침에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제5조 (서비스의 제공 및 변경)
            </h2>
            <p>
              1. 회사는 다음과 같은 서비스를 제공합니다.
              <br />
              ① 무료 사주·오늘의 운세·관상 기본 분석
              <br />
              ② 결제 후 제공되는 심층 해석 콘텐츠
              <br />
              2. 회사는 서비스의 내용, 상품 구성, 가격을 변경할 수 있으며, 변경 시 서비스 화면을 통해
              공지합니다.
              <br />
              3. 유료 콘텐츠(심층 해석 결과)는 결제 승인 후 24시간 동안 열람할 수 있으며, 이 기간이 지나면 다시
              열람할 수 없습니다. 이용자는 필요한 경우 결과 화면을 캡처하는 등 직접 보관해야 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제6조 (서비스의 중단)
            </h2>
            <p>
              회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신 두절 등의 사유가 발생한 경우
              서비스 제공을 일시적으로 중단할 수 있으며, 이 경우 가능한 범위 내에서 사전에 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제7조 (결제)
            </h2>
            <p>
              1. 유료 콘텐츠의 결제는 회사와 제휴한 전자지급결제대행업체(토스페이먼츠(주) 등)를 통해
              이루어집니다.
              <br />
              2. 회사는 결제 수단으로 신용카드, 간편결제 등 전자지급결제대행업체가 지원하는 수단을
              제공합니다.
              <br />
              3. 이용자는 결제 전 상품명, 가격, 콘텐츠 구성을 반드시 확인해야 합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제8조 (청약철회 및 환불)
            </h2>
            <p>
              1. 이용자는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조에 따라 결제일로부터 7일
              이내에 청약철회를 요청할 수 있습니다.
              <br />
              2. 다만, 유료 콘텐츠는 결제 즉시 디지털 콘텐츠(해석 결과) 제공이 개시되는 서비스의 특성상,
              같은 법 제17조 제2항에 따라 <b>이용자가 결제 후 심층 해석 결과를 열람(확인)한 경우</b>에는
              청약철회가 제한될 수 있습니다.
              <br />
              3. 결제는 하였으나 시스템 오류 등으로 결과를 열람하지 못한 경우에는 고객센터({BUSINESS_INFO.csEmail}
              )로 문의 시 전액 환불합니다.
              <br />
              4. 그 외 환불 관련 사항은 관계 법령 및 전자지급결제대행업체의 약관에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제9조 (콘텐츠의 성격 및 면책)
            </h2>
            <p>
              1. 서비스가 제공하는 모든 사주·오늘의 운세·관상 해석은 전통 명리학·관상학을 바탕으로 한
              문화·오락 목적의 참고 콘텐츠이며, 이용자의 성격·건강·재산·연애·미래 등을 과학적으로 확정하거나
              보장하지 않습니다.
              <br />
              2. 이용자는 서비스의 해석 결과를 의료·법률·투자 등 중요한 의사결정의 유일한 근거로 삼아서는
              안 됩니다.
              <br />
              3. 회사는 이용자가 서비스 내용을 신뢰하여 취한 행동으로 발생한 손해에 대해 고의 또는 중대한
              과실이 없는 한 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제10조 (지적재산권)
            </h2>
            <p>
              서비스 내 모든 콘텐츠(텍스트, 디자인, 로고 등)에 대한 저작권 및 지적재산권은 회사에
              귀속되며, 이용자는 회사의 사전 동의 없이 이를 복제·배포·전송할 수 없습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              제11조 (분쟁해결 및 준거법)
            </h2>
            <p>
              1. 서비스 이용과 관련하여 분쟁이 발생한 경우, 회사와 이용자는 신의성실의 원칙에 따라
              원만히 해결하도록 노력합니다.
              <br />
              2. 이 약관은 대한민국 법령에 따라 규율되고 해석됩니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              부칙
            </h2>
            <p>이 약관은 2026년 10월 2일부터 시행합니다.</p>
          </section>
        </div>
      </main>
    </>
  );
}
