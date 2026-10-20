// 喵喵學園大冒險：主程式與換頁。
import * as store from './save/store.js';
import { unlock } from './engine/sfx.js';
import { stop as stopSpeech, unlock as unlockSpeech } from './engine/speech.js';
import home from './scenes/home.js';
import world from './scenes/world.js';
import region from './scenes/region.js';
import battle from './scenes/battle.js';
import parent from './scenes/parent.js';
import wrongbook from './scenes/wrongbook.js';

const scenes = { home, world, region, battle, parent, wrongbook };

export const app = {
  root: null,
  playerId: null,
  cleanup: null,
  get player() { return this.playerId ? store.getPlayer(this.playerId) : null; },
};

export function go(name, params = {}) {
  stopSpeech();
  if (app.cleanup) { try { app.cleanup(); } catch (e) { /* 忽略 */ } }
  app.cleanup = null;
  document.querySelectorAll('.modal-overlay').forEach((m) => m.remove());
  app.root.replaceChildren();
  app.root.className = `scene scene-${name}`;
  const p = app.player;
  document.body.classList.toggle('low-grade', !!p && p.grade <= 2);
  const result = scenes[name](app.root, params, { go, app });
  if (typeof result === 'function') app.cleanup = result;
  window.scrollTo(0, 0);
}

function boot() {
  app.root = document.getElementById('app');
  store.load();
  // iPad 要在第一次觸控後才能播放聲音
  window.addEventListener('pointerdown', () => { unlock(); unlockSpeech(); }, { once: true });
  // 防止 iPad 雙擊放大
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
  go('home');
}

boot();
