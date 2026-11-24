// src/renderer/app.js
import { formatCountdown, formatResetClock } from '../shared/countdown.js';
import { MARGIN, clampScale, stepScale, scaleFromDrag, windowHeight, formatScale, SCALE_DEFAULT } from '../shared/scale.js';

const PIN_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 2.5 21 9l-3.2.8-3 3 .4 4.7-2.4 1L9 14.7l-5.5 5.5-1.2-1.2L7.8 13.5 4 9.7l1-2.4 4.7.4 3-3L13.5 2.5h1Z"/></svg>';
const CHEVRON_DOWN =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const CHEVRON_UP =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>';

const CAUTION = 60;
const CRITICAL = 85;

// 오류별 안내: 제목(무슨 일) + 설명(무엇을 하면 되는지). 카드가 있을 땐 푸터에 짧은 문구만.
const ERRORS = {
  no_token: {
    title: 'Claude Code 로그인이 필요해요',
    desc: '터미널에서 <code>claude</code>를 한 번 실행해 로그인하면 자동으로 이어져요.',
    foot: 'Claude Code 로그인이 필요해요',
  },
  expired: {
    title: '로그인이 만료됐어요',
    desc: 'Claude Code를 한 번 실행하면 갱신돼요.',
    foot: '로그인 만료 · Claude Code를 실행해 주세요',
  },
  auth: {
    title: '다시 로그인해 주세요',
    desc: 'Claude Code에서 <code>/login</code>으로 다시 로그인하면 이어져요.',
    foot: '다시 로그인해 주세요',
  },
  network: {
    title: '인터넷 연결을 확인해 주세요',
    desc: '연결되면 자동으로 다시 불러와요.',
    foot: null, // 시각과 함께 만든다
  },
  rate_limited: {
    title: '잠시 뒤 다시 불러올게요',
    desc: 'Anthropic 서버가 요청을 잠시 제한했어요. 간격을 늘려 자동으로 다시 시도해요.',
    foot: null, // 시각과 함께 만든다
  },
  format: {
    title: '일시적으로 불러올 수 없음',
    desc: '잠시 뒤 자동으로 다시 시도해요.',
    foot: '일시적으로 불러올 수 없음',
  },
};

const cardsEl = document.getElementById('cards');
const widgetEl = document.getElementById('widget');
const pinBtn = document.getElementById('pin-btn');
const refreshBtn = document.getElementById('refresh-btn');
const gripEl = document.getElementById('grip');
const badgeEl = document.getElementById('scale-badge');
const isMac = window.api.platform === 'darwin';

const state = { metrics: [], fetchedAt: null, error: null, expanded: false, pinned: true, scale: SCALE_DEFAULT, update: null };
let structureKey = '';
let lastSentHeight = 0;

document.documentElement.style.setProperty('--margin', `${MARGIN}px`);

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function level(percent) {
  if (percent >= CRITICAL) return 'critical';
  if (percent >= CAUTION) return 'caution';
  return 'calm';
}

function fillClass(m) {
  return m.kind === 'credit' ? 'fill-clay' : `fill-${level(m.percent)}`;
}

function toneClass(m) {
  if (m.kind === 'credit') return '';
  const l = level(m.percent);
  return l === 'calm' ? '' : `is-${l}`;
}

function miniLabel(m) {
  if (m.id === 'weekly') return '주간';
  if (m.id === 'model') return m.label.split(' · ')[1] ?? '모델';
  return '$ 크레딧';
}

function resetLine(m) {
  if (m.kind === 'credit') {
    return `$${m.used.toFixed(2)} <b>/</b> $${m.limit.toFixed(0)} · 월 한도`;
  }
  const countdown = formatCountdown(m.resetsAt);
  const clock = formatResetClock(m.resetsAt);
  if (!countdown) return '';
  return `리셋까지 <b>${countdown}</b>${clock ? ` · ${clock}` : ''}`;
}

function footText() {
  const { error, fetchedAt, expanded } = state;
  const clock = fetchedAt ? formatResetClock(fetchedAt) : '';
  if (error === 'network') return clock ? `${clock} 기준 · 연결 끊김` : '연결할 수 없음';
  if (error === 'rate_limited') return clock ? `${clock} 기준 · 잠시 쉬는 중` : '잠시 뒤 다시 불러올게요';
  if (error) return ERRORS[error]?.foot ?? '일시적으로 불러올 수 없음';
  if (state.update) return `새 버전 ${state.update.version} · 업데이트`;
  if (!clock) return '';
  return expanded ? `${clock} 갱신 · 2분마다` : `${clock} 갱신`;
}

// ---- 구조(틀) — 펼침 여부·지표 구성이 바뀔 때만 새로 만든다 ----

function fullCardHtml(m) {
  return `
    <div class="row" data-id="${escapeHtml(m.id)}" data-shape="full">
      <div class="row-top">
        <div class="pct"><span class="pct-n"></span><small>%</small></div>
        <div class="tag"></div>
      </div>
      <div class="bar"><span></span></div>
      <div class="reset"></div>
    </div>`;
}

