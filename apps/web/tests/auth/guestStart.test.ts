import { handleGuestStart } from "../../src/server/auth/authHandlers";

/** 2026-10-23 비회원 결제: 필수 약관 동의 없이는 비회원 계정을 만들지 않는다 (DB에 닿기 전에 막힘) */
describe("비회원으로 시작", () => {
  it("필수 동의가 빠지면 400", async () => {
    const r = await handleGuestStart(undefined, { agreeTerms: true, agreePrivacy: true, agreeAge: false });
    expect(r.status).toBe(400);
    expect(r.session).toBeUndefined();
  });
  it("요청 형식이 이상하면 400", async () => {
    const r = await handleGuestStart(undefined, null);
    expect(r.status).toBe(400);
  });
});
