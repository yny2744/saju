import { StatelessTokenResultStore, InMemoryResultStore, saveResult, getResult } from "../src/server/resultStore";
import type { AnalyzeResultResponse } from "../src/server/types";

function fakeResult(overrides: Partial<AnalyzeResultResponse> = {}): AnalyzeResultResponse {
  return {
    nickname: "테스트유저",
    saju: { birth: { date: "1990-05-20" } } as unknown as AnalyzeResultResponse["saju"],
    interpretation: {} as unknown as AnalyzeResultResponse["interpretation"],
    ...overrides,
  };
}

describe("resultStore - 기본 함수형 API (getResultStore() 기본 구현체 = StatelessTokenResultStore)", () => {
  test("저장 후 같은 id로 조회하면 그대로 돌아온다", () => {
    const value = fakeResult();
    const { id } = saveResult(value);
    expect(getResult(id)).toEqual(value);
  });

  test("발급된 id에는 생년월일 등 출생정보가 원문으로 포함되지 않는다 (URL 개인정보 노출 금지)", () => {
    const value = fakeResult();
    const { id } = saveResult(value);
    expect(id).not.toContain("1990");
    expect(id).not.toContain("05-20");
    expect(id).not.toContain("테스트유저");
  });

  test("존재하지 않는 id를 조회하면 null을 반환한다", () => {
    expect(getResult("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  test("서로 다른 저장은 서로 다른 id를 받는다 (예측 불가능성)", () => {
    const a = saveResult(fakeResult());
    const b = saveResult(fakeResult());
    expect(a.id).not.toBe(b.id);
  });
});

describe("StatelessTokenResultStore - Phase4 최종 수정 지시서 3조/4조", () => {
  test("여러 '인스턴스'(별도 클래스 인스턴스)에서도 동일 토큰을 복호화할 수 있다 (서버리스 멀티 인스턴스 시뮬레이션)", () => {
    const instanceA = new StatelessTokenResultStore();
    const instanceB = new StatelessTokenResultStore();

    const value = fakeResult({ nickname: "인스턴스간테스트" });
    const { id } = instanceA.save(value);

    // 서로 다른 인스턴스(=다른 서버 프로세스를 흉내)여도, 같은 비밀키(RESULT_TOKEN_SECRET
    // 또는 로컬 기본값)를 사용하므로 어떤 인스턴스에서도 그대로 조회 가능해야 한다.
    // 이는 in-memory Map 방식이었다면 절대 성립할 수 없는 속성이다.
    expect(instanceB.get(id)).toEqual(value);
  });

  test("토큰이 위변조되면(한 글자 변경) 조회에 실패한다 (평문 노출 금지 + 위변조 탐지)", () => {
    const store = new StatelessTokenResultStore();
    const { id } = store.save(fakeResult());

    // 맨 마지막 글자가 아니라 id의 첫 글자(IV 세그먼트의 시작)를 바꾼다. IV는
    // 12바이트 고정 길이라 base64url로 인코딩하면 나머지 없이 정확히 16글자가
    // 되므로, 마지막 문자만 있는 base64 그룹의 "패딩 비트"에 걸릴 일이 없다.
    // (참고: id 맨 끝 글자를 바꾸는 방식은 암호문 길이가 3의 배수+1바이트로
    // 끝나는 경우 그 글자의 하위 비트가 디코딩에 반영되지 않는 base64 패딩
    // 특성 때문에 극히 드물게 "바꿔도 실제로는 안 바뀌는" 값이 나올 수 있어
    // 삭제했다 - 보안 자체(GCM 인증)는 문제없지만 이 테스트가 그 경우를
    // 놓칠 수 있었다.)
    const tampered = (id[0] === "A" ? "B" : "A") + id.slice(1);
    expect(store.get(tampered)).toBeNull();
  });

  test("토큰 자체는 base64url 세 조각(iv.tag.data)으로 구성되고, JSON을 그대로 담지 않는다", () => {
    const store = new StatelessTokenResultStore();
    const { id } = store.save(fakeResult());

    const parts = id.split(".");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(() => JSON.parse(Buffer.from(part, "base64url").toString("utf8"))).toThrow();
    }
  });

  test("완전히 형식이 다른 문자열(예: 옛 UUID)을 조회하면 에러 없이 null을 반환한다", () => {
    const store = new StatelessTokenResultStore();
    expect(store.get("00000000-0000-0000-0000-000000000000")).toBeNull();
    expect(store.get("")).toBeNull();
    expect(store.get("not.a.validtoken")).toBeNull();
  });

  test("만료 시각이 지난 토큰은 null을 반환한다", () => {
    const store = new StatelessTokenResultStore();
    const realNow = Date.now;
    try {
      Date.now = () => realNow() - 1000; // 저장 시점을 과거로 고정
      const { id } = store.save(fakeResult());
      Date.now = realNow;

      const future = realNow() + 31 * 60 * 1000; // TTL(30분)을 넘긴 미래 시점
      Date.now = () => future;
      expect(store.get(id)).toBeNull();
    } finally {
      Date.now = realNow;
    }
  });
});

describe("InMemoryResultStore - 로컬 단일 프로세스 개발용 보조 구현체", () => {
  test("ResultStore 인터페이스를 그대로 구현하며, 단일 인스턴스 내에서는 정상 동작한다", () => {
    const store = new InMemoryResultStore();
    const value = fakeResult();
    const { id } = store.save(value);
    expect(store.get(id)).toEqual(value);
  });

  test("다른 인스턴스에서는 조회할 수 없다 (멀티 인스턴스 환경에서 이 구현체를 쓰면 안 되는 이유를 보여주는 회귀 테스트)", () => {
    const instanceA = new InMemoryResultStore();
    const instanceB = new InMemoryResultStore();
    const { id } = instanceA.save(fakeResult());
    expect(instanceB.get(id)).toBeNull();
  });
});
