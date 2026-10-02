import { BUSINESS_INFO } from "@/lib/businessInfo";
import { Footer } from "@/components/Footer";

export const metadata = { title: `개인정보처리방침 | ${BUSINESS_INFO.serviceName}` };

/**
 * 실제 시스템 동작과 다르게 쓰지 않는다 - 이게 이 페이지에서 제일 중요한 원칙이다.
 *
 *   - 회원 데이터베이스가 없다 (Phase 11 Postgres 미도입) - "회원 탈퇴 시까지 보관"
 *     같은 흔한 문구를 쓰지 않는다. 실제로는 결과당 암호화 토큰 + TTL(30분~24시간)
 *     자동 만료 구조다.
 *   - 사주/오늘의 운세 해석 과정에서 Gemini(Google)/Claude(Anthropic) API로
 *     계산된 사주 데이터가 전달된다 - 이건 실제 해외 제3자 처리위탁이라
 *     명시해야 한다 (얼버무리면 오히려 법적 리스크가 커진다).
 *   - 관상 원본 사진은 서버로 전송되지 않는다 (브라우저 내 처리) - 이것도
 *     실제로 그렇게 구현되어 있다(faceLandmarks.ts).
 *   - 결제 카드정보는 당사가 보관하지 않고 PG사(토스페이먼츠)가 직접 처리한다.
 *
 * ⚠️ Claude가 표준 개인정보처리방침 구조를 참고해 초안으로 작성한 것으로,
 * 법률 자문을 대체하지 않는다. 특히 해외 제3자 처리위탁(Google/Anthropic/Vercel)
 * 고지 부분은 실제 서비스 오픈 전 법률 전문가 검토를 권장한다.
 */
