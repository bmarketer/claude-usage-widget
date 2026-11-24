import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, cleanVersion } from '../src/shared/version.js';
import { fetchLatestTag } from '../src/main/updateCheck.js';

test('isNewer compares major.minor.patch numerically', () => {
  assert.equal(isNewer('v0.2.1', '0.2.0'), true);
  assert.equal(isNewer('v0.10.0', '0.9.9'), true);
  assert.equal(isNewer('v1.0.0', '0.99.0'), true);
  assert.equal(isNewer('v0.2.0', '0.2.0'), false);
  assert.equal(isNewer('v0.1.9', '0.2.0'), false);
});

test('isNewer is false for unparseable input', () => {
  assert.equal(isNewer('latest', '0.2.0'), false);
  assert.equal(isNewer(undefined, '0.2.0'), false);
  assert.equal(isNewer('v0.3.0', ''), false);
});

test('cleanVersion strips the v prefix', () => {
  assert.equal(cleanVersion('v0.2.1'), '0.2.1');
  assert.equal(cleanVersion('junk'), '');
});

test('fetchLatestTag returns tag_name, or null on any failure', async () => {
  const ok = async () => ({ ok: true, json: async () => ({ tag_name: 'v0.3.0' }) });
  const notFound = async () => ({ ok: false, json: async () => ({}) });
  const offline = async () => {
    throw new Error('offline');
  };
  assert.equal(await fetchLatestTag(ok), 'v0.3.0');
  assert.equal(await fetchLatestTag(notFound), null);
  assert.equal(await fetchLatestTag(offline), null);
});
