import type { SajuJson } from "saju-engine";
import type { Focus } from "@/lib/focus";
import { TEN_GOD_ORDER, buildTenGodDistribution, type TenGodDistribution } from "@/lib/tenGodDistribution";
import { TOPICS, TOPIC_KEYS, type AnyTopicKey, type TopicKey } from "@/lib/topics";

/**
 * 다음에 볼 운세 추천 (2026-10-10 수정안 27: "티 안 나게 관심을 넓혀 주는 여정").
 *
 * 광고처럼 아무 운세나 내미는 게 아니라, 그 사람 사주에서 실제로 두드러진 기운(십신 묶음)을 근거로
 * "이 사이트가 내 사주를 보고 권하는구나" 싶게 고른다. 겁주는 말(액운·흉살)은 쓰지 않는다.
 * 엔진이 판정한 십신 분포(buildTenGodDistribution)만 쓰고 새로 판정하지 않는다.
 */

export type TenGodGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

const GROUP_TOPICS: Record<TenGodGroup, { topics: TopicKey[]; reason: string }> = {
  재성: { topics: ["money", "business"], reason: "재물의 별(財星)이 뚜렷한 사주예요" },
  관성: { topics: ["promotion", "job"], reason: "명예의 별(官星)이 힘 있는 사주예요" },
  식상: { topics: ["job", "business", "love"], reason: "재능의 별(食傷)이 넉넉한 사주예요" },
  인성: { topics: ["nature", "family"], reason: "배움과 도움의 별(印星)이 두터운 사주예요" },
  비겁: { topics: ["relationship", "business"], reason: "나와 같은 기운(比劫)이 강한 사주예요" },
};

const FOCUS_TOPICS: Record<Focus, TopicKey[]> = {
  love: ["love", "marriage"],
  work: ["job", "money"],
  health: ["health"],
  relationship: ["relationship"],
};

const FOCUS_REASON: Record<Focus, string> = {
  love: "궁금해하신 연애·결혼과 이어지는 운세예요",
  work: "궁금해하신 일·재물과 이어지는 운세예요",
  health: "궁금해하신 건강과 이어지는 운세예요",
  relationship: "궁금해하신 사람 관계와 이어지는 운세예요",
};

/** 누구에게나 의미 있는 시간의 흐름 - 사주 근거가 모자랄 때 뒤에 붙는다 */
const TIME_TOPICS: Array<{ topic: TopicKey; reason: string }> = [
  { topic: "year", reason: "올해의 기운이 내 사주에 닿는 방식이에요" },
  { topic: "daeun", reason: "지금 지나고 있는 10년의 큰 흐름이에요" },
];

export interface Recommendation {
  topic: TopicKey;
  reason: string;
}

/** 십신 분포 → 묶음별 비율 (높은 순) */
export function groupShares(dist: TenGodDistribution): Array<{ group: TenGodGroup; percent: number }> {
  const byName = new Map(dist.bars.map((b) => [b.name, b.percent]));
  return TEN_GOD_ORDER.map(({ group, gods }) => ({
    group: group as TenGodGroup,
    percent: gods.reduce((s, g) => s + (byName.get(g) ?? 0), 0),
  })).sort((a, b) => b.percent - a.percent);
}

/**
 * 추천 순서: 가장 강한 기운 → (관심 분야) → 두 번째 기운 → 올해 → 대운 → 나머지.
 * exclude(지금 보는 운세·이미 깊게 연 운세)는 빼고 n개.
 */
export function recommendTopics(
  shares: Array<{ group: TenGodGroup; percent: number }>,
  opts: { focus?: Focus | null; exclude?: Iterable<AnyTopicKey>; n?: number } = {}
): Recommendation[] {
  const n = opts.n ?? 3;
  const exclude = new Set<AnyTopicKey>(opts.exclude ?? []);
  const out: Recommendation[] = [];
  const add = (topic: TopicKey, reason: string) => {
    if (out.length >= n || exclude.has(topic) || out.some((r) => r.topic === topic)) return;
    out.push({ topic, reason });
  };
  const strong = shares.filter((s) => s.percent > 0);
  const fromGroup = (i: number) => {
    const s = strong[i];
    if (!s) return;
    const g = GROUP_TOPICS[s.group];
    for (const t of g.topics) add(t, g.reason);
  };

  fromGroup(0);
  if (opts.focus) for (const t of FOCUS_TOPICS[opts.focus]) add(t, FOCUS_REASON[opts.focus]);
  fromGroup(1);
  for (const t of TIME_TOPICS) add(t.topic, t.reason);
  fromGroup(2);
  for (const t of TOPIC_KEYS) add(t, TOPICS[t].blurb);
  return out;
}

export function recommendFromSaju(saju: SajuJson, opts: { focus?: Focus | null; exclude?: Iterable<AnyTopicKey>; n?: number } = {}): Recommendation[] {
  return recommendTopics(groupShares(buildTenGodDistribution(saju)), opts);
}

/** 화면에 같이 내려보내는 "이 사람의 여정" 정보 */
export interface Journey {
  /** 깊게 보기가 열린 운세 */
  unlocked: AnyTopicKey[];
  /** 운세 보기(990)로 본 운세 */
  basics: TopicKey[];
  /** 내 사주로 고른 다음 운세 (깊게 보기가 안 열린 것만) */
  recommend: Recommendation[];
}
