"use client";

import { isAuthEnabled } from "@/lib/launchMode";
import { profileSummary, type SavedProfile } from "@/lib/profileView";
import { ComingSoon } from "@/components/ComingSoon";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readA11yPrefs, saveA11yPrefs, type A11yPrefs } from "@/components/AccessibilityInit";
import { YeopjeonPanel } from "@/components/yeopjeon/YeopjeonPanel";

/**
 * 내 복주머니(마이페이지) — Phase 10.5, 용사주 벤치마킹에서 구조만 차용.
 *
 * 구현 범위: 프로필, 엽전 잔액·내 사주풀이(사람별 12가지 운)·친구 초대·이용내역, 저장한 사람, 알림 설정,
 * 표시 설정, 계정 관리. 엽전은 선물·보상 + 계좌 입금 충전(2026-10-10, /charge).
 *
 * 로그인 안 한 상태로 들어오면 /login으로 보낸다.
 */

type User = { nickname: string; email: string | null; marketingAgreed?: boolean };


function MyPageBody() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | "loading">("loading");
  const [prefs, setPrefs] = useState<A11yPrefs>({ fontSize: "normal", contrast: "normal" });
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setPrefs(readA11yPrefs());
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setMarketing(Boolean(data.user.marketingAgreed));
        fetch("/api/profiles")
          .then((r) => (r.ok ? r.json() : { profiles: [] }))
          .then((d) => setProfiles(d.profiles ?? []))
          .catch(() => {});
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  function updatePrefs(next: Partial<A11yPrefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    saveA11yPrefs(merged);
  }

  async function removeProfile(id: string) {
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) setProfiles((list) => list.filter((p) => p.id !== id));
  }

  async function toggleMarketing(agreed: boolean) {
    setMarketing(agreed);
    const res = await fetch("/api/auth/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agreed }),
    }).catch(() => null);
    if (!res?.ok) setMarketing(!agreed); // 실패하면 원래대로
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    await fetch("/api/auth/delete-account", { method: "DELETE" }).catch(() => {});
    router.push("/");
    router.refresh();
  }

  if (user === "loading") {
    return (
      <main className="mx-auto min-h-screen max-w-sm px-5 pt-20 text-center text-sm" style={{ color: "var(--color-ink-faint)" }}>
        불러오는 중...
      </main>
    );
  }
  if (!user) return null; // router.replace가 처리, 잠깐 빈 화면

  return (
    <>
      <main className="mx-auto min-h-screen max-w-sm px-5 pb-16 pt-12 sm:pt-16">
        <h1 className="mb-7 text-[24px] font-bold">내 복주머니</h1>

        {/* 프로필 */}
        <section className="mb-7 rounded-2xl p-4" style={{ backgroundColor: "var(--color-paper-soft)" }}>
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
              style={{ backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)" }}
            >
              {user.nickname.charAt(0)}
            </div>
            <div>
              <p className="font-semibold">{user.nickname}</p>
              <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                {user.email ? user.email : "카카오로 가입된 계정입니다"}
              </p>
            </div>
          </div>
        </section>

        <YeopjeonPanel />

        {/* 저장한 사람 */}
        <section className="mb-7">
          <h2 className="section-label mb-3">저장한 사람</h2>
          {profiles.length === 0 ? (
            <p className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-paper-soft)", color: "var(--color-ink-faint)" }}>
              아직 저장한 사람이 없어요. 사주를 볼 때 저장하면 여기에 모여요.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--color-line)" }}>
              {profiles.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 px-4 py-3"
                  style={i > 0 ? { borderTop: "1px solid var(--color-line)" } : undefined}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {p.name}
                      {p.hanjaName && (
                        <span className="ml-1.5 font-normal" style={{ fontFamily: "var(--font-serif)", color: "var(--color-ink-soft)" }}>
                          {p.hanjaName}
                        </span>
                      )}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-ink-faint)" }}>
                      {profileSummary(p)}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeProfile(p.id)} className="shrink-0 text-xs underline underline-offset-4" style={{ color: "var(--color-ink-faint)" }}>
                    삭제
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 알림 설정 (마케팅 수신 동의/철회) */}
        <section className="mb-7">
          <h2 className="section-label mb-3">알림 설정</h2>
          <label className="flex items-center justify-between rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "var(--color-paper-soft)" }}>
            새 운세·이벤트 소식 받기
            <input type="checkbox" checked={marketing} onChange={(e) => toggleMarketing(e.target.checked)} className="h-5 w-5" />
          </label>
        </section>

        {/* 표시 설정 */}
        <section className="mb-7">
          <h2 className="section-label mb-3">표시 설정</h2>

          <div className="mb-4">
            <p className="mb-1.5 text-sm font-medium">글자 크기</p>
            <div className="segmented" role="radiogroup" aria-label="글자 크기">
              {([
                ["normal", "기본"],
                ["large", "크게"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.fontSize === value}
                  data-active={prefs.fontSize === value}
                  onClick={() => updatePrefs({ fontSize: value })}
                  className="segmented-option"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium">색상 대비</p>
            <div className="segmented" role="radiogroup" aria-label="색상 대비">
              {([
                ["normal", "기본"],
                ["high", "높게"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={prefs.contrast === value}
                  data-active={prefs.contrast === value}
                  onClick={() => updatePrefs({ contrast: value })}
                  className="segmented-option"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 계정 관리 */}
        <section>
          <h2 className="section-label mb-3">계정 관리</h2>
          <button
            type="button"
            onClick={handleLogout}
            className="mb-2.5 block w-full rounded-xl px-4 py-3 text-left text-sm"
            style={{ border: "1px solid var(--color-line)" }}
          >
            로그아웃
          </button>

          {!confirmingDelete ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="block w-full rounded-xl px-4 py-3 text-left text-sm"
              style={{ color: "var(--color-danger)" }}
            >
              회원탈퇴
            </button>
          ) : (
            <div className="rounded-xl p-4" style={{ backgroundColor: "var(--color-danger-soft)" }}>
              <p className="mb-3 text-sm" style={{ color: "var(--color-danger)" }}>
                정말 탈퇴하시겠어요? 계정 정보, 저장한 사람, 사주풀이, 엽전이 모두 삭제되며 되돌릴 수 없어요.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="flex-1 rounded-full py-2 text-sm"
                  style={{ border: "1px solid var(--color-line)" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 rounded-full py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--color-accent)" }}
                >
                  {deleting ? "처리 중..." : "탈퇴하기"}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

export default function MyPage() {
  return isAuthEnabled() ? <MyPageBody /> : <ComingSoon title="내 복주머니" />;
}
