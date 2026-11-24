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
  // 맥·윈도우 모두 컬러 마스코트(32px). 맥 메뉴바는 16pt에 맞게 2배 해상도 이미지로 넣는다.
  const iconPath = join(__dirname, '../../assets/tray-color.png');
  const img = isMac
    ? nativeImage.createFromBuffer(readFileSync(iconPath), { scaleFactor: 2 })
    : nativeImage.createFromPath(iconPath);
  const tray = new Tray(img);
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
