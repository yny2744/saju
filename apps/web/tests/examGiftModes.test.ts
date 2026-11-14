import { GIFT_MODES, giftProductTitle, giftVia, isGiftMode } from "@/server/exam/gift";

// 2026-11-14 유샘: 보호자(지인) 결제 부탁 링크를 심층분석 2~4·네 가지 모두 보기까지
describe("결제 부탁 링크 상품", () => {
  it("심층분석 1~4와 네 가지 모두 보기만 부탁할 수 있다 (가볍게 보기는 아님)", () => {
    expect([...GIFT_MODES]).toEqual(["exam_deep", "exam_goal", "exam_focus", "exam_calm", "exam_all"]);
    expect(isGiftMode("exam")).toBe(false);
    expect(isGiftMode("exam_all")).toBe(true);
    expect(isGiftMode("deep")).toBe(false);
  });
  it("받는 분 화면의 상품 이름", () => {
    expect(giftProductTitle("suneung", "exam_deep")).toBe("수능대박운 심층분석");
    expect(giftProductTitle("suneung", "exam_goal")).toBe("수능대박운 목표 성취운");
    expect(giftProductTitle("suneung", "exam_all")).toBe("수능대박운 심층분석 네 가지 모두 보기");
  });
  it("열람 표시는 링크마다 따로 - 환불하면 그 링크가 연 풀이만 잠근다", () => {
    expect(giftVia("abc")).toBe("gift:abc");
  });
});
