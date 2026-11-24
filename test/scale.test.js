import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampScale,
  stepScale,
  scaleFromDrag,
  windowWidth,
  windowHeight,
  formatScale,
  SCALE_MIN,
  SCALE_MAX,
} from '../src/shared/scale.js';

test('clampScale snaps to 0.1 and stays within 0.8~1.4', () => {
  assert.equal(clampScale(1), 1);
  assert.equal(clampScale(1.04), 1);
  assert.equal(clampScale(1.06), 1.1);
  assert.equal(clampScale(0.5), SCALE_MIN);
  assert.equal(clampScale(3), SCALE_MAX);
  assert.equal(clampScale(0.7 + 0.2), 0.9); // 부동소수 오차 제거
});

test('clampScale falls back to 1.0 for non-numbers', () => {
  assert.equal(clampScale(undefined), 1);
  assert.equal(clampScale('abc'), 1);
  assert.equal(clampScale(NaN), 1);
  assert.equal(clampScale('1.2'), 1.2);
});

test('stepScale moves one step and stops at the ends', () => {
  assert.equal(stepScale(1, 1), 1.1);
  assert.equal(stepScale(1, -1), 0.9);
  assert.equal(stepScale(1.4, 1), 1.4);
  assert.equal(stepScale(0.8, -1), 0.8);
});

test('scaleFromDrag follows the handle: +56px on 280px is +0.2', () => {
  assert.equal(scaleFromDrag(1, 56), 1.2);
  assert.equal(scaleFromDrag(1, -28), 0.9);
  assert.equal(scaleFromDrag(1, 10), 1); // 반 단계 미만은 그대로
  assert.equal(scaleFromDrag(1, 1000), 1.4);
});

test('window size includes the transparent margin and scales with it', () => {
  assert.equal(windowWidth(1), 312);
  assert.equal(windowWidth(0.8), 250);
  assert.equal(windowWidth(1.4), 437);
  assert.equal(windowHeight(200, 1), 232);
  assert.equal(windowHeight(200, 1.2), 279);
});

test('formatScale shows one decimal', () => {
  assert.equal(formatScale(1), '1.0배');
  assert.equal(formatScale(1.2), '1.2배');
});
