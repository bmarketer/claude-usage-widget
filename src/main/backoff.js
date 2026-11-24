// src/main/backoff.js
// 사용량 주소가 429(요청 제한)로 거절하면 다음 호출까지 기다릴 시간을 늘린다 — 순수 함수.
// 4분 → 8분 → 16분 → 32분(최대). 서버가 Retry-After를 주면 그보다 짧게 기다리지 않는다.
export const BACKOFF_MIN_MS = 4 * 60_000;
export const BACKOFF_MAX_MS = 32 * 60_000;

export function nextBackoff(prevMs, retryAfterMs = 0) {
  const doubled = prevMs > 0 ? Math.min(BACKOFF_MAX_MS, prevMs * 2) : BACKOFF_MIN_MS;
  return Math.max(doubled, Number(retryAfterMs) || 0);
}
