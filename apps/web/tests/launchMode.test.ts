import { getLaunchMode, isLive } from "../src/lib/launchMode";

describe("launchMode (접수용 review / 승인 후 live)", () => {
  const original = process.env.NEXT_PUBLIC_LAUNCH_MODE;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    else process.env.NEXT_PUBLIC_LAUNCH_MODE = original;
  });

  test("환경변수가 없으면 review다 (안전한 기본값 - 승인 전 기능이 노출되지 않는다)", () => {
    delete process.env.NEXT_PUBLIC_LAUNCH_MODE;
    expect(getLaunchMode()).toBe("review");
    expect(isLive()).toBe(false);
  });

  test("정확히 'live'일 때만 live다", () => {
    process.env.NEXT_PUBLIC_LAUNCH_MODE = "live";
    expect(getLaunchMode()).toBe("live");
    expect(isLive()).toBe(true);
  });

  test("오타나 이상한 값('Live', 'true', 'LIVE ')은 live로 취급하지 않는다", () => {
    for (const v of ["Live", "true", "LIVE ", "production", ""]) {
      process.env.NEXT_PUBLIC_LAUNCH_MODE = v;
      expect(isLive()).toBe(false);
    }
  });
});
