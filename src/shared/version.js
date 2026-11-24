// src/shared/version.js
// "v0.2.1" 같은 태그와 앱 버전을 비교한다 — 숫자 세 자리(major.minor.patch)만 본다. 순수 함수.

function parse(v) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v ?? '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

export function isNewer(latest, current) {
  const a = parse(latest);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export function cleanVersion(v) {
  const p = parse(v);
  return p ? p.join('.') : '';
}
