// src/main/tween.js
// 윈도우의 BrowserWindow.setBounds()는 animate 인자가 없다(맥 전용) — 창 높이
// 변화를 직접 보간해서 매 프레임 setBounds를 호출하는 방식으로 대체한다.

export function easeOutCubic(t) {
  const c = Math.min(1, Math.max(0, t)) - 1;
  return c * c * c + 1;
}

export function tweenValue(from, to, t) {
  return from + (to - from) * easeOutCubic(t);
}

const FRAME_MS = 8;
const DEFAULT_DURATION_MS = 150;

// 값 하나를 계속 다시 트윈해야 하는 경우(예: 펼침/접힘을 빠르게 다시 누름)를 위한
// 러너. start()를 다시 호출하면 진행 중이던 트윈은 조용히 취소되고 새로 시작한다.
export function createTweenRunner(duration = DEFAULT_DURATION_MS) {
  let timer = null;

  function cancel() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function start(from, to, onUpdate, onDone) {
    cancel();
    if (from === to) {
      onUpdate(to);
      onDone?.();
      return;
    }
    const startedAt = Date.now();
    timer = setInterval(() => {
      const t = (Date.now() - startedAt) / duration;
      if (t >= 1) {
        cancel();
        onUpdate(to);
        onDone?.();
        return;
      }
      onUpdate(Math.round(tweenValue(from, to, t)));
    }, FRAME_MS);
  }

  return { start, cancel };
}
