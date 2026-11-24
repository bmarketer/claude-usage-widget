// src/main/banner.js
// 맥 알림 배너 — 서명 안 된 앱은 시스템 알림이 막히거나(Electron 42+) 다른 앱 이름·아이콘으로 떠서,
// 위젯이 직접 화면 오른쪽 위에 맥 알림 모양의 작은 창을 띄운다(마스코트 아이콘 · "사용량 · 지금").
// 몇 초 뒤 저절로 사라지고, 누르면 바로 닫힌다. 알림 센터에는 남지 않는다.
import { BrowserWindow, ipcMain, screen } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIDTH = 380; // 배너 352 + 그림자 여백
const HEIGHT = 112;
const EDGE = 8; // 화면 가장자리와의 간격

export function createBanner() {
  let win = null;
  let ready = null;
  let pending = null;

  function ensureWindow() {
    if (win && !win.isDestroyed()) return;
    win = new BrowserWindow({
      width: WIDTH,
      height: HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      resizable: false,
      movable: false,
      focusable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      fullscreenable: false,
      webPreferences: {
        preload: join(__dirname, '../preload/preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    ready = new Promise((resolve) => win.webContents.once('did-finish-load', resolve));
    win.loadFile(join(__dirname, '../renderer/banner.html'));
    win.on('closed', () => {
      win = null;
    });
  }

  // 위젯이 있는 화면의 오른쪽 위(메뉴바 바로 아래)에 띄운다
  function place(near) {
    const display = near ? screen.getDisplayMatching(near) : screen.getPrimaryDisplay();
    const a = display.workArea;
    win.setBounds({ x: a.x + a.width - WIDTH - EDGE, y: a.y + EDGE, width: WIDTH, height: HEIGHT });
  }

  ipcMain.on('banner:done', () => {
    if (win && !win.isDestroyed()) win.hide();
  });

  return async function showBanner({ title, body, near }) {
    ensureWindow();
    pending = { title, body };
    await ready;
    place(near);
    win.webContents.send('banner:show', pending);
    win.showInactive(); // 작업 중인 앱의 포커스를 빼앗지 않는다
  };
}
