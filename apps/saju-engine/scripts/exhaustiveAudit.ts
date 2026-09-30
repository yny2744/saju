/**
 * GPT 요청 크로스체크용 전수조사 스크립트.
 * 12개 지지로 만들 수 있는 모든 4기둥(순서 포함, 중복 허용) 조합 = 12^4 = 20,736가지를
 * 전부 실행해서:
 *   1) 같은 (type, 기둥조합)이 두 번 이상 기록되는 "진짜 중복 버그"가 있는지
 *   2) 규칙 테이블의 모든 항목이 최소 1번 이상 실제로 매칭되는지 (죽은 규칙/누락 로직 탐지)
 * 를 검증한다. 천간은 모두 "갑"으로 고정해서 지지 관계 판정에만 집중한다
 * (천간합은 이미 별도 pairwise 로직이라 이 전수조사 범위에서 제외).
 */
import { calculateRelations } from "../src/relations";
import {
  STEM_COMBINATIONS,
  BRANCH_LIU_HE,
  BRANCH_SAM_HAP,
  BRANCH_BANG_HAP,
  BRANCH_CHUNG,
  BRANCH_SAM_HYEONG_GROUPS,
  BRANCH_JA_MYO_HYEONG,
  BRANCH_JA_HYEONG_LIST,
  BRANCH_PA,
  BRANCH_HAE,
} from "../src/rules/relationTables";
import type { FourPillars } from "../src/types";

const BRANCHES = ["자","축","인","묘","진","사","오","미","신","유","술","해"];

let duplicateBugCount = 0;
const duplicateExamples: string[] = [];

// 커버리지 카운터: 각 테이블 항목이 몇 번 매칭됐는지
const liuHeCoverage = new Map<string, number>(BRANCH_LIU_HE.map(c => [c.pair.join(""), 0]));
const samHapFullCoverage = new Map<string, number>(BRANCH_SAM_HAP.map(c => [c.group.join(""), 0]));
const samHapHalfCoverage = new Map<string, number>(BRANCH_SAM_HAP.map(c => [c.group.join(""), 0]));
const bangHapCoverage = new Map<string, number>(BRANCH_BANG_HAP.map(c => [c.group.join(""), 0]));
const chungCoverage = new Map<string, number>(BRANCH_CHUNG.map(c => [c.join(""), 0]));
const samHyeongFullCoverage = new Map<string, number>(BRANCH_SAM_HYEONG_GROUPS.map(c => [c.group.join(""), 0]));
const samHyeongHalfCoverage = new Map<string, number>(BRANCH_SAM_HYEONG_GROUPS.map(c => [c.group.join(""), 0]));
const jaMyoCoverage = { count: 0 };
const jaHyeongCoverage = new Map<string, number>(BRANCH_JA_HYEONG_LIST.map(b => [b, 0]));
const paCoverage = new Map<string, number>(BRANCH_PA.map(c => [c.join(""), 0]));
const haeCoverage = new Map<string, number>(BRANCH_HAE.map(c => [c.join(""), 0]));

let totalCombos = 0;

function key(pair: string[]): string {
  return [...pair].sort().join("");
}

