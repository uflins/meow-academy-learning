// 區域地圖：一個單元一排關卡，最後是大魔王。
import { h } from '../ui/dom.js';
import { findRegion } from '../engine/curriculum.js';
import { loadRegionUnits } from '../engine/pool.js';
import { progressKey } from '../engine/progress.js';
import { playerBar } from './world.js';
import { play } from '../engine/sfx.js';
import { speak } from '../engine/speech.js';

function stars(n) {
  return h('span', { class: 'stars' }, [0, 1, 2].map((i) => h('span', { class: i < n ? 'on' : '' }, '★')));
}

export default function region(root, { regionId }, { go, app }) {
  const player = app.player;
  if (!player) return go('home');
  const r = findRegion(player.grade, regionId);
  if (!r) return go('world');

  const list = h('div', { class: 'unit-list' }, h('div', { class: 'loading' }, '載入中…'));
  root.append(
    playerBar(player, { go, back: () => go('world') }),
    h('div', { class: 'region', style: { '--region': r.color } },
      h('h2', { class: 'scene-title' }, `${r.icon} ${r.name}`),
      list,
    ),
  );

  loadRegionUnits(r).then((units) => {
    list.replaceChildren(...units.map((u) => h('div', { class: 'unit' },
      h('div', { class: 'unit-title' }, u.title),
      h('div', { class: 'unit-nodes' }, u.nodes.map((n) => {
        const p = player.progress[progressKey(r.id, n.id)];
        return h('button', {
          class: `node btn ${n.isBoss ? 'boss' : ''} ${p ? 'done' : ''}`,
          onclick: () => { play('tap'); go('battle', { regionId: r.id, nodeId: n.id }); },
        },
        h('span', { class: 'node-icon' }, n.isBoss ? '👑' : '🐾'),
        player.grade <= 2 ? h('span', { class: 'mini-say node-say', role: 'button', 'aria-label': '念給我聽', onclick: (e) => { e.stopPropagation(); speak(n.title.replace(/^\d+-\d+\s*/, '')); } }, '🔊') : null,
        h('span', { class: 'node-title' }, n.title),
        stars(p ? p.stars : 0));
      })),
    )));
  }).catch((e) => {
    list.replaceChildren(h('div', { class: 'warn' }, `載入失敗：${e.message}`));
  });
}
