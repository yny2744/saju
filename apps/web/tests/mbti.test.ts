import { MBTI_TYPES, DAY_LINE, axisFit, mbtiBlend, mbtiResult } from "@/lib/fun/mbti";
import { computeFun } from "@/server/fun/funService";

/** 2026-11-01 유샘 지시서: MBTI관 (AI 없음, 네 축 규칙) */
describe("MBTI관", () => {
  it("16유형·일간 10개 문장이 모두 있다", () => {
    expect(MBTI_TYPES).toHaveLength(16);
    for (const t of MBTI_TYPES) {
      const r = mbtiResult(t);
      expect(r.body[0].length).toBeGreaterThan(10);
      expect(r.tags).toHaveLength(4);
    }
    expect(Object.keys(DAY_LINE)).toHaveLength(10);
  });

  it("축 규칙: S는 토·금과 같은 결, 화는 중간, 목은 다른 결", () => {
    expect(axisFit("S", "토")).toBe("same");
    expect(axisFit("S", "화")).toBe("mid");
    expect(axisFit("S", "목")).toBe("differ");
    expect(axisFit("F", "화")).toBe("same");
    expect(axisFit("T", "토")).toBe("mid");
    expect(axisFit("P", "수")).toBe("same");
  });

  it("모든 유형 × 일간 조합이 4문장을 만든다 (160개)", () => {
    const stems: Array<[string, "목" | "화" | "토" | "금" | "수"]> = [["갑", "목"], ["을", "목"], ["병", "화"], ["정", "화"], ["무", "토"], ["기", "토"], ["경", "금"], ["신", "금"], ["임", "수"], ["계", "수"]];
    for (const t of MBTI_TYPES)
      for (const [s, el] of stems) {
        const lines = mbtiBlend(t, s, el);
        expect(lines).toHaveLength(4);
        for (const l of lines) expect(l).toMatch(/[요다]\.$/);
      }
  });

  it("서버 계산: 유형을 고르지 않으면 안내, 고르면 겹쳐 본 풀이까지", () => {
    const base = { kind: "mbti", calendarType: "solar", date: "1990-05-15" };
    expect(computeFun(base).status).toBe(400);
    const r = computeFun({ ...base, mbti: "INFJ" });
    expect(r.status).toBe(200);
    const b = r.body as { result: { title: string }; overlay: { dayCore: string; relation?: { body: string } } };
    expect(b.result.title).toMatch(/^INFJ · /);
    expect(b.overlay.relation?.body).toMatch(/I\(내향\)/);
  });
});
