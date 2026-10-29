import fs from "fs";
import path from "path";
import { TENANT, josa } from "../src/tenants";
import type { TenantConfig } from "../src/tenants/types";
import { BUSINESS_INFO } from "../src/lib/businessInfo";
import { PRICE } from "../src/lib/yeopjeon";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pick = require("../src/tenants/pick");

const DIR = path.join(__dirname, "../src/tenants");
const TENANT_FILES = fs.readdirSync(DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !["index.ts", "types.ts"].includes(f));

/** 2026-10-23 베이직 분리: 설정이 없으면 류결사주, 모르는 고객사는 빌드를 멈춘다, 빌드엔 한 고객사만 */
describe("고객사 설정 (베이직)", () => {
  it("NEXT_PUBLIC_TENANT 가 없으면 류결사주", () => {
    expect(pick.tenantId({})).toBe("ryugyeol");
    expect(pick.tenantId({ NEXT_PUBLIC_TENANT: "" })).toBe("ryugyeol");
    expect(TENANT.id).toBe("ryugyeol");
    expect(TENANT.brand.name).toBe("류결사주");
  });
  it("등록되지 않은 고객사·이상한 값은 빌드를 멈춘다 (남의 사업자 정보가 뜨지 않게)", () => {
    expect(() => pick.tenantFile({ NEXT_PUBLIC_TENANT: "nope" })).toThrow(/알 수 없는 고객사/);
    expect(() => pick.tenantFile({ NEXT_PUBLIC_TENANT: "../x" })).toThrow(/이상해요/);
    expect(() => pick.tenantFile({ NEXT_PUBLIC_TENANT: "types" })).toThrow(/알 수 없는 고객사/);
  });
  it("사업자 정보·가격은 설정에서 읽는다", () => {
    expect(BUSINESS_INFO.serviceName).toBe(TENANT.brand.name);
    expect(BUSINESS_INFO.businessRegistrationNumber).toBe(TENANT.business.businessRegistrationNumber);
    expect(PRICE).toBe(TENANT.prices);
  });
  it("류결사주 값은 분리 전과 같다 (카드사 심사 중 - 바뀌면 안 됨)", () => {
    expect(TENANT.business.businessRegistrationNumber).toBe("485-16-02724");
    expect(TENANT.business.csPhone).toBe("010-2620-2744");
    expect(TENANT.siteUrl).toBe("https://saju-web-khaki.vercel.app");
    // 2026-10-29 유샘: 오픈 가격 (부가세가 딱 떨어지는 값)
    expect([PRICE.BASIC, PRICE.DEEP, PRICE.BUNDLE3, PRICE.BUNDLE12]).toEqual([990, 5500, 9900, 19800]);
  });
  it.each(TENANT_FILES)("%s: 파일 이름 = id, 빈 값 없음", (file) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const t: TenantConfig = require(path.join(DIR, file)).default;
    expect(t.id).toBe(file.replace(/\.ts$/, ""));
    for (const [k, v] of Object.entries({ ...t.brand, ...t.business })) {
      if (k === "channelName") continue; // 없어도 되는 값
      expect(`${k}:${typeof v === "string" && v.trim().length > 0}`).toBe(`${k}:true`);
    }
    for (const [k, v] of Object.entries(t.prices)) expect(`${k}:${Number.isInteger(v) && v > 0}`).toBe(`${k}:true`);
  });
  it("오픈 특가: 행사 후 가격이 지금보다 높고, 부가세가 딱 떨어진다", () => {
    for (const [k, after] of Object.entries(TENANT.openSale?.after ?? {})) {
      const now = PRICE[k as keyof typeof PRICE];
      expect(`${k}:${now % 11}`).toBe(`${k}:0`);
      if (after !== null && after !== undefined) {
        expect(`${k}:${after > now}`).toBe(`${k}:true`);
        expect(`${k}:${after % 11}`).toBe(`${k}:0`);
      }
    }
  });
  it("조사는 받침에 맞춘다", () => {
    expect(josa("류결사주", "은/는")).toBe("류결사주는");
    expect(josa("인자당", "은/는")).toBe("인자당은");
    expect(josa("인자당", "이/가")).toBe("인자당이");
  });
});
