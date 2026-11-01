import { calculateDailyGanzhi } from "saju-engine";
import { dailyPushMessage, readSubscription, welcomePushMessage, PUSH_DAILY_URL } from "@/lib/push";
import { cronAuthorized } from "@/server/push/push";

/** 2026-11-01 유샘: 매일 아침 오늘의 운세 알림 */
describe("아침 알림 문장", () => {
  it("그날 일진으로 정해진 문장을 만든다 (AI 없음)", () => {
    const date = "2026-11-02";
    const g = calculateDailyGanzhi(date);
    const m = dailyPushMessage(date);
    expect(m.body.startsWith(`오늘은 ${g.ganzhi}(`)).toBe(true);
    expect(m.body).toMatch(/의 기운이에요\. 내 사주와 오늘이 어떻게 만나는지 열어 보세요\.$/);
    expect(m.title).toMatch(/· 오늘의 운세$/);
    expect(m.url).toBe(PUSH_DAILY_URL);
    expect(m.tag).toBe(`daily-${date}`);
    // 같은 날이면 늘 같은 문장
    expect(dailyPushMessage(date)).toEqual(m);
  });

  it("유료 상품 권유나 가격을 넣지 않는다", () => {
    for (const d of ["2026-11-01", "2026-11-02", "2026-12-31", "2027-02-04"]) {
      const m = dailyPushMessage(d);
      expect(m.body).not.toMatch(/냥|원|결제|구매|할인|특가/);
    }
    expect(welcomePushMessage().body).not.toMatch(/냥|원|결제/);
  });

  it("하늘과 땅 오행이 같으면 한 번만 말한다", () => {
    // 갑인(甲寅)일: 목·목
    let d = new Date("2026-01-01T00:00:00Z");
    for (let i = 0; i < 60; i++) {
      const s = d.toISOString().slice(0, 10);
      if (calculateDailyGanzhi(s).ganzhi === "갑인") {
        expect(dailyPushMessage(s).body).toContain("하늘과 땅 모두 나무(木)의 기운이에요");
        return;
      }
      d = new Date(d.getTime() + 86400000);
    }
    throw new Error("60일 안에 갑인일이 없음");
  });
});

describe("알림 구독 정보 확인", () => {
  const ok = {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) },
  };
  it("올바른 구독은 통과", () => {
    expect(readSubscription(ok)).toEqual(ok);
  });
  it("https 가 아니거나 열쇠 모양이 틀리면 거절", () => {
    expect(readSubscription(null)).toBeNull();
    expect(readSubscription({ ...ok, endpoint: "http://evil.example/x" })).toBeNull();
    expect(readSubscription({ ...ok, endpoint: "javascript:alert(1)" })).toBeNull();
    expect(readSubscription({ ...ok, keys: { p256dh: "짧음", auth: ok.keys.auth } })).toBeNull();
    expect(readSubscription({ ...ok, keys: { p256dh: ok.keys.p256dh, auth: "" } })).toBeNull();
    expect(readSubscription({ endpoint: ok.endpoint })).toBeNull();
  });
});

describe("발송 주소 암호", () => {
  const old = process.env.CRON_SECRET;
  afterEach(() => {
    if (old === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = old;
  });
  it("암호가 없으면 아무도 못 부른다", () => {
    delete process.env.CRON_SECRET;
    expect(cronAuthorized("Bearer ")).toBe(false);
    expect(cronAuthorized(null)).toBe(false);
  });
  it("너무 짧은 암호도 막는다", () => {
    process.env.CRON_SECRET = "short";
    expect(cronAuthorized("Bearer short")).toBe(false);
  });
  it("맞는 암호만 통과", () => {
    process.env.CRON_SECRET = "s".repeat(32);
    expect(cronAuthorized(`Bearer ${"s".repeat(32)}`)).toBe(true);
    expect(cronAuthorized(`Bearer ${"x".repeat(32)}`)).toBe(false);
    expect(cronAuthorized("s".repeat(32))).toBe(false);
  });
});
