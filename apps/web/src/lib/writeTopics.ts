import { isAnyTopicKey, type AnyTopicKey } from "@/lib/topics";

/**
 * 산 운세를 한꺼번에 쓰기 (2026-10-12 수정안 42·43, 화면용).
 * 모두 동시에 보낸다 - 손님 대기는 가장 느린 하나만큼. 실패한 운세는 2초·5초 쉬고 최대 두 번 더 부른다
 * (서버도 Gemini 붐빔이면 스스로 다시 시도하므로, 여기까지 오면 대개 써진다).
 * 끝까지 실패한 운세 목록을 돌려준다 - 그 운세는 손님이 열거나 책자를 다시 받을 때 마저 쓴다.
 */
const WAITS = [2000, 5000];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function missingTopics(personId: string): Promise<AnyTopicKey[]> {
  const r = await fetch(`/api/persons/${encodeURIComponent(personId)}/written`, { cache: "no-store" });
  if (!r.ok) return [];
  const body = await r.json().catch(() => ({}));
  return Array.isArray(body.missing) ? (body.missing as string[]).filter(isAnyTopicKey) : [];
}

export async function writeTopics(
  personId: string,
  topics: AnyTopicKey[],
  onDone: (topic: AnyTopicKey, ok: boolean) => void = () => {}
): Promise<AnyTopicKey[]> {
  const base = `/api/persons/${encodeURIComponent(personId)}/topics/`;
  const failed: AnyTopicKey[] = [];
  await Promise.all(
    topics.map(async (t) => {
      for (let i = 0; ; i++) {
        try {
          const r = await fetch(base + t, { method: "POST" });
          if (r.ok) {
            onDone(t, true);
            return;
          }
          // 로그인·권한 문제는 다시 불러도 같다
          if (r.status === 401 || r.status === 403 || r.status === 404) break;
        } catch {
          /* 연결 끊김 - 다시 시도 */
        }
        if (i >= WAITS.length) break;
        await sleep(WAITS[i]);
      }
      failed.push(t);
      onDone(t, false);
    })
  );
  return failed;
}
