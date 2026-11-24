// src/main/window.js
import { BrowserWindow, screen } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readJson, writeJson } from './jsonFile.js';
import { clampScale, windowWidth, windowHeight } from '../shared/scale.js';
import { migratePosition, LAYOUT_VERSION } from './position.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const INITIAL_CONTENT_HEIGHT = { collapsed: 240, expanded: 470 }; // 렌더러 첫 측정 전까지만 쓰는 추정치 (CSS px)

export function createWindow(userDataDir, settings) {
  const boundsPath = join(userDataDir, 'window.json');
  const saved = migratePosition(readJson(boundsPath, {}));
  const scale = clampScale(settings.scale);
  const width = windowWidth(scale);
  const height = windowHeight(settings.expanded ? INITIAL_CONTENT_HEIGHT.expanded : INITIAL_CONTENT_HEIGHT.collapsed, scale);

  // 저장된 위치가 모든 디스플레이 밖이면(모니터 구성 변경 등) 위치를 버리고 기본 위치로
  let { x, y } = saved;
  if (x !== undefined && y !== undefined) {
    const onScreen = screen.getAllDisplays().some(({ workArea: a }) => {
      return x + width > a.x + 40 && x < a.x + a.width - 40 && y >= a.y - 20 && y < a.y + a.height - 40;
    });
    if (!onScreen) {
      x = undefined;
      y = undefined;
    }
  }

  const win = new BrowserWindow({
    width,
    height,
    x,
    y,
    resizable: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    // 상태 테두리 글로우를 위해 위젯 둘레에 투명 여백을 둬서, 네이티브 그림자 대신 CSS 그림자를 쓴다
    // (네이티브 그림자는 투명 여백까지 포함한 네모 창 테두리에 그려짐)
    hasShadow: false,
    alwaysOnTop: settings.pinned,
    fullscreenable: false,
    skipTaskbar: process.platform === 'win32', // 윈도우: 작업표시줄 대신 트레이에만
    webPreferences: {
      preload: join(__dirname, '../preload/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (settings.pinned) win.setAlwaysOnTop(true, 'floating');
  win.loadFile(join(__dirname, '../renderer/index.html'));

  // 줌은 페이지가 로드된 뒤에 적용해야 유지된다. 핀치 줌은 막는다(배율은 앱이 관리).
  win.webContents.on('did-finish-load', () => {
    win.webContents.setVisualZoomLevelLimits(1, 1);
    win.webContents.setZoomFactor(clampScale(win.currentScale));
    win.webContents.send('win:scale', clampScale(win.currentScale));
  });
  win.currentScale = scale;

  const persistPosition = () => {
    const bounds = win.getBounds();
    writeJson(boundsPath, { x: bounds.x, y: bounds.y, v: LAYOUT_VERSION });
  };
  win.on('move', persistPosition);

  return win;
}

// 배율 적용: 줌 + 창 폭. 높이는 렌더러가 새 레이아웃을 재서 다시 보낸다(우선 비례로 맞춰 둠).
export function applyScale(win, value) {
  const scale = clampScale(value);
  const prev = clampScale(win.currentScale);
  win.currentScale = scale;
  win.webContents.setZoomFactor(scale);
  const b = win.getBounds();
  const height = Math.max(1, Math.round((b.height * scale) / prev));
  win.setBounds({ x: b.x, y: b.y, width: windowWidth(scale), height }, false);
  win.webContents.send('win:scale', scale);
  return scale;
}
