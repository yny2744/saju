import type { Metadata } from "next";
import { APP_ICON_DIR, APP_NAME, APP_SHORT_NAME } from "@/lib/appInfo";
import { InstallGuide } from "@/components/app/AppInstall";
import { PushToggle } from "@/components/app/PushToggle";
import { CURRENCY_NAME, WELCOME_GIFT, WELCOME_GIFT_APP_ONLY, formatNyang } from "@/lib/yeopjeon";

export const metadata: Metadata = { title: `앱으로 설치 · ${APP_NAME}` };

/**
 * 휴대폰 앱(PWA) 설치 안내 (2026-11-01 유샘) - /app
 * 광고·안내 문자에서 이 주소로 바로 보낼 수 있다. 기기마다 알맞은 설치 방법만 보여 준다 (components/app/AppInstall.tsx).
 */
export default function AppInstallPage() {
  return (
    <main className="mx-auto min-h-screen max-w-xl px-5 pb-16 pt-12">
      <div className="text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${APP_ICON_DIR}/icon-192.png`} alt={`${APP_SHORT_NAME} 아이콘`} width={88} height={88} className="mx-auto rounded-[22px] shadow-lg" />
        <h1 className="mt-4 text-[26px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {APP_SHORT_NAME}, 홈 화면에 두기
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed" style={{ color: "var(--color-ink-soft)", wordBreak: "keep-all" }}>
          앱처럼 설치해 두면 아이콘 한 번으로 바로 열려요.
          <br />
          매일 아침 오늘의 운세로 하루를 시작해 보세요.
        </p>
        {/* 2026-11-01 유샘: 가입 선물은 앱으로 열었을 때만 (고객사 설정 features.appWelcomeGift) */}
        {WELCOME_GIFT_APP_ONLY && (
          <p className="mx-auto mt-4 inline-block rounded-full px-4 py-1.5 text-[14px] font-bold" style={{ backgroundColor: "var(--color-danger)", color: "#fff" }}>
            앱으로 열어서 가입하면 {CURRENCY_NAME} {formatNyang(WELCOME_GIFT)} 선물
          </p>
        )}
      </div>

      <ul className="mt-7 grid grid-cols-3 gap-2 text-center text-[13px]">
        {[
          ["☀", "매일 아침", "오늘의 운세"],
          ["◎", "아이콘 하나로", "바로 열기"],
          WELCOME_GIFT_APP_ONLY ? ["錢", "가입 선물", formatNyang(WELCOME_GIFT)] : ["◇", "설치 비용", "없음"],
        ].map(([g, a, b]) => (
          <li key={a} className="rounded-xl px-2 py-3" style={{ backgroundColor: "var(--color-paper-soft)", border: "1px solid var(--color-line)" }}>
            <span className="block text-[20px]" style={{ color: "var(--color-gold)" }} aria-hidden>
              {g}
            </span>
            <span className="mt-1 block font-semibold">{a}</span>
            <span className="block" style={{ color: "var(--color-ink-soft)" }}>
              {b}
            </span>
          </li>
        ))}
      </ul>

      <section className="mt-7 rounded-2xl p-5" style={{ border: "1px solid var(--color-gold-line)", backgroundColor: "var(--color-card)" }}>
        <h2 className="mb-4 text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          설치하는 방법
        </h2>
        <InstallGuide />
      </section>

      {/* 2026-11-01 매일 아침 오늘의 운세 알림 (알림 열쇠가 있을 때만 보인다) */}
      <div className="mt-5">
        <PushToggle />
      </div>

      <p className="mt-5 text-center text-[12.5px] leading-relaxed" style={{ color: "var(--color-ink-faint)", wordBreak: "keep-all" }}>
        앱스토어를 거치지 않고 이 사이트를 그대로 홈 화면에 두는 방식이라 설치 비용이 없어요. 지우고 싶으면 다른 앱처럼 아이콘을 길게 눌러 지우면 돼요.
      </p>
    </main>
  );
}
