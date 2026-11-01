import type { MetadataRoute } from "next";
import { TENANT } from "@/tenants";
import { APP_ICON_DIR, APP_NAME, APP_SHORT_NAME, APP_START_URL, APP_THEME_COLOR } from "@/lib/appInfo";

/** 휴대폰 앱(PWA) 설치 정보 (2026-11-01) - /manifest.webmanifest */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: TENANT.brand.description,
    lang: "ko",
    start_url: APP_START_URL,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      { src: `${APP_ICON_DIR}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${APP_ICON_DIR}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${APP_ICON_DIR}/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
