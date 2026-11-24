// src/renderer/banner.js — 배너를 밀어 넣고, 7초 뒤(또는 누르면) 밀어낸 다음 main에 숨기라고 알린다.
const SHOW_MS = 7000;
const bannerEl = document.getElementById('banner');
const titleEl = document.getElementById('b-title');
const bodyEl = document.getElementById('b-body');
let timer = null;

function leave() {
  clearTimeout(timer);
  bannerEl.classList.remove('show');
  bannerEl.classList.add('leave');
  setTimeout(() => window.api.banner.done(), 260);
}

window.api.banner.onShow(({ title, body }) => {
  titleEl.textContent = title;
  bodyEl.textContent = body;
  bannerEl.classList.remove('show', 'leave');
  void bannerEl.offsetWidth; // 다시 보여줄 때도 밀려 들어오게
  requestAnimationFrame(() => bannerEl.classList.add('show'));
  clearTimeout(timer);
  timer = setTimeout(leave, SHOW_MS);
});

bannerEl.addEventListener('click', leave);
