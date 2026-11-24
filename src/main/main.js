// src/main/main.js
import { app, dialog, Menu, Notification } from 'electron';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { createNotify } from './notify.js';
import { createBanner } from './banner.js';
import { readJson, writeJson } from './jsonFile.js';
import { fetchUsage, normalize } from './usage.js';
import { getToken } from './token.js';
import { createAlertTracker } from './notifier.js';
import { createSettingsStore } from './settings.js';
import { createWindow, applyScale } from './window.js';
import { registerIpc } from './ipc.js';
import { setupTray } from './tray.js';
import { startUpdateCheck } from './updateCheck.js';
import { nextBackoff } from './backoff.js';
import { formatCountdown, formatResetClock } from '../shared/countdown.js';

const POLL_INTERVAL_MS = 120_000;
const REFRESH_THROTTLE_MS = 10_000;
const isMac = process.platform === 'darwin';
const isWin = process.platform === 'win32';

// 윈도우 토스트 알림은 시작 메뉴 바로가기의 AUMID와 이 값을 맞춰서 뜬다 — electron-builder.yml appId와 같아야 함
if (isWin) app.setAppUserModelId('com.bmarketer.claudeusagewidget');

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// 이미 떠 있는데 바로가기·앱을 다시 실행하면 새로 띄우지 않고 기존 창을 보여준다
// (예전 윈도우판은 트레이로 숨긴 뒤 다시 실행하면 창이 안 뜨던 문제)
app.on('second-instance', () => {
  if (!win) return;
  win.show();
  win.focus();
});

let win = null;
let trayCtl = null;
let lastFetchAt = 0;
let lastGoodMetrics = null; // 마지막 성공값 — 오류가 나도 화면에서 지우지 않기 위해 유지
let lastGoodFetchedAt = null; // "HH:MM 기준" 표시에 쓰는, 그 성공값을 얻은 시각
let backoffMs = 0; // 429를 받으면 늘어나는 대기 시간 — 성공하면 0으로
let backoffUntil = 0;
let lastPayload = null; // 화면이 아직 안 열렸을 때 보낸 결과를 열린 뒤 다시 보내기 위해 보관
let alertTracker = createAlertTracker(); // 앱 준비 뒤 저장된 상태로 다시 만든다
let alertsPath = null;

async function loadUsage() {
  const tokenResult = await getToken();
  if (tokenResult.error) return { error: tokenResult.error };

  const usageResult = await fetchUsage(tokenResult.token);
  if (usageResult.error) return { error: usageResult.error };

  return normalize(usageResult.json, new Date().toISOString());
}

function sendUsage(payload) {
  lastPayload = payload;
  win?.webContents.send('usage:data', payload);
}

async function refresh(force) {
  const now = Date.now();
  if (!force && now - lastFetchAt < REFRESH_THROTTLE_MS) return;
  if (!force && now < backoffUntil) return; // 요청 제한 중엔 자동 갱신을 쉰다 (새로고침 버튼은 허용)
  lastFetchAt = now;

  const result = await loadUsage();

  if (result.error === 'rate_limited') {
    backoffMs = nextBackoff(backoffMs, result.retryAfterMs);
    backoffUntil = Date.now() + backoffMs;
  } else if (!result.error) {
    backoffMs = 0;
    backoffUntil = 0;
  }

  if (result.error) {
    sendUsage({ error: result.error, metrics: lastGoodMetrics ?? [], fetchedAt: lastGoodFetchedAt });
    return;
  }

  lastGoodMetrics = result.metrics;
  trayCtl?.update(result.metrics);
  lastGoodFetchedAt = result.fetchedAt;
  sendUsage({ error: null, metrics: result.metrics, fetchedAt: result.fetchedAt });

  const fired = alertTracker.check(result.metrics);
  if (alertsPath) writeJson(alertsPath, alertTracker.getState()); // 다시 켜도 같은 구간 알림을 또 보내지 않게
  for (const n of fired) {
    notifyThreshold(n);
  }
}

// 맥: 서명 안 된 앱은 시스템 알림이 막히거나 다른 앱 이름으로 떠서, 위젯이 직접 맥 알림 모양 배너를 띄운다.
//      배너를 못 띄우면(예외) 예전처럼 시스템 알림 → osascript로 대신한다. 윈도우: 기본 토스트.
let showBanner = null;
const fallbackNotify = createNotify({ Notification, execFile });
function notify(title, body) {
  if (!isMac) {
    new Notification({ title, body }).show();
    return;
  }
  if (!showBanner) showBanner = createBanner();
  showBanner({ title, body, near: win?.getBounds() }).catch(() => fallbackNotify(title, body));
}

function notifyThreshold(n) {
  const remain = formatCountdown(n.resetsAt);
  const clock = formatResetClock(n.resetsAt);
  const body = remain && clock ? `${remain} 뒤 ${clock}에 리셋됩니다.` : '곧 리셋됩니다.';
  notify(`${shortName(n)} 한도 ${n.percent}%`, body);
}

