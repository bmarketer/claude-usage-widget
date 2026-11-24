// src/main/tray.js
import { Tray, Menu, nativeImage } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { trayTitle, trayTooltip } from '../shared/trayTitle.js';
import { SCALE_PRESETS, clampScale } from '../shared/scale.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isMac = process.platform === 'darwin';

export function setupTray({ app, win, settingsStore, setScale }) {
  // 컬러 마스코트. 맥 메뉴바는 여백을 잘라 메뉴바 높이에 가깝게(33×22pt, 일반·레티나용 NN.png/NN@2x.png 자동 선택),
  // 윈도우 트레이는 정사각형 32px.
  const load = (p) => nativeImage.createFromPath(p);
  const animDir = join(__dirname, '../../assets/tray-anim', isMac ? 'mac' : 'win');
  const still = load(join(animDir, '00.png'));
  const tray = new Tray(still);

  // 위젯 마스코트(claude-fu.webp)와 같은 26장 동작을 메뉴바에서도 돌린다 — 장면별 시간은 원본 그대로
  let frames = [];
  let durations = [];
  try {
    durations = JSON.parse(readFileSync(join(animDir, '..', 'durations.json'), 'utf8'));
    frames = durations.map((_, i) => load(join(animDir, `${String(i).padStart(2, '0')}.png`)));
  } catch {
    frames = []; // 장면 파일이 없으면 멈춘 아이콘으로
  }
  let animTimer = null;
  let frameIndex = 0;
  const stopAnim = () => {
    clearTimeout(animTimer);
    animTimer = null;
    tray.setImage(still);
  };
  const tick = () => {
    tray.setImage(frames[frameIndex]);
    const wait = Math.max(60, Number(durations[frameIndex]) || 120);
    frameIndex = (frameIndex + 1) % frames.length;
    animTimer = setTimeout(tick, wait);
  };
  const syncAnim = () => {
    const on = settingsStore.load().trayAnimate && frames.length > 0;
    if (on && !animTimer) tick();
    else if (!on && animTimer) stopAnim();
  };
  syncAnim();
  tray.setToolTip('사용량');

  let lastMetrics = [];

  const toggleVisible = () => {
    if (win.isVisible()) win.hide();
    else {
      win.show();
      win.focus();
    }
  };

  // 메뉴바 숫자는 맥에서만 (윈도우 트레이는 글자를 못 넣어 툴팁만)
  const renderTitle = () => {
    if (!isMac) return;
    const on = settingsStore.load().trayPercent;
    tray.setTitle(on ? trayTitle(lastMetrics) : '', { fontType: 'monospacedDigit' });
  };

  const update = (metrics) => {
    lastMetrics = Array.isArray(metrics) ? metrics : [];
    renderTitle();
    tray.setToolTip(trayTooltip(lastMetrics));
  };

  const buildMenu = () => {
    const settings = settingsStore.load();
    const current = clampScale(settings.scale);
    return Menu.buildFromTemplate([
      { label: win.isVisible() ? '숨기기' : '보이기', click: toggleVisible },
      { type: 'separator' },
      {
        label: '크기',
        submenu: SCALE_PRESETS.map((p) => ({
          label: `${p.label} (${p.value.toFixed(1)}배)`,
          type: 'checkbox',
          checked: current === p.value,
          click: () => setScale(p.value),
        })),
      },
      ...(isMac
        ? [
            {
              label: '메뉴바에 % 표시',
              type: 'checkbox',
              checked: settings.trayPercent,
              click: () => {
                settingsStore.save({ trayPercent: !settingsStore.load().trayPercent });
                renderTitle();
              },
            },
          ]
        : []),
      {
        label: isMac ? '메뉴바 마스코트 움직이기' : '트레이 아이콘 움직이기',
        type: 'checkbox',
        checked: settings.trayAnimate,
        click: () => {
          settingsStore.save({ trayAnimate: !settingsStore.load().trayAnimate });
          syncAnim();
        },
      },
      {
        label: '로그인 시 자동 시작',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: () => {
          const next = !app.getLoginItemSettings().openAtLogin;
          app.setLoginItemSettings({ openAtLogin: next });
          settingsStore.save({ openAtLogin: next });
        },
      },
      { type: 'separator' },
      { label: '종료', click: () => app.quit() },
    ]);
  };

  tray.on('click', toggleVisible);
  tray.on('right-click', () => tray.popUpContextMenu(buildMenu()));

  return { tray, update };
}