function miniCardHtml(m) {
  return `
    <div class="mini" data-id="${escapeHtml(m.id)}" data-shape="mini">
      <span class="m-label"></span>
      <span class="m-val"><span class="m-n"></span><i class="m-badge" hidden aria-label="한도 임박">!</i></span>
      <div class="bar"><span></span></div>
    </div>`;
}

function dockHtml() {
  const label = state.expanded ? '접기' : '자세히';
  const icon = state.expanded ? CHEVRON_UP : CHEVRON_DOWN;
  return `
    <div class="w-dock">
      <div class="w-foot"><i class="dot"></i><span class="foot-t"></span></div>
      <div class="w-expander" data-action="toggle-expand" role="button" tabindex="0" aria-expanded="${state.expanded}">${label} ${icon}</div>
    </div>`;
}

function errorHtml(error) {
  const e = ERRORS[error] ?? ERRORS.format;
  return `
    <div class="row err">
      <div class="err-title">${escapeHtml(e.title)}</div>
      <div class="err-desc">${e.desc}</div>
      <div class="err-actions">
        <div class="err-btn" data-action="refresh" role="button" tabindex="0">다시 확인</div>
        <span class="err-link" data-action="help" role="button" tabindex="0">도움말</span>
      </div>
    </div>`;
}

function buildStructure() {
  const { metrics, error, expanded } = state;
  if (metrics.length === 0) {
    return error ? errorHtml(error) : '<div class="row"><div class="loading">불러오는 중…</div></div>';
  }
  if (expanded) return `${metrics.map(fullCardHtml).join('')}${dockHtml()}`;
  const primary = metrics.find((m) => m.id === 'session') ?? metrics[0];
  const rest = metrics.filter((m) => m !== primary);
  return `${fullCardHtml(primary)}<div class="minis">${rest.map(miniCardHtml).join('')}</div>${dockHtml()}`;
}

function currentStructureKey() {
  const { metrics, error, expanded } = state;
  if (metrics.length === 0) return `empty:${error ?? 'loading'}`;
  const primary = metrics.find((m) => m.id === 'session') ?? metrics[0];
  return `${expanded ? 'x' : 'c'}:${primary.id}:${metrics.map((m) => m.id).join(',')}`;
}

// ---- 값 — 매초/갱신마다 바뀐 글자·막대만 고친다(포커스·클릭·애니메이션 유지) ----

function setText(el, v) {
  if (el && el.textContent !== v) el.textContent = v;
}
function setHtml(el, v) {
  if (el && el.dataset.html !== v) {
    el.dataset.html = v;
    el.innerHTML = v;
  }
}
function setClass(el, base, extra) {
  const v = extra ? `${base} ${extra}` : base;
  if (el && el.className !== v) el.className = v;
}
function setBar(span, m) {
  if (!span) return;
  setClass(span, fillClass(m));
  const w = `${Math.min(100, Math.max(0, m.percent))}%`;
  if (span.style.width !== w) span.style.width = w;
}

function updateValues() {
  for (const m of state.metrics) {
    const el = cardsEl.querySelector(`[data-id="${CSS.escape(m.id)}"]`);
    if (!el) continue;
    if (el.dataset.shape === 'full') {
      setText(el.querySelector('.pct-n'), String(m.percent));
      setClass(el.querySelector('.pct'), 'pct', toneClass(m));
      setText(el.querySelector('.tag'), m.label);
      setBar(el.querySelector('.bar span'), m);
      setHtml(el.querySelector('.reset'), resetLine(m));
    } else {
      setText(el.querySelector('.m-label'), miniLabel(m));
      setText(el.querySelector('.m-n'), `${m.percent}%`);
      setClass(el.querySelector('.m-val'), 'm-val', toneClass(m));
      const badge = el.querySelector('.m-badge');
      if (badge) badge.hidden = !(m.kind !== 'credit' && m.percent >= CRITICAL);
      setBar(el.querySelector('.bar span'), m);
    }
  }

  const footEl = cardsEl.querySelector('.foot-t');
  setText(footEl, footText());
  const showUpdate = Boolean(state.update) && !state.error;
  if (footEl) {
    setClass(footEl, 'foot-t', showUpdate ? 'is-update' : '');
    if (showUpdate) {
      footEl.dataset.action = 'update';
      footEl.setAttribute('role', 'button');
      footEl.tabIndex = 0;
    } else {
      delete footEl.dataset.action;
      footEl.removeAttribute('role');
      footEl.removeAttribute('tabindex');
    }
  }
  const dot = cardsEl.querySelector('.dot');
  if (dot) setClass(dot, 'dot', state.error ? 'warn' : showUpdate ? 'update' : '');

  cardsEl.classList.toggle('stale', Boolean(state.error) && state.metrics.length > 0);

  // 상태 색 테두리: 한도 지표(세션·주간·모델) 중 가장 높은 값
  const peak = Math.max(-1, ...state.metrics.filter((m) => m.kind === 'limit').map((m) => m.percent));
  widgetEl.classList.toggle('st-caution', peak >= CAUTION && peak < CRITICAL);
  widgetEl.classList.toggle('st-critical', peak >= CRITICAL);
}

