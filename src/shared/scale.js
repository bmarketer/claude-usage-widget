// src/shared/scale.js
// 위젯 배율(크기 조절) 계산 — main·renderer 공용 순수 함수.
// 위젯은 CSS 280px 기준으로 그려지고, 창 전체를 webContents 줌으로 같은 비율로 키우고 줄인다.

export const BASE_WIDTH = 280; // 위젯 본체 폭 (CSS px, 배율 1.0)
export const MARGIN = 16; // 상태 테두리 글로우·그림자가 잘리지 않게 위젯 둘레에 두는 투명 여백 (CSS px)
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.4;
export const SCALE_STEP = 0.1;
export const SCALE_DEFAULT = 1.0;

export const SCALE_PRESETS = [
  { label: '작게', value: 0.8 },
  { label: '보통', value: 1.0 },
  { label: '크게', value: 1.4 },
];

// 0.1 단위로 맞추고 최소·최대 안으로. 숫자가 아니면 기본값.
export function clampScale(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return SCALE_DEFAULT;
  const snapped = Math.round(n / SCALE_STEP) * SCALE_STEP;
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, snapped));
  return Math.round(clamped * 10) / 10; // 부동소수 오차 제거 (0.30000000000000004 같은 값 방지)
}

// 한 단계 키우기(+1)·줄이기(-1)
export function stepScale(scale, direction) {
  return clampScale(clampScale(scale) + Math.sign(direction) * SCALE_STEP);
}

// 모서리 손잡이를 가로로 dx(화면 px)만큼 끌었을 때의 새 배율.
// 위젯 화면 폭(BASE_WIDTH × 배율)이 손잡이를 따라가도록 계산한다.
export function scaleFromDrag(startScale, dx) {
  return clampScale(clampScale(startScale) + Number(dx) / BASE_WIDTH);
}

// 배율에서 창(투명 여백 포함) 크기 계산. contentHeight는 여백을 뺀 위젯 높이(CSS px).
export function windowWidth(scale) {
  return Math.round((BASE_WIDTH + MARGIN * 2) * clampScale(scale));
}

export function windowHeight(contentHeight, scale) {
  return Math.ceil((Number(contentHeight) + MARGIN * 2) * clampScale(scale));
}

export function formatScale(scale) {
  return `${clampScale(scale).toFixed(1)}배`;
}