export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-10 pt-12 sm:pt-16">
        <p className="section-label mb-1.5">법적 고지</p>
        <h1 className="mb-6 text-[26px] font-bold leading-snug">개인정보처리방침</h1>
        <p className="mb-7 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          {BUSINESS_INFO.companyName}({BUSINESS_INFO.serviceName}, 이하 &quot;회사&quot;)는 「개인정보 보호법」을
          준수하며, 이용자의 개인정보를 소중히 다룹니다.
        </p>

        <div className="space-y-7 text-sm leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              1. 수집하는 개인정보 항목
            </h2>
            <p>
              ① 무료/유료 사주 분석 이용 시: 닉네임, 생년월일, 출생시간(선택), 성별, 출생 도시(선택)
              <br />
              ② 관상 분석 이용 시: 닉네임, 연애·관계 선호(선택 입력 텍스트). <b>얼굴 사진 원본은 수집하지
              않습니다</b> — 촬영한 사진은 이용자의 기기(브라우저) 안에서만 분석되며, 서버로는 분석에 쓰인
              얼굴 비율 수치(6개)와 인식 신뢰도 값만 전달됩니다.
              <br />
              ③ 유료 결제 이용 시: 주문 상품명, 결제 금액. <b>카드번호 등 결제 수단 정보는 회사가 직접
              수집·보관하지 않으며</b>, 전자지급결제대행업체(토스페이먼츠(주))가 직접 수집·처리합니다.
              <br />
              ④ 서비스 이용 과정에서 자동 수집: IP 주소(부정 이용·과도한 요청 방지 목적)
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              2. 개인정보의 수집 및 이용 목적
            </h2>
            <p>
              ① 사주·오늘의 운세·관상 해석 결과 생성 및 제공
              <br />
              ② 유료 콘텐츠 결제 처리 및 주문 확인
              <br />
              ③ 서비스 부정 이용 방지(동일 이용자의 과도한 요청 제한)
              <br />
              회사는 수집한 개인정보를 위 목적 외의 용도로 이용하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              3. 개인정보의 보유 및 이용 기간
            </h2>
            <p>
              회사는 <b>별도의 회원 데이터베이스를 운영하지 않습니다.</b> 입력하신 생년월일·성별 등 정보는
              암호화된 임시 토큰 형태로만 아래 기간 동안 보관되며, 서버에 평문으로 저장되지 않습니다.
              <br />
              ① 무료 분석 결과: 생성 후 <b>30분</b>간 조회 가능, 이후 자동 만료되어 복호화할 수 없습니다.
              <br />
              ② 결제 후 유료 해석 열람 권한: 결제 승인 후 <b>24시간</b>
              <br />
              ③ 다만 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관계 법령에서 거래 기록의 보존을
              의무화하는 경우, 결제·청약철회 관련 기록은 해당 법령이 정한 기간 동안 전자지급결제대행업체를
              통해 보관될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              4. 개인정보의 제3자 제공 및 처리위탁
            </h2>
            <p>
              회사는 서비스 제공을 위해 아래와 같이 개인정보 처리를 위탁하거나 제3자에게 제공합니다.
            </p>
            <div className="mt-2 overflow-x-auto rounded-lg" style={{ border: "1px solid var(--color-line)" }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ backgroundColor: "var(--color-paper-soft)" }}>
                    <th className="p-2">수탁자</th>
                    <th className="p-2">위탁 업무</th>
                    <th className="p-2">보유·이용 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="p-2">토스페이먼츠(주)</td>
                    <td className="p-2">결제 처리 및 승인</td>
                    <td className="p-2">관계 법령에 따른 기간</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="p-2">Google LLC (미국)</td>
                    <td className="p-2">사주 해석 생성(Gemini API) — 계산된 생년월일 기반 수치(오행·십신 등)가 전달되며, 성명·연락처는 전달되지 않음</td>
                    <td className="p-2">API 호출 즉시 처리, 별도 보관 안 함</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="p-2">Anthropic PBC (미국)</td>
                    <td className="p-2">사주·관상 해석 생성(Claude API) — 위와 동일한 범위의 수치 데이터 전달</td>
                    <td className="p-2">API 호출 즉시 처리, 별도 보관 안 함</td>
                  </tr>
                  <tr style={{ borderTop: "1px solid var(--color-line)" }}>
                    <td className="p-2">Vercel Inc. (미국)</td>
                    <td className="p-2">서비스 서버 호스팅</td>
                    <td className="p-2">서비스 제공 기간 동안</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2">
              Google LLC·Anthropic PBC·Vercel Inc.로의 정보 이전은 「개인정보 보호법」상 국외 이전에
              해당합니다. 위탁 업무에는 이용자의 성명·연락처 등 식별정보가 아닌, 이미 계산된 사주 수치(간지,
              오행, 십신 등) 또는 얼굴 비율 수치만 전달됩니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              5. 정보주체의 권리
            </h2>
            <p>
              이용자는 언제든지 본인의 개인정보 처리 현황에 대해 열람·정정·삭제를 요청할 수 있습니다.
              다만 현재 서비스 구조상 무료 결과는 30분, 유료 열람 권한은 24시간이 지나면 암호화 토큰이
              자동 만료되어 회사도 더 이상 해당 정보에 접근할 수 없습니다. 그 전에 삭제를 원하시면 고객센터
              ({BUSINESS_INFO.csEmail})로 문의해 주세요.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              6. 개인정보의 파기
            </h2>
            <p>
              회사는 보유 기간이 경과하거나 처리 목적이 달성된 개인정보를 지체 없이 파기합니다. 전자적
              파일 형태의 정보는 복구할 수 없는 방법으로 영구 삭제하며, 암호화 토큰 방식으로 보관된 정보는
              만료 시점 이후 복호화 자체가 불가능한 방식으로 처리됩니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              7. 쿠키 및 로컬 저장소
            </h2>
            <p>
              회사는 이용자 식별을 위한 별도의 추적 쿠키를 사용하지 않습니다. 다만 관상 결과 화면에서
              촬영하신 사진을 보여드리기 위해, 사진의 축소본을 이용자 브라우저의 임시 저장 공간
              (세션 스토리지)에만 저장하며 이는 서버로 전송되지 않고 탭을 닫으면 사라집니다. 결제 과정에서
              전자지급결제대행업체가 자체적으로 쿠키를 사용할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              8. 개인정보 보호책임자
            </h2>
            <p>
              성명: {BUSINESS_INFO.privacyOfficer}
              <br />
              이메일: {BUSINESS_INFO.privacyOfficerEmail}
              <br />
              개인정보 관련 문의, 불만 처리, 피해 구제를 위해 위 연락처로 문의해 주시면 신속히 답변드리겠습니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              9. 고지의 의무
            </h2>
            <p>
              이 개인정보처리방침은 법령·정책 또는 서비스 변경에 따라 내용이 추가·삭제·수정될 수 있으며,
              변경 시 시행일 7일 전부터 서비스 화면을 통해 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold" style={{ color: "var(--color-ink)" }}>
              부칙
            </h2>
            <p>이 개인정보처리방침은 2026년 10월 2일부터 시행합니다.</p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
