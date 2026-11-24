import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trayTitle, trayTooltip } from '../src/shared/trayTitle.js';

const NOW = Date.parse('2026-11-24T09:20:00Z');
const session = (percent) => ({ id: 'session', label: '세션 · 5시간', percent, resetsAt: '2026-11-24T12:01:00Z', kind: 'limit' });

test('trayTitle shows session percent', () => {
  assert.equal(trayTitle([session(39)]), '39%');
});

test('trayTitle adds ! at 85% or more (menu bar stays monochrome)', () => {
  assert.equal(trayTitle([session(84)]), '84%');
  assert.equal(trayTitle([session(85)]), '85%!');
  assert.equal(trayTitle([session(91)]), '91%!');
});

test('trayTitle is empty without session data', () => {
  assert.equal(trayTitle([]), '');
  assert.equal(trayTitle(undefined), '');
  assert.equal(trayTitle([{ id: 'weekly', percent: 50 }]), '');
});

test('trayTooltip includes countdown to reset', () => {
  assert.equal(trayTooltip([session(39)], NOW), '사용량 · 세션 39% · 리셋까지 2시간 41분');
  assert.equal(trayTooltip([], NOW), '사용량');
});