function render() {
  const key = currentStructureKey();
  if (key !== structureKey) {
    structureKey = key;
    cardsEl.innerHTML = buildStructure();
  }
  if (state.metrics.length > 0) updateValues();
  else widgetEl.classList.remove('st-caution', 'st-critical');
}

// ---- 창 높이: 위젯 크기가 바뀌면(내용·폰트 로딩·배율) 실측해 창을 맞춘다 ----

function syncHeight() {
  const content = widgetEl.getBoundingClientRect().height;
  if (content <= 0) return;
  const height = windowHeight(content, state.scale);
  if (height !== lastSentHeight) {
    lastSentHeight = height;
    window.api.win.setHeight(height);
  }
}
new ResizeObserver(() => syncHeight()).observe(widgetEl);

// ---- 입력 ----

function toggleExpand() {
  state.expanded = !state.expanded;
  window.api.win.setExpanded(state.expanded);
  render();
}

cardsEl.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  if (t.dataset.action === 'toggle-expand') toggleExpand();
  else if (t.dataset.action === 'refresh') window.api.usage.refresh();
  else if (t.dataset.action === 'help') window.api.app.openHelp();
  else if (t.dataset.action === 'update') window.api.app.openReleases();
});

// div role=button도 Enter/Space로 누를 수 있게
document.addEventListener('keydown', (e) => {
  const t = e.target;
  if ((e.key === 'Enter' || e.key === ' ') && t instanceof HTMLElement && t.getAttribute('role') === 'button') {
    e.preventDefault();
    t.click();
    return;
  }
  // 크기 단축키: 맥 ⌘, 윈도우 Ctrl (Dock에서 숨긴 앱은 메뉴 단축키를 믿을 수 없어 여기서 직접 받는다)
  const mod = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (mod && !e.altKey) {
    if (e.key === '=' || e.key === '+') setScale(stepScale(state.scale, 1));
    else if (e.key === '-') setScale(stepScale(state.scale, -1));
    else if (e.key === '0') setScale(SCALE_DEFAULT);
    else return;
    e.preventDefault();
  }
});

pinBtn.innerHTML = PIN_ICON;
function showPinned() {
  pinBtn.classList.toggle('pinned', state.pinned);
  pinBtn.setAttribute('aria-pressed', String(state.pinned));
}
pinBtn.addEventListener('click', async () => {
  state.pinned = await window.api.win.togglePin();
  showPinned();
});

refreshBtn.addEventListener('click', () => window.api.usage.refresh());

// ---- 크기 조절: 모서리 손잡이를 가로로 끈 만큼 배율이 0.1 단위로 바뀐다 ----

let badgeTimer = null;
function showBadge(scale, keep) {
  badgeEl.textContent = formatScale(scale);
  badgeEl.classList.add('show');
  clearTimeout(badgeTimer);
  if (!keep) badgeTimer = setTimeout(() => badgeEl.classList.remove('show'), 700);
}

function setScale(value) {
  const next = clampScale(value);
  if (next === state.scale) return;
  window.api.win.setScale(next);
}

let drag = null;
gripEl.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  gripEl.setPointerCapture(e.pointerId);
  drag = { startX: e.screenX, start: state.scale, last: state.scale };
  widgetEl.classList.add('resizing');
  showBadge(state.scale, true);
});
gripEl.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const next = scaleFromDrag(drag.start, e.screenX - drag.startX);
  if (next !== drag.last) {
    drag.last = next;
    setScale(next);
  }
});
function endDrag() {
  if (!drag) return;
  drag = null;
  widgetEl.classList.remove('resizing');
  showBadge(state.scale, false);
}
gripEl.addEventListener('pointerup', endDrag);
gripEl.addEventListener('pointercancel', endDrag);

window.api.win.onScale((scale) => {
  const changed = clampScale(scale) !== state.scale;
  state.scale = clampScale(scale);
  lastSentHeight = 0;
  requestAnimationFrame(syncHeight);
  if (changed) showBadge(state.scale, Boolean(drag));
});

// ---- 데이터 ----

window.api.app.onUpdate((info) => {
  state.update = info;
  render();
});

window.api.usage.onData((payload) => {
  state.metrics = payload.metrics ?? [];
  state.fetchedAt = payload.fetchedAt ?? null;
  state.error = payload.error ?? null;
  render();
});

setInterval(() => {
  if (state.metrics.length > 0) updateValues(); // 카운트다운만 다시 계산 — 틀은 그대로 둔다
}, 1000);

(async () => {
  const settings = await window.api.settings.load();
  state.expanded = settings.expanded;
  state.pinned = settings.pinned;
  state.scale = clampScale(settings.scale);
  showPinned();
  render();
})();
