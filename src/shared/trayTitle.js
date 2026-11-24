// src/shared/trayTitle.js
// 메뉴바(맥) 숫자와 트레이 툴팁 문구 — 순수 함수.
import { formatCountdown } from './countdown.js';

export const WARN_PERCENT = 85;

function sessionOf(metrics) {
  if (!Array.isArray(metrics)) return null;
  return metrics.find((m) => m.id === 'session') ?? null;
}

// 메뉴바는 흑백 템플릿이 규칙이라 색 대신 85% 이상이면 느낌표를 붙인다.
export function trayTitle(metrics) {
  const s = sessionOf(metrics);
  if (!s || !Number.isFinite(s.percent)) return '';
  return s.percent >= WARN_PERCENT ? `${s.percent}%!` : `${s.percent}%`;
}

export function trayTooltip(metrics, now = Date.now()) {
  const s = sessionOf(metrics);
  if (!s || !Number.isFinite(s.percent)) return '사용량';
  const remain = formatCountdown(s.resetsAt, now);
  return remain ? `사용량 · 세션 ${s.percent}% · 리셋까지 ${remain}` : `사용량 · 세션 ${s.percent}%`;
}
