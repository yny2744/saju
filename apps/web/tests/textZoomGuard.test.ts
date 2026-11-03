import { TEXT_ZOOM_GUARD } from "@/lib/textZoomGuard";

// 2026-11-03 카카오톡 글자 확대 보정 스크립트: <body> 맨 앞에 글자 그대로 들어가므로 문법이 깨지면 안 된다
describe("카카오톡 글자 확대 보정 스크립트", () => {
  it("자바스크립트로 읽을 수 있다", () => {
    expect(() => new Function(TEXT_ZOOM_GUARD)).not.toThrow();
  });
  it("카카오톡이 아니면 아무것도 하지 않는다", () => {
    const g = globalThis as unknown as { navigator?: unknown; document?: unknown };
    const saved = { navigator: g.navigator, document: g.document };
    Object.defineProperty(globalThis, "navigator", { value: { userAgent: "Mozilla/5.0 Chrome/130" }, configurable: true });
    Object.defineProperty(globalThis, "document", { value: { documentElement: {} }, configurable: true });
    expect(() => new Function(TEXT_ZOOM_GUARD)()).not.toThrow();
    Object.defineProperty(globalThis, "navigator", { value: saved.navigator, configurable: true });
    Object.defineProperty(globalThis, "document", { value: saved.document, configurable: true });
  });
});
