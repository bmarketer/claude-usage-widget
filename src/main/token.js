// src/main/token.js
// Claude Code CLI 로그인 토큰 읽기 — 플랫폼마다 저장 위치가 다르다.
//   맥: 키체인 'Claude Code-credentials' (usage.js getToken)
//   윈도우: %USERPROFILE%\.claude\.credentials.json (CLAUDE_CONFIG_DIR가 있으면 그 아래)
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getToken as getKeychainToken } from './usage.js';

export function credentialsPath(env = process.env) {
  const base = env.CLAUDE_CONFIG_DIR || join(env.USERPROFILE ?? homedir(), '.claude');
  return join(base, '.credentials.json');
}

// 위젯은 토큰을 갱신하지 않는다(갱신 토큰이 바뀌면 Claude Code 로그인이 풀릴 수 있음).
// 만료됐으면 Claude Code가 다음 실행 때 갱신할 때까지 기다린다 — 맥 키체인 쪽과 같은 규칙.
export async function getFileToken(path = credentialsPath(), now = Date.now()) {
  let raw;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return { error: 'no_token' };
  }

  let oauth;
  try {
    oauth = JSON.parse(raw)?.claudeAiOauth;
  } catch {
    return { error: 'no_token' };
  }
  const token = oauth?.accessToken;
  if (typeof token !== 'string' || !token) return { error: 'no_token' };
  if (Number.isFinite(oauth.expiresAt) && oauth.expiresAt <= now) return { error: 'expired' };
  return { token };
}

export function getToken(platform = process.platform) {
  return platform === 'darwin' ? getKeychainToken() : getFileToken();
}
