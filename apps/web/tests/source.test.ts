import { sourceFromUrl, sourceLabel, validSource } from "../src/lib/source";

/** 2026-10-28 유입 경로 꼬리표 */
describe("유입 경로 꼬리표", () => {
  it("utm 꼬리표와 랜딩을 출처|매체|캠페인|랜딩 으로 기억한다", () => {
    expect(sourceFromUrl("?utm_source=youtube&utm_medium=shorts&utm_campaign=gunghap01", "/l/bond")).toBe("youtube|shorts|gunghap01|bond");
    expect(sourceFromUrl("?utm_source=naver_blog", "/")).toBe("naver_blog|||");
    expect(sourceFromUrl("", "/l/newyear")).toBe("direct|||newyear");
  });
  it("꼬리표도 랜딩도 없으면 기억하지 않는다", () => {
    expect(sourceFromUrl("?ref=ABC", "/")).toBeNull();
    expect(sourceFromUrl("", "/start")).toBeNull();
  });
  it("이상한 글자는 지우고, 받을 때 모양을 확인한다", () => {
    expect(sourceFromUrl("?utm_source=<script>&utm_campaign=신년|운세", "/")).toBe("script||신년운세|");
    expect(validSource(encodeURIComponent("youtube|shorts|c1|bond"))).toBe("youtube|shorts|c1|bond");
    expect(validSource("youtube|<x>||")).toBeNull();
    expect(validSource("a|b")).toBeNull();
    expect(validSource(null)).toBeNull();
  });
  it("관리자 화면 이름", () => {
    expect(sourceLabel(null).source).toBe("(꼬리표 없음)");
    expect(sourceLabel("youtube|shorts|c1|bond")).toEqual({ source: "youtube", medium: "shorts", campaign: "c1", landing: "bond" });
  });
});
