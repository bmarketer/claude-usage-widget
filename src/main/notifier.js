// src/main/notifier.js
// 90%·95%·100% 경계를 리셋 구간마다 "한 번씩만" 알리는 순수 트래커.
// 실제 알림 표시(IO)는 main.js가 담당 — 여기는 상태 판단만 하고, 상태는 직렬화해 파일에 보관할 수 있다
// (앱을 다시 켜도 같은 구간에서 이미 보낸 알림을 또 보내지 않게).
export const THRESHOLDS = [100, 95, 90]; // 높은 경계부터: 한 번에 지표 하나당 알림 1개만

// 사용량 서버의 resets_at은 조회할 때마다 1초 미만~수 초씩 흔들린다(예: 15:59:59.855 → 16:00:00.246, 2026-11-24 실측).
// 문자열이 달라졌다고 새 구간으로 보면 2분마다 알림이 다시 뜨므로, 10분 이내 차이는 같은 구간으로 본다.
const SAME_WINDOW_MS = 10 * 60_000;

export function sameWindow(a, b) {
  if (!a || !b) return a === b;
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a === b;
  return Math.abs(ta - tb) < SAME_WINDOW_MS;
}

// initial: 저장해 둔 상태 { [metricId]: { resetsAt, crossed: number[] } }
export function createAlertTracker(initial = {}) {
  let state = initial && typeof initial === 'object' ? initial : {};

  function check(metrics) {
    const toNotify = [];
    const next = { ...state };

    for (const m of metrics) {
      if (m.kind !== 'limit') continue; // 크레딧 잔액은 한도 알림 대상이 아님

      const prev = state[m.id];
      const resetsAt = m.resetsAt ?? null;
      const inSameWindow = prev && sameWindow(prev.resetsAt, resetsAt);
      // 같은 구간이면 이미 보낸 경계는 계속 기억한다(89↔90 오르내려도 다시 안 보냄). 새 구간이면 초기화.
      const already = new Set(inSameWindow ? prev.crossed ?? [] : []);

      const reached = THRESHOLDS.filter((t) => m.percent >= t);
      const fresh = reached.filter((t) => !already.has(t));
      if (fresh.length > 0) {
        // 내림차순이라 fresh[0]이 이번에 새로 닿은 가장 높은 경계 — 한꺼번에 여러 개 넘어도 알림은 1개
        toNotify.push({ id: m.id, label: m.label, percent: m.percent, threshold: fresh[0], resetsAt });
      }

      next[m.id] = { resetsAt: inSameWindow ? prev.resetsAt : resetsAt, crossed: [...new Set([...already, ...reached])] };
    }

    state = next;
    return toNotify;
  }

  return { check, getState: () => state };
}
