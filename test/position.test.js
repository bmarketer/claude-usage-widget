import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migratePosition, LAYOUT_VERSION } from '../src/main/position.js';

test('mac v0.1 position (no margin) shifts by 16px once', () => {
  assert.deepEqual(migratePosition({ x: 885, y: 43 }, 'darwin'), { x: 869, y: 27, v: LAYOUT_VERSION });
});

test('windows v0.1 position (12px margin) shifts by 4px', () => {
  assert.deepEqual(migratePosition({ x: 100, y: 100 }, 'win32'), { x: 96, y: 96, v: LAYOUT_VERSION });
});

test('already migrated position is kept as is', () => {
  const p = { x: 10, y: 20, v: LAYOUT_VERSION };
  assert.deepEqual(migratePosition(p, 'darwin'), p);
});

test('missing position stays empty', () => {
  assert.deepEqual(migratePosition({}, 'darwin'), { v: LAYOUT_VERSION });
  assert.deepEqual(migratePosition(undefined, 'darwin'), {});
});
