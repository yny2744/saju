import { calculateRelations } from "../src/relations";
import { STEM_COMBINATIONS } from "../src/rules/relationTables";
import type { FourPillars } from "../src/types";

const STEMS = ["갑","을","병","정","무","기","경","신","임","계"];
let dup = 0;
const coverage = new Map<string, number>(STEM_COMBINATIONS.map(c => [c.pair.join(""), 0]));
let total = 0;

for (const y of STEMS) for (const m of STEMS) for (const d of STEMS) for (const h of STEMS) {
  total++;
  const pillars: FourPillars = {
    year: { heavenlyStem: y, earthlyBranch: "자", ganzhi: `${y}자` },
    month: { heavenlyStem: m, earthlyBranch: "축", ganzhi: `${m}축` }, // 자축은 육합이라 지지쪽 오염 없게 별도 검증만 목적이면 상관없음(관계는 독립 카운트)
    day: { heavenlyStem: d, earthlyBranch: "인", ganzhi: `${d}인` },
    hour: { heavenlyStem: h, earthlyBranch: "묘", ganzhi: `${h}묘` },
  };
  const r = calculateRelations(pillars);
  const seen = new Set<string>();
  for (const c of r.combination.filter(c => c.type === "천간합")) {
    const k = [...c.positions].sort().join(",");
    if (seen.has(k)) dup++;
    seen.add(k);
    const sortedChars = [...c.characters].sort().join("");
    const tableKey = STEM_COMBINATIONS.find(x => [...x.pair].sort().join("") === sortedChars)?.pair.join("");
    if (tableKey) coverage.set(tableKey, (coverage.get(tableKey) ?? 0) + 1);
  }
}
console.log(`총 ${total}개 천간 조합 전수조사`);
console.log(`중복 판정: ${dup}건`);
for (const [k,v] of coverage.entries()) console.log(`${k}: ${v}회 ${v===0?"⚠️":""}`);
