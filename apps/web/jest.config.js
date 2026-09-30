/**
 * Phase 4 테스트 설정.
 *
 * React 컴포넌트(app/*.tsx)는 실제 브라우저/DOM 렌더링이 필요한 영역이라
 * 이번 Jest 설정에서는 서버 레이어(src/server/**)만 유닛/통합 테스트 대상으로 삼는다.
 * (섹션 26: API 정상/오류 요청, 검증, 전체 흐름, 보안 - 전부 src/server 안에서
 * 순수 함수/클래스로 구현되어 있어 HTTP 서버를 띄우지 않고도 테스트 가능하다)
 */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: ".",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.jest.json",
    },
  },
};
