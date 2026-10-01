"use strict";
/**
 * Saju Engine - 타입 정의
 *
 * 명세서 7조 "Saju JSON 표준"을 기반으로 하되,
 * Phase 1 범위(사주 8글자 계산)에 맞춰 pillars 관련 필드만 우선 확정한다.
 * elements, tenGods, relations, twelveStages, daeun, seun은 Phase 2 이후에
 * 채워지는 필드이므로 Phase 1에서는 빈 구조로 남겨둔다 (스키마 자리만 유지).
 */
Object.defineProperty(exports, "__esModule", { value: true });
