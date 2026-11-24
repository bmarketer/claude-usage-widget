// src/main/updateCheck.js
// 하루 한 번 GitHub에 최신 Release 태그만 물어본다. 사용자 정보는 보내지 않는다(익명 GET 한 번).
// 새 버전이 있으면 onUpdate({ version, url })를 부르고, 실패하면 조용히 넘어간다(다음 날 다시).
import { isNewer, cleanVersion } from '../shared/version.js';

export const REPO = 'bmarketer/claude-usage-widget';
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const FIRST_DELAY_MS = 30_000; // 켜자마자 네트워크를 쓰지 않게
const INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function fetchLatestTag(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(API_URL, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'claude-usage-widget' },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json?.tag_name === 'string' ? json.tag_name : null;
  } catch {
    return null;
  }
}

export function startUpdateCheck({ currentVersion, onUpdate, fetchImpl = fetch }) {
  const check = async () => {
    const tag = await fetchLatestTag(fetchImpl);
    if (tag && isNewer(tag, currentVersion)) onUpdate({ version: cleanVersion(tag), url: RELEASES_URL });
  };
  setTimeout(check, FIRST_DELAY_MS);
  setInterval(check, INTERVAL_MS);
  return check;
}
