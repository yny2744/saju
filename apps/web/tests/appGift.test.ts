import mgml from "@/tenants/mgml";
import ryugyeol from "@/tenants/ryugyeol";
import injasaju from "@/tenants/injasaju";
import { TENANT } from "@/tenants";
import { JOIN_GIFT, WELCOME_GIFT, WELCOME_GIFT_APP_ONLY, welcomeAllowed } from "@/lib/yeopjeon";
import { APP_COOKIE, isAppCookie } from "@/lib/appInfo";

/** 2026-11-01 유샘: 가입 선물 990냥은 앱으로 열었을 때만 (명견만리) */
describe("앱 가입 선물", () => {
  it("명견만리만 앱 전용, 류결사주·인자사주는 예전처럼 가입하면 바로", () => {
    expect(mgml.features.appWelcomeGift).toBe(true);
    expect(ryugyeol.features.appWelcomeGift).not.toBe(true);
    expect(injasaju.features.appWelcomeGift).not.toBe(true);
    // 명견만리는 류결사주 설정을 물려받으므로 다른 기능 스위치는 그대로
    expect(mgml.features.premiumNaming).toBe(ryugyeol.features.premiumNaming);
  });

  it("이번 빌드 고객사 설정에 따라 선물 조건이 갈린다", () => {
    expect(WELCOME_GIFT_APP_ONLY).toBe(TENANT.features.appWelcomeGift === true);
    expect(welcomeAllowed(true)).toBe(WELCOME_GIFT > 0);
    expect(welcomeAllowed(false)).toBe(WELCOME_GIFT > 0 && !WELCOME_GIFT_APP_ONLY);
    expect(JOIN_GIFT).toBe(WELCOME_GIFT_APP_ONLY ? "앱 설치하고 로그인하면" : "가입하면");
  });

  it("앱 쿠키는 값이 1일 때만 앱으로 본다", () => {
    expect(APP_COOKIE).toBe("ryugyeol_app");
    expect(isAppCookie("1")).toBe(true);
    expect(isAppCookie(undefined)).toBe(false);
    expect(isAppCookie("0")).toBe(false);
    expect(isAppCookie("true")).toBe(false);
  });
});
