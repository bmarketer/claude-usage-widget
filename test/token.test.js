import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { credentialsPath, getFileToken } from '../src/main/token.js';

const NOW = Date.parse('2026-11-24T00:00:00Z');

function withFile(content, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'cuw-token-'));
  const file = join(dir, '.credentials.json');
  if (content !== undefined) writeFileSync(file, content, 'utf8');
  return Promise.resolve(fn(file, dir)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

test('credentialsPath: uses CLAUDE_CONFIG_DIR when set', () => {
  const p = credentialsPath({ CLAUDE_CONFIG_DIR: 'C:\\custom\\dir', USERPROFILE: 'C:\\Users\\bob' });
  assert.equal(p, join('C:\\custom\\dir', '.credentials.json'));
});

test('credentialsPath: falls back to USERPROFILE\\.claude', () => {
  const p = credentialsPath({ USERPROFILE: 'C:\\Users\\bob' });
  assert.equal(p, join('C:\\Users\\bob', '.claude', '.credentials.json'));
});

test('getFileToken: reads accessToken from a valid credentials file', () =>
  withFile(JSON.stringify({ claudeAiOauth: { accessToken: 'tok-abc', refreshToken: 'x', expiresAt: NOW + 60_000 } }), async (file) => {
    assert.deepEqual(await getFileToken(file, NOW), { token: 'tok-abc' });
  }));

test('getFileToken: no expiresAt is treated as valid', () =>
  withFile(JSON.stringify({ claudeAiOauth: { accessToken: 'tok-abc' } }), async (file) => {
    assert.deepEqual(await getFileToken(file, NOW), { token: 'tok-abc' });
  }));

test('getFileToken: expired token returns expired (same rule as macOS keychain)', () =>
  withFile(JSON.stringify({ claudeAiOauth: { accessToken: 'tok-abc', expiresAt: NOW - 1 } }), async (file) => {
    assert.deepEqual(await getFileToken(file, NOW), { error: 'expired' });
  }));

test('getFileToken: missing file returns no_token', () =>
  withFile(undefined, async (_file, dir) => {
    assert.deepEqual(await getFileToken(join(dir, 'does-not-exist.json'), NOW), { error: 'no_token' });
  }));

test('getFileToken: corrupt JSON returns no_token', () =>
  withFile('{not valid json', async (file) => {
    assert.deepEqual(await getFileToken(file, NOW), { error: 'no_token' });
  }));

test('getFileToken: missing or empty accessToken returns no_token', async () => {
  await withFile(JSON.stringify({ claudeAiOauth: { refreshToken: 'x' } }), async (file) => {
    assert.deepEqual(await getFileToken(file, NOW), { error: 'no_token' });
  });
  await withFile(JSON.stringify({ claudeAiOauth: { accessToken: '' } }), async (file) => {
    assert.deepEqual(await getFileToken(file, NOW), { error: 'no_token' });
  });
});
