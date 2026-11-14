import { insertSpend } from "@/server/yeopjeon/ledger";

// 2026-11-14 유샘 실결제 시험: 환불 뒤 같은 상품을 다시 사면 장부 이름표가 겹쳐 결제 처리 전체가 취소되던 문제
describe("구매 사용 기록 (환불 뒤 다시 사기)", () => {
  function fakeLedger() {
    const keys = new Set<string>();
    const rows: Array<{ ref: string; amount: number }> = [];
    const client = {
      query: async (_sql: string, params: unknown[]) => {
        const [userId, amount, , ref] = params as [string, number, string, string];
        const k = `${userId}|spend|${ref}`;
        if (keys.has(k)) return { rowCount: 0 };
        keys.add(k);
        rows.push({ ref, amount });
        return { rowCount: 1 };
      },
    };
    return { client, rows };
  }

  it("처음 사면 이름표 그대로", async () => {
    const { client, rows } = fakeLedger();
    await insertSpend(client, "u1", -990, "[수능] 하늘", "exam:p1:suneung");
    expect(rows).toEqual([{ ref: "exam:p1:suneung", amount: -990 }]);
  });

  it("같은 이름표가 이미 있으면 #2, #3 을 붙여 새 줄로 남긴다", async () => {
    const { client, rows } = fakeLedger();
    await insertSpend(client, "u1", -990, "[수능] 하늘", "exam:p1:suneung");
    await insertSpend(client, "u1", -990, "[수능] 하늘", "exam:p1:suneung");
    await insertSpend(client, "u1", -990, "[수능] 하늘", "exam:p1:suneung");
    expect(rows.map((r) => r.ref)).toEqual(["exam:p1:suneung", "exam:p1:suneung#2", "exam:p1:suneung#3"]);
  });
});
