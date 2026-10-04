/** 접수용(review) 모드에서 승인 후 기능 주소로 직접 들어왔을 때 보여주는 안내 화면. */
export function ComingSoon({ title }: { title: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-sm px-5 pt-24 text-center">
      <h1 className="mb-2 text-[22px] font-bold">{title}</h1>
      <p className="mb-7 text-sm" style={{ color: "var(--color-ink-soft)" }}>
        아직 준비 중인 기능이에요. 곧 만나요.
      </p>
      <a href="/" className="btn-secondary inline-block px-8">
        처음으로
      </a>
    </main>
  );
}
