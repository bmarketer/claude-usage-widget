import { test } from 'node:test';
import assert from 'node:assert/strict';
import { easeOutCubic, tweenValue } from '../src/main/tween.js';

test('easeOutCubic: starts at 0, ends at 1', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
});

test('easeOutCubic: clamps out-of-range progress', () => {
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(1.5), 1);
});

test('easeOutCubic: monotonically increasing between 0 and 1', () => {
  let prev = -Infinity;
  for (let t = 0; t <= 1; t += 0.05) {
    const v = easeOutCubic(t);
    assert.ok(v >= prev, `expected ${v} >= ${prev} at t=${t}`);
    prev = v;
  }
});

test('tweenValue: reaches from/to at the endpoints', () => {
  assert.equal(tweenValue(220, 442, 0), 220);
  assert.equal(tweenValue(220, 442, 1), 442);
});

test('tweenValue: intermediate progress stays within [from, to] for a growing tween', () => {
  const v = tweenValue(220, 442, 0.5);
  assert.ok(v > 220 && v < 442, `expected 220 < ${v} < 442`);
});

test('tweenValue: also works shrinking (to < from)', () => {
  assert.equal(tweenValue(442, 220, 0), 442);
  assert.equal(tweenValue(442, 220, 1), 220);
  const v = tweenValue(442, 220, 0.5);
  assert.ok(v < 442 && v > 220, `expected 220 < ${v} < 442`);
});
