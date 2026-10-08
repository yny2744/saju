export default function NotFound() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-sm px-5 pt-24 text-center">
      <p className="text-[18px] font-bold" style={{ fontFamily: "var(--font-serif)" }}>
        찾으시는 화면이 없어요
      </p>
      <p className="mt-2 text-[14px]" style={{ color: "var(--color-ink-soft)" }}>
        주소가 바뀌었거나 없어진 화면이에요.
      </p>
      <a href="/" className="btn-primary mt-6 block">
        처음으로
      </a>
    </main>
  );
}
