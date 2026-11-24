// src/main/position.js
import { MARGIN } from '../shared/scale.js';

// v0.1의 창 둘레 여백(맥 0px, 윈도우 12px) → v0.2는 MARGIN(16px). 저장된 위치를 한 번만 보정해
// 업데이트 뒤에도 위젯이 같은 자리에 보이게 한다.
export const LAYOUT_VERSION = 2;
export function migratePosition(saved, platform = process.platform) {
  if (!saved || saved.v === LAYOUT_VERSION) return saved ?? {};
  if (!Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return { v: LAYOUT_VERSION };
  const oldMargin = platform === 'win32' ? 12 : 0;
  const d = MARGIN - oldMargin;
  return { x: saved.x - d, y: saved.y - d, v: LAYOUT_VERSION };
}
