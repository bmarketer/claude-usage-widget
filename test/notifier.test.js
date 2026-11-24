import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAlertTracker, sameWindow } from '../src/main/notifier.js';

const RESET_A = '2026-07-26T09:50:00Z';
const RESET_B = '2026-07-27T09:50:00Z'; // 다른 리셋 창

function limit(id, percent, resetsAt = RESET_A) {
  return { id, label: id, percent, resetsAt, kind: 'limit' };
}

test('no notification below 90%', () => {
  const tracker = createAlertTracker();
  assert.deepEqual(tracker.check([limit('session', 39)]), []);
  assert.deepEqual(tracker.check([limit('session', 89)]), []);
});

test('fires once at 90, 95 and 100 — each only once', () => {
  const tracker = createAlertTracker();
  assert.equal(tracker.check([limit('session', 90)])[0].threshold, 90);
  assert.deepEqual(tracker.check([limit('session', 93)]), []);
  assert.equal(tracker.check([limit('session', 95)])[0].threshold, 95);
  assert.deepEqual(tracker.check([limit('session', 97)]), []);
  assert.equal(tracker.check([limit('session', 100)])[0].threshold, 100);
  assert.deepEqual(tracker.check([limit('session', 100)]), []);
});

test('jumping past several thresholds at once sends one alert for the highest', () => {
  const tracker = createAlertTracker();
  const fired = tracker.check([limit('session', 96)]);
  assert.equal(fired.length, 1);
  assert.equal(fired[0].threshold, 95);
  assert.deepEqual(tracker.check([limit('session', 99)]), []); // 90도 이미 지난 걸로 기억
});

test('jittery resets_at from the server is the same window (no repeat every poll)', () => {
  const tracker = createAlertTracker();
  tracker.check([limit('session', 94, '2026-11-24T15:59:59.855393+00:00')]);
  assert.deepEqual(tracker.check([limit('session', 94, '2026-11-24T16:00:00.246810+00:00')]), []);
  assert.deepEqual(tracker.check([limit('session', 94, '2026-11-24T15:59:58.120000+00:00')]), []);
});

test('dropping below and climbing back in the same window does not re-fire', () => {
  const tracker = createAlertTracker();
  tracker.check([limit('session', 90)]);
  tracker.check([limit('session', 89)]);
  assert.deepEqual(tracker.check([limit('session', 90)]), []);
});

test('a new reset window starts fresh', () => {
  const tracker = createAlertTracker();
  tracker.check([limit('session', 96, RESET_A)]);
  const fired = tracker.check([limit('session', 96, RESET_B)]);
  assert.equal(fired.length, 1);
  assert.equal(fired[0].threshold, 95);
});

test('saved state survives an app restart', () => {
  const first = createAlertTracker();
  first.check([limit('session', 92)]);
  const restored = createAlertTracker(JSON.parse(JSON.stringify(first.getState())));
  assert.deepEqual(restored.check([limit('session', 93)]), []);
  assert.equal(restored.check([limit('session', 95)])[0].threshold, 95);
});

test('credit-kind metrics never notify', () => {
  const tracker = createAlertTracker();
  assert.deepEqual(tracker.check([{ id: 'credit', label: '추가 크레딧', percent: 99, kind: 'credit' }]), []);
});

test('tracks multiple metrics independently', () => {
  const tracker = createAlertTracker();
  const fired = tracker.check([limit('session', 96), limit('weekly', 40)]);
  assert.equal(fired.length, 1);
  assert.equal(fired[0].id, 'session');
  assert.equal(tracker.check([limit('session', 96), limit('weekly', 91)])[0].id, 'weekly');
});

test('sameWindow tolerates small jitter but not a different window', () => {
  assert.equal(sameWindow('2026-11-24T15:59:59.8Z', '2026-11-24T16:00:00.2Z'), true);
  assert.equal(sameWindow(RESET_A, RESET_B), false);
  assert.equal(sameWindow(null, null), true);
  assert.equal(sameWindow(null, RESET_A), false);
});
