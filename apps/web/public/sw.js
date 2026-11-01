/*
 * 휴대폰 앱(PWA) 서비스 워커 (2026-11-01).
 * 지금은 설치만 가능하게 하는 최소 구성 - 화면을 기기에 저장(캐시)하지 않는다 (늘 최신 사이트를 그대로 보여 준다).
 * 다음 단계에서 매일 아침 "오늘의 운세" 알림(push)을 여기에 붙인다.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
