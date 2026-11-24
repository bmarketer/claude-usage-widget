// src/main/ipc.js
import { ipcMain, shell } from 'electron';
import { createTweenRunner } from './tween.js';
import { RELEASES_URL } from './updateCheck.js';

export const HELP_URL = 'https://github.com/bmarketer/claude-usage-widget#readme';

export function registerIpc({ win, settingsStore, requestRefresh, setScale }) {
  const heightTween = createTweenRunner();
  ipcMain.handle('usage:refresh', () => {
    requestRefresh();
  });

  ipcMain.handle('settings:load', () => settingsStore.load());

  ipcMain.handle('win:togglePin', () => {
    const next = !win.isAlwaysOnTop();
    win.setAlwaysOnTop(next, 'floating');
    settingsStore.save({ pinned: next });
    return next;
  });

  ipcMain.handle('win:setExpanded', (_e, expanded) => {
    settingsStore.save({ expanded: Boolean(expanded) });
  });

  ipcMain.handle('win:setScale', (_e, scale) => setScale(scale));

  // 고정 주소만 연다 — 렌더러가 임의 URL을 열 수 없게 인자를 받지 않는다.
  ipcMain.handle('app:openHelp', () => shell.openExternal(HELP_URL));
  ipcMain.handle('app:openReleases', () => shell.openExternal(RELEASES_URL));

  // 렌더러가 실측한 창 높이(여백·배율 반영된 화면 px)로 창을 맞춘다 — 접힘/펼침 카드 수가 바뀌어도
  // 매직넘버 없이 항상 실제 레이아웃과 창 크기가 일치한다.
  ipcMain.handle('win:setHeight', (_e, height) => {
    const h = Math.round(Number(height));
    if (!Number.isFinite(h) || h <= 0) return;
    const bounds = win.getBounds();
    if (bounds.height === h) return;
    if (process.platform === 'darwin') {
      win.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: h }, true);
      return;
    }
    // setBounds의 animate 인자는 맥 전용 — 윈도우는 직접 보간하며 매 프레임 setBounds
    heightTween.start(bounds.height, h, (v) => {
      const b = win.getBounds();
      win.setBounds({ x: b.x, y: b.y, width: b.width, height: v });
    });
  });
}