function shortName(n) {
  const parts = n.label.split(' · ');
  return n.id === 'model' ? (parts[1] ?? n.label) : parts[0];
}

// scripts/package-mac.mjs는 서명 보존을 위해 순정 Electron 실행 파일 이름을 그대로 써서
// app.isPackaged가 배포본에서도 항상 false다 — 앱 코드가 app.asar 안에 있는지로 판단한다.
const isBundledApp = () => app.getAppPath().endsWith('.asar');

// 다운로드 폴더 등 응용 프로그램 폴더 밖에서 실행하면 macOS가 앱을 임시 경로로 옮겨
// 실행(App Translocation)해서 로그인 항목 등록이 깨진다. 배포본에서만 옮기기를 제안한다.
function offerMoveToApplications() {
  if (!isMac || !isBundledApp() || app.isInApplicationsFolder()) return false;
  const choice = dialog.showMessageBoxSync({
    type: 'question',
    message: '응용 프로그램 폴더로 옮길까요?',
    detail: '옮겨야 로그인 시 자동 시작이 정상 동작해요.',
    buttons: ['옮기기', '나중에'],
    defaultId: 0,
    cancelId: 1,
  });
  if (choice !== 0) return false;
  try {
    return app.moveToApplicationsFolder(); // 성공하면 옮긴 앱이 다시 실행되고 이 앱은 종료된다
  } catch {
    return false;
  }
}

app.whenReady().then(() => {
  // 메뉴바(트레이) 위젯이라 Dock 아이콘은 숨긴다 — 배포본은 Info.plist LSUIElement로도 숨김
  if (isMac) app.dock?.hide();

  const userData = app.getPath('userData');
  const settingsStore = createSettingsStore(join(userData, 'settings.json'));
  const settings = settingsStore.load();
  alertsPath = join(userData, 'alerts.json');
  alertTracker = createAlertTracker(readJson(alertsPath, {}));

  if (offerMoveToApplications()) return;

  // 배포본만 로그인 항목에 등록한다 — 개발 실행(npm start)이 순정 Electron을 등록하지 않게.
  // 맥은 임시 경로(App Translocation)가 등록되지 않도록 응용 프로그램 폴더에 있을 때만.
  const installed = isMac ? isBundledApp() && app.isInApplicationsFolder() : app.isPackaged;
  if (settings.openAtLogin && installed) {
    app.setLoginItemSettings({ openAtLogin: true });
  }

  win = createWindow(userData, settings);
  // 첫 조회가 화면 로딩보다 빨리 끝나면(윈도우에서 로그인 파일이 없을 때 등) 보낸 결과가 사라진다 —
  // 화면이 열리면 마지막 결과를 다시 보낸다
  win.webContents.on('did-finish-load', () => {
    if (lastPayload) win.webContents.send('usage:data', lastPayload);
  });
  const setScale = (value) => {
    const scale = applyScale(win, value);
    settingsStore.save({ scale });
    return scale;
  };
  registerIpc({ win, settingsStore, requestRefresh: () => refresh(true), setScale });
  trayCtl = setupTray({ app, win, settingsStore, setScale });
  setAppMenu();
  // 툴팁의 "리셋까지 n분"이 폴링 사이에도 맞도록 30초마다 다시 쓴다
  setInterval(() => trayCtl.update(lastGoodMetrics ?? []), 30_000);

  refresh(true);
  setInterval(() => refresh(false), POLL_INTERVAL_MS);

  // 새 버전 알림: 하루 한 번 GitHub 최신 Release 태그만 확인 → 위젯 하단 띠에 표시
  startUpdateCheck({
    currentVersion: app.getVersion(),
    onUpdate: (info) => win?.webContents.send('app:update', info),
  });

  app.on('activate', () => {
    win.show();
    win.focus();
  });

  // 윈도우는 트레이 상주: Alt+F4 등으로 창을 닫아도 숨기기만 하고, 트레이 '종료'만 진짜 종료
  if (isWin) {
    win.on('close', (e) => {
      if (!app.isQuitting) {
        e.preventDefault();
        win.hide();
      }
    });
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// 기본 메뉴(새로고침·개발자 도구·브라우저 줌)를 뺀다. Dock에서 숨긴 앱은 메뉴가 화면에 안 보여서
// 크기 단축키(⌘/Ctrl − + 0)는 렌더러가 직접 받는다. 맥은 ⌘Q·복사 등 기본 키만 남긴다.
function setAppMenu() {
  if (!isMac) {
    Menu.setApplicationMenu(null);
    return;
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }]));
}

// 맥은 창이 모두 닫히면 종료, 윈도우는 트레이에 남는다
app.on('window-all-closed', () => {
  if (isMac) app.quit();
});