for (const y of BRANCHES) {
  for (const m of BRANCHES) {
    for (const d of BRANCHES) {
      for (const h of BRANCHES) {
        totalCombos++;
        const pillars: FourPillars = {
          year: { heavenlyStem: "갑", earthlyBranch: y, ganzhi: `갑${y}` },
          month: { heavenlyStem: "갑", earthlyBranch: m, ganzhi: `갑${m}` },
          day: { heavenlyStem: "갑", earthlyBranch: d, ganzhi: `갑${d}` },
          hour: { heavenlyStem: "갑", earthlyBranch: h, ganzhi: `갑${h}` },
        };
        const r = calculateRelations(pillars);

        // --- 중복 판정 체크: 같은 (type + positions정렬) 조합이 2번 이상 나오면 버그 ---
        const seen = new Set<string>();
        const allEntries = [
          ...r.combination.map(c => `combo:${c.type}:${[...c.positions].sort().join(",")}`),
          ...r.clash.map(c => `clash:${[...c.positions].sort().join(",")}`),
          ...r.punishment.map(c => `pun:${c.type}:${[...c.positions].sort().join(",")}`),
          ...r.destruction.map(c => `dest:${[...c.positions].sort().join(",")}`),
          ...r.harm.map(c => `harm:${[...c.positions].sort().join(",")}`),
        ];
        for (const e of allEntries) {
          if (seen.has(e)) {
            duplicateBugCount++;
            if (duplicateExamples.length < 5) {
              duplicateExamples.push(`${y}-${m}-${d}-${h}: ${e}`);
            }
          }
          seen.add(e);
        }

        // --- 커버리지 집계 ---
        for (const c of r.combination) {
          if (c.type === "육합") {
            const k = key(c.characters);
            const tableKey = BRANCH_LIU_HE.find(x => key(x.pair) === k)?.pair.join("");
            if (tableKey) liuHeCoverage.set(tableKey, (liuHeCoverage.get(tableKey) ?? 0) + 1);
          }
          if (c.type === "삼합") {
            const k = key(c.characters);
            const tableKey = BRANCH_SAM_HAP.find(x => key(x.group) === k)?.group.join("");
            if (tableKey) samHapFullCoverage.set(tableKey, (samHapFullCoverage.get(tableKey) ?? 0) + 1);
          }
          if (c.type === "반합") {
            for (const sam of BRANCH_SAM_HAP) {
              if (c.characters.every(ch => sam.group.includes(ch))) {
                const tk = sam.group.join("");
                samHapHalfCoverage.set(tk, (samHapHalfCoverage.get(tk) ?? 0) + 1);
              }
            }
          }
          if (c.type === "방합") {
            const k = key(c.characters);
            const tableKey = BRANCH_BANG_HAP.find(x => key(x.group) === k)?.group.join("");
            if (tableKey) bangHapCoverage.set(tableKey, (bangHapCoverage.get(tableKey) ?? 0) + 1);
          }
        }
        for (const c of r.clash) {
          const tableKey = BRANCH_CHUNG.find(x => key(x) === key(c.branches))?.join("");
          if (tableKey) chungCoverage.set(tableKey, (chungCoverage.get(tableKey) ?? 0) + 1);
        }
        for (const p of r.punishment) {
          if (p.type === "무은지형" || p.type === "지세지형") {
            const k = key(p.branches);
            const tableKey = BRANCH_SAM_HYEONG_GROUPS.find(x => key(x.group) === k)?.group.join("");
            if (tableKey) samHyeongFullCoverage.set(tableKey, (samHyeongFullCoverage.get(tableKey) ?? 0) + 1);
          }
          if (p.type === "반형") {
            for (const hy of BRANCH_SAM_HYEONG_GROUPS) {
              if (p.branches.every(ch => hy.group.includes(ch))) {
                const tk = hy.group.join("");
                samHyeongHalfCoverage.set(tk, (samHyeongHalfCoverage.get(tk) ?? 0) + 1);
              }
            }
          }
          if (p.type === "무례지형") jaMyoCoverage.count++;
          if (p.type === "자형") {
            jaHyeongCoverage.set(p.branches[0], (jaHyeongCoverage.get(p.branches[0]) ?? 0) + 1);
          }
        }
        for (const d2 of r.destruction) {
          const tableKey = BRANCH_PA.find(x => key(x) === key(d2.branches))?.join("");
          if (tableKey) paCoverage.set(tableKey, (paCoverage.get(tableKey) ?? 0) + 1);
        }
        for (const hEntry of r.harm) {
          const tableKey = BRANCH_HAE.find(x => key(x) === key(hEntry.branches))?.join("");
          if (tableKey) haeCoverage.set(tableKey, (haeCoverage.get(tableKey) ?? 0) + 1);
        }
      }
    }
  }
}

console.log(`총 ${totalCombos}개 조합 전수조사 완료\n`);

console.log("=== 1. 중복 판정 버그 ===");
console.log(`발견된 중복: ${duplicateBugCount}건`);
if (duplicateExamples.length > 0) {
  console.log("예시:", duplicateExamples);
}

console.log("\n=== 2. 규칙 테이블 커버리지 (0이면 죽은 규칙/누락 의심) ===");
const printCoverage = (name: string, map: Map<string, number>) => {
  console.log(`\n[${name}]`);
  for (const [k, v] of map.entries()) {
    console.log(`  ${k}: ${v}회 매칭 ${v === 0 ? "  ⚠️ 0회 - 확인 필요" : ""}`);
  }
};
printCoverage("육합", liuHeCoverage);
printCoverage("삼합(완전)", samHapFullCoverage);
printCoverage("삼합(반합)", samHapHalfCoverage);
printCoverage("방합", bangHapCoverage);
printCoverage("충", chungCoverage);
printCoverage("삼형(완전)", samHyeongFullCoverage);
printCoverage("삼형(반형)", samHyeongHalfCoverage);
printCoverage("파", paCoverage);
printCoverage("해", haeCoverage);
console.log(`\n[자묘형] ${jaMyoCoverage.count}회 매칭 ${jaMyoCoverage.count === 0 ? "⚠️" : ""}`);
printCoverage("자형", jaHyeongCoverage);
