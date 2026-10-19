// 首頁：選玩家（點頭像＋PIN）。第一次使用時請家長先設定。
import { h, toast } from '../ui/dom.js';
import { askPin } from '../ui/pinpad.js';
import * as store from '../save/store.js';
import { catSVG } from '../art/art.js';
import { play } from '../engine/sfx.js';

export default function home(root, params, { go, app }) {
  app.playerId = null;
  document.body.classList.remove('low-grade');
  const players = store.listPlayers();

  const enter = async (p) => {
    play('tap');
    const pin = await askPin({
      title: `${p.avatar} ${p.name}`,
      subtitle: p.pinKind === 'pictures' ? '依序點你的 3 張圖' : '輸入你的 4 位數密碼',
      kind: p.pinKind === 'pictures' ? 'pictures' : 'digits',
      length: p.pinKind === 'pictures' ? 3 : 4,
      check: async (v) => (await store.hashPin(v)) === p.pinHash,
    });
    if (pin == null) return;
    app.playerId = p.id;
    go('world');
  };

  root.append(
    h('div', { class: 'home' },
      h('div', { class: 'home-hero' },
        h('div', { class: 'hero-cats', html: catSVG('momo', { mood: 'happy' }) + catSVG('abacus') + catSVG('leaf', { mood: 'happy' }) }),
        h('h1', { class: 'title' }, '喵喵學園大冒險'),
        h('p', { class: 'subtitle' }, players.length ? '是誰來冒險了呢？' : '歡迎！請家長先建立玩家'),
      ),
      players.length
        ? h('div', { class: 'player-list' }, players.map((p) => h('button', { class: 'player-card btn', onclick: () => enter(p) },
            h('span', { class: 'player-avatar' }, p.avatar),
            h('span', { class: 'player-name' }, p.name),
            h('span', { class: 'player-grade' }, `${p.grade} 年級`))))
        : h('button', { class: 'btn primary big', onclick: () => go('parent', { setup: true }) }, '開始設定'),
      h('button', { class: 'btn ghost parent-link', onclick: () => go('parent') }, '👪 家長區'),
      !store.isStorageOk() ? h('div', { class: 'warn' }, '⚠️ 這個瀏覽器不能存檔（可能是無痕模式），進度不會保留。') : null,
    ),
  );

  if (!players.length && store.hasParentPin()) toast('請到家長區新增玩家');
}
