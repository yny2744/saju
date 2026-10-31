import { slotUnderPointer } from "../src/lib/fun/tarot";

/** 수레바퀴 (2026-10-31): 바퀴 각도 → 금빛 화살표 아래 칸. 멈춤은 늘 칸 가운데(22등분 각도의 배수)에 선다 */
describe("수레바퀴 화살표 칸", () => {
  const SEG = 360 / 22;
  it("돌리지 않았으면 0번 칸, 한 칸만큼 돌리면 그 앞 칸이 화살표 아래로", () => {
    expect(slotUnderPointer(0)).toBe(0);
    expect(slotUnderPointer(SEG)).toBe(21); // 시계 방향으로 한 칸 → 21번 칸이 위로
    expect(slotUnderPointer(-SEG)).toBe(1);
  });
  it("몇 바퀴를 돌아도 같은 칸 (바퀴 한 바퀴 = 22칸)", () => {
    for (let k = 0; k < 22; k++) expect(slotUnderPointer(k * SEG + 360 * 7)).toBe((22 - k) % 22);
  });
});
