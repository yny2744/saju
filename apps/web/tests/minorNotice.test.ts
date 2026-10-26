import fs from "fs";
import path from "path";

/**
 * 2026-10-26 미성년자 결제 취소 고지 (전자상거래법 제13조 제3항) - 현금 결제가 일어나는 화면에서 빠지면 안 된다.
 * 수능운은 깊게 보기·두 번째 사람부터 보호자 결제 안내를 둔다.
 */
const src = (p: string) => fs.readFileSync(path.join(__dirname, "../src", p), "utf8");

describe("미성년자 결제 고지 · 수능운 보호자 결제", () => {
  it("결제 창과 비회원 결제 시작 화면에 고지가 있다", () => {
    expect(src("components/yeopjeon/PayDialog.tsx")).toContain("<MinorNotice");
    expect(src("components/GuestStart.tsx")).toContain("<MinorNotice");
    expect(src("components/yeopjeon/MinorNotice.tsx")).toContain("법정대리인");
  });
  it("이용약관 제8조의2와 같은 내용", () => {
    const terms = src("app/terms/page.tsx");
    expect(terms).toContain("제8조의2 (미성년자의 이용)");
    expect(terms).toContain("법정대리인의 동의 없이 결제한 경우");
  });
  it("수능운 깊게 보기 단추 두 곳 모두 보호자 결제 안내", () => {
    const exam = src("app/person/[id]/exam/page.tsx");
    expect(exam.match(/<GuardianPayNote /g)?.length).toBe(2);
  });
});
