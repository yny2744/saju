import {
  createUserWithEmail,
  verifyEmailLogin,
  EmailAlreadyUsedError,
  InvalidCredentialsError,
  isValidEmail,
  isValidPassword,
  type User,
} from "./users";
import { createSession, deleteSession, getUserBySessionToken } from "./session";

export interface AuthHandlerResult<T> {
  status: number;
  body: T;
  /** undefined = 쿠키 변경 없음 / {token,expiresAt} = 로그인 쿠키 설정 / null = 쿠키 삭제(로그아웃) */
  session?: { token: string; expiresAt: Date } | null;
}

interface AuthErrorBody {
  error: { code: string; message: string };
}

interface AuthUserBody {
  user: { nickname: string; email: string | null };
}

function toPublicUser(user: User): AuthUserBody["user"] {
  return { nickname: user.nickname, email: user.email };
}

export async function handleSignup(rawBody: unknown): Promise<AuthHandlerResult<AuthUserBody | AuthErrorBody>> {
  if (typeof rawBody !== "object" || rawBody === null) {
    return { status: 400, body: { error: { code: "INVALID_BODY", message: "요청 형식이 올바르지 않습니다." } } };
  }
  const body = rawBody as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";

  if (!isValidEmail(email)) {
    return { status: 400, body: { error: { code: "INVALID_EMAIL", message: "이메일 형식이 올바르지 않습니다." } } };
  }
  if (!isValidPassword(password)) {
    return {
      status: 400,
      body: { error: { code: "INVALID_PASSWORD", message: "비밀번호는 8자 이상 72자 이하로 입력해주세요." } },
    };
  }
  if (!nickname || nickname.length > 20) {
    return { status: 400, body: { error: { code: "INVALID_NICKNAME", message: "닉네임을 1~20자로 입력해주세요." } } };
  }

  try {
    const user = await createUserWithEmail(email, password, nickname);
    const session = await createSession(user.id);
    return { status: 200, body: { user: toPublicUser(user) }, session };
  } catch (err) {
    if (err instanceof EmailAlreadyUsedError) {
      return { status: 409, body: { error: { code: "EMAIL_ALREADY_USED", message: err.message } } };
    }
    // eslint-disable-next-line no-console
    console.error("[auth] 회원가입 실패:", err);
    return { status: 500, body: { error: { code: "SIGNUP_FAILED", message: "회원가입에 실패했습니다. 잠시 후 다시 시도해주세요." } } };
  }
}

export async function handleLogin(rawBody: unknown): Promise<AuthHandlerResult<AuthUserBody | AuthErrorBody>> {
  if (typeof rawBody !== "object" || rawBody === null) {
    return { status: 400, body: { error: { code: "INVALID_BODY", message: "요청 형식이 올바르지 않습니다." } } };
  }
  const body = rawBody as Record<string, unknown>;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return { status: 400, body: { error: { code: "INVALID_BODY", message: "이메일과 비밀번호를 입력해주세요." } } };
  }

  try {
    const user = await verifyEmailLogin(email, password);
    const session = await createSession(user.id);
    return { status: 200, body: { user: toPublicUser(user) }, session };
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return { status: 401, body: { error: { code: "INVALID_CREDENTIALS", message: err.message } } };
    }
    // eslint-disable-next-line no-console
    console.error("[auth] 로그인 실패:", err);
    return { status: 500, body: { error: { code: "LOGIN_FAILED", message: "로그인에 실패했습니다. 잠시 후 다시 시도해주세요." } } };
  }
}

export async function handleLogout(token: string | undefined): Promise<AuthHandlerResult<{ ok: true }>> {
  await deleteSession(token);
  return { status: 200, body: { ok: true }, session: null };
}

export async function handleMe(token: string | undefined): Promise<AuthHandlerResult<{ user: AuthUserBody["user"] | null }>> {
  const user = await getUserBySessionToken(token);
  return { status: 200, body: { user: user ? toPublicUser(user) : null } };
}
