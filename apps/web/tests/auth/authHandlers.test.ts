import { isValidEmail, isValidPassword } from "../../src/server/auth/users";
import { handleSignup, handleLogin, handleLogout, handleMe } from "../../src/server/auth/authHandlers";

/**
 * 이 테스트 파일은 DATABASE_URL이 없는 환경(이 테스트 실행 환경)에서도
 * 검증 가능한 부분만 다룬다:
 *   - 순수 함수(isValidEmail/isValidPassword)
 *   - DB 호출 전에 끝나는 입력값 검증(400대 에러)
 *   - 토큰이 없을 때 DB를 아예 안 거치는 경로(handleMe, handleLogout)
 *
 * "유효한 입력 + 실제 가입/로그인 성공" 시나리오는 DATABASE_URL이 설정된
 * 환경(Vercel + Neon 연결 후)에서만 검증 가능하다 - 그 전까지는 여기서
 * "DB 없으면 500으로 명확히 실패한다"(조용히 가짜 성공 처리하지 않는다)는
 * 것만 확인한다.
 */

describe("isValidEmail", () => {
  test("정상 이메일 형식을 통과시킨다", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });
  test("@ 또는 .이 없는 문자열은 거부한다", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
  });
});

describe("isValidPassword", () => {
  test("8자 미만은 거부한다", () => {
    expect(isValidPassword("short1")).toBe(false);
  });
  test("8~72자는 통과시킨다", () => {
    expect(isValidPassword("password123")).toBe(true);
  });
  test("72자 초과는 거부한다 (bcrypt 72바이트 한계)", () => {
    expect(isValidPassword("a".repeat(73))).toBe(false);
  });
});

describe("handleSignup - 입력값 검증 (DB 호출 전에 끝남)", () => {
  test("이메일 형식이 잘못되면 400을 반환한다", async () => {
    const res = await handleSignup({ email: "bad-email", password: "password123", nickname: "홍길동" });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe("INVALID_EMAIL");
  });

  test("비밀번호가 8자 미만이면 400을 반환한다", async () => {
    const res = await handleSignup({ email: "user@example.com", password: "short", nickname: "홍길동" });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe("INVALID_PASSWORD");
  });

  test("닉네임이 비어있으면 400을 반환한다", async () => {
    const res = await handleSignup({ email: "user@example.com", password: "password123", nickname: "" });
    expect(res.status).toBe(400);
    expect((res.body as { error: { code: string } }).error.code).toBe("INVALID_NICKNAME");
  });

  test("본문이 객체가 아니면 400을 반환한다", async () => {
    const res = await handleSignup("문자열입니다");
    expect(res.status).toBe(400);
  });

  test("입력값은 유효하지만 DB가 없으면(테스트 환경) 500으로 명확히 실패한다 - 조용히 가짜 성공 처리하지 않는다", async () => {
    const res = await handleSignup({ email: "user@example.com", password: "password123", nickname: "홍길동" });
    expect(res.status).toBe(500);
    expect(res.session).toBeUndefined();
  });
});

describe("handleLogin - 입력값 검증", () => {
  test("이메일 또는 비밀번호가 없으면 400을 반환한다", async () => {
    const res = await handleLogin({ email: "", password: "" });
    expect(res.status).toBe(400);
  });

  test("입력값은 유효하지만 DB가 없으면 500으로 명확히 실패한다", async () => {
    const res = await handleLogin({ email: "user@example.com", password: "password123" });
    expect(res.status).toBe(500);
  });
});

describe("handleLogout", () => {
  test("토큰이 없어도 정상적으로 처리되고, 쿠키 삭제 신호(session: null)를 반환한다", async () => {
    const res = await handleLogout(undefined);
    expect(res.status).toBe(200);
    expect(res.session).toBeNull();
  });
});

describe("handleMe", () => {
  test("토큰이 없으면 DB를 거치지 않고 바로 user: null을 반환한다", async () => {
    const res = await handleMe(undefined);
    expect(res.status).toBe(200);
    expect((res.body as { user: unknown }).user).toBeNull();
  });
});
