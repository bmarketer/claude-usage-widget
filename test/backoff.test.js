import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextBackoff, BACKOFF_MIN_MS, BACKOFF_MAX_MS } from '../src/main/backoff.js';
import { USER_AGENT } from '../src/main/usage.js';

test('backoff starts at 4 minutes and doubles up to 32 minutes', () => {
  assert.equal(nextBackoff(0), BACKOFF_MIN_MS);
  assert.equal(nextBackoff(BACKOFF_MIN_MS), 8 * 60_000);
  assert.equal(nextBackoff(16 * 60_000), BACKOFF_MAX_MS);
  assert.equal(nextBackoff(BACKOFF_MAX_MS), BACKOFF_MAX_MS);
});

test('backoff respects a longer Retry-After', () => {
  assert.equal(nextBackoff(0, 10 * 60_000), 10 * 60_000);
  assert.equal(nextBackoff(0, 1000), BACKOFF_MIN_MS);
});

test('User-Agent names this widget, not Claude Code', () => {
  assert.match(USER_AGENT, /^claude-usage-widget\/\d+\.\d+\.\d+ /);
  assert.doesNotMatch(USER_AGENT, /claude-code/);
});
