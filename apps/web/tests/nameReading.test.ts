import fs from "fs";
import path from "path";
import { readName, normalizeSuri, isLuckySuri, splitName, soundElement, elementRelation, type NameHanjaDict } from "@/lib/nameReading";

const dict: NameHanjaDict = JSON.parse(fs.readFileSync(path.join(__dirname, "../public/hanja/name-hanja.json"), "utf8"));

describe("작명 자료 (원획)", () => {
  it("부수를 본래 글자로 센다", () => {
    expect(dict["淑"][0]).toBe(12); // 氵→水
    expect(dict["珍"][0]).toBe(10); // 王→玉
    expect(dict["草"][0]).toBe(12); // 艹→艸
    expect(dict["都"][0]).toBe(16); // 阝(오른쪽)→邑
    expect(dict["陽"][0]).toBe(17); // 阝(왼쪽)→阜
    expect(dict["承"][0]).toBe(8); // 手
  });
  it("숫자 한자와 成 계열", () => {
    expect(dict["四"][0]).toBe(4);
    expect(dict["九"][0]).toBe(9);
    expect(["成", "城", "誠", "盛", "晟"].map((c) => dict[c][0])).toEqual([7, 10, 14, 12, 11]);
  });
  it("자원오행: 부수가 오행을 나타낼 때만", () => {
    expect(dict["浩"][1]).toBe("수");
    expect(dict["榮"][1]).toBe("목");
    expect(dict["民"][1]).toBe("");
  });
  it("인명용 한자 8천 자 이상", () => {
    expect(Object.keys(dict).length).toBeGreaterThan(8000);
  });
});

describe("규칙", () => {
  it("81을 넘는 수는 80을 뺀다", () => {
    expect(normalizeSuri(82)).toBe(2);
    expect(normalizeSuri(81)).toBe(81);
    expect(isLuckySuri(23)).toBe(true);
    expect(isLuckySuri(22)).toBe(false);
  });
  it("성 나누기 (복성 포함)", () => {
    expect(splitName("유남영")).toEqual({ surname: "유", given: "남영" });
    expect(splitName("남궁민수")).toEqual({ surname: "남궁", given: "민수" });
    expect(splitName("김")).toBeNull();
  });
  it("발음오행과 상생상극", () => {
    expect(soundElement("유")).toBe("토");
    expect(soundElement("남")).toBe("화");
    expect(soundElement("김")).toBe("목");
    expect(elementRelation("화", "토")).toBe("생");
    expect(elementRelation("토", "화")).toBe("받음");
    expect(elementRelation("목", "토")).toBe("극");
  });
});

describe("이름 풀이", () => {
  it("柳南榮 유남영: 수리 4격 모두 길, 음양 조화, 소리 부딪힘 없음", () => {
    const r = readName("유남영", "柳南榮", ["목", "수"], dict)!;
    expect(r.complete).toBe(true);
    expect(r.suri.map((s) => [s.name, s.value])).toEqual([
      ["원격", 23],
      ["형격", 18],
      ["이격", 23],
      ["정격", 32],
    ]);
    expect(r.suri.every((s) => s.lucky)).toBe(true);
    expect(r.yinYangBalanced).toBe(true);
    expect(r.sound.clashes).toBe(0);
    expect(r.supports).toEqual(["목"]); // 榮(목)이 필요한 목을 채움
    expect(r.verdict).toBe("good");
  });
  it("외자 이름: 이격 = 성 획수", () => {
    const r = readName("김구", "金九", [], dict)!;
    expect(r.suri.find((s) => s.name === "이격")!.value).toBe(8);
    expect(r.suri.find((s) => s.name === "원격")!.value).toBe(9);
  });
  it("한자가 없으면 소리만 본다", () => {
    const r = readName("유남영", undefined, [], dict)!;
    expect(r.complete).toBe(false);
    expect(r.suri).toHaveLength(0);
    expect(r.sound.elements).toEqual(["토", "화", "토"]);
  });
  it("일부만 한자(없음/모름 글자)면 수리는 보류", () => {
    const r = readName("유남영", "柳남榮", [], dict)!;
    expect(r.complete).toBe(false);
  });
});
